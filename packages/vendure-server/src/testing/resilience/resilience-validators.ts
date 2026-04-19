/**
 * Purpose: Pure helpers for verifying resilience policy configuration before runtime wiring.
 * Governing docs:
 *   - docs/architecture.md (§2 Non-negotiable rules, §9 Resilience)
 *   - docs/service-architecture.md (§11 Resilience patterns)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://github.com/connor4312/cockatiel
 *   - https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
 * Tests:
 *   - packages/vendure-server/src/testing/resilience/resilience-validators.test.ts
 */
export type FailureMode = 'transient' | 'permanent' | 'unknown';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface CircuitBreakerValidationConfig {
  threshold: number;
  resetTimeoutMs: number;
  halfOpenMax: number;
}

export interface RetryValidationConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export interface TimeoutValidationConfig {
  typesenseMs: number;
  qdrantMs: number;
  hyperswitchMs: number;
  cdngineMs: number;
  keygenMs: number;
}

export interface BulkheadValidationConfig {
  maxConcurrent: number;
  maxQueue: number;
}

export const RESILIENCE_TIMEOUT_TIERS: TimeoutValidationConfig = {
  typesenseMs: 3_000,
  qdrantMs: 5_000,
  hyperswitchMs: 10_000,
  cdngineMs: 15_000,
  keygenMs: 5_000,
};

const CIRCUIT_BREAKER_LIMITS = {
  minThreshold: 0.01,
  maxThreshold: 1,
  minResetTimeoutMs: 1,
  maxResetTimeoutMs: 300_000,
  minHalfOpenMax: 1,
  maxHalfOpenMax: 100,
} as const;

const RETRY_LIMITS = {
  minAttempts: 1,
  maxAttempts: 10,
  minBackoffMultiplier: 1.1,
  maxBackoffMultiplier: 5,
  minMaxDelayMs: 1,
  maxMaxDelayMs: 60_000,
} as const;

const TIMEOUT_LIMITS = {
  minTimeoutMs: 1,
  maxTimeoutMs: 60_000,
} as const;

const BULKHEAD_LIMITS = {
  minConcurrent: 1,
  maxConcurrent: 1_000,
  minQueue: 1,
  maxQueue: 10_000,
} as const;

export function validateCircuitBreakerConfig(
  config: CircuitBreakerValidationConfig,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (
    !Number.isFinite(config.threshold) ||
    config.threshold < CIRCUIT_BREAKER_LIMITS.minThreshold ||
    config.threshold > CIRCUIT_BREAKER_LIMITS.maxThreshold
  ) {
    errors.push({
      field: 'threshold',
      message: `threshold must be between ${CIRCUIT_BREAKER_LIMITS.minThreshold} and ${CIRCUIT_BREAKER_LIMITS.maxThreshold}`,
    });
  }

  if (
    !Number.isFinite(config.resetTimeoutMs) ||
    config.resetTimeoutMs < CIRCUIT_BREAKER_LIMITS.minResetTimeoutMs ||
    config.resetTimeoutMs > CIRCUIT_BREAKER_LIMITS.maxResetTimeoutMs
  ) {
    errors.push({
      field: 'resetTimeoutMs',
      message: `resetTimeoutMs must be between ${CIRCUIT_BREAKER_LIMITS.minResetTimeoutMs} and ${CIRCUIT_BREAKER_LIMITS.maxResetTimeoutMs}`,
    });
  }

  if (
    !Number.isInteger(config.halfOpenMax) ||
    config.halfOpenMax < CIRCUIT_BREAKER_LIMITS.minHalfOpenMax ||
    config.halfOpenMax > CIRCUIT_BREAKER_LIMITS.maxHalfOpenMax
  ) {
    errors.push({
      field: 'halfOpenMax',
      message: `halfOpenMax must be an integer between ${CIRCUIT_BREAKER_LIMITS.minHalfOpenMax} and ${CIRCUIT_BREAKER_LIMITS.maxHalfOpenMax}`,
    });
  }

  return buildValidationResult(errors);
}

