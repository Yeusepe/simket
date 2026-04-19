/**
 * Purpose: Barrel exports for pure security audit validation helpers.
 * Governing docs:
 *   - docs/architecture.md (§2 Fail-closed on security)
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * Tests:
 *   - packages/vendure-server/src/testing/security/security-checks.test.ts
 */
export {
  checkSecureHeaders,
  classifyThreat,
  detectSensitiveDataExposure,
  validateCorsConfig,
  validateCspHeader,
  validateInputSanitization,
  validateRateLimitConfig,
} from './security-checks.js';
export type {
  CorsValidationConfig,
  CspValidationResult,
  InjectionThreatType,
  InputSanitizationResult,
  InputThreat,
  RateLimitConfig,
  SecureHeadersResult,
  SensitiveDataExposureResult,
  SensitiveDataFinding,
  SensitiveDataType,
  SecurityCheckResult,
  ThreatCategory,
  ThreatClassificationResult,
} from './security-checks.js';
