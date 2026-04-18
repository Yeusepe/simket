/**
 * Purpose: Contracts for media transformation inputs, outputs, and configuration.
 * Governing docs:
 *   - docs/architecture.md (§2 Worker-first, §5 Asset pipeline)
 *   - docs/service-architecture.md (§9 Media asset lifecycle)
 *   - docs/domain-model.md (§4.1.1 AssetReference)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://sharp.pixelplumbing.com/api-constructor
 *   - https://sharp.pixelplumbing.com/api-output#webp
 *   - https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
 * Tests:
 *   - packages/vendure-server/src/features/media-transform/transform.service.test.ts
 */
export type MediaType = 'image' | 'animatedImage' | 'video';

export type OutputFormat = 'webp' | 'animatedWebp' | 'webm' | 'mp4' | 'thumbnail';

export interface TransformConfig {
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly imageQuality: number;
  readonly thumbnailWidth: number;
  readonly thumbnailHeight: number;
  readonly videoMaxDuration: number;
  readonly videoBitrate: string;
}

export interface TransformInput {
  readonly buffer: Buffer;
  readonly filename: string;
  readonly mimeType: string;
}

export interface TransformOutput {
  readonly buffer: Buffer;
  readonly format: OutputFormat;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
  readonly filename: string;
  readonly durationMs: number;
}

export interface TransformResult {
  readonly original: {
    width: number;
    height: number;
    sizeBytes: number;
    mimeType: string;
  };
  readonly outputs: readonly TransformOutput[];
  readonly thumbnail: TransformOutput;
  readonly totalDurationMs: number;
}
