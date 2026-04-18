/**
 * Purpose: Unit tests for media transform helpers and the orchestrator service.
 * Governing docs:
 *   - docs/architecture.md (§2 Worker-first, §5 Asset pipeline)
 *   - docs/service-architecture.md (§9 Media asset lifecycle, §10 observability)
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://sharp.pixelplumbing.com/api-constructor
 *   - https://sharp.pixelplumbing.com/api-output#webp
 *   - https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
 *   - https://github.com/eugeneware/ffmpeg-static
 *   - packages/vendure-server/node_modules/sharp/lib/index.d.ts
 *   - packages/vendure-server/node_modules/@types/fluent-ffmpeg/index.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/media-transform/transform.service.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import {
  buildOutputFilename,
  calculateResizeDimensions,
  detectMediaType,
  isAnimatedImage,
} from './image-transformer.js';
import { DEFAULT_TRANSFORM_CONFIG, MediaTransformService, resolveTransformConfig } from './transform.service.js';
import type { TransformConfig, TransformOutput } from './transform.types.js';

function createOutput(
  format: TransformOutput['format'],
  filename: string,
): TransformOutput {
  return {
    buffer: Buffer.from(filename),
    format,
    width: 320,
    height: 180,
    sizeBytes: Buffer.byteLength(filename),
    filename,
    durationMs: 12,
  };
}

describe('detectMediaType', () => {
  it('classifies static images', () => {
    expect(detectMediaType('image/jpeg')).toBe('image');
  });

  it('classifies animated images', () => {
    expect(detectMediaType('image/gif')).toBe('animatedImage');
  });

  it('classifies videos', () => {
    expect(detectMediaType('video/mp4')).toBe('video');
  });

  it('rejects unsupported mime types', () => {
    expect(() => detectMediaType('application/pdf')).toThrow(/unsupported/i);
  });
});

describe('isAnimatedImage', () => {
  it('returns true for gif assets', () => {
    expect(isAnimatedImage('image/gif')).toBe(true);
  });

  it('returns false for png assets', () => {
    expect(isAnimatedImage('image/png')).toBe(false);
  });

  it('returns true for webp assets that may contain animation', () => {
    expect(isAnimatedImage('image/webp')).toBe(true);
  });
});

describe('calculateResizeDimensions', () => {
  it('fits landscape images inside the maximum bounds', () => {
    expect(calculateResizeDimensions(4_000, 2_000, 1_200, 1_200)).toEqual({
      width: 1_200,
      height: 600,
    });
  });

  it('fits portrait images inside the maximum bounds', () => {
    expect(calculateResizeDimensions(1_000, 2_000, 800, 800)).toEqual({
      width: 400,
      height: 800,
    });
  });

  it('does not upscale smaller images', () => {
    expect(calculateResizeDimensions(640, 360, 1_200, 1_200)).toEqual({
      width: 640,
      height: 360,
    });
  });

  it('returns exact dimensions when already matching the boundary', () => {
    expect(calculateResizeDimensions(1_200, 630, 1_200, 630)).toEqual({
      width: 1_200,
      height: 630,
    });
  });
});

describe('buildOutputFilename', () => {
  it('builds webp filenames', () => {
    expect(buildOutputFilename('hero image.jpg', 'webp')).toBe('hero image.webp');
  });

  it('builds animated webp filenames', () => {
    expect(buildOutputFilename('loop.gif', 'animatedWebp')).toBe('loop.webp');
  });

  it('builds webm filenames', () => {
    expect(buildOutputFilename('trailer.mp4', 'webm')).toBe('trailer.webm');
  });

  it('builds thumbnail filenames', () => {
    expect(buildOutputFilename('cover.png', 'thumbnail')).toBe('cover-thumbnail.webp');
  });
});

describe('resolveTransformConfig', () => {
  it('returns the repository defaults when no overrides are provided', () => {
    expect(resolveTransformConfig()).toEqual(DEFAULT_TRANSFORM_CONFIG);
  });

  it('merges partial overrides with defaults', () => {
    const expected: TransformConfig = {
      ...DEFAULT_TRANSFORM_CONFIG,
      imageQuality: 72,
    };

    expect(resolveTransformConfig({ imageQuality: 72 })).toEqual(expected);
  });
});

describe('MediaTransformService', () => {
  it('applies default config before delegating to the image transformer', async () => {
    const inspectImage = vi.fn(async () => ({
      width: 640,
      height: 360,
      sizeBytes: 256,
      mimeType: 'image/jpeg',
    }));
    const transformImage = vi.fn(async () => [createOutput('webp', 'hero.webp')]);
    const generateThumbnail = vi.fn(async () =>
      createOutput('thumbnail', 'hero-thumbnail.webp'),
    );
    const inspectVideo = vi.fn();
    const transformVideo = vi.fn();
    const generateVideoThumbnail = vi.fn();

    const service = new MediaTransformService(undefined, {
      imageTransformer: {
        inspectImage,
        transformImage,
        generateThumbnail,
      },
      videoTransformer: {
        inspectVideo,
        transformVideo,
        generateVideoThumbnail,
      },
    });

    const result = await service.processMedia({
      buffer: Buffer.from('image'),
      filename: 'hero.jpg',
      mimeType: 'image/jpeg',
    });

    expect(inspectImage).toHaveBeenCalledOnce();
    expect(transformImage).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'hero.jpg' }),
      DEFAULT_TRANSFORM_CONFIG,
    );
    expect(generateThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'hero.jpg' }),
      DEFAULT_TRANSFORM_CONFIG,
    );
    expect(result.original).toEqual({
      width: 640,
      height: 360,
      sizeBytes: 256,
      mimeType: 'image/jpeg',
    });
    expect(result.outputs).toHaveLength(1);
    expect(result.thumbnail.filename).toBe('hero-thumbnail.webp');
    expect(inspectVideo).not.toHaveBeenCalled();
  });

  it('rejects unsupported mime types before invoking transformers', async () => {
    const inspectImage = vi.fn();
    const transformImage = vi.fn();
    const generateThumbnail = vi.fn();
    const inspectVideo = vi.fn();
    const transformVideo = vi.fn();
    const generateVideoThumbnail = vi.fn();

    const service = new MediaTransformService(undefined, {
      imageTransformer: {
        inspectImage,
        transformImage,
        generateThumbnail,
      },
      videoTransformer: {
        inspectVideo,
        transformVideo,
        generateVideoThumbnail,
      },
    });

    await expect(
      service.processMedia({
        buffer: Buffer.from('document'),
        filename: 'manual.pdf',
        mimeType: 'application/pdf',
      }),
    ).rejects.toThrow(/unsupported/i);

    expect(inspectImage).not.toHaveBeenCalled();
    expect(inspectVideo).not.toHaveBeenCalled();
  });
});
