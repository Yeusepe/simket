/**
 * Purpose: Define the palette of available HeroUI-based blocks for the page builder.
 * Governing docs:
 *   - docs/architecture.md §2 (HeroUI everywhere), §5 (Framely integration)
 *   - docs/domain-model.md §1 (EditorElement)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/framely-app/src/editor/block-palette.test.ts
 */

import type { PaletteBlock, PropertyField } from '../types/editor-types.js';

export interface PaletteBlockWithSchema extends PaletteBlock {
  readonly propSchema: readonly PropertyField[];
}

/** All available blocks in the editor palette, grouped by category */
export const PALETTE_BLOCKS: readonly PaletteBlockWithSchema[] = [
  // Layout blocks
  {
    type: 'hero',
    label: 'Hero Section',
    icon: '🖼️',
    category: 'layout',
    defaultProps: {
      title: 'Welcome to my store',
      subtitle: 'Browse my creations',
      backgroundImage: '',
      alignment: 'center',
    },
    propSchema: [
      { name: 'title', type: 'text', label: 'Title', required: true },
      { name: 'subtitle', type: 'text', label: 'Subtitle', required: false },
      { name: 'backgroundImage', type: 'image', label: 'Background Image', required: false },
      { name: 'alignment', type: 'select', label: 'Alignment', required: false, options: ['left', 'center', 'right'] },
    ],
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: '↕️',
    category: 'layout',
    defaultProps: { height: 32 },
    propSchema: [
      { name: 'height', type: 'number', label: 'Height (px)', required: true, defaultValue: 32 },
    ],
  },
  {
    type: 'card-grid',
    label: 'Card Grid',
    icon: '▦',
    category: 'layout',
    defaultProps: { columns: 3, gap: 16 },
    propSchema: [
      { name: 'columns', type: 'number', label: 'Columns', required: true, defaultValue: 3 },
      { name: 'gap', type: 'number', label: 'Gap (px)', required: false, defaultValue: 16 },
    ],
  },

  // Content blocks
  {
    type: 'text',
    label: 'Text Block',
    icon: '📝',
    category: 'content',
    defaultProps: { content: 'Enter your text here...', variant: 'body' },
    propSchema: [
      { name: 'content', type: 'richtext', label: 'Content', required: true },
      { name: 'variant', type: 'select', label: 'Variant', required: false, options: ['heading', 'subheading', 'body', 'caption'] },
    ],
  },
  {
    type: 'button',
    label: 'Button',
    icon: '🔘',
    category: 'content',
    defaultProps: { text: 'Click me', variant: 'primary', href: '' },
    propSchema: [
      { name: 'text', type: 'text', label: 'Button Text', required: true },
      { name: 'variant', type: 'select', label: 'Variant', required: false, options: ['primary', 'secondary', 'tertiary', 'danger', 'ghost', 'outline'] },
      { name: 'href', type: 'url', label: 'Link URL', required: false },
    ],
  },
  {
    type: 'badge',
    label: 'Badge',
    icon: '🏷️',
    category: 'content',
    defaultProps: { text: 'New', variant: 'primary' },
    propSchema: [
      { name: 'text', type: 'text', label: 'Badge Text', required: true },
      { name: 'variant', type: 'select', label: 'Variant', required: false, options: ['primary', 'secondary', 'danger', 'success', 'warning'] },
    ],
  },
  {
    type: 'testimonial',
    label: 'Testimonial',
    icon: '💬',
    category: 'content',
    defaultProps: { quote: 'Great product!', author: 'John Doe', role: 'Customer' },
    propSchema: [
      { name: 'quote', type: 'text', label: 'Quote', required: true },
      { name: 'author', type: 'text', label: 'Author', required: true },
      { name: 'role', type: 'text', label: 'Role', required: false },
    ],
  },
  {
    type: 'alert',
    label: 'Alert',
    icon: '⚠️',
    category: 'content',
    defaultProps: { title: 'Notice', description: 'Important information', status: 'info' },
    propSchema: [
      { name: 'title', type: 'text', label: 'Title', required: true },
      { name: 'description', type: 'text', label: 'Description', required: true },
      { name: 'status', type: 'select', label: 'Status', required: false, options: ['info', 'success', 'warning', 'danger'] },
    ],
  },

  // Media blocks
  {
    type: 'gallery',
    label: 'Image Gallery',
    icon: '🖼️',
    category: 'media',
    defaultProps: { images: [], columns: 3 },
    propSchema: [
      { name: 'columns', type: 'number', label: 'Columns', required: false, defaultValue: 3 },
    ],
  },
  {
    type: 'avatar',
    label: 'Avatar',
    icon: '👤',
    category: 'media',
    defaultProps: { src: '', name: '', size: 'md' },
    propSchema: [
      { name: 'src', type: 'image', label: 'Image', required: false },
      { name: 'name', type: 'text', label: 'Name', required: false },
      { name: 'size', type: 'select', label: 'Size', required: false, options: ['sm', 'md', 'lg', 'xl'] },
    ],
  },

  // Interactive blocks
  {
    type: 'tabs',
    label: 'Tabs',
    icon: '📑',
    category: 'interactive',
    defaultProps: { tabs: [{ key: 'tab-1', title: 'Tab 1' }, { key: 'tab-2', title: 'Tab 2' }] },
    propSchema: [],
  },
  {
    type: 'modal',
    label: 'Modal Trigger',
    icon: '📦',
    category: 'interactive',
    defaultProps: { triggerText: 'Open Modal', title: 'Modal Title', content: '' },
    propSchema: [
      { name: 'triggerText', type: 'text', label: 'Trigger Text', required: true },
      { name: 'title', type: 'text', label: 'Modal Title', required: true },
      { name: 'content', type: 'richtext', label: 'Content', required: false },
    ],
  },
  {
    type: 'tooltip',
    label: 'Tooltip',
    icon: '💡',
    category: 'interactive',
    defaultProps: { text: 'Hover me', content: 'Tooltip content' },
    propSchema: [
      { name: 'text', type: 'text', label: 'Trigger Text', required: true },
      { name: 'content', type: 'text', label: 'Tooltip Content', required: true },
    ],
  },

  // Data blocks
  {
    type: 'table',
    label: 'Table',
    icon: '📊',
    category: 'data',
    defaultProps: { columns: ['Column 1', 'Column 2'], rows: [['Cell 1', 'Cell 2']] },
    propSchema: [],
  },
  {
    type: 'progress',
    label: 'Progress Bar',
    icon: '📈',
    category: 'data',
    defaultProps: { value: 50, label: 'Progress', max: 100 },
    propSchema: [
      { name: 'value', type: 'number', label: 'Value', required: true, defaultValue: 50 },
      { name: 'label', type: 'text', label: 'Label', required: false },
      { name: 'max', type: 'number', label: 'Maximum', required: false, defaultValue: 100 },
    ],
  },
  {
    type: 'breadcrumb',
    label: 'Breadcrumb',
    icon: '🧭',
    category: 'data',
    defaultProps: { items: [{ label: 'Home', href: '/' }, { label: 'Current' }] },
    propSchema: [],
  },
] as const;

/** Get blocks by category */
export function getBlocksByCategory(category: PaletteBlock['category']): readonly PaletteBlockWithSchema[] {
  return PALETTE_BLOCKS.filter((b) => b.category === category);
}

/** Get a single block definition by type */
export function getPaletteBlock(type: string): PaletteBlockWithSchema | undefined {
  return PALETTE_BLOCKS.find((b) => b.type === type);
}

/** All available categories */
export const BLOCK_CATEGORIES = [
  { key: 'layout', label: 'Layout', icon: '📐' },
  { key: 'content', label: 'Content', icon: '📝' },
  { key: 'media', label: 'Media', icon: '🖼️' },
  { key: 'interactive', label: 'Interactive', icon: '🎮' },
  { key: 'data', label: 'Data', icon: '📊' },
] as const;
