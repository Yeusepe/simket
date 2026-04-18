/**
 * Correlation middleware and structured logging.
 *
 * Correlation IDs are application-level request identifiers (passed via
 * x-correlation-id header) that complement OTel trace IDs. Both are
 * included in log entries for full observability.
 *
 * Uses OTel API to extract trace/span IDs — does NOT reimplement tracing.
 *
 * Governing docs:
 *   - docs/architecture.md §10 (Observability)
 * External references:
 *   - https://opentelemetry.io/docs/languages/js/ (OTel JS SDK)
 */
import { trace, context } from '@opentelemetry/api';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export const CORRELATION_HEADER = 'x-correlation-id';

const correlationStore = new AsyncLocalStorage<string>();

/** Returns the current correlation ID from async context, if any. */
export function getCorrelationId(): string | undefined {
  return correlationStore.getStore();
}

/** Returns the current OTel trace ID from active span context, if any. */
export function getTraceId(): string | undefined {
  const span = trace.getSpan(context.active());
  if (!span) return undefined;
  const traceId = span.spanContext().traceId;
  // OTel uses "0000000000000000" as invalid trace ID
  return traceId && traceId !== '00000000000000000000000000000000'
    ? traceId
    : undefined;
}

export interface CorrelationRequest {
  headers: Record<string, string | string[] | undefined>;
}

export interface CorrelationResponse {
  setHeader(name: string, value: string): void;
}

export type NextFunction = () => void;

/**
 * Express-compatible middleware that extracts or generates a correlation ID.
 * Sets it as a span attribute and response header.
 */
export function correlationMiddleware(
  req: CorrelationRequest,
  res: CorrelationResponse,
  next: NextFunction,
): void {
  const existing = req.headers[CORRELATION_HEADER];
  const correlationId =
    typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();

  res.setHeader(CORRELATION_HEADER, correlationId);

  const span = trace.getSpan(context.active());
  if (span) {
    span.setAttribute('correlation.id', correlationId);
  }

  // Attach correlationId to request for downstream access
  (req as unknown as Record<string, unknown>)['correlationId'] = correlationId;

  correlationStore.run(correlationId, next);
}

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export interface LogEntry {
  level: string;
  message: string;
  service: string;
  correlationId: string | undefined;
  traceId: string | undefined;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Creates a structured logger that includes correlation ID, OTel trace ID,
 * timestamps, and service name in JSON format.
 */
export function createLogger(name: string): Logger {
  function buildEntry(level: string, message: string, data?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      service: name,
      correlationId: getCorrelationId(),
      traceId: getTraceId(),
      timestamp: new Date().toISOString(),
      ...data,
    };
  }

  return {
    info(message: string, data?: Record<string, unknown>): void {
      const entry = buildEntry('info', message, data);
      process.stdout.write(JSON.stringify(entry) + '\n');
    },
    warn(message: string, data?: Record<string, unknown>): void {
      const entry = buildEntry('warn', message, data);
      process.stdout.write(JSON.stringify(entry) + '\n');
    },
    error(message: string, data?: Record<string, unknown>): void {
      const entry = buildEntry('error', message, data);
      process.stderr.write(JSON.stringify(entry) + '\n');
    },
  };
}
