/**
 * Purpose: Verify Framely page schemas render predictably through the storefront page renderer.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing and change-safety)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 *   - https://dev.to/belastrittmatter/building-a-nextjs-website-editor-bj3
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageRenderer } from './renderer';
import { CURRENT_PAGE_SCHEMA_VERSION } from './types';

describe('PageRenderer', () => {
  it('renders nothing for an empty schema', () => {
    const { container } = render(
      <PageRenderer schema={{ version: CURRENT_PAGE_SCHEMA_VERSION, blocks: [] }} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders registered blocks from schema props', () => {
    render(
      <PageRenderer
        schema={{
          version: CURRENT_PAGE_SCHEMA_VERSION,
          blocks: [
            {
              id: 'hero-1',
              type: 'hero',
              props: {
                title: 'Custom storefronts',
                subtitle: 'Launch a creator-first landing page.',
                ctaLabel: 'Get started',
                ctaHref: '/start',
              },
            },
            {
              id: 'button-1',
              type: 'button',
              props: {
                label: 'Shop now',
                href: '/shop',
              },
            },
          ],
          theme: {
            primaryColor: '#4f46e5',
            backgroundColor: '#09090b',
          },
        }}
      />,
    );

    expect(screen.getByText('Custom storefronts')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /shop now/i })).toHaveAttribute(
      'href',
      '/shop',
    );
    expect(screen.getByTestId('builder-page-renderer')).toHaveAttribute(
      'style',
      expect.stringContaining('--builder-primary-color: #4f46e5'),
    );
  });

  it('skips unknown block types without breaking known blocks', () => {
    render(
      <PageRenderer
        schema={{
          version: CURRENT_PAGE_SCHEMA_VERSION,
          blocks: [
            {
              id: 'unknown-1',
              type: 'missing',
              props: {},
            },
            {
              id: 'text-1',
              type: 'text',
              props: {
                content: {
                  type: 'doc',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Still visible' }],
                    },
                  ],
                },
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Still visible')).toBeInTheDocument();
    expect(screen.queryByTestId('builder-block-missing')).not.toBeInTheDocument();
  });

  it('renders nested child blocks recursively', () => {
    render(
      <PageRenderer
        schema={{
          version: CURRENT_PAGE_SCHEMA_VERSION,
          blocks: [
            {
              id: 'hero-1',
              type: 'hero',
              props: {
                title: 'Nested content',
                subtitle: 'Children should render below the hero copy.',
              },
              children: [
                {
                  id: 'button-1',
                  type: 'button',
                  props: {
                    label: 'Explore creator pages',
                    href: '/creators',
                  },
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole('link', { name: /explore creator pages/i }),
    ).toHaveAttribute('href', '/creators');
  });
});
