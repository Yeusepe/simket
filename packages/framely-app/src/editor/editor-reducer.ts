/**
 * Purpose: Pure-function editor state reducer with undo/redo, element CRUD, and drag-and-drop.
 * Governing docs:
 *   - docs/architecture.md §5 (Framely integration)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md §6 (state and data rules)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 *   - https://dev.to/belastrittmatter/building-a-nextjs-website-editor-bj3
 * Tests:
 *   - packages/framely-app/src/editor/editor-reducer.test.ts
 */

import type {
  EditorState,
  EditorAction,
  EditorElement,
  HistoryEntry,
} from '../types/editor-types.js';

const MAX_HISTORY = 50;

export const INITIAL_EDITOR_STATE: EditorState = {
  page: null,
  selectedElementId: null,
  hoveredElementId: null,
  isDragging: false,
  history: [],
  historyIndex: -1,
  isDirty: false,
};

function pushHistory(state: EditorState, elements: EditorElement[]): EditorState {
  const entry: HistoryEntry = { elements: structuredClone(elements), timestamp: Date.now() };
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(entry);
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift();
  }
  return {
    ...state,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

function addElementToTree(
  elements: EditorElement[],
  element: EditorElement,
  parentId: string | null,
  index?: number,
): EditorElement[] {
  if (parentId === null) {
    const i = index ?? elements.length;
    const result = [...elements];
    result.splice(i, 0, { ...element, parentId: null });
    return result;
  }

  return elements.map((el) => {
    if (el.id === parentId) {
      const children = [...el.children];
      const i = index ?? children.length;
      children.splice(i, 0, { ...element, parentId });
      return { ...el, children };
    }
    if (el.children.length > 0) {
      return { ...el, children: addElementToTree(el.children, element, parentId, index) };
    }
    return el;
  });
}

function removeElementFromTree(
  elements: EditorElement[],
  elementId: string,
): EditorElement[] {
  return elements
    .filter((el) => el.id !== elementId)
    .map((el) => ({
      ...el,
      children: removeElementFromTree(el.children, elementId),
    }));
}

function updateElementPropsInTree(
  elements: EditorElement[],
  elementId: string,
  props: Record<string, unknown>,
): EditorElement[] {
  return elements.map((el) => {
    if (el.id === elementId) {
      return { ...el, props: { ...el.props, ...props } };
    }
    if (el.children.length > 0) {
      return { ...el, children: updateElementPropsInTree(el.children, elementId, props) };
    }
    return el;
  });
}

function findElementById(elements: EditorElement[], id: string): EditorElement | null {
  for (const el of elements) {
    if (el.id === id) return el;
    const found = findElementById(el.children, id);
    if (found) return found;
  }
  return null;
}

function moveElementInTree(
  elements: EditorElement[],
  elementId: string,
  newParentId: string | null,
  newIndex: number,
): EditorElement[] {
  const element = findElementById(elements, elementId);
  if (!element) return elements;

  const without = removeElementFromTree(elements, elementId);
  return addElementToTree(without, element, newParentId, newIndex);
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD_PAGE':
      return {
        ...INITIAL_EDITOR_STATE,
        page: action.page,
        history: [{ elements: structuredClone(action.page.elements), timestamp: Date.now() }],
        historyIndex: 0,
      };

    case 'SELECT_ELEMENT':
      return { ...state, selectedElementId: action.elementId };

    case 'HOVER_ELEMENT':
      return { ...state, hoveredElementId: action.elementId };

    case 'SET_DRAGGING':
      return { ...state, isDragging: action.isDragging };

    case 'ADD_ELEMENT': {
      if (!state.page) return state;
      const newElements = addElementToTree(state.page.elements, action.element, action.parentId, action.index);
      const withHistory = pushHistory(state, newElements);
      return {
        ...withHistory,
        page: { ...state.page, elements: newElements },
        isDirty: true,
        selectedElementId: action.element.id,
      };
    }

    case 'REMOVE_ELEMENT': {
      if (!state.page) return state;
      const newElements = removeElementFromTree(state.page.elements, action.elementId);
      const withHistory = pushHistory(state, newElements);
      return {
        ...withHistory,
        page: { ...state.page, elements: newElements },
        isDirty: true,
        selectedElementId:
          state.selectedElementId === action.elementId ? null : state.selectedElementId,
      };
    }

    case 'UPDATE_ELEMENT_PROPS': {
      if (!state.page) return state;
      const newElements = updateElementPropsInTree(
        state.page.elements,
        action.elementId,
        action.props,
      );
      const withHistory = pushHistory(state, newElements);
      return {
        ...withHistory,
        page: { ...state.page, elements: newElements },
        isDirty: true,
      };
    }

    case 'MOVE_ELEMENT': {
      if (!state.page) return state;
      const newElements = moveElementInTree(
        state.page.elements,
        action.elementId,
        action.newParentId,
        action.newIndex,
      );
      const withHistory = pushHistory(state, newElements);
      return {
        ...withHistory,
        page: { ...state.page, elements: newElements },
        isDirty: true,
      };
    }

    case 'UPDATE_THEME': {
      if (!state.page) return state;
      return {
        ...state,
        page: {
          ...state.page,
          theme: { ...state.page.theme, ...action.theme },
        },
        isDirty: true,
      };
    }

    case 'UNDO': {
      if (!state.page || state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const entry = state.history[newIndex];
      if (!entry) return state;
      return {
        ...state,
        page: { ...state.page, elements: structuredClone(entry.elements) },
        historyIndex: newIndex,
        isDirty: true,
      };
    }

    case 'REDO': {
      if (!state.page || state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const entry = state.history[newIndex];
      if (!entry) return state;
      return {
        ...state,
        page: { ...state.page, elements: structuredClone(entry.elements) },
        historyIndex: newIndex,
        isDirty: true,
      };
    }

    case 'MARK_SAVED':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}
