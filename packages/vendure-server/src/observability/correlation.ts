import { trace, context } from '@opentelemetry/api';
import { randomUUID } from 'node:crypto';

export const CORRELATION_HEADER = 'x-correlation-id';

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
    typeof existing === 'string' && existing.length > 0
      ? existing
      : randomUUID();

  res.setHeader(CORRELATION_HEADER, correlationId);

  const span = trace.getSpan(context.active());
  if (span) {
    span.setAttribute('correlation.id', correlationId);
  }

  // Attach correlationId to request for downstream access
  (req as Record<string, unknown>)['correlationId'] = correlationId;

  next();
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
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Creates a structured logger that includes correlation ID, timestamps,
 * and service name in JSON format.
 */
export function createLogger(name: string): Logger {
  function buildEntry(
    level: string,
    message: string,
    data?: Record<string, unknown>,
  ): LogEntry {
    const span = trace.getSpan(context.active());
    const correlationId = span
      ? (span.attributes?.['correlation.id'] as string | undefined)
      : undefined;

    return {
      level,
      message,
      service: name,
      correlationId,
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
