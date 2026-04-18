/**
 * Purpose: Verify the custom TipTap iFramely embed node contract.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap)
 *   - docs/domain-model.md (§4.1 Product description)
 * External references:
 *   - https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node
 *   - https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views
 * Tests:
 *   - packages/storefront/src/extensions/iframely-embed.test.ts
 */
import { describe, expect, it } from 'vitest';
import { IframelyEmbed } from './iframely-embed';

describe('IframelyEmbed', () => {
  const extensionContext = {
    name: 'iframelyEmbed',
    options: {},
    storage: {},
    parent: undefined,
    editor: undefined,
  } as never;

  it('creates an extension with the expected name', () => {
    expect(IframelyEmbed.name).toBe('iframelyEmbed');
  });

  it('is configured as a block atom node', () => {
    expect(IframelyEmbed.config.group).toBe('block');
    expect(IframelyEmbed.config.atom).toBe(true);
  });

  it('stores url and html attributes', () => {
    const attributes = IframelyEmbed.config.addAttributes?.call(extensionContext);

    expect(attributes).toMatchObject({
      url: expect.objectContaining({ default: null }),
      html: expect.objectContaining({ default: '' }),
    });
  });

  it('parses an iFramely div from HTML', () => {
    const parseRules = IframelyEmbed.config.parseHTML?.call(extensionContext) ?? [];
    const parseRule = parseRules[0];
    const element = document.createElement('div');

    element.setAttribute('data-iframely-url', 'https://example.com/embed');
    element.className = 'iframely-embed';
    element.innerHTML = '<iframe src="https://cdn.iframe.ly/widget"></iframe>';

    expect(parseRule?.tag).toBe('div[data-iframely-url]');
    expect(
      typeof parseRule?.getAttrs === 'function' ? parseRule.getAttrs(element) : null,
    ).toEqual({
      url: 'https://example.com/embed',
      html: '<iframe src="https://cdn.iframe.ly/widget"></iframe>',
    });
  });

  it('renders a div with iFramely attributes and HTML', () => {
    const rendered = IframelyEmbed.config.renderHTML?.call(extensionContext, {
      node: { attrs: {} } as never,
      HTMLAttributes: {
        url: 'https://example.com/embed',
        html: '<iframe src="https://cdn.iframe.ly/widget"></iframe>',
      },
    });

    expect(rendered).toBeInstanceOf(HTMLElement);
    expect((rendered as HTMLElement).tagName).toBe('DIV');
    expect((rendered as HTMLElement).getAttribute('data-iframely-url')).toBe(
      'https://example.com/embed',
    );
    expect((rendered as HTMLElement).className).toContain('iframely-embed');
    expect((rendered as HTMLElement).innerHTML).toContain(
      'https://cdn.iframe.ly/widget',
    );
  });

  it('falls back to a safe link when embed HTML uses a disallowed iframe host', () => {
    const rendered = IframelyEmbed.config.renderHTML?.call(extensionContext, {
      node: { attrs: {} } as never,
      HTMLAttributes: {
        url: 'https://example.com/embed',
        html: '<iframe src="https://evil.example.com/embed"></iframe>',
      },
    });

    expect((rendered as HTMLElement).innerHTML).toContain('https://example.com/embed');
    expect((rendered as HTMLElement).innerHTML).not.toContain('evil.example.com');
  });
});
