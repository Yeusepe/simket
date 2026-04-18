/**
 * Purpose: ClamAV feature barrel.
 *
 * Governing docs:
 *   - docs/architecture.md (§2 Fail-closed on security, §5 Asset pipeline)
 *   - docs/service-architecture.md (§9 Media asset lifecycle)
 * Tests:
 *   - packages/vendure-server/src/features/clamav/clamav.service.test.ts
 */
export { ClamavScannerService, buildQuarantineRecord, parseClamdResponse, validateClamavConfig } from './clamav.service.js';
export type {
  ClamavConfig,
  ClamavService,
  QuarantineRecord,
  ScanResult,
  ScanVerdict,
} from './clamav.types.js';
