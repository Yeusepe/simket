/**
 * Purpose: Calculate settlement-ready revenue splits for collaborative order lines.
 * Governing docs:
 *   - docs/architecture.md (§2, §5, §6 purchase flow)
 *   - docs/service-architecture.md (§1.6 Convex functions, §5 service ownership)
 *   - docs/domain-model.md (§4.4 Collaboration)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://stripe.com/docs/connect/separate-charges-and-transfers
 *   - https://stripe.com/docs/connect/destination-charges
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/revenue-split.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';

export interface CollaborativeOrder {
  readonly orderId: string;
  readonly orderCode?: string;
  readonly currencyCode: string;
  readonly transferGroup?: string;
  readonly sourceTransactionId?: string;
  readonly lines: ReadonlyArray<CollaborativeOrderLine>;
}

export interface CollaborativeOrderLine {
  readonly orderLineId: string;
  readonly productId: string;
  readonly productName?: string;
  readonly lineAmount: number;
  readonly ownerCreatorId: string;
  readonly ownerStripeAccountId: string;
  readonly collaborations: ReadonlyArray<CollaboratorShare>;
}

export interface CollaboratorShare {
  readonly creatorId: string;
  readonly stripeAccountId: string;
  readonly revenueSharePercent: number;
}

export interface RevenueSettlementDraft {
  readonly orderId: string;
  readonly orderCode?: string;
  readonly orderLineId: string;
  readonly productId: string;
  readonly productName?: string;
  readonly creatorId: string;
  readonly ownerCreatorId: string;
  readonly stripeAccountId: string;
  readonly currencyCode: string;
  readonly amount: number;
  readonly sharePercent: number;
  readonly transferGroup: string;
  readonly sourceTransactionId?: string;
}

const tracer = trace.getTracer('simket-collaboration-settlements');

@Injectable()
export class RevenueSplitService {
  calculateOrderSplits(order: CollaborativeOrder): RevenueSettlementDraft[] {
    return tracer.startActiveSpan('settlements.calculateRevenueSplit', (span) => {
      try {
        this.assertOrder(order);
        const transferGroup = order.transferGroup ?? RevenueSplitService.createTransferGroup(order);
        const settlements: RevenueSettlementDraft[] = [];

        for (const line of order.lines) {
          settlements.push(...this.calculateLineSplits(order, line, transferGroup));
        }

        return settlements;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  static createTransferGroup(order: Pick<CollaborativeOrder, 'orderId' | 'orderCode'>): string {
    return `ORDER_${order.orderCode ?? order.orderId}`;
  }

  private calculateLineSplits(
    order: CollaborativeOrder,
    line: CollaborativeOrderLine,
    transferGroup: string,
  ): RevenueSettlementDraft[] {
    this.assertLine(line);

    if (line.collaborations.length === 0) {
      return [];
    }

    const collaboratorPercent = line.collaborations.reduce(
      (sum, collaboration) => sum + collaboration.revenueSharePercent,
      0,
    );
    if (collaboratorPercent > 100) {
      throw new Error(
        `Collaborator revenue share for product "${line.productId}" exceeds 100% (${collaboratorPercent}%)`,
      );
    }

    const collaboratorSettlements: RevenueSettlementDraft[] = line.collaborations
      .filter((collaboration) => collaboration.revenueSharePercent > 0)
      .map((collaboration) => {
        if (!collaboration.stripeAccountId.trim()) {
          throw new Error(
            `Collaborator "${collaboration.creatorId}" is missing a Stripe connected account ID`,
          );
        }

        const amount = Math.floor((line.lineAmount * collaboration.revenueSharePercent) / 100);
        return {
          orderId: order.orderId,
          orderCode: order.orderCode,
          orderLineId: line.orderLineId,
          productId: line.productId,
          productName: line.productName,
          creatorId: collaboration.creatorId,
          ownerCreatorId: line.ownerCreatorId,
          stripeAccountId: collaboration.stripeAccountId,
          currencyCode: order.currencyCode,
          amount,
          sharePercent: collaboration.revenueSharePercent,
          transferGroup,
          sourceTransactionId: order.sourceTransactionId,
        };
      });

    const allocatedToCollaborators = collaboratorSettlements.reduce(
      (sum, settlement) => sum + settlement.amount,
      0,
    );
    const ownerAmount = line.lineAmount - allocatedToCollaborators;
    if (ownerAmount < 0) {
      throw new Error(`Owner settlement for product "${line.productId}" cannot be negative`);
    }

    const ownerSettlement: RevenueSettlementDraft = {
      orderId: order.orderId,
      orderCode: order.orderCode,
      orderLineId: line.orderLineId,
      productId: line.productId,
      productName: line.productName,
      creatorId: line.ownerCreatorId,
      ownerCreatorId: line.ownerCreatorId,
      stripeAccountId: line.ownerStripeAccountId,
      currencyCode: order.currencyCode,
      amount: ownerAmount,
      sharePercent: 100 - collaboratorPercent,
      transferGroup,
      sourceTransactionId: order.sourceTransactionId,
    };

    return [ownerSettlement, ...collaboratorSettlements];
  }

  private assertOrder(order: CollaborativeOrder): void {
    if (!order.orderId.trim()) {
      throw new Error('Settlement order ID must not be empty');
    }
    if (!order.currencyCode.trim()) {
      throw new Error('Settlement currency code must not be empty');
    }
  }

  private assertLine(line: CollaborativeOrderLine): void {
    if (!line.productId.trim()) {
      throw new Error('Settlement line product ID must not be empty');
    }
    if (!line.orderLineId.trim()) {
      throw new Error('Settlement line ID must not be empty');
    }
    if (!line.ownerCreatorId.trim()) {
      throw new Error(`Product "${line.productId}" is missing an owner creator ID`);
    }
    if (!line.ownerStripeAccountId.trim()) {
      throw new Error(`Product owner "${line.ownerCreatorId}" is missing a Stripe connected account ID`);
    }
    if (!Number.isInteger(line.lineAmount) || line.lineAmount < 0) {
      throw new Error(`Settlement line amount for product "${line.productId}" must be a non-negative integer`);
    }
  }
}
