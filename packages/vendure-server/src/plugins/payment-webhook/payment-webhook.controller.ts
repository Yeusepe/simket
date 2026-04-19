/**
 * Purpose: HTTP controller that receives Hyperswitch webhook POSTs, verifies signatures,
 * and dispatches order lifecycle actions via EventBus.
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 *   - docs/service-architecture.md §1.13 (Hyperswitch API contract)
 * External references:
 *   - https://docs.hyperswitch.io/explore-hyperswitch/webhooks
 *   - https://docs.hyperswitch.io/explore-hyperswitch/webhooks#signature-verification
 *   - https://docs.vendure.io/guides/developer-guide/plugins/#middleware
 * Tests:
 *   - packages/vendure-server/src/plugins/payment-webhook/payment-webhook.controller.test.ts
 */
import { Controller, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { Logger } from '@vendure/core';
import type { Request, Response } from 'express';
import {
  parseWebhookEventType,
  extractPaymentIdFromEvent,
  extractOrderIdFromEvent,
  determineOrderAction,
  verifyWebhookSignature,
  WebhookEventType,
} from './payment-webhook.service.js';

const loggerCtx = 'PaymentWebhookController';

/**
 * Express middleware-style webhook controller for Hyperswitch payment events.
 *
 * Mounted at `/payments/webhooks` via the plugin's middleware configuration.
 *
 * @see https://docs.hyperswitch.io/explore-hyperswitch/webhooks
 */
@Controller('payments')
export class PaymentWebhookController {
  private readonly webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env['HYPERSWITCH_WEBHOOK_SECRET'] ?? '';
  }

  @Post('webhooks')
  async handleWebhook(@Req() req: Request, @Res() res: Response): Promise<void> {
    const signature = req.headers['x-webhook-signature'] as string | undefined;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Verify signature if secret is configured
    if (this.webhookSecret) {
      if (!signature || !verifyWebhookSignature(rawBody, signature, this.webhookSecret)) {
        Logger.warn('Webhook signature verification failed', loggerCtx);
        res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
        return;
      }
    }

    let payload: unknown;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      Logger.warn('Failed to parse webhook payload', loggerCtx);
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid JSON' });
      return;
    }

    const eventTypeRaw = (payload as Record<string, unknown>)?.event_type;
    if (typeof eventTypeRaw !== 'string') {
      Logger.warn('Webhook payload missing event_type', loggerCtx);
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing event_type' });
      return;
    }

    const eventType = parseWebhookEventType(eventTypeRaw);
    const paymentId = extractPaymentIdFromEvent(payload);
    const orderId = extractOrderIdFromEvent(payload);
    const action = determineOrderAction(eventType);

    Logger.info(
      `Webhook received: ${eventTypeRaw} → ${action} (payment=${paymentId}, order=${orderId})`,
      loggerCtx,
    );

    if (eventType === WebhookEventType.UNKNOWN) {
      // Acknowledge unknown events to prevent retries
      res.status(HttpStatus.OK).json({ received: true, action: 'NONE' });
      return;
    }

    // TODO: Dispatch order lifecycle action via Vendure EventBus
    // This will be wired when the full order processing flow is implemented.
    // For now, acknowledge receipt so Hyperswitch doesn't retry.

    res.status(HttpStatus.OK).json({
      received: true,
      action,
      paymentId,
      orderId,
    });
  }
}
