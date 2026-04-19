/**
 * Purpose: Record, process, retry, and query collaborative creator settlements.
 * Governing docs:
 *   - docs/architecture.md (§2, §5, §6 purchase flow)
 *   - docs/service-architecture.md (§1.6 Convex functions, §5 service ownership)
 *   - docs/domain-model.md (§4.4 Collaboration)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://stripe.com/docs/connect/separate-charges-and-transfers
 *   - packages/vendure-server/node_modules/@vendure/core/dist/connection/transactional-connection.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/settlement.service.test.ts
 */
import { Injectable, Optional } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { TransactionalConnection, type RequestContext } from '@vendure/core';
import { StripeService } from '../../features/hyperswitch/index.js';
import {
  RevenueSplitService,
  type CollaborativeOrder,
  type RevenueSettlementDraft,
} from './revenue-split.service.js';
import { SettlementEntity, SettlementStatus } from './settlement.entity.js';

interface SettlementRepository {
  create(input: Partial<SettlementEntity>): SettlementEntity;
  save(entity: SettlementEntity): Promise<SettlementEntity>;
  find(options?: {
    readonly where?: Partial<SettlementEntity>;
    readonly order?: { readonly createdAt?: 'ASC' | 'DESC' };
  }): Promise<SettlementEntity[]>;
  findOneBy(where: Partial<SettlementEntity>): Promise<SettlementEntity | null>;
}

export interface SettlementHistoryFilter {
  readonly status?: SettlementStatus;
  readonly orderId?: string;
  readonly skip?: number;
  readonly take?: number;
}

export interface SettlementEarningsSummary {
  readonly creatorId: string;
  readonly currencyCode: string;
  readonly pendingAmount: number;
  readonly processingAmount: number;
  readonly completedAmount: number;
  readonly failedAmount: number;
  readonly totalAmount: number;
  readonly settlementCount: number;
}

const tracer = trace.getTracer('simket-collaboration-settlements');

