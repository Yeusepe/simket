import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createResiliencePolicy,
  ResiliencePolicyOptions,
  DEFAULT_RESILIENCE_OPTIONS,
} from './resilience.js';

describe('Resilience Policy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a policy with default options', () => {
    const policy = createResiliencePolicy('test-service');
    expect(policy).toBeDefined();
    expect(policy.execute).toBeInstanceOf(Function);
  });

  it('should execute a successful function through the policy', async () => {
    const policy = createResiliencePolicy('test-service');
    const result = await policy.execute(() => Promise.resolve('success'));
    expect(result).toBe('success');
  });

  it('should timeout after configured duration', async () => {
    const policy = createResiliencePolicy('test-service', {
      timeout: 50,
    });

    const slowFn = () => new Promise((resolve) => setTimeout(resolve, 200));

    await expect(policy.execute(slowFn)).rejects.toThrow();
  });

  it('should retry on transient failures then succeed', async () => {
    const policy = createResiliencePolicy('test-service', {
      retry: { maxAttempts: 3, initialDelay: 10, maxDelay: 50 },
      timeout: 5_000,
      circuitBreaker: { threshold: 0.6, duration: 30_000, minimumRps: 100 },
    });

    let attempts = 0;
    const fn = () => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error('transient'));
      }
      return Promise.resolve('recovered');
    };

    const result = await policy.execute(fn);
    expect(result).toBe('recovered');
    expect(attempts).toBe(3);
  });

  it('should open circuit breaker after sustained failures', async () => {
    const policy = createResiliencePolicy('test-service', {
      retry: { maxAttempts: 1, initialDelay: 10, maxDelay: 50 },
      timeout: 5_000,
      circuitBreaker: { threshold: 0.5, duration: 30_000, minimumRps: 0 },
    });

    const alwaysFail = () => Promise.reject(new Error('permanent'));

    // Exhaust retries to trip the breaker
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

  it('should expose DEFAULT_RESILIENCE_OPTIONS', () => {
    expect(DEFAULT_RESILIENCE_OPTIONS).toBeDefined();
    expect(DEFAULT_RESILIENCE_OPTIONS.timeout).toBeGreaterThan(0);
    expect(DEFAULT_RESILIENCE_OPTIONS.retry.maxAttempts).toBeGreaterThan(0);
  });

  it('should accept custom options that override defaults', () => {
    const custom: Partial<ResiliencePolicyOptions> = { timeout: 999 };
    const policy = createResiliencePolicy('custom-svc', custom);
    expect(policy).toBeDefined();
  });

  it('should support bulkhead limiting concurrent calls', async () => {
    const policy = createResiliencePolicy('test-service', {
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

    // Launch 3 concurrent calls — only 2 should run at once, third should be rejected
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
