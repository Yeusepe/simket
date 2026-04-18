import {
  timeout,
  retry,
  circuitBreaker,
  bulkhead,
  wrap,
  handleAll,
  ExponentialBackoff,
  ConsecutiveBreaker,
  SamplingBreaker,
  TaskCancelledError,
  BulkheadRejectedError,
  BrokenCircuitError,
  TimeoutStrategy,
} from 'cockatiel';
import type { IPolicy } from 'cockatiel';

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
}

export interface CircuitBreakerOptions {
  /** Failure rate threshold (0-1) to trip the breaker */
  threshold: number;
  /** Duration in ms the breaker stays open */
  duration: number;
  /** Minimum RPS before breaker activates (avoids tripping on low traffic) */
  minimumRps: number;
}

export interface BulkheadOptions {
  maxConcurrent: number;
  maxQueue: number;
}

export interface ResiliencePolicyOptions {
  timeout: number;
  retry: RetryOptions;
  circuitBreaker: CircuitBreakerOptions;
  bulkhead?: BulkheadOptions;
}

export const DEFAULT_RESILIENCE_OPTIONS: ResiliencePolicyOptions = {
  timeout: 5_000,
  retry: { maxAttempts: 3, initialDelay: 200, maxDelay: 5_000 },
  circuitBreaker: { threshold: 0.5, duration: 30_000, minimumRps: 5 },
  bulkhead: { maxConcurrent: 10, maxQueue: 50 },
};

export interface ResiliencePolicy {
  execute<T>(fn: () => Promise<T>): Promise<T>;
}

/**
 * Per-service Cockatiel resilience policy factory.
 *
 * Wraps: Timeout → Retry (exponential + jitter) → CircuitBreaker → Bulkhead
 * Every outbound call must go through this per architecture §9.
 */
export function createResiliencePolicy(
  _serviceName: string,
  overrides: Partial<ResiliencePolicyOptions> = {},
): ResiliencePolicy {
  const opts: ResiliencePolicyOptions = {
    ...DEFAULT_RESILIENCE_OPTIONS,
    ...overrides,
    retry: { ...DEFAULT_RESILIENCE_OPTIONS.retry, ...overrides.retry },
    circuitBreaker: {
      ...DEFAULT_RESILIENCE_OPTIONS.circuitBreaker,
      ...overrides.circuitBreaker,
    },
  };

  const timeoutPolicy = timeout(opts.timeout, TimeoutStrategy.Aggressive);

  const retryPolicy = retry(handleAll, {
    maxAttempts: opts.retry.maxAttempts,
    backoff: new ExponentialBackoff({
      initialDelay: opts.retry.initialDelay,
      maxDelay: opts.retry.maxDelay,
    }),
  });

  const breakerPolicy = circuitBreaker(handleAll, {
    halfOpenAfter: opts.circuitBreaker.duration,
    breaker:
      opts.circuitBreaker.minimumRps > 0
        ? new SamplingBreaker({
            threshold: opts.circuitBreaker.threshold,
            duration: opts.circuitBreaker.duration,
            minimumRps: opts.circuitBreaker.minimumRps,
          })
        : new ConsecutiveBreaker(3),
  });

  const policies: IPolicy[] = [timeoutPolicy, retryPolicy, breakerPolicy];

  if (opts.bulkhead) {
    policies.push(bulkhead(opts.bulkhead.maxConcurrent, opts.bulkhead.maxQueue));
  }

  // wrap accepts 1-N policies; cast to satisfy overloaded signatures
  const combined = (wrap as (...p: IPolicy[]) => IPolicy)(...policies);

  return {
    execute<T>(fn: () => Promise<T>): Promise<T> {
      return combined.execute(() => fn()) as Promise<T>;
    },
  };
}

/**
 * Pre-configured resilience policies per external service.
 * Usage: `SERVICE_POLICIES.typesense.execute(() => typesenseClient.search(...))`
 */
export const SERVICE_POLICIES = {
  typesense: createResiliencePolicy('typesense', {
    timeout: 2_000,
    retry: { maxAttempts: 2, initialDelay: 100, maxDelay: 1_000 },
  }),
  qdrant: createResiliencePolicy('qdrant', {
    timeout: 3_000,
    retry: { maxAttempts: 2, initialDelay: 200, maxDelay: 2_000 },
  }),
  cdngine: createResiliencePolicy('cdngine', {
    timeout: 10_000,
    retry: { maxAttempts: 3, initialDelay: 500, maxDelay: 5_000 },
  }),
  clamav: createResiliencePolicy('clamav', {
    timeout: 10_000,
    retry: { maxAttempts: 2, initialDelay: 200, maxDelay: 2_000 },
    circuitBreaker: { threshold: 0.25, duration: 30_000, minimumRps: 1 },
  }),
  stripe: createResiliencePolicy('stripe', {
    timeout: 15_000,
    retry: { maxAttempts: 2, initialDelay: 1_000, maxDelay: 5_000 },
    circuitBreaker: { threshold: 0.3, duration: 60_000, minimumRps: 2 },
  }),
  betterAuth: createResiliencePolicy('better-auth', {
    timeout: 3_000,
    retry: { maxAttempts: 2, initialDelay: 200, maxDelay: 2_000 },
  }),
  keygen: createResiliencePolicy('keygen', {
    timeout: 5_000,
    retry: { maxAttempts: 3, initialDelay: 300, maxDelay: 3_000 },
  }),
  payloadCms: createResiliencePolicy('payload-cms', {
    timeout: 5_000,
    retry: { maxAttempts: 2, initialDelay: 300, maxDelay: 3_000 },
  }),
  svix: createResiliencePolicy('svix', {
    timeout: 10_000,
    retry: { maxAttempts: 3, initialDelay: 500, maxDelay: 5_000 },
  }),
} as const;

export { TaskCancelledError, BulkheadRejectedError, BrokenCircuitError };
