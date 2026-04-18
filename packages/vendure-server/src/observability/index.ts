export {
  initTracing,
  getTracer,
  getMeter,
  shutdownTracing,
} from './tracing.js';
export type { TracingOptions } from './tracing.js';

export {
  recordHttpDuration,
  recordCacheHit,
  recordCacheMiss,
  recordCircuitBreakerState,
  recordEventLoopLag,
  recordQueueDepth,
  resetMetrics,
} from './metrics.js';

export {
  correlationMiddleware,
  createLogger,
  CORRELATION_HEADER,
} from './correlation.js';
export type {
  Logger,
  LogEntry,
  CorrelationRequest,
  CorrelationResponse,
  NextFunction,
} from './correlation.js';