export function validateRetryConfig(config: RetryValidationConfig): ValidationResult {
  const errors: ValidationError[] = [];

  if (
    !Number.isInteger(config.maxAttempts) ||
    config.maxAttempts < RETRY_LIMITS.minAttempts ||
    config.maxAttempts > RETRY_LIMITS.maxAttempts
  ) {
    errors.push({
      field: 'maxAttempts',
      message: `maxAttempts must be an integer between ${RETRY_LIMITS.minAttempts} and ${RETRY_LIMITS.maxAttempts}`,
    });
  }

  if (
    !Number.isFinite(config.backoffMultiplier) ||
    config.backoffMultiplier < RETRY_LIMITS.minBackoffMultiplier ||
    config.backoffMultiplier > RETRY_LIMITS.maxBackoffMultiplier
  ) {
    errors.push({
      field: 'backoffMultiplier',
      message: `backoffMultiplier must be between ${RETRY_LIMITS.minBackoffMultiplier} and ${RETRY_LIMITS.maxBackoffMultiplier}`,
    });
  }

  if (
    !Number.isFinite(config.maxDelayMs) ||
    config.maxDelayMs < RETRY_LIMITS.minMaxDelayMs ||
    config.maxDelayMs > RETRY_LIMITS.maxMaxDelayMs
  ) {
    errors.push({
      field: 'maxDelayMs',
      message: `maxDelayMs must be between ${RETRY_LIMITS.minMaxDelayMs} and ${RETRY_LIMITS.maxMaxDelayMs}`,
    });
  }

  return buildValidationResult(errors);
}

export function validateTimeoutConfig(
  config: TimeoutValidationConfig,
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [field, value] of Object.entries(config)) {
    if (
      !Number.isFinite(value) ||
      value < TIMEOUT_LIMITS.minTimeoutMs ||
      value > TIMEOUT_LIMITS.maxTimeoutMs
    ) {
      errors.push({
        field,
        message: `${field} must be between ${TIMEOUT_LIMITS.minTimeoutMs} and ${TIMEOUT_LIMITS.maxTimeoutMs}`,
      });
    }
  }

  if (
    config.typesenseMs > config.qdrantMs ||
    config.qdrantMs > config.hyperswitchMs ||
    config.keygenMs > config.hyperswitchMs ||
    config.hyperswitchMs > config.cdngineMs
  ) {
    errors.push({
      field: 'tierOrdering',
      message:
        'Timeout tiers must progress from fast search calls to slower payment and asset operations.',
    });
  }

  return buildValidationResult(errors);
}

export function validateBulkheadConfig(
  config: BulkheadValidationConfig,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (
    !Number.isInteger(config.maxConcurrent) ||
    config.maxConcurrent < BULKHEAD_LIMITS.minConcurrent ||
    config.maxConcurrent > BULKHEAD_LIMITS.maxConcurrent
  ) {
    errors.push({
      field: 'maxConcurrent',
      message: `maxConcurrent must be an integer between ${BULKHEAD_LIMITS.minConcurrent} and ${BULKHEAD_LIMITS.maxConcurrent}`,
    });
  }

  if (
    !Number.isInteger(config.maxQueue) ||
    config.maxQueue < BULKHEAD_LIMITS.minQueue ||
    config.maxQueue > BULKHEAD_LIMITS.maxQueue
  ) {
    errors.push({
      field: 'maxQueue',
      message: `maxQueue must be an integer between ${BULKHEAD_LIMITS.minQueue} and ${BULKHEAD_LIMITS.maxQueue}`,
    });
  }

  return buildValidationResult(errors);
}

export function classifyFailureMode(
  statusCode?: number,
  errorType?: string,
): FailureMode {
  const normalizedErrorType = errorType?.trim().toLowerCase();

  if (
    normalizedErrorType === 'network' ||
    normalizedErrorType === 'timeout' ||
    normalizedErrorType === 'dns' ||
    normalizedErrorType === 'connection'
  ) {
    return 'transient';
  }

  if (statusCode === undefined) {
    return 'unknown';
  }

  if (statusCode === 408 || statusCode === 425 || statusCode === 429) {
    return 'transient';
  }

  if (statusCode >= 500 && statusCode <= 599) {
    return 'transient';
  }

  if (statusCode >= 400 && statusCode <= 499) {
    return 'permanent';
  }

  return 'unknown';
}

export function shouldRetry(failureMode: FailureMode): boolean {
  return failureMode === 'transient';
}

function buildValidationResult(errors: ValidationError[]): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
  };
}
