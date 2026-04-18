/**
 * Purpose: Render persisted TipTap rich text content inside Framely store pages.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap, §5 Framely integration)
 *   - docs/domain-model.md (§4.5 StorePage content)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 *   - https://tiptap.dev/docs/editor/getting-started/install/react
 * Tests:
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import type { JSONContent } from '@tiptap/core';
import type { ReactNode } from 'react';
import { TipTapReadOnly } from '../../components/TipTapEditor';
import type { BlockDefinition } from '../types';

export interface TextBlockProps {
  readonly content?: JSONContent | string;
  readonly children?: ReactNode;
}

export const textBlockDefinition: BlockDefinition = {
  type: 'text',
  label: 'Rich text',
  icon: 'type',
  defaultProps: {
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Tell visitors about your store, products, and latest releases.' }],
        },
      ],
    },
  },
  propSchema: {
    fields: [
      {
        name: 'content',
        type: 'richtext',
        label: 'Content',
        required: true,
      },
    ],
  },
};

export function TextBlock({
  content = textBlockDefinition.defaultProps.content as JSONContent,
  children,
}: TextBlockProps) {
  return (
    <div className="rounded-[var(--builder-border-radius,1.5rem)] bg-transparent">
      <TipTapReadOnly className="text-foreground" content={content} />
      {children}
    </div>
  );
}
