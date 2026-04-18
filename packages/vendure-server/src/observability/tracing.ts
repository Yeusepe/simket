import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import type { SpanExporter } from '@opentelemetry/sdk-trace-node';
import type { PushMetricExporter } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import {
  trace,
  metrics,
  type Tracer,
  type Meter,
} from '@opentelemetry/api';

export interface TracingOptions {
  otlpEndpoint?: string;
  /** Override the trace exporter (useful for testing). */
  traceExporter?: SpanExporter;
  /** Override the metric exporter (useful for testing). */
  metricExporter?: PushMetricExporter;
}

const DEFAULT_OTLP_ENDPOINT = 'http://localhost:4318';

let sdk: NodeSDK | undefined;

export function initTracing(
  serviceName: string,
  opts?: TracingOptions,
): NodeSDK {
  const endpoint = opts?.otlpEndpoint ?? DEFAULT_OTLP_ENDPOINT;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: process.env['npm_package_version'] ?? '0.0.0',
    'deployment.environment': process.env['NODE_ENV'] ?? 'development',
  });

  const traceExporter: SpanExporter = opts?.traceExporter ??
    new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });

  const metricExporter: PushMetricExporter = opts?.metricExporter ??
    new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15_000,
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
    ],
  });

  sdk.start();
  return sdk;
}

export function getTracer(name = 'simket'): Tracer {
  return trace.getTracer(name);
}

export function getMeter(name = 'simket'): Meter {
  return metrics.getMeter(name);
}

export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = undefined;
  }
}
