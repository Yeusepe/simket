/**
 * Purpose: Vendure EventBus subscriber that forwards lifecycle events to Svix
 * for creator webhook delivery. Each product mutation, order completion, or
 * collaboration event is forwarded to the creator's Svix application.
 *
 * Governing docs:
 *   - docs/architecture.md §12 (Notifications — Svix webhook delivery)
 *   - docs/service-architecture.md §1.7 (Svix contract)
 * External references:
 *   - https://docs.svix.com/sending-messages
 *   - https://docs.vendure.io/guides/developer-guide/events/
 * Tests:
 *   - packages/vendure-server/src/features/svix/svix-event-subscriber.test.ts
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  EventBus,
  Logger,
  ProductEvent,
  OrderStateTransitionEvent,
} from '@vendure/core';
import { SvixService, validateEventType } from './svix.service.js';
import type { SimketEventType } from './svix.types.js';

const loggerCtx = 'SvixEventSubscriber';

/**
 * Subscribes to Vendure EventBus events and forwards them to Svix for
 * outbound webhook delivery to creators.
 *
 * This subscriber does NOT block the request path — events are processed
 * asynchronously after the transaction commits.
 */
@Injectable()
export class SvixEventSubscriber implements OnModuleInit {
  private readonly svix: SvixService | null;

  constructor(private readonly eventBus: EventBus) {
    const apiKey = process.env['SVIX_API_KEY'];
    if (apiKey) {
      this.svix = new SvixService({ svixApiKey: apiKey });
    } else {
      Logger.warn('SVIX_API_KEY not set — webhook delivery disabled', loggerCtx);
      this.svix = null;
    }
  }

  onModuleInit(): void {
    if (!this.svix) return;

    this.subscribeToProductEvents();
    this.subscribeToOrderEvents();
    Logger.info('Svix event subscribers registered', loggerCtx);
  }

  private subscribeToProductEvents(): void {
    this.eventBus.ofType(ProductEvent).subscribe((event) => {
      const eventType = this.mapProductEventType(event.type);
      if (!eventType) return;

      const creatorId = this.extractCreatorId(event);
      if (!creatorId) return;

      this.sendEventSafe(creatorId, eventType, {
        productId: String(event.product.id),
        productName: event.product.name ?? 'Unknown',
      });
    });
  }

  private subscribeToOrderEvents(): void {
    this.eventBus.ofType(OrderStateTransitionEvent).subscribe((event) => {
      if (event.toState !== 'PaymentSettled') return;

      // Forward order.completed for each product's creator
      const { order } = event;
      for (const line of order.lines ?? []) {
        const creatorId = (line.productVariant as Record<string, unknown>)?.customFields
          ? String((line.productVariant.customFields as Record<string, unknown>)?.creatorId ?? '')
          : '';

        if (creatorId) {
          this.sendEventSafe(creatorId, 'order.completed', {
            orderId: String(order.code),
            productVariantId: String(line.productVariant?.id),
            quantity: String(line.quantity),
            linePrice: String(line.linePriceWithTax),
          });
        }
      }
    });
  }

  private mapProductEventType(type: string): SimketEventType | null {
    switch (type) {
      case 'created':
        return 'product.created';
      case 'updated':
        return 'product.updated';
      case 'deleted':
        return 'product.deleted';
      default:
        return null;
    }
  }

  private extractCreatorId(event: ProductEvent): string | null {
    const customFields = event.product?.customFields as Record<string, unknown> | undefined;
    const creatorId = customFields?.creatorId;
    return typeof creatorId === 'string' && creatorId.length > 0 ? creatorId : null;
  }

  private sendEventSafe(
    creatorId: string,
    eventType: SimketEventType,
    payload: Record<string, string>,
  ): void {
    if (!this.svix) return;

    this.svix.sendEvent({ creatorId, eventType, payload }).catch((err) => {
      Logger.error(
        `Failed to send Svix event ${eventType} for creator ${creatorId}: ${String(err)}`,
        loggerCtx,
      );
    });
  }
}
