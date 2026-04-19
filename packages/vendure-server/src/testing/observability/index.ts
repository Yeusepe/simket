/**
 * Purpose: Re-export pure observability test helpers for local testing modules.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://opentelemetry.io/docs/specs/otel/common/attribute-naming/
 *   - https://www.w3.org/TR/trace-context/#traceparent-header
 * Tests:
 *   - packages/vendure-server/src/testing/observability/trace-validators.test.ts
 */
export type {
  AlertRule,
  AttributeValidationResult,
  SpanKindName,
  TraceCoverageResult,
  ValidationResult,
} from './trace-validators.js';
export {
  checkTraceCoverage,
  classifySpanKind,
  validateAlertRule,
  validateMetricName,
  validateServiceName,
  validateSpanAttributes,
  validateSpanName,
  validateTraceContext,
} from './trace-validators.js';
