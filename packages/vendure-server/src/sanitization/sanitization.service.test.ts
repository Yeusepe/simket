/**
 * Purpose: Verify server-side HTML and TipTap sanitization for user-provided rich text.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap, §2 fail-closed security)
 *   - docs/service-architecture.md (§1.1 Vendure Bebop gateway)
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://github.com/cure53/DOMPurify/blob/main/README.md
 *   - https://github.com/kkomelin/isomorphic-dompurify
 * Tests:
 *   - packages/vendure-server/src/sanitization/sanitization.service.test.ts
 */
import { describe, expect, it } from 'vitest';
import { SanitizationService } from './sanitization.service.js';

describe('SanitizationService', () => {
  const service = new SanitizationService();

  it('strips scripts, event handlers, javascript: urls, and SVG-based XSS from raw HTML', () => {
    const sanitized = service.sanitizeHtml(`
      <h2>Heading</h2>
      <script>alert(1)</script>
      <img src="https://cdn.example.com/image.png" onerror="alert(1)" />
      <a href="javascript:void(0)" onclick="alert(1)">Unsafe link</a>
      <svg><g onload="alert(1)"></g></svg>
    `);

    expect(sanitized).toContain('<h2>Heading</h2>');
    expect(sanitized).toContain('<img');
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('<svg');
  });

  it('preserves allowed iFramely iframe embeds and strips disallowed iframe hosts', () => {
    const sanitized = service.sanitizeHtml(`
      <iframe
        src="https://cdn.iframe.ly/widget"
        title="Allowed embed"
        allowfullscreen
      ></iframe>
      <iframe src="https://evil.example.com/embed"></iframe>
    `);

    expect(sanitized).toContain('https://cdn.iframe.ly/widget');
    expect(sanitized).toContain('<iframe');
    expect(sanitized).not.toContain('https://evil.example.com/embed');
  });

  it('preserves cavalry-player custom elements while stripping unsafe attributes', () => {
    const sanitized = service.sanitizeHtml(`
      <cavalry-player
        src="https://assets.example.com/scene.cv"
        controls="true"
        onclick="alert(1)"
      ></cavalry-player>
    `);

    expect(sanitized).toContain('<cavalry-player');
    expect(sanitized).toContain('src="https://assets.example.com/scene.cv"');
    expect(sanitized).toContain('controls="true"');
    expect(sanitized).not.toContain('onclick');
  });

  it('sanitizes serialized TipTap JSON content while preserving normal formatting and allowed embeds', () => {
    const input = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Safe title' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Visit ' },
            {
              type: 'text',
              text: 'this link',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
        {
          type: 'iframelyEmbed',
          attrs: {
            url: 'https://example.com/watch',
            html: '<iframe src="https://cdn.iframe.ly/widget"></iframe><script>alert(1)</script>',
          },
        },
        {
          type: 'image',
          attrs: {
            src: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
            alt: 'Blocked image',
          },
        },
      ],
    });

    const sanitized = JSON.parse(service.sanitizeRichText(input)) as {
      content: Array<Record<string, unknown>>;
    };

    expect(JSON.stringify(sanitized)).toContain('Safe title');
    expect(JSON.stringify(sanitized)).toContain('cdn.iframe.ly/widget');
    expect(JSON.stringify(sanitized)).not.toContain('javascript:');
    expect(JSON.stringify(sanitized)).not.toContain('<script');
    expect(JSON.stringify(sanitized)).not.toContain('data:text/html');
  });

  it('sanitizes serialized store page content recursively for post-sale pages', () => {
    const input = JSON.stringify({
      blocks: [
        {
          type: 'text',
          props: {
            content:
              '<p><strong>Thanks for your purchase</strong></p><img src="https://cdn.example.com/image.png" onerror="alert(1)" />',
          },
        },
        {
          type: 'embed',
          props: {
            html: '<iframe src="https://evil.example.com/embed"></iframe>',
          },
        },
      ],
    });

    const sanitized = service.sanitizeStorePageContent(input);

    expect(sanitized).toContain('<strong>Thanks for your purchase</strong>');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('evil.example.com');
  });
});
