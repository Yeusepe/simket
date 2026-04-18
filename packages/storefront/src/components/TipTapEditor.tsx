/**
 * Purpose: Reusable TipTap rich text editor for descriptions, TOS, pages, articles.
 * Governing docs:
 *   - docs/architecture.md (§6 UI layer, §4 content model)
 *   - docs/domain-model.md (TipTap JSONB fields)
 * External references:
 *   - https://tiptap.dev/docs/editor/getting-started/install/react
 *   - https://tiptap.dev/docs/editor/api/editor
 *   - https://tiptap.dev/docs/editor/extensions/overview
 *   - https://cavalry.studio/docs/web-player/
 * Tests:
 *   - packages/storefront/src/components/TipTapEditor.test.tsx
 */
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { IframelyEmbed } from '../extensions/iframely-embed';
import { CavalryEmbed } from '../extensions/cavalry-extension';

/**
 * TipTap JSON content structure.
 * Mirrors the JSONContent type from @tiptap/core.
 * Docs: https://tiptap.dev/docs/editor/api/editor#getjson
 */
export interface TipTapJSONContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TipTapJSONContent[];
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
  text?: string;
  [key: string]: unknown;
}

/** Props accepted by the TipTapEditor component. */
export interface TipTapEditorProps {
  /** Initial content — TipTap JSON or an HTML string. */
  content?: TipTapJSONContent | string;
  /**
   * Called on every content change with the updated JSON.
   * Docs: https://tiptap.dev/docs/editor/api/editor#events (onUpdate)
   */
  onChange?: (json: TipTapJSONContent) => void;
  /** Whether the editor is editable. Defaults to `true`. */
  editable?: boolean;
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string;
  /** Additional CSS class names applied to the outer wrapper div. */
  className?: string;
}

/**
 * Rich text editor powered by TipTap.
 *
 * Includes StarterKit (bold, italic, headings, lists, code blocks, blockquotes,
 * horizontal rules), Link (auto-linked URLs), Image (inline images), and
 * Placeholder extensions out of the box.
 */
export function TipTapEditor({
  content,
  onChange,
  editable = true,
  placeholder,
  className,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      // Disable StarterKit's built-in Link so we can configure our own below.
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Image,
      IframelyEmbed,
      CavalryEmbed,
      Placeholder.configure({
        placeholder: placeholder ?? 'Start writing…',
      }),
    ],
    content,
    editable,
    // Apply Tailwind prose classes via ProseMirror editorProps.
    // Docs: https://tiptap.dev/docs/editor/api/editor#editorprops
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getJSON());
    },
  });

  return (
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
}

/** Props for the read-only variant (same as editor minus editable/onChange). */
export type TipTapReadOnlyProps = Omit<TipTapEditorProps, 'editable' | 'onChange'>;

/**
 * Read-only variant of the TipTap editor.
 * Renders rich content without an editable surface — suitable for product
 * descriptions, terms of service previews, and static article display.
 */
export function TipTapReadOnly(props: TipTapReadOnlyProps) {
  return <TipTapEditor {...props} editable={false} />;
}
