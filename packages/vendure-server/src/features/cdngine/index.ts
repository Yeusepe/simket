/**
 * Purpose: CDNgine feature barrel — re-exports service and types.
 *
 * Governing docs:
 *   - docs/architecture.md (§5 CDNgine owns artefacts)
 *   - docs/service-architecture.md (CDNgine integration)
 * Tests:
 *   - packages/vendure-server/src/features/cdngine/cdngine.service.test.ts
 */
export { CdngineService } from './cdngine.service.js';
export {
  SUPPORTED_MIME_TYPES,
  type PresignRequest,
  type PresignResponse,
  type TransformOperation,
  type TransformRequest,
  type TransformResponse,
  type AssetMetadata,
  type TransformOutput,
  type TransformWebhookPayload,
  type Fetcher,
} from './cdngine.types.js';
