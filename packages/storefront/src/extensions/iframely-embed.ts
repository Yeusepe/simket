/**
 * Purpose: Provide a TipTap block node for persisted iFramely embeds.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap)
 *   - docs/domain-model.md (§4.1 Product description)
 * External references:
 *   - https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node
 *   - https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views
 * Tests:
 *   - packages/storefront/src/extensions/iframely-embed.test.ts
 */
import { mergeAttributes, Node } from '@tiptap/core';
import { sanitizeEditorContent, sanitizeHtml, sanitizeLinkUrl } from '../sanitization/html-sanitizer';

export interface IframelyEmbedAttributes {
  html: string;
  url: string | null;
}

export interface SetIframelyEmbedOptions {
  html: string;
  url: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframelyEmbed: {
      setIframelyEmbed: (options: SetIframelyEmbedOptions) => ReturnType;
    };
  }
}

function getIframelyUrl(attributes: Record<string, unknown>): string | null {
  const url = attributes.url ?? attributes['data-iframely-url'];

  if (typeof url !== 'string' || url.length === 0) {
    return null;
  }

  return sanitizeLinkUrl(url);
}

function getIframelyHtml(attributes: Record<string, unknown>): string {
  return typeof attributes.html === 'string' ? sanitizeHtml(attributes.html) : '';
}

function syncIframelyElement(
  element: HTMLElement,
  attributes: Record<string, unknown>,
): void {
  const url = getIframelyUrl(attributes);
  const html = getIframelyHtml(attributes);

  element.className =
    'iframely-embed overflow-hidden rounded-xl border border-default-200 bg-content1';
  element.setAttribute('contenteditable', 'false');

  if (url) {
    element.setAttribute('data-iframely-url', url);
  } else {
    element.removeAttribute('data-iframely-url');
  }

  if (html) {
    element.innerHTML = html;
    return;
  }

  element.replaceChildren();

  if (!url) {
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer nofollow';
  link.textContent = url;
  element.append(link);
}

function createIframelyElement(attributes: Record<string, unknown>): HTMLElement {
  const element = document.createElement('div');

  syncIframelyElement(element, attributes);

  return element;
}

export const IframelyEmbed = Node.create({
  name: 'iframelyEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-iframely-url'),
        renderHTML: (attributes: IframelyEmbedAttributes) =>
          attributes.url ? { 'data-iframely-url': attributes.url } : {},
      },
      html: {
        default: '',
        parseHTML: (element: HTMLElement) => element.innerHTML,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-iframely-url]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          return {
            url: node.getAttribute('data-iframely-url'),
            html: node.innerHTML,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attributes = mergeAttributes(HTMLAttributes, {
      class: 'iframely-embed',
      'data-iframely-url': getIframelyUrl(HTMLAttributes) ?? undefined,
    });

    if (typeof document === 'undefined') {
      return ['div', attributes];
    }

    return createIframelyElement(HTMLAttributes);
  },

  addCommands() {
    return {
      setIframelyEmbed:
        (options: SetIframelyEmbedOptions) =>
        ({ commands }) =>
          commands.insertContent({
             type: this.name,
             attrs: sanitizeEditorContent(options),
           }),
     };
   },

  addNodeView() {
    return ({ node }) => {
      const dom = createIframelyElement(node.attrs as Record<string, unknown>);

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }

          syncIframelyElement(dom, updatedNode.attrs as Record<string, unknown>);
          return true;
        },
      };
    };
  },
});
