/**
 * Purpose: Express-compatible route handlers for editorial webhook ingestion,
 * cached editorial reads, polling update status, and SSE subscriptions.
 * Governing docs:
 *   - docs/architecture.md (§2 Fail-closed on security, §11 Idempotent by default)
 *   - docs/service-architecture.md (§1.5 PayloadCMS API, §1.7 Svix)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://payloadcms.com/docs/rest-api/overview
 *   - https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
 *   - https://developer.mozilla.org/docs/Web/API/Server-sent_events
 * Tests:
 *   - packages/vendure-server/src/features/editorial/editorial-webhook.router.test.ts
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { trace, SpanStatusCode, type Tracer } from '@opentelemetry/api';
import type { Request, Response } from 'express';
import { EditorialCacheService } from './editorial-cache.service.js';
import { EditorialSyncService } from './editorial-sync.service.js';
import type {
  EditorialCollectionSlug,
  EditorialWebhookDocument,
  EditorialWebhookEvent,
  EditorialWebhookOperation,
} from './editorial.types.js';

export interface EditorialWebhookRequest extends Request {
  rawBody?: string;
}

interface EditorialRouteDependencies {
  readonly cacheService: Pick<
    EditorialCacheService,
    'getArticle' | 'getCuratedCollections' | 'getFeaturedProducts'
  >;
  readonly syncService: Pick<
    EditorialSyncService,
    'getUpdateSince' | 'processWebhook' | 'subscribe'
  >;
  readonly webhookSecret: string;
  readonly signatureHeaderName?: string;
  readonly tracer?: Tracer;
}

interface EditorialRouteApp {
  post(path: string, handler: (req: Request, res: Response) => Promise<void> | void): unknown;
  get(path: string, handler: (req: Request, res: Response) => Promise<void> | void): unknown;
}

const COLLECTIONS = new Set<EditorialCollectionSlug>([
  'articles',
  'editorial-sections',
  'featured-products',
]);
const OPERATIONS = new Set<EditorialWebhookOperation>([
  'create',
  'delete',
  'publish',
  'unpublish',
  'update',
]);

export function editorialWebhookJsonVerifier(
  req: Request,
  _res: Response,
  buffer: Buffer,
): void {
  (req as EditorialWebhookRequest).rawBody = buffer.toString('utf8');
}

export function verifyEditorialWebhookSignature(input: {
  readonly secret: string;
  readonly signature?: string;
  readonly rawBody: string;
}): boolean {
  if (!input.signature || input.secret.trim().length === 0) {
    return false;
  }

  const normalizedSignature = normalizeSignature(input.signature);
  if (!normalizedSignature) {
    return false;
  }

  const expected = createHmac('sha256', input.secret).update(input.rawBody, 'utf8').digest();
  return expected.length === normalizedSignature.length && timingSafeEqual(expected, normalizedSignature);
}

export function createEditorialRouteHandlers(dependencies: EditorialRouteDependencies) {
  const tracer = dependencies.tracer ?? trace.getTracer('simket-editorial-routes');
  const signatureHeaderName = dependencies.signatureHeaderName ?? 'x-payload-signature-256';

  return {
    handleWebhook: async (req: EditorialWebhookRequest, res: Response): Promise<void> => {
      await tracer.startActiveSpan('editorial.routes.handleWebhook', async (span) => {
        try {
          const rawBody =
            req.rawBody ??
            (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));
          const signature = req.get(signatureHeaderName);

          if (
            !verifyEditorialWebhookSignature({
              secret: dependencies.webhookSecret,
              signature,
              rawBody,
            })
          ) {
            res.status(401).json({ error: 'Invalid editorial webhook signature.' });
            return;
          }

          const event = parseEditorialWebhookPayload(req.body);
          const update = await dependencies.syncService.processWebhook(event);
          res.status(202).json({ accepted: true, update });
        } catch (error) {
          markSpanError(span, error);
          res.status(400).json({ error: toErrorMessage(error) });
        } finally {
          span.end();
        }
      });
    },
    handleCollections: async (_req: Request, res: Response): Promise<void> => {
      const collections = await dependencies.cacheService.getCuratedCollections();
      res.json({ collections });
    },
    handleArticle: async (req: Request, res: Response): Promise<void> => {
      const slug = String(req.params['slug'] ?? '').trim();
      const article = await dependencies.cacheService.getArticle(slug);
      if (!article) {
        res.status(404).json({ error: `Unknown article "${slug}".` });
        return;
      }

      res.json({ article });
    },
    handleFeaturedProducts: async (req: Request, res: Response): Promise<void> => {
      const sectionId = String(req.query['sectionId'] ?? '').trim();
      const featuredProducts = await dependencies.cacheService.getFeaturedProducts(sectionId);
      res.json({ featuredProducts });
    },
    handleUpdates: async (req: Request, res: Response): Promise<void> => {
      const version = parseRequestedVersion(req.query['since']);
      res.json(dependencies.syncService.getUpdateSince(version));
    },
    handleUpdateStream: async (req: Request, res: Response): Promise<void> => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.write('event: ready\ndata: {"connected":true}\n\n');

      const sinceVersion = parseRequestedVersion(req.query['since']);
      const initialUpdate = dependencies.syncService.getUpdateSince(sinceVersion);
      if (initialUpdate.hasUpdate && initialUpdate.update) {
        res.write(`event: editorial-update\ndata: ${JSON.stringify(initialUpdate.update)}\n\n`);
      }

      const unsubscribe = dependencies.syncService.subscribe((update) => {
        res.write(`event: editorial-update\ndata: ${JSON.stringify(update)}\n\n`);
      });

      req.on('close', () => {
        unsubscribe();
        res.end();
      });
    },
  };
}

export function mountEditorialRoutes(
  app: EditorialRouteApp,
  dependencies: EditorialRouteDependencies,
): void {
  const handlers = createEditorialRouteHandlers(dependencies);
  app.post('/webhooks/payloadcms/editorial', handlers.handleWebhook);
  app.get('/editorial/collections', handlers.handleCollections);
  app.get('/editorial/articles/:slug', handlers.handleArticle);
  app.get('/editorial/featured-products', handlers.handleFeaturedProducts);
  app.get('/editorial/updates', handlers.handleUpdates);
  app.get('/editorial/updates/stream', handlers.handleUpdateStream);
}

function parseEditorialWebhookPayload(payload: unknown): EditorialWebhookEvent {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Editorial webhook payload must be an object.');
  }

  const record = payload as Record<string, unknown>;
  const collection = readCollection(record['collection']);
  const operation = readOperation(record['operation']);
  const eventId = readString(record['eventId']) ?? buildFallbackEventId(collection, operation, record);
  const occurredAt = readString(record['occurredAt']) ?? new Date().toISOString();

  return {
    eventId,
    collection,
    operation,
    occurredAt,
    doc: normalizeWebhookDocument(record['doc']),
    previousDoc: normalizeWebhookDocument(record['previousDoc']),
  };
}

function normalizeWebhookDocument(value: unknown): EditorialWebhookDocument | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = readString(record['id']);
  if (!id) {
    return undefined;
  }

  return {
    id,
    slug: readString(record['slug']),
    title: readString(record['title']),
    excerpt: readString(record['excerpt']),
    status: readString(record['status']) ?? readString(record['_status']),
    sectionId: readSectionId(record['section']),
    publishedAt: readString(record['publishedAt']),
    tags: readStringArray(record['tags']),
  };
}

function readCollection(value: unknown): EditorialCollectionSlug {
  if (typeof value === 'string' && COLLECTIONS.has(value as EditorialCollectionSlug)) {
    return value as EditorialCollectionSlug;
  }

  throw new Error(`Unsupported editorial collection "${String(value)}".`);
}

function readOperation(value: unknown): EditorialWebhookOperation {
  if (typeof value === 'string' && OPERATIONS.has(value as EditorialWebhookOperation)) {
    return value as EditorialWebhookOperation;
  }

  throw new Error(`Unsupported editorial operation "${String(value)}".`);
}

function readString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function readStringArray(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : undefined;
}

function readSectionId(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    return readString((value as Record<string, unknown>)['id']);
  }

  return undefined;
}

function buildFallbackEventId(
  collection: EditorialCollectionSlug,
  operation: EditorialWebhookOperation,
  payload: Record<string, unknown>,
): string {
  const doc = normalizeWebhookDocument(payload['doc']);
  const previousDoc = normalizeWebhookDocument(payload['previousDoc']);
  const suffix = doc?.id ?? previousDoc?.id ?? 'unknown';
  return `${collection}:${operation}:${suffix}`;
}

function parseRequestedVersion(value: unknown): number {
  const numericValue =
    typeof value === 'string'
      ? Number.parseInt(value, 10)
      : typeof value === 'number'
        ? value
        : 0;
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : 0;
}

function normalizeSignature(signature: string): Buffer | undefined {
  const normalized = signature.startsWith('sha256=') ? signature.slice('sha256='.length) : signature;
  if (!/^[a-fA-F0-9]+$/.test(normalized)) {
    return undefined;
  }

  return Buffer.from(normalized, 'hex');
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function markSpanError(span: import('@opentelemetry/api').Span, error: unknown): void {
  span.setStatus({ code: SpanStatusCode.ERROR, message: toErrorMessage(error) });
}
