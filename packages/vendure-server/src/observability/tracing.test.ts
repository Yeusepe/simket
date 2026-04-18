import { describe, it, expect, afterEach } from 'vitest';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-node';
import {
  InMemoryMetricExporter,
  AggregationTemporality,
} from '@opentelemetry/sdk-metrics';
import {
  initTracing,
  getTracer,
  getMeter,
  shutdownTracing,
} from './tracing.js';

function inMemoryOpts() {
  return {
    traceExporter: new InMemorySpanExporter(),
    metricExporter: new InMemoryMetricExporter(
      AggregationTemporality.CUMULATIVE,
    ),
  };
}

describe('Tracing', () => {
  afterEach(async () => {
    await shutdownTracing();
  });

  it('should initialize the SDK and return it', () => {
    const sdk = initTracing('test-service', inMemoryOpts());
    expect(sdk).toBeDefined();
  });

  it('should return a tracer via getTracer()', () => {
    initTracing('test-service', inMemoryOpts());
    const tracer = getTracer('test');
    expect(tracer).toBeDefined();
    expect(typeof tracer.startSpan).toBe('function');
  });

  it('should return a meter via getMeter()', () => {
    initTracing('test-service', inMemoryOpts());
    const meter = getMeter('test');
    expect(meter).toBeDefined();
    expect(typeof meter.createCounter).toBe('function');
    expect(typeof meter.createHistogram).toBe('function');
  });

  it('should create and end spans without errors', () => {
    initTracing('test-service', inMemoryOpts());
    const tracer = getTracer('test');
    const span = tracer.startSpan('test-span');
    expect(span).toBeDefined();
    expect(typeof span.end).toBe('function');
    span.end();
  });

  it('should accept a custom OTLP endpoint', () => {
    const sdk = initTracing('test-service', {
      otlpEndpoint: 'http://custom:4318',
      ...inMemoryOpts(),
    });
    expect(sdk).toBeDefined();
  });

  it('should shutdown gracefully', async () => {
    initTracing('test-service', inMemoryOpts());
    await expect(shutdownTracing()).resolves.toBeUndefined();
  });

  it('should handle shutdown when not initialized', async () => {
    await expect(shutdownTracing()).resolves.toBeUndefined();
  });
});
