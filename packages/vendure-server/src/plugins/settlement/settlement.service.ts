/**
 * Purpose: Revenue settlement and collaboration split calculation.
 *
 * Computes per-collaborator payouts after platform fees, with floor rounding
 * so the product owner receives the remainder (no overpay).
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 *   - docs/domain-model.md §Collaboration
 * External references:
 *   - https://api-reference.hyperswitch.io/v1/payouts/payouts--create
 *   - https://docs.hyperswitch.io/features/payment-flows/payouts
 * Tests:
 *   - packages/vendure-server/src/plugins/settlement/settlement.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { RequestContext, TransactionalConnection } from '@vendure/core';
import { OrderService } from '@vendure/core';
import { OrderSettlementEntity, OrderSettlementStatus } from './settlement.entity.js';

/** A collaborator's share in a product. */
export interface CollaboratorShare {
  readonly collaboratorId: string;
  /** Percentage of (revenue - platform fee) this collaborator receives. */
  readonly sharePercent: number;
  /** Hyperswitch payout account ID for this collaborator. */
  readonly payoutAccountId: string;
}

/** Result of split calculation for a single collaborator. */
export interface PayoutTarget {
  readonly collaboratorId: string;
  readonly payoutAccountId: string;
  readonly amountCents: number;
}

/** Full settlement breakdown. */
export interface SettlementResult {
  readonly totalRevenueCents: number;
  readonly platformFeeCents: number;
  readonly distributableCents: number;
  readonly collaboratorPayouts: readonly PayoutTarget[];
  readonly ownerRemainderCents: number;
}

export interface SplitValidation {
  readonly valid: boolean;
  readonly errors: string[];
}

interface SettlementRepository {
  create(input: Partial<OrderSettlementEntity>): OrderSettlementEntity;
  save(entity: OrderSettlementEntity): Promise<OrderSettlementEntity>;
  find(options?: {
    readonly order?: {
      readonly createdAt?: 'ASC' | 'DESC';
      readonly id?: 'ASC' | 'DESC';
    };
  }): Promise<OrderSettlementEntity[]>;
  findOneBy(where: Partial<OrderSettlementEntity>): Promise<OrderSettlementEntity | null>;
}

type OrderLike = NonNullable<Awaited<ReturnType<OrderService['findOne']>>>;

const tracer = trace.getTracer('simket-order-settlement');

export class SettlementError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SettlementError';
  }
}

/**
 * Calculate collaborator revenue splits.
 *
 * @param totalRevenueCents - Gross payment amount (before platform fee)
 * @param collaborators - Collaborator share configs (sum ≤ 100%)
 * @param platformFeeCents - Platform fee already calculated
 * @returns Settlement breakdown with per-collaborator payouts
 */
export function calculateCollaboratorSplits(
  totalRevenueCents: number,
  collaborators: readonly CollaboratorShare[],
  platformFeeCents: number,
): SettlementResult {
  const distributableCents = totalRevenueCents - platformFeeCents;

  const payouts: PayoutTarget[] = collaborators.map((collab) => ({
    collaboratorId: collab.collaboratorId,
    payoutAccountId: collab.payoutAccountId,
    amountCents: Math.floor(distributableCents * (collab.sharePercent / 100)),
  }));

  const totalPaid = payouts.reduce((sum, p) => sum + p.amountCents, 0);
  const ownerRemainderCents = distributableCents - totalPaid;

  return {
    totalRevenueCents,
    platformFeeCents,
    distributableCents,
    collaboratorPayouts: payouts,
    ownerRemainderCents,
  };
}

/**
 * Validate a collaboration split configuration.
 *
 * Rules:
 * - Sum of shares ≤ 100%
 * - Each share: 0 < percent ≤ 100
 * - Each collaborator has a payout account
 * - No duplicate collaborator IDs
 */
