/**
 * Purpose: Verify settlement recording, transfer processing, retries, and history queries.
 * Governing docs:
 *   - docs/architecture.md (§2, §5, §6 purchase flow)
 *   - docs/service-architecture.md (§1.6 Convex functions)
 *   - docs/domain-model.md (§4.4 Collaboration)
 * External references:
 *   - https://stripe.com/docs/connect/separate-charges-and-transfers
 *   - packages/vendure-server/node_modules/@vendure/core/dist/connection/transactional-connection.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/settlement.service.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { TransactionalConnection } from '@vendure/core';
import { StripeService } from '../../features/stripe/index.js';
import { RevenueSplitService, type CollaborativeOrder } from './revenue-split.service.js';
import { SettlementEntity, SettlementStatus } from './settlement.entity.js';
import { SettlementService } from './settlement.service.js';

class MemorySettlementRepository {
  private readonly rows = new Map<string, SettlementEntity>();
  private nextId = 1;

  create(input: Partial<SettlementEntity>): SettlementEntity {
    return new SettlementEntity(input);
  }

  async save(entity: SettlementEntity): Promise<SettlementEntity> {
    if (!entity.id) {
      entity.id = `settlement-${this.nextId++}`;
    }
    entity.createdAt = entity.createdAt ?? new Date('2025-01-01T00:00:00.000Z');
    entity.updatedAt = new Date('2025-01-01T00:00:00.000Z');
    this.rows.set(entity.id, cloneSettlement(entity));
    return cloneSettlement(entity);
  }

  async find(options?: {
    readonly where?: Partial<SettlementEntity>;
    readonly order?: { readonly createdAt?: 'ASC' | 'DESC' };
  }): Promise<SettlementEntity[]> {
    const rows = [...this.rows.values()]
      .filter((row) => (options?.where ? matchesWhere(row, options.where) : true))
      .map(cloneSettlement);

    if (options?.order?.createdAt === 'DESC') {
      rows.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    }
    if (options?.order?.createdAt === 'ASC') {
      rows.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    }

    return rows;
  }

  async findOneBy(where: Partial<SettlementEntity>): Promise<SettlementEntity | null> {
    return [...this.rows.values()].find((row) => matchesWhere(row, where)) ?? null;
  }

  seed(entity: SettlementEntity): void {
    entity.createdAt = entity.createdAt ?? new Date('2025-01-01T00:00:00.000Z');
    entity.updatedAt = entity.updatedAt ?? new Date('2025-01-01T00:00:00.000Z');
    this.rows.set(entity.id, cloneSettlement(entity));
  }
}

function cloneSettlement(entity: SettlementEntity): SettlementEntity {
  return new SettlementEntity({
    ...entity,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    processedAt: entity.processedAt,
    failedAt: entity.failedAt,
  });
}

function matchesWhere<T extends object>(entity: T, where: Partial<T>): boolean {
  return Object.entries(where).every(([key, value]) => entity[key as keyof T] === value);
}

function createOrder(): CollaborativeOrder {
  return {
    orderId: 'order-1',
    orderCode: 'ORDER-1',
    currencyCode: 'usd',
    sourceTransactionId: 'ch_123',
    lines: [
      {
        orderLineId: 'line-1',
        productId: 'product-1',
        productName: 'Terrain Pack',
        lineAmount: 10000,
        ownerCreatorId: 'owner-1',
        ownerStripeAccountId: 'acct_owner',
        collaborations: [
          {
            creatorId: 'collab-1',
            stripeAccountId: 'acct_collab',
            revenueSharePercent: 25,
          },
        ],
      },
    ],
  };
}

function createService(options?: {
  readonly repository?: MemorySettlementRepository;
  readonly stripeService?: Pick<StripeService, 'createTransfer'>;
}) {
  const repository = options?.repository ?? new MemorySettlementRepository();
  const connection = {
    getRepository: vi.fn().mockReturnValue(repository),
  } as unknown as Pick<TransactionalConnection, 'getRepository'>;

  const service = new SettlementService(
    connection,
    new RevenueSplitService(),
    options?.stripeService as StripeService | undefined,
  );

  return { service, repository };
}

describe('SettlementService', () => {
  it('records pending settlements once per order', async () => {
    const { service, repository } = createService();

    const created = await service.recordPendingSettlements(undefined, createOrder());
    const replayed = await service.recordPendingSettlements(undefined, createOrder());

    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({
      creatorId: 'owner-1',
      amount: 7500,
      status: SettlementStatus.Pending,
    });
    expect(created[1]).toMatchObject({
      creatorId: 'collab-1',
      amount: 2500,
      status: SettlementStatus.Pending,
    });
    expect(replayed).toHaveLength(2);
    expect(await repository.find({ where: { orderId: 'order-1' } })).toHaveLength(2);
  });

  it('processes a pending settlement via Stripe transfer', async () => {
    const repository = new MemorySettlementRepository();
    repository.seed(
      new SettlementEntity({
        id: 'settlement-1',
        orderId: 'order-1',
        orderCode: 'ORDER-1',
        orderLineId: 'line-1',
        productId: 'product-1',
        creatorId: 'collab-1',
        ownerCreatorId: 'owner-1',
        stripeAccountId: 'acct_collab',
        currencyCode: 'usd',
        amount: 2500,
        sharePercent: 25,
        transferGroup: 'ORDER-1',
        sourceTransactionId: 'ch_123',
        status: SettlementStatus.Pending,
        attemptCount: 0,
      }),
    );
    const stripeService = {
      createTransfer: vi.fn().mockResolvedValue({
        transferId: 'tr_123',
        destinationAccountId: 'acct_collab',
        amount: 2500,
        currencyCode: 'usd',
        transferGroup: 'ORDER-1',
        sourceTransactionId: 'ch_123',
      }),
    };
    const { service } = createService({ repository, stripeService });

    const processed = await service.processSettlement(undefined, 'settlement-1');

    expect(stripeService.createTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2500,
        destinationAccountId: 'acct_collab',
        transferGroup: 'ORDER-1',
        sourceTransactionId: 'ch_123',
        idempotencyKey: 'simket_tr_settlement-1_1',
      }),
    );
    expect(processed.status).toBe(SettlementStatus.Completed);
    expect(processed.paymentReference).toBe('tr_123');
    expect(processed.attemptCount).toBe(1);
  });

  it('marks failed settlements and retries them with a new idempotency key', async () => {
    const repository = new MemorySettlementRepository();
    repository.seed(
      new SettlementEntity({
        id: 'settlement-2',
        orderId: 'order-1',
        orderLineId: 'line-1',
        productId: 'product-1',
        creatorId: 'collab-1',
        ownerCreatorId: 'owner-1',
        stripeAccountId: 'acct_collab',
        currencyCode: 'usd',
        amount: 2500,
        sharePercent: 25,
        transferGroup: 'ORDER-1',
        status: SettlementStatus.Pending,
      }),
    );
    const createTransfer = vi
      .fn()
      .mockRejectedValueOnce(new Error('Insufficient funds'))
      .mockResolvedValueOnce({
        transferId: 'tr_retry',
        destinationAccountId: 'acct_collab',
        amount: 2500,
        currencyCode: 'usd',
        transferGroup: 'ORDER-1',
        sourceTransactionId: null,
      });
    const { service } = createService({
      repository,
      stripeService: { createTransfer },
    });

    await expect(service.processSettlement(undefined, 'settlement-2')).rejects.toThrow(
      /insufficient funds/i,
    );

    const failed = await repository.findOneBy({ id: 'settlement-2' });
    expect(failed?.status).toBe(SettlementStatus.Failed);
    expect(failed?.attemptCount).toBe(1);

    const retried = await service.retryFailedSettlements(undefined, 'order-1');

    expect(retried[0]?.status).toBe(SettlementStatus.Completed);
    expect(createTransfer.mock.calls[0]?.[0].idempotencyKey).toBe('simket_tr_settlement-2_1');
    expect(createTransfer.mock.calls[1]?.[0].idempotencyKey).toBe('simket_tr_settlement-2_2');
  });

  it('aggregates earnings by settlement status for a creator', async () => {
    const repository = new MemorySettlementRepository();
    repository.seed(
      new SettlementEntity({
        id: 'settlement-1',
        orderId: 'order-1',
        orderLineId: 'line-1',
        productId: 'product-1',
        creatorId: 'creator-1',
        ownerCreatorId: 'creator-1',
        stripeAccountId: 'acct_1',
        currencyCode: 'usd',
        amount: 1000,
        sharePercent: 10,
        status: SettlementStatus.Pending,
      }),
    );
    repository.seed(
      new SettlementEntity({
        id: 'settlement-2',
        orderId: 'order-2',
        orderLineId: 'line-2',
        productId: 'product-2',
        creatorId: 'creator-1',
        ownerCreatorId: 'creator-1',
        stripeAccountId: 'acct_1',
        currencyCode: 'usd',
        amount: 2000,
        sharePercent: 20,
        status: SettlementStatus.Completed,
      }),
    );
    repository.seed(
      new SettlementEntity({
        id: 'settlement-3',
        orderId: 'order-3',
        orderLineId: 'line-3',
        productId: 'product-3',
        creatorId: 'creator-1',
        ownerCreatorId: 'creator-1',
        stripeAccountId: 'acct_1',
        currencyCode: 'usd',
        amount: 500,
        sharePercent: 5,
        status: SettlementStatus.Failed,
      }),
    );
    const { service } = createService({ repository });

    const summary = await service.getEarningsSummary(undefined, 'creator-1');

    expect(summary).toEqual({
      creatorId: 'creator-1',
      currencyCode: 'usd',
      pendingAmount: 1000,
      processingAmount: 0,
      completedAmount: 2000,
      failedAmount: 500,
      totalAmount: 3500,
      settlementCount: 3,
    });
  });
});
