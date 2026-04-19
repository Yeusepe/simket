/**
 * Purpose: Core type definitions for the Framely page builder editor.
 * Governing docs:
 *   - docs/architecture.md §5 (Framely integration)
 *   - docs/domain-model.md §1 (FramelyProject, EditorElement)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 *   - https://dev.to/belastrittmatter/building-a-nextjs-website-editor-bj3
 * Tests:
 *   - packages/framely-app/src/editor/editor.test.ts
 */

/** Represents a single element in the editor canvas */
export interface EditorElement {
  readonly id: string;
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly children: EditorElement[];
  readonly parentId: string | null;
}

/** Theme configuration for a store page */
export interface EditorTheme {
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  borderRadius: string;
  mode: 'light' | 'dark';
}

/** Represents a single page in a creator's store */
export interface StorePage {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly elements: EditorElement[];
  readonly theme: EditorTheme;
  readonly isTemplate: boolean;
  readonly isPostSale: boolean;
  readonly productId: string | null;
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Editor history entry for undo/redo */
export interface HistoryEntry {
  readonly elements: EditorElement[];
  readonly timestamp: number;
}

/** Editor state managed by useEditor hook */
export interface EditorState {
  readonly page: StorePage | null;
  readonly selectedElementId: string | null;
  readonly hoveredElementId: string | null;
  readonly isDragging: boolean;
  readonly history: HistoryEntry[];
  readonly historyIndex: number;
  readonly isDirty: boolean;
}

/** Actions dispatched to the editor reducer */
export type EditorAction =
  | { type: 'LOAD_PAGE'; page: StorePage }
  | { type: 'SELECT_ELEMENT'; elementId: string | null }
  | { type: 'HOVER_ELEMENT'; elementId: string | null }
  | { type: 'ADD_ELEMENT'; element: EditorElement; parentId: string | null; index?: number }
  | { type: 'REMOVE_ELEMENT'; elementId: string }
  | { type: 'UPDATE_ELEMENT_PROPS'; elementId: string; props: Record<string, unknown> }
  | { type: 'MOVE_ELEMENT'; elementId: string; newParentId: string | null; newIndex: number }
  | { type: 'UPDATE_THEME'; theme: Partial<EditorTheme> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_SAVED' }
  | { type: 'SET_DRAGGING'; isDragging: boolean };

/** Block definition exposed by the block palette */
export interface PaletteBlock {
  readonly type: string;
  readonly label: string;
  readonly icon: string;
  readonly category: 'layout' | 'content' | 'media' | 'interactive' | 'data';
  readonly defaultProps: Record<string, unknown>;
}

/** Property field definition for the property panel */
export interface PropertyField {
  readonly name: string;
  readonly type: 'text' | 'richtext' | 'image' | 'url' | 'number' | 'select' | 'boolean' | 'color';
  readonly label: string;
  readonly required: boolean;
  readonly defaultValue?: unknown;
  readonly options?: readonly string[];
}

export const DEFAULT_THEME: EditorTheme = {
  primaryColor: '#006FEE',
  backgroundColor: '#FFFFFF',
  fontFamily: 'Inter, system-ui, sans-serif',
  borderRadius: '12px',
  mode: 'light',
};