@Injectable()
export class SettlementService {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly revenueSplitService: RevenueSplitService,
    @Optional() private readonly stripeService?: StripeService,
  ) {}

  async recordPendingSettlements(
    ctx: RequestContext | undefined,
    order: CollaborativeOrder,
  ): Promise<SettlementEntity[]> {
    return tracer.startActiveSpan('settlements.recordPending', async (span) => {
      try {
        span.setAttribute('settlement.order_id', order.orderId);
        const repository = this.getRepository(ctx);
        const existing = await repository.find({
          where: { orderId: order.orderId },
          order: { createdAt: 'ASC' },
        });
        if (existing.length > 0) {
          return existing;
        }

        const drafts = this.revenueSplitService
          .calculateOrderSplits(order)
          .filter((draft) => draft.amount > 0);

        const settlements: SettlementEntity[] = [];
        for (const draft of drafts) {
          settlements.push(await repository.save(repository.create(this.toSettlementInput(draft))));
        }
        span.setAttribute('settlement.count', settlements.length);
        return settlements;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async processPendingSettlements(
    ctx: RequestContext | undefined,
    orderId: string,
  ): Promise<SettlementEntity[]> {
    const settlements = await this.getRepository(ctx).find({
      where: { orderId, status: SettlementStatus.Pending },
      order: { createdAt: 'ASC' },
    });

    const processed: SettlementEntity[] = [];
    for (const settlement of settlements) {
      processed.push(await this.processSettlement(ctx, settlement.id));
    }
    return processed;
  }

  async retryFailedSettlements(
    ctx: RequestContext | undefined,
    orderId?: string,
  ): Promise<SettlementEntity[]> {
    const where: Partial<SettlementEntity> = { status: SettlementStatus.Failed };
    if (orderId) {
      where.orderId = orderId;
    }

    const failedSettlements = await this.getRepository(ctx).find({
      where,
      order: { createdAt: 'ASC' },
    });

    const retried: SettlementEntity[] = [];
    for (const settlement of failedSettlements) {
      retried.push(await this.processSettlement(ctx, settlement.id));
    }
    return retried;
  }

  async processSettlement(
    ctx: RequestContext | undefined,
    settlementId: string,
  ): Promise<SettlementEntity> {
    return tracer.startActiveSpan('settlements.processOne', async (span) => {
      const repository = this.getRepository(ctx);
      const settlement = await repository.findOneBy({ id: settlementId });
      if (!settlement) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Settlement not found' });
        span.end();
        throw new Error(`Settlement "${settlementId}" does not exist`);
      }

      try {
        span.setAttribute('settlement.id', settlement.id);
        span.setAttribute('settlement.order_id', settlement.orderId);
        span.setAttribute('settlement.creator_id', settlement.creatorId);

        if (settlement.status === SettlementStatus.Completed && settlement.paymentReference) {
          return settlement;
        }

        const attempt = settlement.attemptCount + 1;
        settlement.status = SettlementStatus.Processing;
        settlement.attemptCount = attempt;
        settlement.failureMessage = null;
        settlement.failedAt = null;
        await repository.save(settlement);

        const stripe = this.requireStripeService();
        const transfer = await stripe.createTransfer({
          amount: settlement.amount,
          currencyCode: settlement.currencyCode,
          destinationAccountId: settlement.stripeAccountId,
          transferGroup:
            settlement.transferGroup ??
            RevenueSplitService.createTransferGroup({
              orderId: settlement.orderId,
              orderCode: settlement.orderCode ?? undefined,
            }),
          sourceTransactionId: settlement.sourceTransactionId ?? undefined,
          idempotencyKey: StripeService.generateTransferIdempotencyKey(settlement.id, attempt),
          metadata: {
            orderId: settlement.orderId,
            orderLineId: settlement.orderLineId,
            productId: settlement.productId,
            creatorId: settlement.creatorId,
          },
        });

        settlement.status = SettlementStatus.Completed;
        settlement.paymentReference = transfer.transferId;
        settlement.transferGroup = transfer.transferGroup;
        settlement.processedAt = new Date();
        return await repository.save(settlement);
      } catch (error) {
        settlement.status = SettlementStatus.Failed;
        settlement.failureMessage = error instanceof Error ? error.message : String(error);
        settlement.failedAt = new Date();
        await repository.save(settlement);
        span.setStatus({ code: SpanStatusCode.ERROR, message: settlement.failureMessage });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getSettlementHistory(
    ctx: RequestContext | undefined,
    creatorId: string,
    filter: SettlementHistoryFilter = {},
  ): Promise<SettlementEntity[]> {
    const where: Partial<SettlementEntity> = { creatorId };
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.orderId) {
      where.orderId = filter.orderId;
    }

    const settlements = await this.getRepository(ctx).find({
      where,
      order: { createdAt: 'DESC' },
    });
    const skip = filter.skip ?? 0;
    const take = filter.take ?? settlements.length;
    return settlements.slice(skip, skip + take);
  }

  async getEarningsSummary(
    ctx: RequestContext | undefined,
    creatorId: string,
  ): Promise<SettlementEarningsSummary> {
    const settlements = await this.getSettlementHistory(ctx, creatorId);
    const currencyCode = settlements[0]?.currencyCode ?? 'usd';
    const pendingAmount = sumAmounts(settlements, SettlementStatus.Pending);
    const processingAmount = sumAmounts(settlements, SettlementStatus.Processing);
    const completedAmount = sumAmounts(settlements, SettlementStatus.Completed);
    const failedAmount = sumAmounts(settlements, SettlementStatus.Failed);

    return {
      creatorId,
      currencyCode,
      pendingAmount,
      processingAmount,
      completedAmount,
      failedAmount,
      totalAmount: pendingAmount + processingAmount + completedAmount + failedAmount,
      settlementCount: settlements.length,
    };
  }

  private getRepository(ctx: RequestContext | undefined): SettlementRepository {
    return this.connection.getRepository(ctx, SettlementEntity) as SettlementRepository;
  }

  private requireStripeService(): StripeService {
    if (!this.stripeService) {
      throw new Error('Settlement processing requires StripeService to be configured');
    }
    return this.stripeService;
  }

  private toSettlementInput(draft: RevenueSettlementDraft): Partial<SettlementEntity> {
    return {
      orderId: draft.orderId,
      orderCode: draft.orderCode ?? null,
      orderLineId: draft.orderLineId,
      productId: draft.productId,
      productName: draft.productName ?? null,
      creatorId: draft.creatorId,
      ownerCreatorId: draft.ownerCreatorId,
      stripeAccountId: draft.stripeAccountId,
      currencyCode: draft.currencyCode,
      amount: draft.amount,
      sharePercent: draft.sharePercent,
      status: SettlementStatus.Pending,
      attemptCount: 0,
      transferGroup: draft.transferGroup,
      sourceTransactionId: draft.sourceTransactionId ?? null,
      paymentReference: null,
      failureMessage: null,
      processedAt: null,
      failedAt: null,
    };
  }
}

function sumAmounts(settlements: SettlementEntity[], status: SettlementStatus): number {
  return settlements
    .filter((settlement) => settlement.status === status)
    .reduce((sum, settlement) => sum + settlement.amount, 0);
}
