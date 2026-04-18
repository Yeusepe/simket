/**
 * Purpose: CDNgine integration — asset upload, transformation, and metadata.
 *
 * Wraps HTTP calls to CDNgine with:
 *   - Input validation (reject bad filenames, unsupported MIME types, empty IDs)
 *   - Cockatiel resilience policies (timeout, retry, circuit breaker, bulkhead)
 *   - OpenTelemetry tracing (one span per outbound operation)
 *   - Dependency-injected fetch for testability
 *
 * Governing docs:
 *   - docs/architecture.md (§5 CDNgine owns artefacts)
 *   - docs/service-architecture.md (CDNgine integration)
 * External references:
 *   - CDNgine internal API contract (see cdngine.types.ts)
 *   - https://github.com/connor4312/cockatiel (resilience wrapping)
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/#create-spans
 * Tests:
 *   - packages/vendure-server/src/features/cdngine/cdngine.service.test.ts
 */
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { SERVICE_POLICIES } from '../../resilience/resilience.js';
import {
  SUPPORTED_MIME_TYPES,
  type Fetcher,
  type PresignRequest,
  type PresignResponse,
  type TransformRequest,
  type TransformResponse,
  type AssetMetadata,
  type TransformWebhookPayload,
  type TransformOperation,
} from './cdngine.types.js';

const tracer = trace.getTracer('simket-cdngine');

export class CdngineService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetch: Fetcher;

  constructor(baseUrl: string, apiKey: string, fetcher?: Fetcher) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.fetch = fetcher ?? globalThis.fetch.bind(globalThis);
  }

  // ---------- presignUpload ----------

  async presignUpload(req: PresignRequest): Promise<PresignResponse> {
    if (!req.filename || req.filename.trim().length === 0) {
      throw new Error('presignUpload: filename must not be empty');
    }
    if (!SUPPORTED_MIME_TYPES.has(req.mimeType)) {
      throw new Error(
        `presignUpload: unsupported MIME type "${req.mimeType}". ` +
          `Supported: ${[...SUPPORTED_MIME_TYPES].join(', ')}`,
      );
    }

    return this.postJson<PresignResponse>(
      '/api/v1/upload/presign',
      req,
      'cdngine.presignUpload',
    );
  }

  // ---------- requestTransform ----------

  async requestTransform(req: TransformRequest): Promise<TransformResponse> {
    if (!req.assetId || req.assetId.trim().length === 0) {
      throw new Error('requestTransform: assetId must not be empty');
    }
    if (!req.operations || req.operations.length === 0) {
      throw new Error('requestTransform: operations must not be empty');
    }

    return this.postJson<TransformResponse>(
      '/api/v1/transform',
      req,
      'cdngine.requestTransform',
    );
  }

  // ---------- getAssetMetadata ----------

  async getAssetMetadata(assetId: string): Promise<AssetMetadata | null> {
    const url = `${this.baseUrl}/api/v1/assets/${encodeURIComponent(assetId)}`;

    return tracer.startActiveSpan('cdngine.getAssetMetadata', async (span) => {
      try {
        span.setAttribute('cdngine.asset_id', assetId);

        const res = await SERVICE_POLICIES.cdngine.execute(() =>
          this.fetch(url, {
            method: 'GET',
            headers: this.defaultHeaders(),
          }),
        );

        if (res.status === 404) {
          span.setAttribute('cdngine.not_found', true);
          return null;
        }

        if (!res.ok) {
          throw new Error(
            `CDNgine GET /api/v1/assets/${assetId} failed with status ${res.status}`,
          );
        }

        return (await res.json()) as AssetMetadata;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  // ---------- parseTransformWebhook (static) ----------

  static parseTransformWebhook(payload: unknown): TransformWebhookPayload {
    const p = payload as Record<string, unknown>;

    if (!p || typeof p !== 'object') {
      throw new Error('parseTransformWebhook: payload must be an object');
    }
    if (typeof p['assetId'] !== 'string' || !p['assetId']) {
      throw new Error('parseTransformWebhook: missing or invalid assetId');
    }
    if (typeof p['jobId'] !== 'string' || !p['jobId']) {
      throw new Error('parseTransformWebhook: missing or invalid jobId');
    }
    if (p['status'] !== 'completed' && p['status'] !== 'failed') {
      throw new Error(
        'parseTransformWebhook: status must be "completed" or "failed"',
      );
    }
    if (!Array.isArray(p['outputs'])) {
      throw new Error('parseTransformWebhook: outputs must be an array');
    }

    return p as unknown as TransformWebhookPayload;
  }

  // ---------- buildHeroTransformOps (static) ----------

  /**
   * Generates standard hero-image transform operations based on source MIME type.
   *
   * - GIFs → animated-webp + resize
   * - Videos → mp4 + resize
   * - Everything else → webp + resize
   */
  static buildHeroTransformOps(mimeType: string): TransformOperation[] {
    let formatOp: TransformOperation;

    if (mimeType === 'image/gif') {
      formatOp = { type: 'format', target: 'animated-webp' };
    } else if (mimeType.startsWith('video/')) {
      formatOp = { type: 'format', target: 'mp4' };
    } else {
      formatOp = { type: 'format', target: 'webp' };
    }

    return [
      formatOp,
      { type: 'resize', width: 1200, height: 630 },
    ];
  }

  // ---------- private helpers ----------

  private defaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async postJson<T>(
    path: string,
    body: unknown,
    spanName: string,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    return tracer.startActiveSpan(spanName, async (span) => {
      try {
        span.setAttribute('cdngine.endpoint', path);

        const res = await SERVICE_POLICIES.cdngine.execute(() =>
          this.fetch(url, {
            method: 'POST',
            headers: this.defaultHeaders(),
            body: JSON.stringify(body),
          }),
        );

        if (!res.ok) {
          throw new Error(
            `CDNgine POST ${path} failed with status ${res.status}`,
          );
        }

        return (await res.json()) as T;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
