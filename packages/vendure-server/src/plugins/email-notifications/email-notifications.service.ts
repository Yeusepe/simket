/**
 * Purpose: Email notification logic — template selection, subject rendering,
 * payload building for worker-dispatched transactional emails.
 *
 * Governing docs:
 *   - docs/architecture.md §12 (Notifications)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/worker-job-queue/
 * Tests:
 *   - packages/vendure-server/src/plugins/email-notifications/email-notifications.service.test.ts
 */

export enum EmailTemplateType {
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  COLLABORATION_INVITE = 'COLLABORATION_INVITE',
  SETTLEMENT_COMPLETE = 'SETTLEMENT_COMPLETE',
}

export interface EmailPayload {
  readonly to: string;
  readonly recipientName: string;
  readonly subject: string;
  readonly templateType: EmailTemplateType;
  readonly data: Record<string, string>;
}

/**
 * Build a fully-formed email payload ready for the email dispatch worker.
 */
export function buildEmailPayload(params: {
  templateType: EmailTemplateType;
  recipientEmail: string;
  recipientName: string;
  data: Record<string, string>;
}): EmailPayload {
  return {
    to: params.recipientEmail,
    recipientName: params.recipientName,
    subject: renderSubjectLine(params.templateType, params.data),
    templateType: params.templateType,
    data: params.data,
  };
}

/**
 * Basic email address validation (not exhaustive — proper validation happens
 * at the email provider level).
 */
export function validateEmailAddress(email: string): boolean {
  if (!email) return false;
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return false;
  if (atIndex >= email.length - 1) return false;
  return true;
}

/**
 * Render a human-readable subject line for the email template.
 */
export function renderSubjectLine(
  templateType: EmailTemplateType,
  data: Record<string, string>,
): string {
  switch (templateType) {
    case EmailTemplateType.ORDER_CONFIRMATION:
      return `Your Simket order #${data.orderId ?? 'unknown'} is confirmed`;
    case EmailTemplateType.COLLABORATION_INVITE:
      return `${data.inviterName ?? 'Someone'} invited you to collaborate on Simket`;
    case EmailTemplateType.SETTLEMENT_COMPLETE:
      return `Your Simket payout of ${data.amountFormatted ?? '$0.00'} is complete`;
    default:
      return 'Notification from Simket';
  }
}
