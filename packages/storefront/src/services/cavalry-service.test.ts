/**
 * Purpose: Verify Cavalry embed URL validation and parsing helpers.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap)
 *   - docs/domain-model.md (§4.1 Product description)
 * External references:
 *   - https://cavalry.studio/docs/web-player/
 *   - https://cavalry.studio/docs/web-player/api/
 * Tests:
 *   - packages/storefront/src/services/cavalry-service.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildCavalryPlayerConfig,
  isValidCavalryUrl,
  parseCavalryEmbed,
} from './cavalry-service';

describe('isValidCavalryUrl', () => {
  it('accepts http and https URLs that point to Cavalry scene assets', () => {
    expect(isValidCavalryUrl('https://cdn.example.com/animations/scene.cv')).toBe(
      true,
    );
    expect(
      isValidCavalryUrl('https://cdn.example.com/animations/scene.cv?version=2'),
    ).toBe(true);
  });

  it('rejects empty, non-http, and non-scene URLs', () => {
    expect(isValidCavalryUrl('')).toBe(false);
    expect(isValidCavalryUrl('javascript:alert(1)')).toBe(false);
    expect(isValidCavalryUrl('ftp://cdn.example.com/scene.cv')).toBe(false);
    expect(isValidCavalryUrl('https://cdn.example.com/scene.json')).toBe(false);
  });
});

describe('parseCavalryEmbed', () => {
  it('parses a direct Cavalry scene URL', () => {
    expect(
      parseCavalryEmbed('https://cdn.example.com/animations/product-demo.cv'),
    ).toEqual({
      src: 'https://cdn.example.com/animations/product-demo.cv',
    });
  });

  it('parses a persisted Cavalry embed div', () => {
    expect(
      parseCavalryEmbed(
        '<div data-cavalry-src="https://cdn.example.com/animations/product-demo.cv" data-cavalry-width="1280" data-cavalry-height="720" data-cavalry-autoplay="false" data-cavalry-loop="false" data-cavalry-controls="true"></div>',
      ),
    ).toEqual({
      src: 'https://cdn.example.com/animations/product-demo.cv',
      width: 1280,
      height: 720,
      autoplay: false,
      loop: false,
      controls: true,
    });
  });

  it('returns undefined for invalid embeds', () => {
    expect(parseCavalryEmbed('<div data-cavalry-src="javascript:alert(1)"></div>')).toBe(
      undefined,
    );
    expect(parseCavalryEmbed('<div>missing src</div>')).toBe(undefined);
  });
});

describe('buildCavalryPlayerConfig', () => {
  it('applies the expected defaults', () => {
    expect(
      buildCavalryPlayerConfig({
        src: 'https://cdn.example.com/animations/product-demo.cv',
      }),
    ).toEqual({
      src: 'https://cdn.example.com/animations/product-demo.cv',
      container: '[data-cavalry-player-container]',
      options: {
        autoplay: false,
        loop: true,
        controls: false,
      },
    });
  });

  it('preserves custom playback options', () => {
    expect(
      buildCavalryPlayerConfig({
        src: 'https://cdn.example.com/animations/product-demo.cv',
        autoplay: true,
        loop: false,
        controls: true,
      }),
    ).toEqual({
      src: 'https://cdn.example.com/animations/product-demo.cv',
      container: '[data-cavalry-player-container]',
      options: {
        autoplay: true,
        loop: false,
        controls: true,
      },
    });
  });
});
