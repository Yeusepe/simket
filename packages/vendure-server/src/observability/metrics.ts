import { metrics, type Meter, type Counter, type Histogram } from '@opentelemetry/api';
import type { ObservableGauge } from '@opentelemetry/api';

let meter: Meter | undefined;
let httpDurationHistogram: Histogram | undefined;
let cacheHitCounter: Counter | undefined;
let cacheMissCounter: Counter | undefined;
let circuitBreakerGauge: ObservableGauge | undefined;
let eventLoopLagGauge: ObservableGauge | undefined;
let queueDepthGauge: ObservableGauge | undefined;

const circuitBreakerStates = new Map<string, number>();
const eventLoopLagValues = new Map<string, number>();
const queueDepthValues = new Map<string, number>();

function ensureMeter(): Meter {
  if (!meter) {
    meter = metrics.getMeter('simket-metrics');
  }
  return meter;
}

function ensureHttpDuration(): Histogram {
  if (!httpDurationHistogram) {
    httpDurationHistogram = ensureMeter().createHistogram(
      'http_request_duration_seconds',
      {
        description: 'Duration of HTTP requests in seconds',
        unit: 's',
      },
    );
  }
  return httpDurationHistogram;
}

function ensureCacheHit(): Counter {
  if (!cacheHitCounter) {
    cacheHitCounter = ensureMeter().createCounter('cache_hit_total', {
      description: 'Total number of cache hits',
    });
  }
  return cacheHitCounter;
}

function ensureCacheMiss(): Counter {
  if (!cacheMissCounter) {
    cacheMissCounter = ensureMeter().createCounter('cache_miss_total', {
      description: 'Total number of cache misses',
    });
  }
  return cacheMissCounter;
}

function ensureCircuitBreakerGauge(): ObservableGauge {
  if (!circuitBreakerGauge) {
    circuitBreakerGauge = ensureMeter().createObservableGauge(
      'circuit_breaker_state',
      { description: 'Circuit breaker state (0=closed, 1=half-open, 2=open)' },
    );
    circuitBreakerGauge.addCallback((result) => {
      for (const [service, state] of circuitBreakerStates) {
        result.observe(state, { service });
      }
    });
  }
  return circuitBreakerGauge;
}

function ensureEventLoopLagGauge(): ObservableGauge {
  if (!eventLoopLagGauge) {
    eventLoopLagGauge = ensureMeter().createObservableGauge(
      'event_loop_lag_ms',
      { description: 'Event loop lag in milliseconds' },
    );
    eventLoopLagGauge.addCallback((result) => {
      for (const [label, value] of eventLoopLagValues) {
        result.observe(value, { source: label });
      }
    });
  }
  return eventLoopLagGauge;
}

function ensureQueueDepthGauge(): ObservableGauge {
  if (!queueDepthGauge) {
    queueDepthGauge = ensureMeter().createObservableGauge('queue_depth', {
      description: 'Current queue depth',
    });
    queueDepthGauge.addCallback((result) => {
      for (const [queue, depth] of queueDepthValues) {
        result.observe(depth, { queue });
      }
    });
  }
  return queueDepthGauge;
}

export function recordHttpDuration(
  method: string,
  path: string,
  status: number,
  duration: number,
): void {
  ensureHttpDuration().record(duration, {
    method,
    path,
    status: String(status),
  });
}

export function recordCacheHit(entity: string): void {
  ensureCacheHit().add(1, { entity });
}

export function recordCacheMiss(entity: string): void {
  ensureCacheMiss().add(1, { entity });
}

const CIRCUIT_BREAKER_STATE_MAP: Record<string, number> = {
  closed: 0,
  'half-open': 1,
  open: 2,
};

export function recordCircuitBreakerState(
  service: string,
  state: string,
): void {
  ensureCircuitBreakerGauge();
  circuitBreakerStates.set(service, CIRCUIT_BREAKER_STATE_MAP[state] ?? -1);
}

export function recordEventLoopLag(source: string, lagMs: number): void {
  ensureEventLoopLagGauge();
  eventLoopLagValues.set(source, lagMs);
}

export function recordQueueDepth(queue: string, depth: number): void {
  ensureQueueDepthGauge();
  queueDepthValues.set(queue, depth);
}

export function resetMetrics(): void {
  meter = undefined;
  httpDurationHistogram = undefined;
  cacheHitCounter = undefined;
  cacheMissCounter = undefined;
  circuitBreakerGauge = undefined;
  eventLoopLagGauge = undefined;
  queueDepthGauge = undefined;
  circuitBreakerStates.clear();
  eventLoopLagValues.clear();
  queueDepthValues.clear();
}
