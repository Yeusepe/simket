/**
 * Tests: CDNgine integration service — asset upload, transformation, and metadata.
 *
 * Governing docs:
 *   - docs/architecture.md (§5 CDNgine owns artefacts)
 *   - docs/service-architecture.md (CDNgine integration)
 * External references:
 *   - CDNgine internal API contract (see cdngine.types.ts)
 *   - https://github.com/connor4312/cockatiel (resilience wrapping)
 */
import { describe, it, expect, vi } from 'vitest';
import { CdngineService } from './cdngine.service.js';
import {
  SUPPORTED_MIME_TYPES,
  type PresignResponse,
  type AssetMetadata,
  type TransformResponse,
  type TransformWebhookPayload,
} from './cdngine.types.js';

// ---------- helpers ----------

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/** Create a mock fetcher that returns the given JSON body. */
function mockFetcher(status: number, body: unknown): Fetcher {
  return vi.fn<Fetcher>().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const BASE_URL = 'https://cdn.internal.test';
const API_KEY = 'test-api-key';

function createService(fetcher: Fetcher): CdngineService {
  return new CdngineService(BASE_URL, API_KEY, fetcher);
}

// ---------- presignUpload ----------

describe('CdngineService.presignUpload', () => {
  const validPresign: PresignResponse = {
    uploadUrl: 'https://cdn.internal.test/upload/abc',
    assetId: 'asset-123',
    expiresAt: '2025-12-31T23:59:59Z',
  };

  it('calls correct endpoint and returns upload URL + asset ID', async () => {
    const fetcher = mockFetcher(200, validPresign);
    const svc = createService(fetcher);

    const result = await svc.presignUpload({
      filename: 'hero.png',
      mimeType: 'image/png',
      creatorId: 'creator-1',
    });

    expect(result).toEqual(validPresign);

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${BASE_URL}/api/v1/upload/presign`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      filename: 'hero.png',
      mimeType: 'image/png',
      creatorId: 'creator-1',
    });
    expect((init.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${API_KEY}`,
    );
  });

  it('rejects empty filename', async () => {
    const svc = createService(mockFetcher(200, validPresign));
    await expect(
      svc.presignUpload({ filename: '', mimeType: 'image/png', creatorId: 'c1' }),
    ).rejects.toThrow(/filename/i);
  });

  it('rejects unsupported mimeType', async () => {
    const svc = createService(mockFetcher(200, validPresign));
    await expect(
      svc.presignUpload({
        filename: 'file.exe',
        mimeType: 'application/x-executable',
        creatorId: 'c1',
      }),
    ).rejects.toThrow(/mime/i);
  });
});

// ---------- requestTransform ----------

