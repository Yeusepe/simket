/**
 * Purpose: Tests for the editor state reducer — undo/redo, element CRUD, drag reorder.
 * Governing docs:
 *   - AGENTS.md §1.1 (TDD-first)
 *   - docs/architecture.md §5 (Framely integration)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import { editorReducer, INITIAL_EDITOR_STATE } from './editor-reducer';
import type { EditorState, StorePage, EditorElement } from '../types/editor-types';
import { DEFAULT_THEME } from '../types/editor-types';

function makePage(elements: EditorElement[] = []): StorePage {
  return {
    id: 'page-1',
    title: 'Test Page',
    slug: 'test-page',
    elements,
    theme: { ...DEFAULT_THEME },
    isTemplate: false,
    isPostSale: false,
    productId: null,
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

function makeElement(id: string, type = 'text', parentId: string | null = null): EditorElement {
  return { id, type, props: { content: `Element ${id}` }, children: [], parentId };
}

describe('editorReducer', () => {
  describe('LOAD_PAGE', () => {
    it('loads a page and resets state', () => {
      const page = makePage([makeElement('el-1')]);
      const state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      expect(state.page).toEqual(page);
      expect(state.selectedElementId).toBeNull();
      expect(state.history).toHaveLength(1);
      expect(state.historyIndex).toBe(0);
      expect(state.isDirty).toBe(false);
    });
  });

  describe('SELECT_ELEMENT', () => {
    it('selects an element by id', () => {
      const page = makePage([makeElement('el-1')]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      state = editorReducer(state, { type: 'SELECT_ELEMENT', elementId: 'el-1' });
      expect(state.selectedElementId).toBe('el-1');
    });

    it('deselects when null', () => {
      const page = makePage([makeElement('el-1')]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      state = editorReducer(state, { type: 'SELECT_ELEMENT', elementId: 'el-1' });
      state = editorReducer(state, { type: 'SELECT_ELEMENT', elementId: null });
      expect(state.selectedElementId).toBeNull();
    });
  });

  describe('ADD_ELEMENT', () => {
    it('adds an element to root', () => {
      const page = makePage([]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      const el = makeElement('new-1');
      state = editorReducer(state, { type: 'ADD_ELEMENT', element: el, parentId: null });
      expect(state.page!.elements).toHaveLength(1);
      expect(state.page!.elements[0].id).toBe('new-1');
      expect(state.isDirty).toBe(true);
      expect(state.selectedElementId).toBe('new-1');
    });

    it('adds an element as child', () => {
      const parent = makeElement('parent-1');
      const page = makePage([parent]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      const child = makeElement('child-1');
      state = editorReducer(state, { type: 'ADD_ELEMENT', element: child, parentId: 'parent-1' });
      expect(state.page!.elements[0].children).toHaveLength(1);
      expect(state.page!.elements[0].children[0].id).toBe('child-1');
    });

    it('adds at specific index', () => {
      const page = makePage([makeElement('el-1'), makeElement('el-2')]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      const el = makeElement('inserted');
      state = editorReducer(state, { type: 'ADD_ELEMENT', element: el, parentId: null, index: 1 });
      expect(state.page!.elements[1].id).toBe('inserted');
      expect(state.page!.elements).toHaveLength(3);
    });
  });

  describe('REMOVE_ELEMENT', () => {
    it('removes an element from root', () => {
      const page = makePage([makeElement('el-1'), makeElement('el-2')]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      state = editorReducer(state, { type: 'REMOVE_ELEMENT', elementId: 'el-1' });
      expect(state.page!.elements).toHaveLength(1);
      expect(state.page!.elements[0].id).toBe('el-2');
      expect(state.isDirty).toBe(true);
    });

    it('clears selection when removing selected element', () => {
      const page = makePage([makeElement('el-1')]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      state = editorReducer(state, { type: 'SELECT_ELEMENT', elementId: 'el-1' });
      state = editorReducer(state, { type: 'REMOVE_ELEMENT', elementId: 'el-1' });
      expect(state.selectedElementId).toBeNull();
    });
  });

  describe('UPDATE_ELEMENT_PROPS', () => {
    it('merges props on existing element', () => {
      const page = makePage([makeElement('el-1')]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      state = editorReducer(state, {
        type: 'UPDATE_ELEMENT_PROPS',
        elementId: 'el-1',
        props: { color: 'red' },
      });
      expect(state.page!.elements[0].props).toEqual({
        content: 'Element el-1',
        color: 'red',
      });
    });
  });

  describe('MOVE_ELEMENT', () => {
    it('moves element to new position', () => {
      const page = makePage([makeElement('el-1'), makeElement('el-2'), makeElement('el-3')]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      state = editorReducer(state, {
        type: 'MOVE_ELEMENT',
        elementId: 'el-3',
        newParentId: null,
        newIndex: 0,
      });
      expect(state.page!.elements[0].id).toBe('el-3');
      expect(state.page!.elements[1].id).toBe('el-1');
    });
  });

  describe('UPDATE_THEME', () => {
    it('merges theme changes', () => {
      const page = makePage([]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      state = editorReducer(state, {
        type: 'UPDATE_THEME',
        theme: { primaryColor: '#FF0000', mode: 'dark' },
      });
      expect(state.page!.theme.primaryColor).toBe('#FF0000');
      expect(state.page!.theme.mode).toBe('dark');
      expect(state.page!.theme.fontFamily).toBe(DEFAULT_THEME.fontFamily);
    });
  });

  describe('Undo/Redo', () => {
    it('undoes the last action', () => {
      const page = makePage([makeElement('el-1')]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      state = editorReducer(state, {
        type: 'ADD_ELEMENT',
        element: makeElement('el-2'),
        parentId: null,
      });
      expect(state.page!.elements).toHaveLength(2);
      state = editorReducer(state, { type: 'UNDO' });
      expect(state.page!.elements).toHaveLength(1);
    });

    it('redoes after undo', () => {
      const page = makePage([makeElement('el-1')]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      state = editorReducer(state, {
        type: 'ADD_ELEMENT',
        element: makeElement('el-2'),
        parentId: null,
      });
      state = editorReducer(state, { type: 'UNDO' });
      state = editorReducer(state, { type: 'REDO' });
      expect(state.page!.elements).toHaveLength(2);
    });

    it('does not undo past initial state', () => {
      const page = makePage([makeElement('el-1')]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      state = editorReducer(state, { type: 'UNDO' });
      expect(state.page!.elements).toHaveLength(1);
    });
  });

  describe('MARK_SAVED', () => {
    it('clears dirty flag', () => {
      const page = makePage([]);
      let state = editorReducer(INITIAL_EDITOR_STATE, { type: 'LOAD_PAGE', page });
      state = editorReducer(state, {
        type: 'ADD_ELEMENT',
        element: makeElement('el-1'),
        parentId: null,
      });
      expect(state.isDirty).toBe(true);
      state = editorReducer(state, { type: 'MARK_SAVED' });
      expect(state.isDirty).toBe(false);
    });
  });

  describe('no-op cases', () => {
    it('returns state when no page loaded', () => {
      const state = editorReducer(INITIAL_EDITOR_STATE, {
        type: 'ADD_ELEMENT',
        element: makeElement('el-1'),
        parentId: null,
      });
      expect(state).toBe(INITIAL_EDITOR_STATE);
    });
  });
});
