/**
 * Purpose: Verify the custom TipTap Cavalry embed node contract.
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
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../components/CavalryPlayer', () => ({
  CavalryPlayerNodeView: () => null,
}));

import { CavalryEmbed } from './cavalry-extension';

describe('CavalryEmbed', () => {
  const extensionContext = {
    name: 'cavalryEmbed',
    options: {},
    storage: {},
    parent: undefined,
    editor: undefined,
  } as never;

  let editorElement: HTMLDivElement;

  beforeEach(() => {
    editorElement = document.createElement('div');
    document.body.append(editorElement);
  });

  afterEach(() => {
    editorElement.remove();
  });

  it('creates an extension with the expected name', () => {
    expect(CavalryEmbed.name).toBe('cavalryEmbed');
  });

  it('is configured as a block atom node with the expected defaults', () => {
    const attributes = CavalryEmbed.config.addAttributes?.call(extensionContext);

    expect(CavalryEmbed.config.group).toBe('block');
    expect(CavalryEmbed.config.atom).toBe(true);
    expect(attributes).toMatchObject({
      src: expect.objectContaining({ default: null }),
      width: expect.objectContaining({ default: null }),
      height: expect.objectContaining({ default: null }),
      autoplay: expect.objectContaining({ default: false }),
      loop: expect.objectContaining({ default: true }),
      controls: expect.objectContaining({ default: false }),
    });
  });

  it('setCavalryEmbed inserts a node with the provided attributes', () => {
    const editor = new Editor({
      element: editorElement,
      extensions: [StarterKit, CavalryEmbed],
    });

    expect(
      editor.commands.setCavalryEmbed({
        src: 'https://cdn.example.com/animations/product-demo.cv',
        width: 1280,
        height: 720,
        autoplay: true,
      }),
    ).toBe(true);

    expect(editor.getJSON()).toMatchObject({
      type: 'doc',
    });
    expect(editor.getJSON().content?.[0]).toEqual({
      type: 'cavalryEmbed',
      attrs: {
        src: 'https://cdn.example.com/animations/product-demo.cv',
        width: 1280,
        height: 720,
        autoplay: true,
        loop: true,
        controls: false,
      },
    });

    editor.destroy();
  });

  it('toggleCavalryEmbed removes an existing Cavalry node', () => {
    const editor = new Editor({
      element: editorElement,
      extensions: [StarterKit, CavalryEmbed],
    });

    editor.commands.setCavalryEmbed({
      src: 'https://cdn.example.com/animations/product-demo.cv',
    });

    expect(
      editor.commands.toggleCavalryEmbed({
        src: 'https://cdn.example.com/animations/product-demo.cv',
      }),
    ).toBe(true);
    expect(
      editor.getJSON().content?.some((node) => node.type === 'cavalryEmbed'),
    ).toBe(false);

    editor.destroy();
  });

  it('rejects invalid scene URLs', () => {
    const editor = new Editor({
      element: editorElement,
      extensions: [StarterKit, CavalryEmbed],
    });

    expect(
      editor.commands.setCavalryEmbed({
        src: 'https://cdn.example.com/animations/product-demo.json',
      }),
    ).toBe(false);
    expect(editor.getJSON()).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
        },
      ],
    });

    editor.destroy();
  });
});