export function validateSplitConfiguration(
  collaborators: readonly CollaboratorShare[],
): SplitValidation {
  const errors: string[] = [];

  const seenIds = new Set<string>();
  let totalPercent = 0;

  for (const collab of collaborators) {
    if (collab.sharePercent <= 0 || collab.sharePercent > 100) {
      errors.push(
        `Collaborator ${collab.collaboratorId}: share must be between 0 and 100 (got ${collab.sharePercent})`,
      );
    }
    if (!collab.payoutAccountId) {
      errors.push(`Collaborator ${collab.collaboratorId}: missing payout account`);
    }
    if (seenIds.has(collab.collaboratorId)) {
      errors.push(`Duplicate collaborator ID: ${collab.collaboratorId}`);
    }
    seenIds.add(collab.collaboratorId);
    totalPercent += collab.sharePercent;
  }

  if (totalPercent > 100) {
    errors.push(`Total share percent ${totalPercent}% exceeds 100%`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build Hyperswitch payout params for a collaborator.
 *
 * Docs: https://api-reference.hyperswitch.io/v1/payouts/payouts--create
 */
export function buildPayoutParams(
  target: PayoutTarget,
  currency: string,
  orderId: string,
): {
  amount: number;
  currency: string;
  payoutAccountId: string;
  metadata: Record<string, string>;
} {
  return {
    amount: target.amountCents,
    currency,
    payoutAccountId: target.payoutAccountId,
    metadata: {
      orderId,
      collaboratorId: target.collaboratorId,
      type: 'collaboration_settlement',
    },
  };
}

function normalizeId(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new SettlementError('INVALID_INPUT', `${fieldName} is required.`);
  }

  return normalized;
}

function orderSettlements(settlements: readonly OrderSettlementEntity[]): OrderSettlementEntity[] {
  return [...settlements].sort((left, right) => {
    const createdAtDelta = right.createdAt.getTime() - left.createdAt.getTime();
    if (createdAtDelta !== 0) {
      return createdAtDelta;
    }

    return right.id.localeCompare(left.id);
  });
}

@Injectable()
export class SettlementService {
  constructor(
    private readonly connection: Pick<TransactionalConnection, 'getRepository'>,
    private readonly orderService: OrderService,
  ) {}

  async processSettlement(
    ctx: RequestContext,
    orderId: string,
  ): Promise<OrderSettlementEntity> {
    return tracer.startActiveSpan('settlement.process', async (span) => {
      const normalizedOrderId = normalizeId(orderId, 'orderId');
      let settlement = await this.getRepository(ctx).findOneBy({ orderId: normalizedOrderId });

      try {
        const order = await this.requireOrder(ctx, normalizedOrderId);
        settlement ??= this.getRepository(ctx).create({
          orderId: normalizedOrderId,
          orderCode: order.code,
          amountCents: 0,
          currencyCode: String(order.currencyCode),
          status: OrderSettlementStatus.Pending,
          retryCount: 0,
          lastError: null,
          payoutMetadata: null,
          processedAt: null,
        });
        settlement.status = OrderSettlementStatus.Processing;
        settlement.lastError = null;
        settlement.orderCode = order.code;
        settlement.amountCents = order.totalWithTax;
        settlement.currencyCode = String(order.currencyCode);
        await this.getRepository(ctx).save(settlement);

        if (order.active) {
          throw new SettlementError('ORDER_NOT_PLACED', `Order "${normalizedOrderId}" is still active.`);
        }
        if (order.totalWithTax <= 0) {
          throw new SettlementError(
            'ORDER_TOTAL_INVALID',
            `Order "${normalizedOrderId}" has no payable amount to settle.`,
          );
        }

        settlement.payoutMetadata = {
          orderId: String(order.id),
          orderCode: order.code,
          amountCents: order.totalWithTax,
          currencyCode: String(order.currencyCode),
          type: 'order_settlement',
        };
        settlement.status = OrderSettlementStatus.Completed;
        settlement.processedAt = new Date();
        settlement.lastError = null;
        return await this.getRepository(ctx).save(settlement);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        if (!settlement) {
          settlement = this.getRepository(ctx).create({
            orderId: normalizedOrderId,
            orderCode: normalizedOrderId,
            amountCents: 0,
            currencyCode: 'USD',
            status: OrderSettlementStatus.Failed,
            retryCount: 0,
            lastError: String(error),
            payoutMetadata: null,
            processedAt: null,
          });
        } else {
          settlement.status = OrderSettlementStatus.Failed;
          settlement.lastError = error instanceof Error ? error.message : String(error);
        }

        return await this.getRepository(ctx).save(settlement);
      } finally {
        span.end();
      }
    });
  }

  async getSettlementStatus(
    ctx: RequestContext,
    orderId: string,
  ): Promise<OrderSettlementEntity | null> {
    return this.getRepository(ctx).findOneBy({ orderId: normalizeId(orderId, 'orderId') });
  }

  async getPendingSettlements(ctx: RequestContext): Promise<OrderSettlementEntity[]> {
    const settlements = await this.getRepository(ctx).find({
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return orderSettlements(settlements.filter((settlement) =>
      settlement.status === OrderSettlementStatus.Pending ||
      settlement.status === OrderSettlementStatus.Processing ||
      settlement.status === OrderSettlementStatus.Failed,
    ));
  }

  async retrySettlement(
    ctx: RequestContext,
    id: string,
  ): Promise<OrderSettlementEntity> {
    const settlement = await this.getRepository(ctx).findOneBy({ id: normalizeId(id, 'id') });
    if (!settlement) {
      throw new SettlementError('SETTLEMENT_NOT_FOUND', `Settlement "${id}" was not found.`);
    }

    settlement.retryCount += 1;
    settlement.status = OrderSettlementStatus.Pending;
    settlement.lastError = null;
    await this.getRepository(ctx).save(settlement);
    return this.processSettlement(ctx, settlement.orderId);
  }

  private getRepository(ctx: RequestContext): SettlementRepository {
    return this.connection.getRepository(ctx, OrderSettlementEntity) as unknown as SettlementRepository;
  }

  private async requireOrder(ctx: RequestContext, orderId: string): Promise<OrderLike> {
    const order = await this.orderService.findOne(ctx, orderId);
    if (!order) {
      throw new SettlementError('ORDER_NOT_FOUND', `Order "${orderId}" was not found.`);
    }

    return order;
  }
}
