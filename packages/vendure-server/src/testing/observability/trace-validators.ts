/**
 * Purpose: Pure OpenTelemetry-oriented validation helpers for trace, metric, and alert assertions.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://opentelemetry.io/docs/specs/otel/common/attribute-naming/
 *   - https://opentelemetry.io/docs/specs/semconv/resource/#service
 *   - https://opentelemetry.io/docs/specs/otel/trace/api/#spankind
 *   - https://www.w3.org/TR/trace-context/#traceparent-header
 * Tests:
 *   - packages/vendure-server/src/testing/observability/trace-validators.test.ts
 */
export type SpanKindName =
  | 'SERVER'
  | 'CLIENT'
  | 'INTERNAL'
  | 'PRODUCER'
  | 'CONSUMER';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AttributeValidationResult extends ValidationResult {
  missingKeys: string[];
}

export interface AlertRule {
  condition: '>' | '>=' | '<' | '<=' | '==' | '!=';
  threshold: number;
  window: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface TraceCoverageResult {
  missing: string[];
  extra: string[];
}

const LOWERCASE_DOTTED_NAME = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const TRACEPARENT_FORMAT = /^[0-9a-f]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;
const ZERO_TRACE_ID = '00000000000000000000000000000000';
const ZERO_PARENT_ID = '0000000000000000';
const ALERT_CONDITIONS = new Set<AlertRule['condition']>([
  '>',
  '>=',
  '<',
  '<=',
  '==',
  '!=',
]);
const ALERT_SEVERITIES = new Set<AlertRule['severity']>([
  'info',
  'warning',
  'critical',
]);
const ALERT_WINDOW = /^[1-9]\d*[smhd]$/;

export function validateSpanName(name: string): ValidationResult {
  return buildValidationResult(
    LOWERCASE_DOTTED_NAME.test(name),
    'Span name must follow service.operation format using lowercase dot-separated segments.',
  );
}

export function validateSpanAttributes(
  attrs: Record<string, unknown>,
  requiredKeys: readonly string[],
): AttributeValidationResult {
  const missingKeys = requiredKeys.filter((key) => !hasPresentValue(attrs[key]));

  return {
    valid: missingKeys.length === 0,
    errors:
      missingKeys.length === 0
        ? []
        : [`Missing required span attributes: ${missingKeys.join(', ')}.`],
    missingKeys,
  };
}

export function validateTraceContext(
  headers: Record<string, string | string[] | undefined>,
): ValidationResult {
  const traceparent = getTraceparentHeader(headers);

  if (!traceparent) {
    return { valid: false, errors: ['Missing traceparent header.'] };
  }

  const normalized = traceparent.trim().toLowerCase();
  const [version, traceId, parentId] = normalized.split('-');

  if (version === 'ff') {
    return { valid: false, errors: ['traceparent version ff is invalid.'] };
  }

  if (!TRACEPARENT_FORMAT.test(normalized)) {
    return {
      valid: false,
      errors: ['traceparent must match the W3C version-traceid-parentid-flags format.'],
    };
  }

  if (traceId === ZERO_TRACE_ID) {
    return {
      valid: false,
      errors: ['traceparent trace-id must not be all zeros.'],
    };
  }

  if (parentId === ZERO_PARENT_ID) {
    return {
      valid: false,
      errors: ['traceparent parent-id must not be all zeros.'],
    };
  }

  return { valid: true, errors: [] };
}

export function validateMetricName(name: string): ValidationResult {
  return buildValidationResult(
    LOWERCASE_DOTTED_NAME.test(name),
    'Metric name must use lowercase dot-separated segments.',
  );
}

export function validateAlertRule(
  rule: Partial<AlertRule> | null | undefined,
): ValidationResult {
  const errors: string[] = [];

  if (!ALERT_CONDITIONS.has(rule?.condition as AlertRule['condition'])) {
    errors.push('Alert rule condition must be one of >, >=, <, <=, ==, or !=.');
  }

  if (!Number.isFinite(rule?.threshold)) {
    errors.push('Alert rule threshold must be a finite number.');
  }

  if (typeof rule?.window !== 'string' || !ALERT_WINDOW.test(rule.window)) {
    errors.push('Alert rule window must use a positive duration like 5m, 1h, or 1d.');
  }

  if (!ALERT_SEVERITIES.has(rule?.severity as AlertRule['severity'])) {
    errors.push('Alert rule severity must be one of info, warning, or critical.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function classifySpanKind(operation: string): SpanKindName {
  const normalizedOperation = extractOperation(operation);

  if (matchesKeyword(normalizedOperation, ['publish', 'enqueue', 'dispatch', 'emit', 'produce'])) {
    return 'PRODUCER';
  }

  if (matchesKeyword(normalizedOperation, ['consume', 'dequeue', 'subscribe', 'poll'])) {
    return 'CONSUMER';
  }

  if (matchesKeyword(normalizedOperation, ['handle', 'route', 'serve', 'listen', 'accept'])) {
    return 'SERVER';
  }

  if (matchesKeyword(normalizedOperation, ['request', 'fetch', 'query', 'call', 'invoke'])) {
    return 'CLIENT';
  }

  return 'INTERNAL';
}

export function validateServiceName(name: string): ValidationResult {
  const normalized = name.trim().toLowerCase();
  const isValid =
    LOWERCASE_DOTTED_NAME.test(name) &&
    !normalized.startsWith('unknown_service');

  return buildValidationResult(
    isValid,
    'Service name must use lowercase dot-separated segments and must not use unknown_service.',
  );
}

export function checkTraceCoverage(
  spans: readonly string[],
  expectedOps: readonly string[],
): TraceCoverageResult {
  const actualOperations = unique(spans.map(extractOperation));
  const expectedOperations = unique(
    expectedOps.map((operation) => operation.trim().toLowerCase()).filter(Boolean),
  );
  const expectedSet = new Set(expectedOperations);
  const actualSet = new Set(actualOperations);

  return {
    missing: expectedOperations.filter((operation) => !actualSet.has(operation)),
    extra: actualOperations.filter((operation) => !expectedSet.has(operation)),
  };
}

function buildValidationResult(valid: boolean, error: string): ValidationResult {
  return {
    valid,
    errors: valid ? [] : [error],
  };
}

function getTraceparentHeader(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== 'traceparent') {
      continue;
    }

    return typeof value === 'string' ? value : undefined;
  }

  return undefined;
}

function hasPresentValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function extractOperation(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.includes('.')) {
    return trimmed;
  }

  return trimmed.slice(trimmed.lastIndexOf('.') + 1);
}

function matchesKeyword(operation: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => operation === keyword || operation.endsWith(`_${keyword}`));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
