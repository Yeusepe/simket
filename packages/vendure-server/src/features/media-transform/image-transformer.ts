/**
 * Purpose: Transform uploaded images into WebP derivatives and thumbnails using sharp.
 * Governing docs:
 *   - docs/architecture.md (§2 Worker-first, §5 Asset pipeline)
 *   - docs/service-architecture.md (§9 Media asset lifecycle, §10 observability)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://sharp.pixelplumbing.com/api-constructor
 *   - https://sharp.pixelplumbing.com/api-output#webp
 *   - packages/vendure-server/node_modules/sharp/lib/index.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/media-transform/transform.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace, type Tracer } from '@opentelemetry/api';
import sharp, { type Metadata, type OutputInfo } from 'sharp';
import type { MediaType, OutputFormat, TransformConfig, TransformInput, TransformOutput } from './transform.types.js';

export interface ImageInspection {
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
  readonly mimeType: string;
}

export interface ImageTransformer {
  inspectImage(input: TransformInput): Promise<ImageInspection>;
  transformImage(
    input: TransformInput,
    config: TransformConfig,
  ): Promise<readonly TransformOutput[]>;
  generateThumbnail(
    input: TransformInput,
    config: TransformConfig,
  ): Promise<TransformOutput>;
}

const tracer = trace.getTracer('simket-media-transform');
const ANIMATED_IMAGE_MIME_TYPES = new Set(['image/gif', 'image/apng', 'image/webp']);

export function isAnimatedImage(mimeType: string): boolean {
  return ANIMATED_IMAGE_MIME_TYPES.has(normalizeMimeType(mimeType));
}

export function detectMediaType(mimeType: string): MediaType {
  const normalizedMimeType = normalizeMimeType(mimeType);

  if (normalizedMimeType.startsWith('video/')) {
    return 'video';
  }
  if (normalizedMimeType.startsWith('image/')) {
    return isAnimatedImage(normalizedMimeType) ? 'animatedImage' : 'image';
  }

  throw new Error(`Unsupported MIME type "${mimeType}" for media transformation`);
}

export function calculateResizeDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  assertPositiveInteger(width, 'width');
  assertPositiveInteger(height, 'height');
  assertPositiveInteger(maxWidth, 'maxWidth');
  assertPositiveInteger(maxHeight, 'maxHeight');

  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

export function buildOutputFilename(original: string, format: OutputFormat): string {
  const parsed = pathSafeParse(original);
  const outputExtension =
    format === 'webm'
      ? '.webm'
      : format === 'mp4'
        ? '.mp4'
        : '.webp';

  return format === 'thumbnail'
    ? `${parsed.name}-thumbnail${outputExtension}`
    : `${parsed.name}${outputExtension}`;
}

@Injectable()
export class SharpImageTransformer implements ImageTransformer {
  constructor(private readonly spanTracer: Tracer = tracer) {}

  async inspectImage(input: TransformInput): Promise<ImageInspection> {
    return this.spanTracer.startActiveSpan('mediaTransform.inspectImage', async (span) => {
      span.setAttribute('media_transform.filename', input.filename);
      span.setAttribute('media_transform.mime_type', input.mimeType);
      span.setAttribute('media_transform.input_size', input.buffer.length);

      try {
        const metadata = await this.readMetadata(input);
        const dimensions = getMetadataDimensions(metadata, input.filename);
        span.setAttribute('media_transform.width', dimensions.width);
        span.setAttribute('media_transform.height', dimensions.height);
        span.setAttribute('media_transform.pages', metadata.pages ?? 1);

        return {
          ...dimensions,
          sizeBytes: input.buffer.length,
          mimeType: input.mimeType,
        };
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async transformImage(
    input: TransformInput,
    config: TransformConfig,
  ): Promise<readonly TransformOutput[]> {
    return this.spanTracer.startActiveSpan('mediaTransform.transformImage', async (span) => {
      const startedAt = Date.now();
      span.setAttribute('media_transform.filename', input.filename);
      span.setAttribute('media_transform.mime_type', input.mimeType);

      try {
        const metadata = await this.readMetadata(input);
        const originalDimensions = getMetadataDimensions(metadata, input.filename);
        const resizedDimensions = calculateResizeDimensions(
          originalDimensions.width,
          originalDimensions.height,
          config.maxWidth,
          config.maxHeight,
        );
        const animated = isActuallyAnimated(metadata);

        const pipeline = sharp(input.buffer, createSharpOptions(animated))
          .resize({
            width: resizedDimensions.width,
            height: resizedDimensions.height,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({
            quality: config.imageQuality,
            alphaQuality: 100,
            effort: 6,
            loop: metadata.loop ?? 0,
            delay: metadata.delay,
            mixed: animated,
          });

        const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
        const output = this.toTransformOutput(
          input.filename,
          animated ? 'animatedWebp' : 'webp',
          data,
          info,
          Date.now() - startedAt,
        );

        span.setAttribute('media_transform.output_format', output.format);
        span.setAttribute('media_transform.output_width', output.width);
        span.setAttribute('media_transform.output_height', output.height);
        span.setAttribute('media_transform.output_size', output.sizeBytes);

        return [output];
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async generateThumbnail(
    input: TransformInput,
    config: TransformConfig,
  ): Promise<TransformOutput> {
    return this.spanTracer.startActiveSpan('mediaTransform.generateImageThumbnail', async (span) => {
      const startedAt = Date.now();
      span.setAttribute('media_transform.filename', input.filename);
      span.setAttribute('media_transform.mime_type', input.mimeType);

      try {
        const { data, info } = await sharp(input.buffer, createSharpOptions(false))
          .resize({
            width: config.thumbnailWidth,
            height: config.thumbnailHeight,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({
            quality: Math.min(config.imageQuality, 75),
            alphaQuality: 100,
            effort: 4,
          })
          .toBuffer({ resolveWithObject: true });

        const output = this.toTransformOutput(
          input.filename,
          'thumbnail',
          data,
          info,
          Date.now() - startedAt,
        );

        span.setAttribute('media_transform.thumbnail_width', output.width);
        span.setAttribute('media_transform.thumbnail_height', output.height);
        span.setAttribute('media_transform.thumbnail_size', output.sizeBytes);
        return output;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async readMetadata(input: TransformInput): Promise<Metadata> {
    return sharp(input.buffer, createSharpOptions(isAnimatedImage(input.mimeType))).metadata();
  }

  private toTransformOutput(
    originalFilename: string,
    format: OutputFormat,
    data: Buffer,
    info: OutputInfo,
    durationMs: number,
  ): TransformOutput {
    return {
      buffer: data,
      format,
      width: info.width,
      height: info.pageHeight ?? info.height,
      sizeBytes: info.size,
      filename: buildOutputFilename(originalFilename, format),
      durationMs: Math.max(1, durationMs),
    };
  }
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase();
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function pathSafeParse(filename: string): { name: string } {
  const sanitized = filename.replaceAll('\\', '/').split('/').at(-1) ?? 'asset';
  const dotIndex = sanitized.lastIndexOf('.');
  return {
    name: dotIndex > 0 ? sanitized.slice(0, dotIndex) : sanitized,
  };
}

function createSharpOptions(animated: boolean): sharp.SharpOptions {
  return {
    animated,
    autoOrient: true,
    failOn: 'error',
  };
}

function isActuallyAnimated(metadata: Metadata): boolean {
  return (metadata.pages ?? 1) > 1;
}

function getMetadataDimensions(
  metadata: Metadata,
  filename: string,
): { width: number; height: number } {
  const width = metadata.width;
  const height = metadata.pageHeight ?? metadata.height;
  if (!width || !height) {
    throw new Error(`Unable to determine dimensions for image "${filename}"`);
  }

  return { width, height };
}
