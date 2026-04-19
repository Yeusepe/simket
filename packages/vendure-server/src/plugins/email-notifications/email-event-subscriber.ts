/**
 * Purpose: Vendure EventBus subscriber that dispatches transactional emails
 * via a job queue when key lifecycle events occur.
 *
 * Governing docs:
 *   - docs/architecture.md §12 (Notifications)
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/events/
 *   - https://docs.vendure.io/guides/developer-guide/worker-job-queue/
 * Tests:
 *   - packages/vendure-server/src/plugins/email-notifications/email-event-subscriber.test.ts
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus, OrderStateTransitionEvent, Logger, JobQueue, JobQueueService } from '@vendure/core';
import { buildEmailPayload, EmailTemplateType, type EmailPayload } from './email-notifications.service.js';

const loggerCtx = 'EmailEventSubscriber';

/**
 * Subscribes to Vendure EventBus events and enqueues email dispatch jobs.
 *
 * The actual email sending is handled by a worker job processor, keeping
 * the request path fast. This subscriber only builds payloads and enqueues.
 *
 * @see https://docs.vendure.io/guides/developer-guide/events/
 * @see https://docs.vendure.io/guides/developer-guide/worker-job-queue/
 */
@Injectable()
export class EmailEventSubscriber implements OnModuleInit {
  private emailQueue!: JobQueue<EmailPayload>;

  constructor(
    private readonly eventBus: EventBus,
    private readonly jobQueueService: JobQueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.jobQueueService) {
      Logger.error(
        'JobQueueService not injected — email queue will not be available. ' +
        'Ensure PluginCommonModule is imported in EmailNotificationsPlugin.',
        loggerCtx,
      );
      return;
    }

    this.emailQueue = await this.jobQueueService.createQueue({
      name: 'email-notifications',
      process: async (job) => {
        // In production, this sends via a transactional email service (Resend, SendGrid).
        // The transport adapter will be injected when the email provider is configured.
        Logger.info(
          `[email-queue] Would send "${job.data.templateType}" email to ${job.data.to}`,
          loggerCtx,
        );
      },
    });

    this.subscribeToOrderEvents();
  }

  private subscribeToOrderEvents(): void {
    this.eventBus.ofType(OrderStateTransitionEvent).subscribe((event) => {
      if (event.toState === 'PaymentSettled') {
        this.enqueueOrderConfirmation(event).catch((err) => {
          Logger.error(`Failed to enqueue order confirmation email: ${String(err)}`, loggerCtx);
        });
      }
    });

    Logger.info('Email event subscribers registered', loggerCtx);
  }

  private async enqueueOrderConfirmation(event: OrderStateTransitionEvent): Promise<void> {
    const { order } = event;
    const customer = order.customer;

    if (!customer?.emailAddress) {
      Logger.warn(`Order ${String(order.id)} has no customer email — skipping confirmation`, loggerCtx);
      return;
    }

    const payload = buildEmailPayload({
      templateType: EmailTemplateType.ORDER_CONFIRMATION,
      recipientEmail: customer.emailAddress,
      recipientName: `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Customer',
      data: {
        orderId: String(order.code),
        orderTotal: String(order.totalWithTax),
      },
    });

    if (!this.emailQueue) {
      Logger.warn(`Email queue not initialized — skipping confirmation for order ${String(order.code)}`, loggerCtx);
      return;
    }

    await this.emailQueue.add(payload, { retries: 3 });
    Logger.info(`Enqueued order confirmation email for order ${String(order.code)}`, loggerCtx);
  }
}
