/**
 * Purpose: Unit tests for pure observability validation helpers used by Vendure-server tests.
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
import { describe, expect, it } from 'vitest';
import type { AlertRule } from './trace-validators.js';
import {
  checkTraceCoverage,
  classifySpanKind,
  validateAlertRule,
  validateMetricName,
  validateServiceName,
  validateSpanAttributes,
  validateSpanName,
  validateTraceContext,
} from './trace-validators.js';

describe('validateSpanName', () => {
  it('accepts span names in service.operation format', () => {
    expect(validateSpanName('catalog.lookup')).toEqual({ valid: true, errors: [] });
  });

  it('accepts snake_case operation segments', () => {
    expect(validateSpanName('checkout.create_order')).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('rejects span names without a service prefix', () => {
    expect(validateSpanName('lookup')).toEqual({
      valid: false,
      errors: ['Span name must follow service.operation format using lowercase dot-separated segments.'],
    });
  });

  it('rejects uppercase span names', () => {
    expect(validateSpanName('Catalog.lookup')).toEqual({
      valid: false,
      errors: ['Span name must follow service.operation format using lowercase dot-separated segments.'],
    });
  });

  it('rejects empty span segments', () => {
    expect(validateSpanName('catalog.')).toEqual({
      valid: false,
      errors: ['Span name must follow service.operation format using lowercase dot-separated segments.'],
    });
  });
});

describe('validateSpanAttributes', () => {
  it('passes when all required attributes are present', () => {
    expect(
      validateSpanAttributes(
        {
          'http.method': 'GET',
          'http.route': '/products',
        },
        ['http.method', 'http.route'],
      ),
    ).toEqual({
      valid: true,
      errors: [],
      missingKeys: [],
    });
  });

  it('returns missing keys for absent attributes', () => {
    expect(
      validateSpanAttributes(
        {
          'http.method': 'GET',
        },
        ['http.method', 'http.route', 'http.status_code'],
      ),
    ).toEqual({
      valid: false,
      errors: [
        'Missing required span attributes: http.route, http.status_code.',
      ],
      missingKeys: ['http.route', 'http.status_code'],
    });
  });

  it('treats undefined and blank values as missing', () => {
    expect(
      validateSpanAttributes(
        {
          'http.method': ' ',
          'http.route': undefined,
        },
        ['http.method', 'http.route'],
      ),
    ).toEqual({
      valid: false,
      errors: ['Missing required span attributes: http.method, http.route.'],
      missingKeys: ['http.method', 'http.route'],
    });
  });

  it('passes when no required keys are provided', () => {
    expect(validateSpanAttributes({ any: 'value' }, [])).toEqual({
      valid: true,
      errors: [],
      missingKeys: [],
    });
  });
});

describe('validateTraceContext', () => {
  it('accepts a valid W3C traceparent header', () => {
    expect(
      validateTraceContext({
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      }),
    ).toEqual({ valid: true, errors: [] });
  });

  it('matches the traceparent header name case-insensitively', () => {
    expect(
      validateTraceContext({
        TraceParent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00',
      }),
    ).toEqual({ valid: true, errors: [] });
  });

  it('rejects missing traceparent headers', () => {
    expect(validateTraceContext({})).toEqual({
      valid: false,
      errors: ['Missing traceparent header.'],
    });
  });

  it('rejects malformed traceparent values', () => {
    expect(
      validateTraceContext({
        traceparent: '00-xyz-00f067aa0ba902b7-01',
      }),
    ).toEqual({
      valid: false,
      errors: ['traceparent must match the W3C version-traceid-parentid-flags format.'],
    });
  });

  it('rejects all-zero trace ids', () => {
    expect(
      validateTraceContext({
        traceparent: '00-00000000000000000000000000000000-00f067aa0ba902b7-01',
      }),
    ).toEqual({
      valid: false,
      errors: ['traceparent trace-id must not be all zeros.'],
    });
  });

  it('rejects all-zero parent ids', () => {
    expect(
      validateTraceContext({
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01',
      }),
    ).toEqual({
      valid: false,
      errors: ['traceparent parent-id must not be all zeros.'],
    });
  });

  it('rejects the reserved ff version', () => {
    expect(
      validateTraceContext({
        traceparent: 'ff-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      }),
    ).toEqual({
      valid: false,
      errors: ['traceparent version ff is invalid.'],
    });
  });
});

describe('validateMetricName', () => {
  it('accepts lowercase dot-separated metric names', () => {
    expect(validateMetricName('http.server.duration')).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('accepts underscores within metric segments', () => {
    expect(validateMetricName('queue.retry_count')).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('rejects uppercase metric names', () => {
    expect(validateMetricName('Http.server.duration')).toEqual({
      valid: false,
      errors: ['Metric name must use lowercase dot-separated segments.'],
    });
  });

  it('rejects metric names with hyphens', () => {
    expect(validateMetricName('http-server.duration')).toEqual({
      valid: false,
      errors: ['Metric name must use lowercase dot-separated segments.'],
    });
  });
});

describe('validateAlertRule', () => {
  it('accepts valid alert rules', () => {
    const rule: AlertRule = {
      condition: '>=',
      threshold: 0.95,
      window: '5m',
      severity: 'critical',
    };

    expect(validateAlertRule(rule)).toEqual({ valid: true, errors: [] });
  });

  it('rejects missing alert properties', () => {
    expect(validateAlertRule({ condition: '>' })).toEqual({
      valid: false,
      errors: [
        'Alert rule threshold must be a finite number.',
        'Alert rule window must use a positive duration like 5m, 1h, or 1d.',
        'Alert rule severity must be one of info, warning, or critical.',
      ],
    });
  });

  it('rejects unsupported conditions', () => {
    expect(
      validateAlertRule({
        condition: 'between',
        threshold: 10,
        window: '5m',
        severity: 'warning',
      }),
    ).toEqual({
      valid: false,
      errors: ['Alert rule condition must be one of >, >=, <, <=, ==, or !=.'],
    });
  });

  it('rejects invalid windows', () => {
    expect(
      validateAlertRule({
        condition: '>',
        threshold: 10,
        window: 'five minutes',
        severity: 'warning',
      }),
    ).toEqual({
      valid: false,
      errors: ['Alert rule window must use a positive duration like 5m, 1h, or 1d.'],
    });
  });

  it('rejects invalid severities', () => {
    expect(
      validateAlertRule({
        condition: '>',
        threshold: 10,
        window: '5m',
        severity: 'urgent',
      }),
    ).toEqual({
      valid: false,
      errors: ['Alert rule severity must be one of info, warning, or critical.'],
    });
  });
});

describe('classifySpanKind', () => {
  it('classifies inbound handlers as SERVER spans', () => {
    expect(classifySpanKind('http.handle')).toBe('SERVER');
  });

  it('classifies outbound requests as CLIENT spans', () => {
    expect(classifySpanKind('payment.request')).toBe('CLIENT');
  });

  it('classifies publish operations as PRODUCER spans', () => {
    expect(classifySpanKind('queue.publish')).toBe('PRODUCER');
  });

  it('classifies consume operations as CONSUMER spans', () => {
    expect(classifySpanKind('queue.consume')).toBe('CONSUMER');
  });

  it('defaults to INTERNAL when no hint matches', () => {
    expect(classifySpanKind('pricing.compute')).toBe('INTERNAL');
  });
});

describe('validateServiceName', () => {
  it('accepts lowercase dot-separated service names', () => {
    expect(validateServiceName('simket.vendure')).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('accepts underscores in service name segments', () => {
    expect(validateServiceName('simket.vendure_server')).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('rejects empty service names', () => {
    expect(validateServiceName('')).toEqual({
      valid: false,
      errors: ['Service name must use lowercase dot-separated segments and must not use unknown_service.'],
    });
  });

  it('rejects uppercase service names', () => {
    expect(validateServiceName('Simket.vendure')).toEqual({
      valid: false,
      errors: ['Service name must use lowercase dot-separated segments and must not use unknown_service.'],
    });
  });

  it('rejects unknown_service placeholders', () => {
    expect(validateServiceName('unknown_service.node')).toEqual({
      valid: false,
      errors: ['Service name must use lowercase dot-separated segments and must not use unknown_service.'],
    });
  });
});

describe('checkTraceCoverage', () => {
  it('reports full coverage when actual and expected operations align', () => {
    expect(
      checkTraceCoverage(['catalog.lookup', 'checkout.create_order'], [
        'lookup',
        'create_order',
      ]),
    ).toEqual({
      missing: [],
      extra: [],
    });
  });

  it('reports missing expected operations', () => {
    expect(checkTraceCoverage(['catalog.lookup'], ['lookup', 'charge'])).toEqual({
      missing: ['charge'],
      extra: [],
    });
  });

  it('reports unexpected extra operations', () => {
    expect(
      checkTraceCoverage(['catalog.lookup', 'payment.charge'], ['lookup']),
    ).toEqual({
      missing: [],
      extra: ['charge'],
    });
  });

  it('deduplicates operations before comparing coverage', () => {
    expect(
      checkTraceCoverage(['catalog.lookup', 'catalog.lookup', 'lookup'], ['lookup']),
    ).toEqual({
      missing: [],
      extra: [],
    });
  });
});
