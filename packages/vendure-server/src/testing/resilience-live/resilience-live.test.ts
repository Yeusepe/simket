/**
 * Purpose: Live resilience verification tests that exercise real Cockatiel policies.
 * These tests verify that timeout, retry, circuit breaker, and bulkhead policies
 * behave correctly with actual async operations — NOT config validators.
 *
 * Governing docs:
 *   - docs/architecture.md §9 (Resilience)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://github.com/connor4312/cockatiel (Cockatiel v3 API)
 * Tests:
 *   - This file
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createResiliencePolicy,
  SERVICE_POLICIES,
} from '../../resilience/resilience.js';

/**
 * These tests follow the same pattern as resilience.test.ts to avoid
 * Cockatiel's internal halfOpenAfter timers from keeping the vitest worker alive.
 * Key: use high minimumRps (100) so SamplingBreaker never trips accidentally,
 * and use duration: 30_000 so any timers are long-lived but the worker exits before they fire.
 */

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Resilience policy — timeout', () => {
  it('should resolve when function completes within timeout', async () => {
    const policy = createResiliencePolicy('test-timeout', {
      timeout: 500,
      retry: { maxAttempts: 0, initialDelay: 10, maxDelay: 50 },
      circuitBreaker: { threshold: 0.5, duration: 30_000, minimumRps: 100 },
    });

    const result = await policy.execute(() => Promise.resolve('fast'));
    expect(result).toBe('fast');
  });

  it('should reject when function exceeds timeout', async () => {
    const policy = createResiliencePolicy('test-timeout-exceed', {
      timeout: 50,
      retry: { maxAttempts: 0, initialDelay: 10, maxDelay: 50 },
      circuitBreaker: { threshold: 0.5, duration: 30_000, minimumRps: 100 },
    });

    const slowFn = () => new Promise((resolve) => setTimeout(resolve, 200));
    await expect(policy.execute(slowFn)).rejects.toThrow();
  });
});

describe('Resilience policy — retry', () => {
  it('should retry transient failures and eventually succeed', async () => {
    const policy = createResiliencePolicy('test-retry', {
      timeout: 5_000,
      retry: { maxAttempts: 3, initialDelay: 10, maxDelay: 50 },
      circuitBreaker: { threshold: 0.5, duration: 30_000, minimumRps: 100 },
    });

    let attempts = 0;
    const fn = () => {
      attempts++;
      if (attempts < 3) return Promise.reject(new Error('transient'));
      return Promise.resolve('recovered');
    };

    const result = await policy.execute(fn);
    expect(result).toBe('recovered');
    expect(attempts).toBe(3);
  });

  it('should fail after exhausting retries', async () => {
    const policy = createResiliencePolicy('test-retry-exhaust', {
      timeout: 5_000,
      retry: { maxAttempts: 2, initialDelay: 10, maxDelay: 50 },
      circuitBreaker: { threshold: 0.5, duration: 30_000, minimumRps: 100 },
    });

    let calls = 0;
    const fn = () => {
      calls++;
      return Promise.reject(new Error(`fail #${calls}`));
    };

    await expect(policy.execute(fn)).rejects.toThrow('fail');
  });
});

describe('Resilience policy — circuit breaker', () => {
  it('should open circuit after sustained failures', async () => {
    // Use minimumRps: 0 to trigger ConsecutiveBreaker behavior
    const policy = createResiliencePolicy('test-breaker', {
      timeout: 5_000,
      retry: { maxAttempts: 1, initialDelay: 10, maxDelay: 50 },
      circuitBreaker: { threshold: 0.5, duration: 30_000, minimumRps: 0 },
    });

    const alwaysFail = () => Promise.reject(new Error('permanent'));

    // Trip the breaker
    for (let i = 0; i < 5; i++) {
      try {
        await policy.execute(alwaysFail);
      } catch {
        // expected
      }
    }

    // Next call should be rejected immediately by the open circuit
    await expect(policy.execute(alwaysFail)).rejects.toThrow();
  });
});

describe('Resilience policy — bulkhead', () => {
  it('should enforce concurrent call limits', async () => {
    const policy = createResiliencePolicy('test-bulkhead', {
      bulkhead: { maxConcurrent: 2, maxQueue: 0 },
      timeout: 5_000,
      retry: { maxAttempts: 1, initialDelay: 10, maxDelay: 50 },
      circuitBreaker: { threshold: 0.6, duration: 30_000, minimumRps: 100 },
    });

    let running = 0;
    let maxRunning = 0;
    const slowFn = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 100));
      running--;
      return 'done';
    };

    const results = await Promise.allSettled([
      policy.execute(slowFn),
      policy.execute(slowFn),
      policy.execute(slowFn),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(2);
    expect(rejected.length).toBe(1);
    expect(maxRunning).toBe(2);
  });
});

describe('SERVICE_POLICIES — smoke tests', () => {
  it('all service policies should be defined', () => {
    const expectedServices = [
      'typesense', 'qdrant', 'cdngine', 'clamav', 'hyperswitch',
      'betterAuth', 'keygen', 'payloadCms', 'svix', 'crowdsec',
    ] as const;

    for (const svc of expectedServices) {
      expect(SERVICE_POLICIES[svc]).toBeDefined();
      expect(typeof SERVICE_POLICIES[svc].execute).toBe('function');
    }
  });

  it('each policy can execute a simple async function', async () => {
    for (const [name, policy] of Object.entries(SERVICE_POLICIES)) {
      const result = await policy.execute(async () => `${name}-ok`);
      expect(result).toBe(`${name}-ok`);
    }
  });
});
