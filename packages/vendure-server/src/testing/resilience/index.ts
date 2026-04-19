/**
 * Purpose: Re-export pure resilience verification utilities for tests and config checks.
 * Governing docs:
 *   - docs/architecture.md (§2 Non-negotiable rules, §9 Resilience)
 *   - docs/service-architecture.md (§11 Resilience patterns)
 * External references:
 *   - https://github.com/connor4312/cockatiel
 * Tests:
 *   - packages/vendure-server/src/testing/resilience/resilience-validators.test.ts
 */
export {
  RESILIENCE_TIMEOUT_TIERS,
  classifyFailureMode,
  shouldRetry,
  validateBulkheadConfig,
  validateCircuitBreakerConfig,
  validateRetryConfig,
  validateTimeoutConfig,
} from './resilience-validators.js';
export type {
  BulkheadValidationConfig,
  CircuitBreakerValidationConfig,
  FailureMode,
  RetryValidationConfig,
  TimeoutValidationConfig,
  ValidationError,
  ValidationResult,
} from './resilience-validators.js';
