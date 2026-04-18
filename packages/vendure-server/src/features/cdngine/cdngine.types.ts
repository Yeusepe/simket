/**
 * Purpose: CDNgine type definitions — request/response shapes for asset upload,
 *          transformation, and metadata endpoints.
 *
 * Governing docs:
 *   - docs/architecture.md (§5 CDNgine owns artefacts)
 *   - docs/service-architecture.md (CDNgine integration)
 * External references:
 *   - CDNgine internal API contract (documented inline below)
 * Tests:
 *   - packages/vendure-server/src/features/cdngine/cdngine.service.test.ts
 */

// ---------- Supported MIME types ----------

/** MIME types CDNgine accepts for asset ingestion. */
export const SUPPORTED_MIME_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
]);

// ---------- Presign ----------

/** POST /api/v1/upload/presign — request body. */
export interface PresignRequest {
  filename: string;
  mimeType: string;
  creatorId: string;
}

/** POST /api/v1/upload/presign — response body. */
export interface PresignResponse {
  uploadUrl: string;
  assetId: string;
  expiresAt: string;
}

// ---------- Transform ----------

/** Discriminated union of supported transform operations. */
export type TransformOperation =
  | { type: 'resize'; width: number; height: number }
  | { type: 'format'; target: 'webp' | 'animated-webp' | 'mp4' };

/** POST /api/v1/transform — request body. */
export interface TransformRequest {
  assetId: string;
  operations: TransformOperation[];
}

/** POST /api/v1/transform — response body. */
export interface TransformResponse {
  jobId: string;
  status: 'queued';
}

// ---------- Asset metadata ----------

/** GET /api/v1/assets/:assetId — response body. */
export interface AssetMetadata {
  assetId: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
  size: number;
}

// ---------- Webhook ----------

/** Individual output from a completed transform job. */
export interface TransformOutput {
  format: string;
  url: string;
  width: number;
  height: number;
}

/** POST /webhooks/cdngine/transform-complete — webhook body. */
export interface TransformWebhookPayload {
  assetId: string;
  jobId: string;
  status: 'completed' | 'failed';
  outputs: TransformOutput[];
}

// ---------- Fetcher DI type ----------

/** Injectable fetch function signature for testability. */
export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
