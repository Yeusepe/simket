/**
 * Tests: Scalar API documentation spec generation.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://github.com/scalar/scalar
 *   - https://spec.openapis.org/oas/v3.1.0
 */
import { describe, it, expect } from 'vitest';
import { buildOpenApiSpec } from './api-docs.js';
import type { OpenApiSpec } from './api-docs.js';

describe('buildOpenApiSpec', () => {
  let spec: OpenApiSpec;

  beforeAll(() => {
    spec = buildOpenApiSpec();
  });

  it('should produce a valid OpenAPI 3.1 structure', () => {
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBe('Simket Marketplace API');
    expect(spec.info.version).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  it('should include server information', () => {
    expect(spec.servers).toBeDefined();
    expect(spec.servers!.length).toBeGreaterThan(0);
    expect(spec.servers![0]!.url).toBeDefined();
  });

  it('should include health probe endpoints', () => {
    expect(spec.paths['/health/live']).toBeDefined();
    expect(spec.paths['/health/ready']).toBeDefined();
    expect(spec.paths['/health/startup']).toBeDefined();
  });

  it('should include product CRUD endpoints', () => {
    expect(spec.paths['/shop-api/products']).toBeDefined();
    expect(spec.paths['/shop-api/products/{id}']).toBeDefined();
  });

  it('should include search endpoint', () => {
    expect(spec.paths['/shop-api/search']).toBeDefined();
  });

  it('should include cart endpoints', () => {
    expect(spec.paths['/shop-api/cart']).toBeDefined();
    expect(spec.paths['/shop-api/cart/items']).toBeDefined();
  });

  it('should include checkout endpoint', () => {
    expect(spec.paths['/shop-api/checkout']).toBeDefined();
  });

  it('should have the expected number of endpoint paths', () => {
    const pathCount = Object.keys(spec.paths).length;
    expect(pathCount).toBe(9);
  });

  it('should have required fields on each endpoint', () => {
    for (const [path, methods] of Object.entries(spec.paths)) {
      expect(methods).toBeDefined();
      for (const [method, operation] of Object.entries(methods as Record<string, unknown>)) {
        const op = operation as {
          summary?: string;
          responses?: Record<string, unknown>;
        };
        expect(op.summary).toBeDefined();
        expect(op.responses).toBeDefined();
        expect(op.responses!['200'] ?? op.responses!['201']).toBeDefined();
      }
    }
  });

  it('should include component schemas', () => {
    expect(spec.components).toBeDefined();
    expect(spec.components!.schemas).toBeDefined();
    expect(spec.components!.schemas!['Product']).toBeDefined();
    expect(spec.components!.schemas!['Cart']).toBeDefined();
    expect(spec.components!.schemas!['HealthResponse']).toBeDefined();
  });
});
