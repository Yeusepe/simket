/**
 * Purpose: Verify storefront defence-in-depth HTML sanitization for TipTap-rendered content.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap, §3 client apps)
 *   - docs/domain-model.md (§4.1 Product description, §4.5 StorePage)
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://github.com/cure53/DOMPurify/blob/main/README.md
 *   - https://github.com/kkomelin/isomorphic-dompurify
 * Tests:
 *   - packages/storefront/src/components/common/SanitizedContent.test.tsx
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SanitizedContent } from './SanitizedContent';

describe('SanitizedContent', () => {
  it('strips script tags, event handlers, javascript: urls, and SVG payloads', () => {
    const { container } = render(
      <SanitizedContent
        html={`
          <p>Safe text</p>
          <script>alert(1)</script>
          <img src="https://cdn.example.com/image.png" onerror="alert(1)" />
          <a href="javascript:void(0)" onclick="alert(1)">Bad link</a>
          <svg><g onload="alert(1)"></g></svg>
        `}
      />,
    );

    expect(container.innerHTML).toContain('Safe text');
    expect(container.innerHTML).not.toContain('<script');
    expect(container.innerHTML).not.toContain('onerror');
    expect(container.innerHTML).not.toContain('onclick');
    expect(container.innerHTML).not.toContain('javascript:');
    expect(container.innerHTML).not.toContain('<svg');
  });

  it('preserves allowed iFramely embeds and cavalry-player elements', () => {
    const { container } = render(
      <SanitizedContent
        html={`
          <iframe src="https://cdn.iframe.ly/widget" title="Allowed embed"></iframe>
          <cavalry-player src="https://assets.example.com/scene.cv" controls="true"></cavalry-player>
        `}
      />,
    );

    expect(container.querySelector('iframe')).toHaveAttribute(
      'src',
      'https://cdn.iframe.ly/widget',
    );
    expect(container.querySelector('cavalry-player')).toHaveAttribute(
      'src',
      'https://assets.example.com/scene.cv',
    );
  });

  it('strips iframe hosts outside the allowlist', () => {
    const { container } = render(
      <SanitizedContent html={'<iframe src="https://evil.example.com/embed"></iframe>'} />,
    );

    expect(container.querySelector('iframe')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('evil.example.com');
  });

  it('preserves normal formatting tags and safe links', () => {
    const { container } = render(
      <SanitizedContent
        html={`
          <h2>Heading</h2>
          <p><strong>Bold</strong> <em>Italic</em> <a href="https://example.com">Link</a></p>
          <img src="https://cdn.example.com/image.png" alt="Preview" />
        `}
      />,
    );

    expect(container.querySelector('h2')).toHaveTextContent('Heading');
    expect(container.querySelector('strong')).toHaveTextContent('Bold');
    expect(container.querySelector('em')).toHaveTextContent('Italic');
    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      'https://example.com/',
    );
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn.example.com/image.png',
    );
  });
});
