/**
 * Purpose: Unit tests for the Svix webhook delivery service and its pure helpers.
 * Governing docs:
 *   - docs/architecture.md (§4 System boundary, §5 Service ownership)
 *   - docs/service-architecture.md (§1.7 Svix)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.svix.com/
 *   - https://api.svix.com/
 *   - packages/vendure-server/node_modules/svix/dist/index.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/svix/svix.service.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type {
  ApplicationOut,
  AppPortalAccessOut,
  EndpointOut,
  ListResponseEndpointOut,
  MessageOut,
  Svix,
} from 'svix';
import type { SendEventParams, WebhookConfig } from './svix.types.js';
import {
  SvixService,
  buildAppId,
  validateEventType,
  validateWebhookUrl,
} from './svix.service.js';

type SvixClientMock = Pick<Svix, 'application' | 'message' | 'endpoint' | 'authentication'>;

const VALID_EVENT_TYPES = [
  'product.created',
  'product.updated',
  'product.deleted',
  'order.completed',
  'order.refunded',
  'collaboration.invited',
  'collaboration.accepted',
  'collaboration.revoked',
  'asset.processed',
  'asset.failed',
] as const;

const CONFIG: WebhookConfig = {
  svixApiKey: 'svix_test_key',
  svixAppPortalUrl: 'https://portal.simket.test',
};

function createApplicationOut(id: string): ApplicationOut {
  return {
    id,
    name: `App ${id}`,
    metadata: {},
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    uid: id,
  };
}

function createMessageOut(eventType: string): MessageOut {
  return {
    id: 'msg_123',
    eventType,
    payload: { type: eventType },
    timestamp: new Date('2025-01-01T00:00:00.000Z'),
    eventId: null,
    channels: null,
    tags: null,
    deliverAt: null,
  };
}

function createEndpointOut(url: string): EndpointOut {
  return {
    id: 'ep_123',
    url,
    description: 'Creator endpoint',
    metadata: {},
    version: 1,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    channels: null,
    disabled: false,
    filterTypes: null,
    rateLimit: null,
    throttleRate: null,
    uid: null,
  };
}

function createEndpointsResponse(url: string): ListResponseEndpointOut {
  return {
    data: [createEndpointOut(url)],
    done: true,
    iterator: null,
    prevIterator: null,
  };
}

function createPortalAccessOut(): AppPortalAccessOut {
  return {
    token: 'portal-token',
    url: 'https://portal.svix.test/access-token',
  };
}

function createClientMock(): SvixClientMock {
  return {
    application: {
      getOrCreate: vi.fn().mockResolvedValue(createApplicationOut(buildAppId('creator-1'))),
    },
    message: {
      create: vi.fn().mockResolvedValue(createMessageOut('product.created')),
    },
    endpoint: {
      create: vi.fn().mockResolvedValue(createEndpointOut('https://example.com/webhooks')),
      list: vi.fn().mockResolvedValue(createEndpointsResponse('https://example.com/webhooks')),
    },
    authentication: {
      appPortalAccess: vi.fn().mockResolvedValue(createPortalAccessOut()),
    },
  } as unknown as SvixClientMock;
}

describe('validateEventType', () => {
  it('accepts every supported Simket event type', () => {
    for (const eventType of VALID_EVENT_TYPES) {
      expect(validateEventType(eventType)).toBe(true);
    }
  });

  it('rejects unsupported event types', () => {
    expect(validateEventType('product.published')).toBe(false);
    expect(validateEventType('')).toBe(false);
  });
});

describe('validateWebhookUrl', () => {
  it('accepts valid https URLs', () => {
    expect(validateWebhookUrl('https://example.com/webhooks')).toBeUndefined();
    expect(validateWebhookUrl('https://hooks.example.com/path?foo=bar')).toBeUndefined();
  });

  it('rejects insecure http URLs', () => {
    expect(validateWebhookUrl('http://example.com/webhooks')).toMatch(/https/i);
  });

  it('rejects invalid URLs', () => {
    expect(validateWebhookUrl('not-a-url')).toMatch(/valid url/i);
  });

  it('rejects empty URLs', () => {
    expect(validateWebhookUrl('')).toMatch(/must not be empty/i);
  });
});

describe('buildAppId', () => {
  it('builds the expected creator app identifier', () => {
    expect(buildAppId('creator-123')).toBe('simket_creator_creator-123');
  });
});

describe('SvixService', () => {
  it('ensureCreatorApp calls application.getOrCreate with the creator app uid', async () => {
    const client = createClientMock();
    const service = new SvixService(CONFIG, client);

    const app = await service.ensureCreatorApp('creator-1');

    expect(app.id).toBe(buildAppId('creator-1'));
    expect(client.application.getOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: buildAppId('creator-1'),
        metadata: { creatorId: 'creator-1' },
      }),
    );
  });

  it('sendEvent validates the event type and calls message.create with the webhook payload', async () => {
    const client = createClientMock();
    const service = new SvixService(CONFIG, client);
    const params: SendEventParams = {
      creatorId: 'creator-1',
      eventType: 'product.created',
      payload: { productId: 'prod_123' },
    };

    const result = await service.sendEvent(params);

    expect(result.eventType).toBe('product.created');
    expect(client.message.create).toHaveBeenCalledWith(
      buildAppId('creator-1'),
      expect.objectContaining({
        eventType: 'product.created',
        payload: {
          productId: 'prod_123',
          type: 'product.created',
        },
      }),
      undefined,
    );
  });

  it('sendEvent passes the idempotency key to Svix', async () => {
    const client = createClientMock();
    const service = new SvixService(CONFIG, client);

    await service.sendEvent({
      creatorId: 'creator-1',
      eventType: 'product.created',
      payload: { productId: 'prod_123' },
      idempotencyKey: 'evt_123',
    });

    expect(client.message.create).toHaveBeenCalledWith(
      buildAppId('creator-1'),
      expect.any(Object),
      { idempotencyKey: 'evt_123' },
    );
  });

  it('sendEvent rejects unsupported event types', async () => {
    const client = createClientMock();
    const service = new SvixService(CONFIG, client);

    await expect(
      service.sendEvent({
        creatorId: 'creator-1',
        eventType: 'product.published' as SendEventParams['eventType'],
        payload: {},
      }),
    ).rejects.toThrow(/unsupported event type/i);
  });

  it('registerEndpoint validates the URL and calls endpoint.create', async () => {
    const client = createClientMock();
    const service = new SvixService(CONFIG, client);

    const endpoint = await service.registerEndpoint('creator-1', 'https://example.com/webhooks', [
      'order.completed',
      'asset.processed',
    ]);

    expect(endpoint.url).toBe('https://example.com/webhooks');
    expect(client.endpoint.create).toHaveBeenCalledWith(
      buildAppId('creator-1'),
      expect.objectContaining({
        url: 'https://example.com/webhooks',
        filterTypes: ['order.completed', 'asset.processed'],
      }),
      undefined,
    );
  });

  it('listEndpoints calls endpoint.list for the creator app', async () => {
    const client = createClientMock();
    const service = new SvixService(CONFIG, client);

    const endpoints = await service.listEndpoints('creator-1');

    expect(endpoints.data).toHaveLength(1);
    expect(client.endpoint.list).toHaveBeenCalledWith(buildAppId('creator-1'));
  });

  it('getPortalUrl calls authentication.appPortalAccess and returns the url', async () => {
    const client = createClientMock();
    const service = new SvixService(CONFIG, client);

    const url = await service.getPortalUrl('creator-1');

    expect(url).toBe('https://portal.svix.test/access-token');
    expect(client.authentication.appPortalAccess).toHaveBeenCalledWith(
      buildAppId('creator-1'),
      expect.objectContaining({
        application: expect.objectContaining({ uid: buildAppId('creator-1') }),
      }),
      undefined,
    );
  });
});
