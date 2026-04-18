import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordHttpDuration,
  recordCacheHit,
  recordCacheMiss,
  recordCircuitBreakerState,
  recordEventLoopLag,
  recordQueueDepth,
  resetMetrics,
} from './metrics.js';

describe('Metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('should record HTTP duration without throwing', () => {
    expect(() => recordHttpDuration('GET', '/api/products', 200, 0.123)).not.toThrow();
  });

  it('should record multiple HTTP durations', () => {
    expect(() => {
      recordHttpDuration('GET', '/api/products', 200, 0.1);
      recordHttpDuration('POST', '/api/orders', 201, 0.25);
      recordHttpDuration('GET', '/api/products', 500, 0.5);
    }).not.toThrow();
  });

  it('should record cache hits', () => {
    expect(() => {
      recordCacheHit('Product');
      recordCacheHit('Product');
      recordCacheHit('Order');
    }).not.toThrow();
  });

  it('should record cache misses', () => {
    expect(() => {
      recordCacheMiss('Product');
      recordCacheMiss('Category');
    }).not.toThrow();
  });

  it('should record circuit breaker state changes', () => {
    expect(() => {
      recordCircuitBreakerState('typesense', 'closed');
      recordCircuitBreakerState('typesense', 'open');
      recordCircuitBreakerState('stripe', 'half-open');
    }).not.toThrow();
  });

  it('should record event loop lag', () => {
    expect(() => {
      recordEventLoopLag('main', 5.2);
      recordEventLoopLag('main', 3.1);
    }).not.toThrow();
  });

  it('should record queue depth', () => {
    expect(() => {
      recordQueueDepth('email', 42);
      recordQueueDepth('email', 40);
      recordQueueDepth('indexing', 100);
    }).not.toThrow();
  });

  it('should reset all metrics cleanly', () => {
    recordCacheHit('Product');
    recordHttpDuration('GET', '/', 200, 0.01);
    recordCircuitBreakerState('svc', 'closed');
    resetMetrics();

    // After reset, recording again should re-create instruments
    expect(() => {
      recordCacheHit('Product');
      recordHttpDuration('GET', '/', 200, 0.01);
    }).not.toThrow();
  });
});
