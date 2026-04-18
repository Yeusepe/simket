/**
 * Purpose: Keygen feature barrel for the licensing service, helpers, and contracts.
 * Governing docs:
 *   - docs/architecture.md (§5 Service ownership)
 *   - docs/service-architecture.md (§1.11 Keygen)
 * Tests:
 *   - packages/vendure-server/src/features/keygen/keygen.service.test.ts
 */
export {
  KeygenConfigError,
  KeygenService,
  KeygenServiceError,
  formatLicenseKey,
  isLicenseExpired,
  isValidLicenseStatus,
  isValidLicenseType,
  parseLicenseKey,
  validateKeygenConfig,
} from './keygen.service.js';
export type {
  CreateLicenseInput,
  KeygenConfig,
  License,
  LicenseStatus,
  LicenseType,
  ValidationResult,
} from './keygen.types.js';
