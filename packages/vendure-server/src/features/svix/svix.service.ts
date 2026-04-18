/**
 * Purpose: Svix webhook delivery service for creator-scoped outbound events.
 * Governing docs:
 *   - docs/architecture.md (§2 Every outbound call through Cockatiel, §5 Service ownership)
 *   - docs/service-architecture.md (§1.7 Svix)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.svix.com/
 *   - https://api.svix.com/
 *   - packages/vendure-server/node_modules/svix/dist/index.d.ts
 *   - packages/vendure-server/node_modules/svix/dist/api/application.d.ts
 *   - packages/vendure-server/node_modules/svix/dist/api/message.d.ts
 *   - packages/vendure-server/node_modules/svix/dist/api/endpoint.d.ts
 *   - packages/vendure-server/node_modules/svix/dist/api/authentication.d.ts
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/#create-spans
 * Tests:
 *   - packages/vendure-server/src/features/svix/svix.service.test.ts
 */
import { SpanStatusCode, trace } from '@opentelemetry/api';
import {
  Svix,
  type ApplicationIn,
  type ApplicationOut,
  type AppPortalAccessIn,
  type EndpointIn,
  type EndpointOut,
  type ListResponseEndpointOut,
  type MessageIn,
  type MessageOut,
} from 'svix';
import { SERVICE_POLICIES } from '../../resilience/resilience.js';
import type { SendEventParams, SimketEventType, WebhookConfig } from './svix.types.js';

const tracer = trace.getTracer('simket-svix');

const SIMKET_EVENT_TYPES = new Set<SimketEventType>([
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
]);

type SvixClientLike = Pick<Svix, 'application' | 'message' | 'endpoint' | 'authentication'>;

export function validateEventType(type: string): type is SimketEventType {
  return SIMKET_EVENT_TYPES.has(type as SimketEventType);
}

export function validateWebhookUrl(url: string): string | undefined {
  if (!url || url.trim().length === 0) {
    return 'webhook url must not be empty';
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== 'https:') {
      return 'webhook url must use https';
    }
  } catch {
    return 'webhook url must be a valid URL';
  }

  return undefined;
}

export function buildAppId(creatorId: string): string {
  if (!creatorId || creatorId.trim().length === 0) {
    throw new Error('creatorId must not be empty');
  }

  return `simket_creator_${creatorId}`;
}

export class SvixService {
  private readonly client: SvixClientLike;

  constructor(config: WebhookConfig, client?: SvixClientLike) {
    if (!config.svixApiKey || config.svixApiKey.trim().length === 0) {
      throw new Error('SvixService: svixApiKey must not be empty');
    }

    this.client = client ?? new Svix(config.svixApiKey);
  }

  async ensureCreatorApp(creatorId: string): Promise<ApplicationOut> {
    const appId = buildAppId(creatorId);
    const applicationIn: ApplicationIn = {
      uid: appId,
      name: `Simket Creator ${creatorId}`,
      metadata: {
        creatorId,
      },
    };

    return tracer.startActiveSpan('svix.ensureCreatorApp', async (span) => {
      try {
        span.setAttribute('svix.creator_id', creatorId);
        span.setAttribute('svix.app_uid', appId);

        const app = await SERVICE_POLICIES.svix.execute(() =>
          this.client.application.getOrCreate(applicationIn),
        );

        span.setAttribute('svix.app_id', app.id);
        return app;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async sendEvent(params: SendEventParams): Promise<MessageOut> {
    if (!validateEventType(params.eventType)) {
      throw new Error(`sendEvent: unsupported event type "${params.eventType}"`);
    }

    const app = await this.ensureCreatorApp(params.creatorId);
    const messageIn: MessageIn = {
      eventType: params.eventType,
      payload: {
        ...params.payload,
        type: params.eventType,
      },
    };
    const options = params.idempotencyKey
      ? { idempotencyKey: params.idempotencyKey }
      : undefined;

    return tracer.startActiveSpan('svix.sendEvent', async (span) => {
      try {
        span.setAttribute('svix.creator_id', params.creatorId);
        span.setAttribute('svix.app_id', app.id);
        span.setAttribute('svix.event_type', params.eventType);
        if (params.idempotencyKey) {
          span.setAttribute('svix.idempotency_key', params.idempotencyKey);
        }

        const message = await SERVICE_POLICIES.svix.execute(() =>
          this.client.message.create(app.id, messageIn, options),
        );

        span.setAttribute('svix.message_id', message.id);
        return message;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async registerEndpoint(
    creatorId: string,
    url: string,
    eventTypes?: SimketEventType[],
  ): Promise<EndpointOut> {
    const urlError = validateWebhookUrl(url);
    if (urlError) {
      throw new Error(`registerEndpoint: ${urlError}`);
    }
    if (eventTypes && eventTypes.some((eventType) => !validateEventType(eventType))) {
      throw new Error('registerEndpoint: eventTypes contains unsupported values');
    }

    const app = await this.ensureCreatorApp(creatorId);
    const endpointIn: EndpointIn = {
      url,
      description: `Simket creator webhook endpoint for ${creatorId}`,
      metadata: {
        creatorId,
      },
      ...(eventTypes ? { filterTypes: [...eventTypes] } : {}),
    };

    return tracer.startActiveSpan('svix.registerEndpoint', async (span) => {
      try {
        span.setAttribute('svix.creator_id', creatorId);
        span.setAttribute('svix.app_id', app.id);
        span.setAttribute('svix.endpoint_url', url);

        const endpoint = await SERVICE_POLICIES.svix.execute(() =>
          this.client.endpoint.create(app.id, endpointIn, undefined),
        );

        span.setAttribute('svix.endpoint_id', endpoint.id);
        return endpoint;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async listEndpoints(creatorId: string): Promise<ListResponseEndpointOut> {
    const app = await this.ensureCreatorApp(creatorId);

    return tracer.startActiveSpan('svix.listEndpoints', async (span) => {
      try {
        span.setAttribute('svix.creator_id', creatorId);
        span.setAttribute('svix.app_id', app.id);

        return await SERVICE_POLICIES.svix.execute(() => this.client.endpoint.list(app.id));
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async getPortalUrl(creatorId: string): Promise<string> {
    const app = await this.ensureCreatorApp(creatorId);
    const accessIn: AppPortalAccessIn = {
      application: {
        uid: app.uid ?? buildAppId(creatorId),
        name: app.name,
        metadata: app.metadata,
      },
    };

    return tracer.startActiveSpan('svix.getPortalUrl', async (span) => {
      try {
        span.setAttribute('svix.creator_id', creatorId);
        span.setAttribute('svix.app_id', app.id);

        const access = await SERVICE_POLICIES.svix.execute(() =>
          this.client.authentication.appPortalAccess(app.id, accessIn, undefined),
        );

        span.setAttribute('svix.portal_url', access.url);
        return access.url;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
