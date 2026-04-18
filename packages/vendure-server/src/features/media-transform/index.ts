/**
 * Purpose: Barrel exports for media transformation helpers and services.
 * Governing docs:
 *   - docs/architecture.md (§2 Worker-first, §5 Asset pipeline)
 *   - docs/service-architecture.md (§9 Media asset lifecycle)
 * External references:
 *   - https://sharp.pixelplumbing.com/api-output#webp
 *   - https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
 * Tests:
 *   - packages/vendure-server/src/features/media-transform/transform.service.test.ts
 */
export {
  SharpImageTransformer,
  buildOutputFilename,
  calculateResizeDimensions,
  detectMediaType,
  isAnimatedImage,
} from './image-transformer.js';
export type { ImageInspection, ImageTransformer } from './image-transformer.js';
export { FfmpegVideoTransformer } from './video-transformer.js';
export type { VideoInspection, VideoTransformer } from './video-transformer.js';
export {
  DEFAULT_TRANSFORM_CONFIG,
  MediaTransformService,
  resolveTransformConfig,
} from './transform.service.js';
export type {
  MediaType,
  OutputFormat,
  TransformConfig,
  TransformInput,
  TransformOutput,
  TransformResult,
} from './transform.types.js';
