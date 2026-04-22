/**
 * Purpose: Initialize React Fast Refresh globals before the main storefront
 *          bundle executes in local Vite development.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://raw.githubusercontent.com/vitejs/vite-plugin-react/main/packages/plugin-react/README.md
 *   - https://raw.githubusercontent.com/vitejs/vite-plugin-react/main/packages/plugin-react/src/index.ts
 * Tests:
 *   - packages/storefront/src/vite-react-refresh.test.ts
 */
declare global {
  interface Window {
    $RefreshReg$?: (type: unknown, id?: string) => void;
    $RefreshSig$?: () => <T>(type: T) => T;
  }
}

if (import.meta.hot) {
  const reactRefreshRuntimePath = '/@react-refresh';
  const { injectIntoGlobalHook } = await import(
    /* @vite-ignore */
    reactRefreshRuntimePath
  );

  injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => (type) => type;
}

export {};
