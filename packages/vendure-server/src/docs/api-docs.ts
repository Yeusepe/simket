/**
 * Purpose: OpenAPI 3.1 spec generation and Scalar API docs mounting.
 *
 * Builds the OpenAPI spec manually from the known Simket endpoints
 * (health probes, product CRUD, search, cart, checkout) and mounts
 * the Scalar interactive API reference on an Express app.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://github.com/scalar/scalar
 *   - https://spec.openapis.org/oas/v3.1.0
 *   - https://github.com/scalar/scalar/tree/main/packages/express-api-reference
 * Tests:
 *   - packages/vendure-server/src/docs/api-docs.test.ts
 */
import { apiReference } from '@scalar/express-api-reference';
import type { Express } from 'express';

// ── OpenAPI types ─────────────────────────────────────────────────────────────

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: { name?: string; url?: string; email?: string };
    license?: { name: string; url?: string };
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
  tags?: Array<{ name: string; description?: string }>;
}

// ── Schema definitions ────────────────────────────────────────────────────────

const healthResponseSchema = {
  type: 'object',
  required: ['status', 'checks'],
  properties: {
    status: { type: 'string', enum: ['ok', 'error'] },
    checks: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['up', 'down'] },
          detail: {},
        },
      },
    },
  },
} as const;

const productSchema = {
  type: 'object',
  required: ['id', 'name', 'slug', 'price'],
  properties: {
    id: { type: 'string', description: 'Unique product identifier' },
    name: { type: 'string', description: 'Product display name' },
    slug: { type: 'string', description: 'URL-friendly product slug' },
    description: { type: 'string', description: 'Product description' },
    price: { type: 'number', description: 'Price in cents' },
    currencyCode: { type: 'string', description: 'ISO 4217 currency code' },
    assets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          mimeType: { type: 'string' },
        },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const cartSchema = {
  type: 'object',
  required: ['id', 'items', 'total'],
  properties: {
    id: { type: 'string', description: 'Cart/order identifier' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['productId', 'quantity', 'unitPrice'],
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'integer', minimum: 1 },
          unitPrice: { type: 'number' },
        },
      },
    },
    total: { type: 'number', description: 'Total price in cents' },
    currencyCode: { type: 'string' },
  },
} as const;

const errorSchema = {
  type: 'object',
  required: ['type', 'title', 'status'],
  properties: {
    type: { type: 'string', format: 'uri' },
    title: { type: 'string' },
    status: { type: 'integer' },
    detail: { type: 'string' },
    instance: { type: 'string' },
  },
} as const;

const searchResultSchema = {
  type: 'object',
  required: ['items', 'totalItems'],
  properties: {
    items: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
    totalItems: { type: 'integer' },
    facets: { type: 'array', items: { type: 'object' } },
  },
} as const;

// ── Spec builder ──────────────────────────────────────────────────────────────

/**
 * Builds the OpenAPI 3.1 specification for the Simket marketplace API.
 */
export function buildOpenApiSpec(): OpenApiSpec {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Simket Marketplace API',
      version: '0.1.0',
      description:
        'REST API for the Simket digital goods marketplace. ' +
        'Covers health probes, product catalog, search, cart, and checkout.',
      contact: { name: 'Simket Team' },
      license: { name: 'UNLICENSED' },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local development' },
      { url: 'https://api.simket.io', description: 'Production' },
    ],
    tags: [
      { name: 'Health', description: 'Kubernetes health probes' },
      { name: 'Products', description: 'Product catalog operations' },
      { name: 'Search', description: 'Full-text product search' },
      { name: 'Cart', description: 'Shopping cart management' },
      { name: 'Checkout', description: 'Order checkout flow' },
    ],
    paths: {
      '/health/live': {
        get: {
          summary: 'Liveness probe',
          description: 'Returns 200 if the process is alive and the event loop is responsive.',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'Service is alive',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
            '503': {
              description: 'Service is unhealthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
          },
        },
      },
      '/health/ready': {
        get: {
          summary: 'Readiness probe',
          description: 'Returns 200 if the service is ready to accept traffic (DB + Redis connected).',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'Service is ready',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
            '503': {
              description: 'Service is not ready',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
          },
        },
      },
      '/health/startup': {
        get: {
          summary: 'Startup probe',
          description: 'Returns 200 if the service has completed initialization (config loaded, migrations ready).',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'Service has started',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
            '503': {
              description: 'Service is still starting',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
          },
        },
      },
      '/shop-api/products': {
        get: {
          summary: 'List products',
          description: 'Returns a paginated list of published products.',
          tags: ['Products'],
          parameters: [
            { name: 'take', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'skip', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': {
              description: 'Product list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      items: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                      totalItems: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/shop-api/products/{id}': {
        get: {
          summary: 'Get product by ID',
          description: 'Returns a single product by its identifier.',
          tags: ['Products'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Product detail',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Product' },
                },
              },
            },
            '404': {
              description: 'Product not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/shop-api/search': {
        get: {
          summary: 'Search products',
          description: 'Full-text search across the product catalog via Typesense.',
          tags: ['Search'],
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'take', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'skip', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SearchResult' },
                },
              },
            },
          },
        },
      },
      '/shop-api/cart': {
        get: {
          summary: 'Get active cart',
          description: 'Returns the active cart/order for the current session.',
          tags: ['Cart'],
          responses: {
            '200': {
              description: 'Active cart',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Cart' },
                },
              },
            },
          },
        },
      },
      '/shop-api/cart/items': {
        post: {
          summary: 'Add item to cart',
          description: 'Adds a product to the active cart.',
          tags: ['Cart'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['productId', 'quantity'],
                  properties: {
                    productId: { type: 'string' },
                    quantity: { type: 'integer', minimum: 1 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Updated cart',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Cart' },
                },
              },
            },
            '400': {
              description: 'Invalid request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/shop-api/checkout': {
        post: {
          summary: 'Create checkout session',
          description: 'Initiates a checkout session for the active cart via Stripe.',
          tags: ['Checkout'],
          responses: {
            '201': {
              description: 'Checkout session created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['sessionId', 'url'],
                    properties: {
                      sessionId: { type: 'string' },
                      url: { type: 'string', format: 'uri' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Cart is empty or invalid',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        HealthResponse: healthResponseSchema,
        Product: productSchema,
        Cart: cartSchema,
        Error: errorSchema,
        SearchResult: searchResultSchema,
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };
}

// ── Mount helper ──────────────────────────────────────────────────────────────

/**
 * Mounts the Scalar interactive API reference on an Express app.
 *
 * @param app - Express application instance
 * @param opts.path - Mount path (default: `/docs`)
 *
 * Docs: https://github.com/scalar/scalar/tree/main/packages/express-api-reference
 */
export function mountApiDocs(
  app: Express,
  opts?: { path?: string },
): void {
  const mountPath = opts?.path ?? '/docs';
  const spec = buildOpenApiSpec();

  // Scalar accepts content as a generic record (SourceConfiguration.content)
  // Docs: https://github.com/scalar/scalar/tree/main/packages/express-api-reference
  app.use(
    mountPath,
    apiReference({
      content: spec as unknown as Record<string, unknown>,
    }),
  );
}
