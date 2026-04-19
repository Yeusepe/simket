/**
 * Purpose: Unit tests for pure resilience configuration validators.
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
import { describe, expect, it } from 'vitest';
import {
  classifyFailureMode,
  shouldRetry,
  validateBulkheadConfig,
  validateCircuitBreakerConfig,
  validateRetryConfig,
  validateTimeoutConfig,
} from './resilience-validators.js';

describe('resilience validators', () => {
  describe('validateCircuitBreakerConfig', () => {
    it('passes for a valid circuit breaker config', () => {
      const result = validateCircuitBreakerConfig({
        threshold: 0.5,
        resetTimeoutMs: 10_000,
        halfOpenMax: 2,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('fails when threshold is outside bounds', () => {
      const result = validateCircuitBreakerConfig({
        threshold: 1.5,
        resetTimeoutMs: 10_000,
        halfOpenMax: 2,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'threshold' }),
      );
    });

    it('fails when reset timeout is negative', () => {
      const result = validateCircuitBreakerConfig({
        threshold: 0.5,
        resetTimeoutMs: -1,
        halfOpenMax: 2,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'resetTimeoutMs' }),
      );
    });
  });

  describe('validateRetryConfig', () => {
    it('passes for a valid retry config', () => {
      const result = validateRetryConfig({
        maxAttempts: 3,
        backoffMultiplier: 2,
        maxDelayMs: 5_000,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('fails when maxAttempts is zero', () => {
      const result = validateRetryConfig({
        maxAttempts: 0,
        backoffMultiplier: 2,
        maxDelayMs: 5_000,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'maxAttempts' }),
      );
    });

    it('fails when backoff multiplier is excessive', () => {
      const result = validateRetryConfig({
        maxAttempts: 3,
        backoffMultiplier: 10,
        maxDelayMs: 5_000,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'backoffMultiplier' }),
      );
    });
  });

  describe('validateTimeoutConfig', () => {
    it('passes for valid timeout tiers', () => {
      const result = validateTimeoutConfig({
        typesenseMs: 3_000,
        qdrantMs: 5_000,
        hyperswitchMs: 10_000,
        cdngineMs: 15_000,
        keygenMs: 5_000,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('fails when a timeout is zero or negative', () => {
      const result = validateTimeoutConfig({
        typesenseMs: 0,
        qdrantMs: 5_000,
        hyperswitchMs: 10_000,
        cdngineMs: 15_000,
        keygenMs: -5,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'typesenseMs' }),
          expect.objectContaining({ field: 'keygenMs' }),
        ]),
      );
    });

    it('fails when timeout tiers are out of order', () => {
      const result = validateTimeoutConfig({
        typesenseMs: 6_000,
        qdrantMs: 5_000,
        hyperswitchMs: 10_000,
        cdngineMs: 15_000,
        keygenMs: 5_000,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'tierOrdering' }),
      );
    });
  });

  describe('validateBulkheadConfig', () => {
    it('passes for valid concurrency limits', () => {
      const result = validateBulkheadConfig({
        maxConcurrent: 10,
        maxQueue: 20,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('fails when concurrency or queue limits are zero or negative', () => {
      const result = validateBulkheadConfig({
        maxConcurrent: -1,
        maxQueue: 0,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'maxConcurrent' }),
          expect.objectContaining({ field: 'maxQueue' }),
        ]),
      );
    });
  });

  describe('classifyFailureMode', () => {
    it.each([
      [{ statusCode: 429, errorType: undefined }, 'transient'],
      [{ statusCode: 500, errorType: undefined }, 'transient'],
      [{ statusCode: 400, errorType: undefined }, 'permanent'],
      [{ statusCode: 404, errorType: undefined }, 'permanent'],
      [{ statusCode: undefined, errorType: 'network' }, 'transient'],
    ] as const)('classifies %o as %s', (input, expected) => {
      expect(classifyFailureMode(input.statusCode, input.errorType)).toBe(expected);
    });
  });

  describe('shouldRetry', () => {
    it('retries transient failures', () => {
      expect(shouldRetry('transient')).toBe(true);
    });

    it('does not retry permanent failures', () => {
      expect(shouldRetry('permanent')).toBe(false);
    });

    it('does not retry unknown failures', () => {
      expect(shouldRetry('unknown')).toBe(false);
    });
  });
});
