/**
 * Purpose: Tests for useAdaptiveColors React hook.
 * Governing docs:
 *   - docs/architecture.md (§14 color system)
 *   - AGENTS.md §4.4 (Leonardo contrast-colors rule)
 * External references:
 *   - https://github.com/adobe/leonardo
 */
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdaptiveColors } from './use-adaptive-colors';

function getCSSVar(name: string): string {
  return document.documentElement.style.getPropertyValue(name);
}

function clearRootStyles() {
  const root = document.documentElement;
  const toRemove: string[] = [];
  for (let i = 0; i < root.style.length; i++) {
    const prop = root.style.item(i);
    if (prop.startsWith('--simket-') || prop.startsWith('--store-')) {
      toRemove.push(prop);
    }
  }
  for (const prop of toRemove) {
    root.style.removeProperty(prop);
  }
}

describe('useAdaptiveColors', () => {
  afterEach(clearRootStyles);

  it('applies CSS variables to document root in light mode', () => {
    const { result } = renderHook(() =>
      useAdaptiveColors({ mode: 'light' }),
    );

    expect(result.current.background).toBeDefined();
    expect(getCSSVar('--simket-bg')).toBe(result.current.background);
    expect(getCSSVar('--simket-accent')).toBeTruthy();
  });

  it('updates CSS variables when mode changes', () => {
    let mode: 'light' | 'dark' = 'light';
    const { result, rerender } = renderHook(() =>
      useAdaptiveColors({ mode }),
    );

    const lightBg = result.current.background;

    mode = 'dark';
    rerender();

    const darkBg = result.current.background;
    expect(lightBg).not.toBe(darkBg);
    expect(getCSSVar('--simket-bg')).toBe(darkBg);
  });

  it('cleans up CSS variables on unmount', () => {
    const { unmount } = renderHook(() =>
      useAdaptiveColors({ mode: 'light' }),
    );

    expect(getCSSVar('--simket-bg')).toBeTruthy();

    unmount();

    expect(getCSSVar('--simket-bg')).toBe('');
  });

  it('supports custom prefix for creator stores', () => {
    renderHook(() =>
      useAdaptiveColors({
        mode: 'dark',
        primaryColor: '#ff5500',
        prefix: 'store',
      }),
    );

    expect(getCSSVar('--store-bg')).toBeTruthy();
    expect(getCSSVar('--store-accent')).toBeTruthy();
  });
});
