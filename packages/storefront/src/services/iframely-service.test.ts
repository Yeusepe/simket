/**
 * Purpose: Verify iFramely URL validation and response parsing helpers.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap)
 *   - docs/service-architecture.md (§1 service surfaces)
 * External references:
 *   - https://iframely.com/docs/iframely-api
 *   - https://iframely.com/docs/parameters
 * Tests:
 *   - packages/storefront/src/services/iframely-service.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildIframelyApiUrl,
  isEmbeddableUrl,
  parseIframelyResponse,
} from './iframely-service';

describe('isEmbeddableUrl', () => {
  it('accepts valid http and https URLs', () => {
    expect(isEmbeddableUrl('https://example.com/watch?v=123')).toBe(true);
    expect(isEmbeddableUrl('http://example.com/embed')).toBe(true);
  });

  it('rejects unsupported or empty URLs', () => {
    expect(isEmbeddableUrl('')).toBe(false);
    expect(isEmbeddableUrl('ftp://example.com/file')).toBe(false);
    expect(isEmbeddableUrl('javascript:alert(1)')).toBe(false);
    expect(isEmbeddableUrl('not a url')).toBe(false);
  });
});

describe('buildIframelyApiUrl', () => {
  it('encodes the target URL and appends the expected query parameters', () => {
    expect(
      buildIframelyApiUrl('https://example.com/watch?v=1&list=2', 'secret-key'),
    ).toBe(
      'https://cdn.iframe.ly/api/iframely?url=https%3A%2F%2Fexample.com%2Fwatch%3Fv%3D1%26list%3D2&key=secret-key&iframe=1&omit_script=1',
    );
  });
});

describe('parseIframelyResponse', () => {
  it('extracts html and metadata from a valid response', () => {
    expect(
      parseIframelyResponse({
        html: '<iframe src="https://player.example.com/embed/123"></iframe>',
        meta: {
          title: 'Example video',
          site: 'Example Provider',
        },
        links: {
          thumbnail: {
            href: 'https://cdn.example.com/thumb.jpg',
          },
        },
      }),
    ).toEqual({
      html: '<iframe src="https://player.example.com/embed/123"></iframe>',
      title: 'Example video',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      providerName: 'Example Provider',
    });
  });

  it('returns null when html is missing', () => {
    expect(
      parseIframelyResponse({
        meta: { title: 'Missing embed' },
      }),
    ).toBeNull();
  });

  it('returns null for null input', () => {
    expect(parseIframelyResponse(null)).toBeNull();
  });
});
