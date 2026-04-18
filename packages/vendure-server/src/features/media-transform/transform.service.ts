/**
 * Purpose: Orchestrate media transformation for images and videos with OpenTelemetry coverage.
 * Governing docs:
 *   - docs/architecture.md (§2 Worker-first, §5 Asset pipeline)
 *   - docs/service-architecture.md (§9 Media asset lifecycle, §10 observability)
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/#create-spans
 *   - https://sharp.pixelplumbing.com/api-output#webp
 *   - https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
 * Tests:
 *   - packages/vendure-server/src/features/media-transform/transform.service.test.ts
 */
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace, type Span, type Tracer } from '@opentelemetry/api';
import {
  SharpImageTransformer,
  detectMediaType,
  type ImageTransformer,
} from './image-transformer.js';
import { FfmpegVideoTransformer, type VideoTransformer } from './video-transformer.js';
import type { TransformConfig, TransformInput, TransformResult } from './transform.types.js';

interface FileSystemLike {
  mkdir(path: string, options?: { recursive?: boolean }): Promise<unknown>;
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  writeFile(path: string, data: Buffer): Promise<void>;
}

interface MediaTransformServiceOptions {
  readonly imageTransformer?: ImageTransformer;
  readonly videoTransformer?: VideoTransformer;
  readonly fs?: FileSystemLike;
  readonly now?: () => number;
  readonly tracer?: Tracer;
  readonly tempRoot?: string;
  readonly idFactory?: () => string;
}

const PACKAGE_ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const TEMP_ROOT = path.join(PACKAGE_ROOT, '.simket-temp', 'media-transform');

export const DEFAULT_TRANSFORM_CONFIG: TransformConfig = {
  maxWidth: 1_920,
  maxHeight: 1_080,
  imageQuality: 82,
  thumbnailWidth: 480,
  thumbnailHeight: 270,
  videoMaxDuration: 120,
  videoBitrate: '2M',
};

@Injectable()
export class MediaTransformService {
  private readonly imageTransformer: ImageTransformer;
  private readonly videoTransformer: VideoTransformer;
  private readonly fs: FileSystemLike;
  private readonly now: () => number;
  private readonly tracer: Tracer;
  private readonly tempRoot: string;
  private readonly idFactory: () => string;

  constructor(
    config: Partial<TransformConfig> = {},
    options: MediaTransformServiceOptions = {},
  ) {
    this.imageTransformer = options.imageTransformer ?? new SharpImageTransformer();
    this.videoTransformer = options.videoTransformer ?? new FfmpegVideoTransformer();
    this.fs = options.fs ?? { mkdir, rm, writeFile };
    this.now = options.now ?? (() => Date.now());
    this.tracer = options.tracer ?? trace.getTracer('simket-media-transform');
    this.tempRoot = options.tempRoot ?? TEMP_ROOT;
    this.idFactory = options.idFactory ?? (() => randomUUID());
    this.baseConfig = resolveTransformConfig(config);
  }

  private readonly baseConfig: TransformConfig;

  async processMedia(
    input: TransformInput,
    config: Partial<TransformConfig> = {},
  ): Promise<TransformResult> {
    return this.tracer.startActiveSpan('mediaTransform.processMedia', async (span) => {
      const startedAt = this.now();
      span.setAttribute('media_transform.filename', input.filename);
      span.setAttribute('media_transform.mime_type', input.mimeType);
      span.setAttribute('media_transform.input_size', input.buffer.length);

      try {
        const effectiveConfig = resolveTransformConfig({ ...this.baseConfig, ...config });
        const mediaType = detectMediaType(input.mimeType);
        span.setAttribute('media_transform.media_type', mediaType);

        if (mediaType === 'video') {
          return await this.processVideo(input, effectiveConfig, startedAt, span);
        }

        const original = await this.imageTransformer.inspectImage(input);
        const outputs = await this.imageTransformer.transformImage(input, effectiveConfig);
        const thumbnail = await this.imageTransformer.generateThumbnail(input, effectiveConfig);
        const totalDurationMs = Math.max(1, this.now() - startedAt);

        span.setAttribute('media_transform.output_count', outputs.length);
        span.setAttribute('media_transform.thumbnail_format', thumbnail.format);
        span.setAttribute('media_transform.total_duration_ms', totalDurationMs);

        return {
          original,
          outputs,
          thumbnail,
          totalDurationMs,
        };
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async processVideo(
    input: TransformInput,
    config: TransformConfig,
    startedAt: number,
    span: Span,
  ): Promise<TransformResult> {
    const workDir = path.join(this.tempRoot, this.idFactory());
    const inputPath = path.join(workDir, sanitizeFilename(input.filename));

    await this.fs.mkdir(workDir, { recursive: true });

    try {
      await this.fs.writeFile(inputPath, input.buffer);
      const original = await this.videoTransformer.inspectVideo(inputPath);
      const output = await this.videoTransformer.transformVideo(inputPath, config);
      const thumbnail = await this.videoTransformer.generateVideoThumbnail(inputPath, config);
      const totalDurationMs = Math.max(1, this.now() - startedAt);

      span.setAttribute('media_transform.output_count', 1);
      span.setAttribute('media_transform.thumbnail_format', thumbnail.format);
      span.setAttribute('media_transform.total_duration_ms', totalDurationMs);

      return {
        original: {
          width: original.width,
          height: original.height,
          sizeBytes: original.sizeBytes || input.buffer.length,
          mimeType: input.mimeType,
        },
        outputs: [output],
        thumbnail,
        totalDurationMs,
      };
    } finally {
      await this.fs.rm(workDir, { recursive: true, force: true });
    }
  }
}

export function resolveTransformConfig(
  overrides: Partial<TransformConfig> = {},
): TransformConfig {
  const resolved: TransformConfig = {
    ...DEFAULT_TRANSFORM_CONFIG,
    ...overrides,
  };

  validatePositiveInteger(resolved.maxWidth, 'maxWidth');
  validatePositiveInteger(resolved.maxHeight, 'maxHeight');
  validateQuality(resolved.imageQuality, 'imageQuality');
  validatePositiveInteger(resolved.thumbnailWidth, 'thumbnailWidth');
  validatePositiveInteger(resolved.thumbnailHeight, 'thumbnailHeight');
  validatePositiveInteger(resolved.videoMaxDuration, 'videoMaxDuration');
  if (resolved.videoBitrate.trim().length === 0) {
    throw new Error('videoBitrate must not be empty');
  }

  return resolved;
}

function validatePositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function validateQuality(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error(`${name} must be an integer between 1 and 100`);
  }
}

function sanitizeFilename(filename: string): string {
  const basename = filename.replaceAll('\\', '/').split('/').at(-1)?.trim();
  if (!basename) {
    return 'asset.bin';
  }

  return basename;
}
