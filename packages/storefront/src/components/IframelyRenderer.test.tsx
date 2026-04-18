/**
 * Purpose: Verify read-only iFramely embed rendering in the storefront.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap, §3 client apps)
 *   - docs/domain-model.md (§4.1 Product description)
 * External references:
 *   - https://iframely.com/docs/iframely-api
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/IframelyRenderer.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IframelyRenderer } from './IframelyRenderer';

describe('IframelyRenderer', () => {
  it('renders embed HTML when provided', () => {
    const { container } = render(
      <IframelyRenderer
        html="<blockquote>Embedded content</blockquote>"
        url="https://example.com/embed"
        title="Example embed"
      />,
    );

    expect(container.querySelector('blockquote')).toHaveTextContent(
      'Embedded content',
    );
  });

  it('shows a fallback link when html is empty', () => {
    render(
      <IframelyRenderer
        html=""
        url="https://example.com/embed"
        title="Example embed"
      />,
    );

    const link = screen.getByRole('link', { name: 'Example embed' });
    expect(link).toHaveAttribute('href', 'https://example.com/embed');
  });

  it('applies container styling classes', () => {
    const { container } = render(
      <IframelyRenderer
        html="<div>Styled embed</div>"
        url="https://example.com/embed"
      />,
    );

    expect(container.firstElementChild).toHaveClass(
      'iframely-renderer',
      'overflow-hidden',
      'rounded-xl',
    );
  });
});
