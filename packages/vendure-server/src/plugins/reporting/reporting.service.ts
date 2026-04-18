/**
 * Purpose: Pure functions for content reporting and moderation.
 *
 * Handles: report validation, priority assignment, status checks,
 * and user eligibility. IO-free for testability.
 *
 * Governing docs:
 *   - docs/architecture.md §10 (Trust & Safety)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 * Tests:
 *   - packages/vendure-server/src/plugins/reporting/reporting.service.test.ts
 */

/** Reasons for reporting content. */
export enum ReportReason {
  COPYRIGHT = 'COPYRIGHT',
  ILLEGAL_CONTENT = 'ILLEGAL_CONTENT',
  FRAUD = 'FRAUD',
  HARASSMENT = 'HARASSMENT',
  SPAM = 'SPAM',
  MISLEADING = 'MISLEADING',
  OTHER = 'OTHER',
}

/** Report lifecycle states. */
export enum ReportStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

/** Priority levels for triage. */
export type ReportPriority = 'HIGH' | 'MEDIUM' | 'LOW';

const MAX_DESCRIPTION_LENGTH = 2000;

interface ReportInput {
  targetType: string;
  targetId: string;
  reason: ReportReason;
  description?: string;
  reporterId: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a report submission.
 */
export function validateReport(input: ReportInput): ValidationResult {
  const errors: string[] = [];

  if (!input.targetType || input.targetType.trim().length === 0) {
    errors.push('Target type is required');
  }
  if (!input.targetId || input.targetId.trim().length === 0) {
    errors.push('Target ID is required');
  }
  if (!input.reporterId || input.reporterId.trim().length === 0) {
    errors.push('Reporter ID is required');
  }
  if (input.description && input.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if a report in the given status can still be acted upon.
 */
export function isReportActionable(status: ReportStatus): boolean {
  return status === ReportStatus.PENDING || status === ReportStatus.UNDER_REVIEW;
}

/**
 * Assign priority based on report reason for triage.
 *
 * - HIGH: Copyright, illegal content (legal risk)
 * - MEDIUM: Fraud, harassment (user safety)
 * - LOW: Spam, misleading, other
 */
export function getReportPriority(reason: ReportReason): ReportPriority {
  switch (reason) {
    case ReportReason.COPYRIGHT:
    case ReportReason.ILLEGAL_CONTENT:
      return 'HIGH';
    case ReportReason.FRAUD:
    case ReportReason.HARASSMENT:
      return 'MEDIUM';
    case ReportReason.SPAM:
    case ReportReason.MISLEADING:
    case ReportReason.OTHER:
    default:
      return 'LOW';
  }
}

/**
 * Check if a user is eligible to submit a report.
 * Users cannot report themselves.
 */
export function canUserReport(reporterId: string, targetOwnerId: string): boolean {
  if (!reporterId || reporterId.trim().length === 0) return false;
  return reporterId !== targetOwnerId;
}
