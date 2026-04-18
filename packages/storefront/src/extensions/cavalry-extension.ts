/**
 * Purpose: Provide a TipTap block node for persisted Cavalry Web Player embeds.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap)
 *   - docs/domain-model.md (§4.1 Product description)
 * External references:
 *   - https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node
 *   - https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views
 *   - https://cavalry.studio/docs/web-player/
 * Tests:
 *   - packages/storefront/src/extensions/cavalry-extension.test.ts
 */
import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CavalryPlayerNodeView } from '../components/CavalryPlayer';
import {
  isValidCavalryUrl,
  type CavalryEmbedConfig,
} from '../services/cavalry-service';

export interface CavalryEmbedAttributes {
  src: string | null;
  width: number | null;
  height: number | null;
  autoplay: boolean;
  loop: boolean;
  controls: boolean;
}

export interface SetCavalryEmbedOptions extends CavalryEmbedConfig {}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cavalryEmbed: {
      setCavalryEmbed: (options: SetCavalryEmbedOptions) => ReturnType;
      toggleCavalryEmbed: (options: SetCavalryEmbedOptions) => ReturnType;
    };
  }
}

function getBooleanAttribute(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function getNullableNumberAttribute(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function getCavalryAttributes(
  attributes: Record<string, unknown>,
): CavalryEmbedAttributes {
  return {
    src:
      typeof attributes.src === 'string' && attributes.src.length > 0
        ? attributes.src
        : null,
    width: getNullableNumberAttribute(attributes.width),
    height: getNullableNumberAttribute(attributes.height),
    autoplay: getBooleanAttribute(attributes.autoplay, false),
    loop: getBooleanAttribute(attributes.loop, true),
    controls: getBooleanAttribute(attributes.controls, false),
  };
}

function createCavalryElement(attributes: Record<string, unknown>): HTMLElement {
  const element = document.createElement('div');
  const cavalryAttributes = getCavalryAttributes(attributes);

  element.className =
    'cavalry-embed overflow-hidden rounded-xl border border-default-200 bg-content1';
  element.setAttribute('contenteditable', 'false');

  if (cavalryAttributes.src) {
    element.setAttribute('data-cavalry-src', cavalryAttributes.src);
  }

  if (cavalryAttributes.width !== null) {
    element.setAttribute('data-cavalry-width', String(cavalryAttributes.width));
  }

  if (cavalryAttributes.height !== null) {
    element.setAttribute('data-cavalry-height', String(cavalryAttributes.height));
  }

  element.setAttribute(
    'data-cavalry-autoplay',
    String(cavalryAttributes.autoplay),
  );
  element.setAttribute('data-cavalry-loop', String(cavalryAttributes.loop));
  element.setAttribute(
    'data-cavalry-controls',
    String(cavalryAttributes.controls),
  );

  return element;
}

function getRenderableAttributes(attributes: CavalryEmbedAttributes) {
  return {
    class: 'cavalry-embed',
    'data-cavalry-src': attributes.src ?? undefined,
    'data-cavalry-width':
      attributes.width !== null ? String(attributes.width) : undefined,
    'data-cavalry-height':
      attributes.height !== null ? String(attributes.height) : undefined,
    'data-cavalry-autoplay': String(attributes.autoplay),
    'data-cavalry-loop': String(attributes.loop),
    'data-cavalry-controls': String(attributes.controls),
  };
}

function normalizeOptions(options: SetCavalryEmbedOptions): CavalryEmbedAttributes {
  return {
    src: options.src,
    width: options.width ?? null,
    height: options.height ?? null,
    autoplay: options.autoplay ?? false,
    loop: options.loop ?? true,
    controls: options.controls ?? false,
  };
}

export const CavalryEmbed = Node.create({
  name: 'cavalryEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-cavalry-src'),
      },
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-cavalry-width');
          return value ? Number.parseInt(value, 10) : null;
        },
      },
      height: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-cavalry-height');
          return value ? Number.parseInt(value, 10) : null;
        },
      },
      autoplay: {
        default: false,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-cavalry-autoplay') === 'true',
      },
      loop: {
        default: true,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-cavalry-loop') !== 'false',
      },
      controls: {
        default: false,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-cavalry-controls') === 'true',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-cavalry-src]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          const src = node.getAttribute('data-cavalry-src');

          if (!src || !isValidCavalryUrl(src)) {
            return false;
          }

          return {
            src,
            width: node.getAttribute('data-cavalry-width')
              ? Number.parseInt(node.getAttribute('data-cavalry-width') ?? '', 10)
              : null,
            height: node.getAttribute('data-cavalry-height')
              ? Number.parseInt(node.getAttribute('data-cavalry-height') ?? '', 10)
              : null,
            autoplay: node.getAttribute('data-cavalry-autoplay') === 'true',
            loop: node.getAttribute('data-cavalry-loop') !== 'false',
            controls: node.getAttribute('data-cavalry-controls') === 'true',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attributes = getCavalryAttributes(HTMLAttributes);
    const renderedAttributes = mergeAttributes(
      HTMLAttributes,
      getRenderableAttributes(attributes),
    );

    if (typeof document === 'undefined') {
      return ['div', renderedAttributes];
    }

    return createCavalryElement(renderedAttributes);
  },

  addCommands() {
    return {
      setCavalryEmbed:
        (options: SetCavalryEmbedOptions) =>
        ({ commands }) => {
          if (!isValidCavalryUrl(options.src)) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: normalizeOptions(options),
          });
        },
      toggleCavalryEmbed:
        (options: SetCavalryEmbedOptions) =>
        ({ commands, tr, state }) => {
          if (!isValidCavalryUrl(options.src)) {
            return false;
          }

          let nodePosition: number | null = null;

          state.doc.descendants((node, position) => {
            if (node.type.name === this.name) {
              nodePosition = position;
              return false;
            }

            return true;
          });

          if (nodePosition !== null) {
            const cavalryNode = state.doc.nodeAt(nodePosition);

            if (!cavalryNode) {
              return false;
            }

            tr.delete(nodePosition, nodePosition + cavalryNode.nodeSize);
            return true;
          }

          return commands.insertContent({
            type: this.name,
            attrs: normalizeOptions(options),
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CavalryPlayerNodeView);
  },
});
