/**
 * Purpose: Unit tests for editorial webhook and refresh route handlers.
 * Governing docs:
 *   - docs/architecture.md (§2 Fail-closed on security, §11 Idempotent by default)
 *   - docs/service-architecture.md (§1.5 PayloadCMS API)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://payloadcms.com/docs/rest-api/overview
 * Tests:
 *   - packages/vendure-server/src/features/editorial/editorial-webhook.router.test.ts
 */
import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  createEditorialRouteHandlers,
  verifyEditorialWebhookSignature,
} from './editorial-webhook.router.js';

function sign(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

function createRequest(options: {
  headers?: Record<string, string>;
  body?: unknown;
  rawBody?: string;
  query?: Record<string, string>;
} = {}) {
  const headers = Object.fromEntries(
    Object.entries(options.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
  );

  return {
    body: options.body,
    rawBody: options.rawBody,
    query: options.query ?? {},
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  };
}

function createResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    finished: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.finished = true;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    write: vi.fn(),
    end: vi.fn(function end(this: typeof response) {
      this.finished = true;
      return this;
    }),
  };

  return response;
}

describe('verifyEditorialWebhookSignature', () => {
  it('accepts sha256 signatures', () => {
    const payload = '{"eventId":"evt-1"}';
    const secret = 'payload_secret';

    expect(
      verifyEditorialWebhookSignature({
        secret,
        signature: sign(payload, secret),
        rawBody: payload,
      }),
    ).toBe(true);
    expect(
      verifyEditorialWebhookSignature({
        secret,
        signature: `sha256=${sign(payload, secret)}`,
        rawBody: payload,
      }),
    ).toBe(true);
  });

  it('rejects invalid signatures', () => {
    expect(
      verifyEditorialWebhookSignature({
        secret: 'payload_secret',
        signature: 'bad-signature',
        rawBody: '{"eventId":"evt-1"}',
      }),
    ).toBe(false);
  });
});

describe('createEditorialRouteHandlers', () => {
  it('processes a valid webhook and returns the sync result', async () => {
    const rawBody = JSON.stringify({
      eventId: 'evt-1',
      collection: 'articles',
      operation: 'update',
      occurredAt: '2026-01-02T00:00:00.000Z',
      doc: { id: 'article-1', slug: 'launch-day', status: 'published' },
    });
    const syncService = {
      processWebhook: vi.fn().mockResolvedValue({ version: 2, collection: 'articles' }),
      getUpdateSince: vi.fn().mockReturnValue({ hasUpdate: false, version: 2 }),
      subscribe: vi.fn().mockReturnValue(() => undefined),
    };
    const cacheService = {
      getCuratedCollections: vi.fn().mockResolvedValue([]),
      getArticle: vi.fn(),
      getFeaturedProducts: vi.fn(),
    };
    const handlers = createEditorialRouteHandlers({
      cacheService: cacheService as never,
      syncService: syncService as never,
      webhookSecret: 'payload_secret',
    });
    const request = createRequest({
      body: JSON.parse(rawBody),
      rawBody,
      headers: {
        'x-payload-signature-256': sign(rawBody, 'payload_secret'),
      },
    });
    const response = createResponse();

    await handlers.handleWebhook(request as never, response as never);

    expect(syncService.processWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'articles',
        operation: 'update',
      }),
    );
    expect(response.statusCode).toBe(202);
    expect(response.body).toEqual({ accepted: true, update: { version: 2, collection: 'articles' } });
  });

  it('fails closed when the webhook signature is invalid', async () => {
    const syncService = {
      processWebhook: vi.fn(),
      getUpdateSince: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => undefined),
    };
    const handlers = createEditorialRouteHandlers({
      cacheService: {
        getCuratedCollections: vi.fn(),
        getArticle: vi.fn(),
        getFeaturedProducts: vi.fn(),
      } as never,
      syncService: syncService as never,
      webhookSecret: 'payload_secret',
    });
    const request = createRequest({
      body: { eventId: 'evt-1' },
      rawBody: '{"eventId":"evt-1"}',
      headers: {
        'x-payload-signature-256': 'bad-signature',
      },
    });
    const response = createResponse();

    await handlers.handleWebhook(request as never, response as never);

    expect(syncService.processWebhook).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid editorial webhook signature.' });
  });

  it('returns cached curated collections for the storefront refresh endpoint', async () => {
    const cacheService = {
      getCuratedCollections: vi.fn().mockResolvedValue([{ id: 'section-1', name: 'Hero' }]),
      getArticle: vi.fn(),
      getFeaturedProducts: vi.fn(),
    };
    const handlers = createEditorialRouteHandlers({
      cacheService: cacheService as never,
      syncService: {
        processWebhook: vi.fn(),
        getUpdateSince: vi.fn().mockReturnValue({ hasUpdate: false, version: 0 }),
        subscribe: vi.fn().mockReturnValue(() => undefined),
      } as never,
      webhookSecret: 'payload_secret',
    });
    const response = createResponse();

    await handlers.handleCollections(createRequest() as never, response as never);

    expect(cacheService.getCuratedCollections).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual({
      collections: [{ id: 'section-1', name: 'Hero' }],
    });
  });

  it('streams editorial updates over SSE', async () => {
    const listeners: Array<(update: unknown) => void> = [];
    const handlers = createEditorialRouteHandlers({
      cacheService: {
        getCuratedCollections: vi.fn(),
        getArticle: vi.fn(),
        getFeaturedProducts: vi.fn(),
      } as never,
      syncService: {
        processWebhook: vi.fn(),
        getUpdateSince: vi.fn().mockReturnValue({ hasUpdate: false, version: 0 }),
        subscribe: vi.fn().mockImplementation((listener: (update: unknown) => void) => {
          listeners.push(listener);
          return () => undefined;
        }),
      } as never,
      webhookSecret: 'payload_secret',
    });
    const request = {
      on: vi.fn(),
      query: {},
    };
    const response = createResponse();

    await handlers.handleUpdateStream(request as never, response as never);
    listeners[0]?.({ version: 3, collection: 'articles' });

    expect(response.headers['content-type']).toBe('text/event-stream');
    expect(response.write).toHaveBeenCalledWith('event: ready\ndata: {"connected":true}\n\n');
    expect(response.write).toHaveBeenCalledWith(
      'event: editorial-update\ndata: {"version":3,"collection":"articles"}\n\n',
    );
  });
});
