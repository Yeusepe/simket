/**
 * Purpose: Transform uploaded videos into WebM derivatives and WebP thumbnails using ffmpeg.
 * Governing docs:
 *   - docs/architecture.md (§2 Worker-first, §5 Asset pipeline)
 *   - docs/service-architecture.md (§9 Media asset lifecycle, §11 resilience patterns)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
 *   - https://github.com/eugeneware/ffmpeg-static
 *   - packages/vendure-server/node_modules/@types/fluent-ffmpeg/index.d.ts
 *   - packages/vendure-server/node_modules/ffmpeg-static/types/index.d.ts
 *   - packages/vendure-server/node_modules/ffprobe-static/index.js
 * Tests:
 *   - packages/vendure-server/src/features/media-transform/transform.service.test.ts
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace, type Tracer } from '@opentelemetry/api';
import ffmpeg from 'fluent-ffmpeg';
import { buildOutputFilename, calculateResizeDimensions } from './image-transformer.js';
import type { TransformConfig, TransformOutput } from './transform.types.js';

const require = createRequire(import.meta.url);
const ffmpegBinaryPath = require('ffmpeg-static') as string | null;
const ffprobeStatic = require('ffprobe-static') as { path?: string };
const tracer = trace.getTracer('simket-media-transform');

interface ProbeStream {
  readonly codec_type?: string;
  readonly width?: number;
  readonly height?: number;
}

interface ProbeFormat {
  readonly duration?: number;
  readonly size?: number;
}

interface ProbeData {
  readonly streams: readonly ProbeStream[];
  readonly format: ProbeFormat;
}

export interface VideoInspection {
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
  readonly mimeType: string;
  readonly durationSeconds: number;
}

export interface VideoTransformer {
  inspectVideo(inputPath: string): Promise<VideoInspection>;
  transformVideo(inputPath: string, config: TransformConfig): Promise<TransformOutput>;
  generateVideoThumbnail(inputPath: string, config: TransformConfig): Promise<TransformOutput>;
}

@Injectable()
export class FfmpegVideoTransformer implements VideoTransformer {
  constructor(private readonly spanTracer: Tracer = tracer) {
    configureFfmpegPaths();
  }

  async inspectVideo(inputPath: string): Promise<VideoInspection> {
    return this.spanTracer.startActiveSpan('mediaTransform.inspectVideo', async (span) => {
      span.setAttribute('media_transform.input_path', inputPath);

      try {
        const probe = await probeFile(inputPath);
        const videoStream = getVideoStream(probe, inputPath);
        const width = videoStream.width;
        const height = videoStream.height;
        const durationSeconds = Number(probe.format.duration ?? 0);
        const sizeBytes = Number(probe.format.size ?? 0);

        if (!width || !height) {
          throw new Error(`Unable to determine dimensions for video "${inputPath}"`);
        }

        span.setAttribute('media_transform.width', width);
        span.setAttribute('media_transform.height', height);
        span.setAttribute('media_transform.duration_seconds', durationSeconds);
        span.setAttribute('media_transform.size_bytes', sizeBytes);

        return {
          width,
          height,
          sizeBytes,
          mimeType: mimeTypeFromExtension(path.extname(inputPath)),
          durationSeconds,
        };
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async transformVideo(inputPath: string, config: TransformConfig): Promise<TransformOutput> {
    return this.spanTracer.startActiveSpan('mediaTransform.transformVideo', async (span) => {
      const startedAt = Date.now();
      span.setAttribute('media_transform.input_path', inputPath);

      try {
        const inspection = await this.inspectVideo(inputPath);
        if (inspection.durationSeconds > config.videoMaxDuration) {
          throw new Error(
            `Video duration ${inspection.durationSeconds}s exceeds limit of ${config.videoMaxDuration}s`,
          );
        }

        const resized = normalizeVideoDimensions(
          calculateResizeDimensions(
            inspection.width,
            inspection.height,
            config.maxWidth,
            config.maxHeight,
          ),
        );
        const outputPath = path.join(
          path.dirname(inputPath),
          buildOutputFilename(path.basename(inputPath), 'webm'),
        );

        await executeCommand(
          ffmpeg(inputPath)
            .videoCodec('libvpx-vp9')
            .audioCodec('libopus')
            .outputOptions([
              '-map 0:v:0',
              '-map 0:a?',
              `-b:v ${config.videoBitrate}`,
              '-crf 32',
              '-deadline good',
              '-cpu-used 2',
              '-row-mt 1',
              `-vf scale=${resized.width}:${resized.height}:force_original_aspect_ratio=decrease`,
            ])
            .format('webm')
            .save(outputPath),
        );

        const buffer = await readFile(outputPath);
        const transformed = await this.inspectVideo(outputPath);
        const durationMs = Math.max(1, Date.now() - startedAt);

        span.setAttribute('media_transform.output_width', transformed.width);
        span.setAttribute('media_transform.output_height', transformed.height);
        span.setAttribute('media_transform.output_size', buffer.length);

        return {
          buffer,
          format: 'webm' as const,
          width: transformed.width,
          height: transformed.height,
          sizeBytes: buffer.length,
          filename: path.basename(outputPath),
          durationMs,
        };
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async generateVideoThumbnail(
    inputPath: string,
    config: TransformConfig,
  ): Promise<TransformOutput> {
    return this.spanTracer.startActiveSpan('mediaTransform.generateVideoThumbnail', async (span) => {
      const startedAt = Date.now();
      span.setAttribute('media_transform.input_path', inputPath);

      try {
        const inspection = await this.inspectVideo(inputPath);
        const seekSeconds = inspection.durationSeconds >= 1 ? 1 : 0;
        const resized = normalizeVideoDimensions(
          calculateResizeDimensions(
            inspection.width,
            inspection.height,
            config.thumbnailWidth,
            config.thumbnailHeight,
          ),
        );
        const outputPath = path.join(
          path.dirname(inputPath),
          buildOutputFilename(path.basename(inputPath), 'thumbnail'),
        );

        await executeCommand(
          ffmpeg(inputPath)
            .seekInput(seekSeconds)
            .frames(1)
            .noAudio()
            .videoCodec('libwebp')
            .outputOptions([
              `-vf scale=${resized.width}:${resized.height}:force_original_aspect_ratio=decrease`,
              '-q:v 70',
              '-compression_level 6',
            ])
            .format('webp')
            .save(outputPath),
        );

        const buffer = await readFile(outputPath);
        const thumbnail = await probeStillImage(outputPath);
        return {
          buffer,
          format: 'thumbnail' as const,
          width: thumbnail.width,
          height: thumbnail.height,
          sizeBytes: buffer.length,
          filename: path.basename(outputPath),
          durationMs: Math.max(1, Date.now() - startedAt),
        };
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

function configureFfmpegPaths(): void {
  if (!ffmpegBinaryPath) {
    throw new Error('ffmpeg-static did not provide a usable ffmpeg binary path');
  }
  if (!ffprobeStatic.path) {
    throw new Error('ffprobe-static did not provide a usable ffprobe binary path');
  }

  ffmpeg.setFfmpegPath(ffmpegBinaryPath);
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

function getVideoStream(probe: ProbeData, inputPath: string): ProbeStream {
  const stream = probe.streams.find((item) => item.codec_type === 'video');
  if (!stream) {
    throw new Error(`No video stream found in "${inputPath}"`);
  }

  return stream;
}

function normalizeVideoDimensions(dimensions: {
  readonly width: number;
  readonly height: number;
}): { width: number; height: number } {
  return {
    width: toEven(dimensions.width),
    height: toEven(dimensions.height),
  };
}

function toEven(value: number): number {
  return value % 2 === 0 ? value : Math.max(2, value - 1);
}

function mimeTypeFromExtension(extension: string): string {
  const normalized = extension.toLowerCase();
  if (normalized === '.webm') {
    return 'video/webm';
  }
  if (normalized === '.mov') {
    return 'video/quicktime';
  }
  return 'video/mp4';
}

function probeFile(inputPath: string): Promise<ProbeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data as ProbeData);
    });
  });
}

async function probeStillImage(inputPath: string): Promise<{ width: number; height: number }> {
  const probe = await probeFile(inputPath);
  const stream = getVideoStream(probe, inputPath);
  if (!stream.width || !stream.height) {
    throw new Error(`Unable to determine dimensions for thumbnail "${inputPath}"`);
  }

  return {
    width: stream.width,
    height: stream.height,
  };
}

function executeCommand(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command.on('end', () => resolve());
    command.on('error', (error) => reject(error));
    command.run();
  });
}
