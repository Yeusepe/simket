/**
 * Tests: HTML embed sanitization pure functions
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 */
import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeIframeEmbed,
  isAllowedEmbedDomain,
  stripDangerousAttributes,
  ALLOWED_EMBED_DOMAINS,
} from './html-sanitize.service';

describe('HtmlSanitizeService', () => {
  describe('sanitizeHtml', () => {
    it('strips script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('strips event handler attributes', () => {
      const input = '<p onclick="alert(1)" onmouseover="steal()">Click me</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onmouseover');
      expect(result).toContain('Click me');
    });

    it('strips javascript: protocol in href', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    it('allows safe HTML tags', () => {
      const input = '<p><strong>Bold</strong> and <em>italic</em> with <a href="https://example.com">link</a></p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
      expect(result).toContain('href="https://example.com"');
    });

    it('strips style tags', () => {
      const input = '<style>body { display: none; }</style><p>Visible</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<style');
      expect(result).toContain('Visible');
    });

    it('handles empty input', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('strips data: protocol in img src', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('data:text/html');
    });
  });

  describe('sanitizeIframeEmbed', () => {
    it('allows iframes from approved domains', () => {
      const input = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>';
      const result = sanitizeIframeEmbed(input);
      expect(result).toContain('youtube.com');
      expect(result).toContain('sandbox=');
    });

    it('rejects iframes from unknown domains', () => {
      const input = '<iframe src="https://evil.com/steal"></iframe>';
      const result = sanitizeIframeEmbed(input);
      expect(result).toBe('');
    });

    it('adds sandbox attribute to allowed iframes', () => {
      const input = '<iframe src="https://player.vimeo.com/video/123"></iframe>';
      const result = sanitizeIframeEmbed(input);
      expect(result).toContain('sandbox="allow-scripts allow-same-origin"');
    });

    it('strips dangerous attributes from iframes', () => {
      const input = '<iframe src="https://www.youtube.com/embed/abc" onload="alert(1)" onclick="steal()"></iframe>';
      const result = sanitizeIframeEmbed(input);
      expect(result).not.toContain('onload');
      expect(result).not.toContain('onclick');
    });
  });

  describe('isAllowedEmbedDomain', () => {
    it('allows YouTube', () => {
      expect(isAllowedEmbedDomain('https://www.youtube.com/embed/abc')).toBe(true);
    });

    it('allows Vimeo', () => {
      expect(isAllowedEmbedDomain('https://player.vimeo.com/video/123')).toBe(true);
    });

    it('allows Twitter/X embeds', () => {
      expect(isAllowedEmbedDomain('https://platform.twitter.com/embed/xyz')).toBe(true);
    });

    it('allows GitHub gists', () => {
      expect(isAllowedEmbedDomain('https://gist.github.com/user/abc')).toBe(true);
    });

    it('rejects unknown domains', () => {
      expect(isAllowedEmbedDomain('https://malicious.com/page')).toBe(false);
    });

    it('rejects javascript protocol', () => {
      expect(isAllowedEmbedDomain('javascript:alert(1)')).toBe(false);
    });

    it('allows CodePen', () => {
      expect(isAllowedEmbedDomain('https://codepen.io/pen/abc')).toBe(true);
    });

    it('allows Spotify', () => {
      expect(isAllowedEmbedDomain('https://open.spotify.com/embed/track/123')).toBe(true);
    });
  });

  describe('stripDangerousAttributes', () => {
    it('strips all on* event handlers', () => {
      const attrs = {
        src: 'https://example.com',
        onclick: 'alert(1)',
        onmouseover: 'steal()',
        onerror: 'hack()',
        class: 'my-class',
      };
      const result = stripDangerousAttributes(attrs);
      expect(result).toEqual({ src: 'https://example.com', class: 'my-class' });
    });

    it('strips style attribute', () => {
      const attrs = { style: 'background: url(javascript:alert(1))', id: 'safe' };
      const result = stripDangerousAttributes(attrs);
      expect(result).toEqual({ id: 'safe' });
    });

    it('returns empty object for all-dangerous attributes', () => {
      const attrs = { onclick: 'x', onload: 'y', style: 'z' };
      const result = stripDangerousAttributes(attrs);
      expect(result).toEqual({});
    });
  });
});