describe('CdngineService.requestTransform', () => {
  const validTransform: TransformResponse = {
    jobId: 'job-456',
    status: 'queued',
  };

  it('calls correct endpoint and returns job ID', async () => {
    const fetcher = mockFetcher(200, validTransform);
    const svc = createService(fetcher);

    const result = await svc.requestTransform({
      assetId: 'asset-123',
      operations: [{ type: 'resize', width: 800, height: 600 }],
    });

    expect(result).toEqual(validTransform);

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${BASE_URL}/api/v1/transform`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      assetId: 'asset-123',
      operations: [{ type: 'resize', width: 800, height: 600 }],
    });
  });

  it('rejects empty assetId', async () => {
    const svc = createService(mockFetcher(200, validTransform));
    await expect(
      svc.requestTransform({
        assetId: '',
        operations: [{ type: 'resize', width: 100, height: 100 }],
      }),
    ).rejects.toThrow(/assetId/i);
  });

  it('rejects empty operations array', async () => {
    const svc = createService(mockFetcher(200, validTransform));
    await expect(
      svc.requestTransform({ assetId: 'a1', operations: [] }),
    ).rejects.toThrow(/operations/i);
  });
});

// ---------- getAssetMetadata ----------

describe('CdngineService.getAssetMetadata', () => {
  const validMeta: AssetMetadata = {
    assetId: 'asset-123',
    status: 'ready',
    url: 'https://cdn.internal.test/assets/asset-123',
    mimeType: 'image/png',
    width: 1920,
    height: 1080,
    size: 204800,
  };

  it('calls correct endpoint and returns metadata', async () => {
    const fetcher = mockFetcher(200, validMeta);
    const svc = createService(fetcher);

    const result = await svc.getAssetMetadata('asset-123');

    expect(result).toEqual(validMeta);

    expect(fetcher).toHaveBeenCalledOnce();
    const [url] = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toBe(`${BASE_URL}/api/v1/assets/asset-123`);
  });

  it('returns null for 404', async () => {
    const fetcher = mockFetcher(404, { error: 'not found' });
    const svc = createService(fetcher);

    const result = await svc.getAssetMetadata('nonexistent');
    expect(result).toBeNull();
  });

  it('throws for non-404 error responses', async () => {
    const fetcher = mockFetcher(500, { error: 'internal' });
    const svc = createService(fetcher);

    await expect(svc.getAssetMetadata('asset-123')).rejects.toThrow(/500/);
  });
});

// ---------- parseTransformWebhook ----------

describe('CdngineService.parseTransformWebhook', () => {
  const validPayload: TransformWebhookPayload = {
    assetId: 'asset-123',
    jobId: 'job-456',
    status: 'completed',
    outputs: [
      { format: 'webp', url: 'https://cdn.test/out.webp', width: 800, height: 600 },
    ],
  };

  it('parses valid webhook payload correctly', () => {
    const result = CdngineService.parseTransformWebhook(validPayload);
    expect(result).toEqual(validPayload);
  });

  it('rejects payload missing assetId', () => {
    const bad = { ...validPayload, assetId: undefined };
    expect(() =>
      CdngineService.parseTransformWebhook(bad as unknown as TransformWebhookPayload),
    ).toThrow(/assetId/i);
  });

  it('rejects payload missing jobId', () => {
    const bad = { ...validPayload, jobId: undefined };
    expect(() =>
      CdngineService.parseTransformWebhook(bad as unknown as TransformWebhookPayload),
    ).toThrow(/jobId/i);
  });

  it('rejects payload with invalid status', () => {
    const bad = { ...validPayload, status: 'unknown' };
    expect(() =>
      CdngineService.parseTransformWebhook(bad as unknown as TransformWebhookPayload),
    ).toThrow(/status/i);
  });

  it('rejects payload missing outputs', () => {
    const bad = { ...validPayload, outputs: undefined };
    expect(() =>
      CdngineService.parseTransformWebhook(bad as unknown as TransformWebhookPayload),
    ).toThrow(/outputs/i);
  });
});

// ---------- buildHeroTransformOps ----------

describe('CdngineService.buildHeroTransformOps', () => {
  it('generates correct operations for image mimeType', () => {
    const ops = CdngineService.buildHeroTransformOps('image/png');
    expect(ops).toEqual([
      { type: 'format', target: 'webp' },
      { type: 'resize', width: 1200, height: 630 },
    ]);
  });

  it('generates animated-webp for gif', () => {
    const ops = CdngineService.buildHeroTransformOps('image/gif');
    expect(ops).toEqual([
      { type: 'format', target: 'animated-webp' },
      { type: 'resize', width: 1200, height: 630 },
    ]);
  });

  it('generates mp4 target for video mimeType', () => {
    const ops = CdngineService.buildHeroTransformOps('video/mp4');
    expect(ops).toEqual([
      { type: 'format', target: 'mp4' },
      { type: 'resize', width: 1200, height: 630 },
    ]);
  });

  it('defaults to webp for unknown mimeType', () => {
    const ops = CdngineService.buildHeroTransformOps('image/webp');
    expect(ops).toEqual([
      { type: 'format', target: 'webp' },
      { type: 'resize', width: 1200, height: 630 },
    ]);
  });
});

// ---------- SUPPORTED_MIME_TYPES ----------

describe('SUPPORTED_MIME_TYPES', () => {
  it.each([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
  ])('includes %s', (mime) => {
    expect(SUPPORTED_MIME_TYPES.has(mime)).toBe(true);
  });

  it('does not include unsupported types', () => {
    expect(SUPPORTED_MIME_TYPES.has('application/pdf')).toBe(false);
    expect(SUPPORTED_MIME_TYPES.has('text/plain')).toBe(false);
  });
});
