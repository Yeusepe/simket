/**
 * Purpose: Public API for the reporting plugin.
 *
 * Governing docs:
 *   - docs/architecture.md §10 (Trust & Safety)
 * Tests:
 *   - packages/vendure-server/src/plugins/reporting/reporting.service.test.ts
 */

export { ReportingPlugin } from './reporting.plugin.js';
export {
  ReportReason,
  ReportStatus,
  validateReport,
  isReportActionable,
  getReportPriority,
  canUserReport,
} from './reporting.service.js';
export type { ReportPriority } from './reporting.service.js';
