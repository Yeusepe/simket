/**
 * @simket/framely-app — Framely page builder for creator storefronts.
 *
 * Purpose: Page builder editor with drag-and-drop, undo/redo, HeroUI block palette.
 * Governing docs:
 *   - docs/architecture.md §5 (Framely integration)
 *   - docs/domain-model.md §1 (FramelyProject, EditorElement)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 *   - https://heroui.com/react/llms.txt
 */

export type {
  EditorElement,
  EditorTheme,
  StorePage,
  EditorState,
  EditorAction,
  PaletteBlock,
  PropertyField,
  HistoryEntry,
} from './types/editor-types';
export { DEFAULT_THEME } from './types/editor-types';

export { editorReducer, INITIAL_EDITOR_STATE } from './editor/editor-reducer';
export {
  PALETTE_BLOCKS,
  BLOCK_CATEGORIES,
  getBlocksByCategory,
  getPaletteBlock,
} from './editor/block-palette';
export type { PaletteBlockWithSchema } from './editor/block-palette';
