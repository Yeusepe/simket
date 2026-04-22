/**
 * Purpose: Guard the storefront Vite dev server against missing React Fast
 *          Refresh initialization when served through the Cloudflare runtime.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://raw.githubusercontent.com/vitejs/vite-plugin-react/main/packages/plugin-react/README.md
 *   - https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
 * Tests:
 *   - packages/storefront/src/vite-react-refresh.test.ts
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('storefront dev refresh wiring', () => {
  it('injects the React refresh preamble during local dev', () => {
    const indexHtml = readFileSync(
      path.resolve(__dirname, '../index.html'),
      'utf8',
    );

    const preambleScript = '<script type="module" src="/src/react-refresh-preamble.ts"></script>';
    const mainScript = '<script type="module" src="/src/main.tsx"></script>';

    expect(indexHtml).toContain(preambleScript);
    expect(indexHtml.indexOf(preambleScript)).toBeLessThan(indexHtml.indexOf(mainScript));
  });

  it('initializes the official React refresh globals from the runtime endpoint', () => {
    const preambleSource = readFileSync(
      path.resolve(__dirname, './react-refresh-preamble.ts'),
      'utf8',
    );

    expect(preambleSource).toContain("const reactRefreshRuntimePath = '/@react-refresh';");
    expect(preambleSource).toContain('/* @vite-ignore */');
    expect(preambleSource).toContain('if (import.meta.hot)');
    expect(preambleSource).toContain('injectIntoGlobalHook(window);');
    expect(preambleSource).toContain('window.$RefreshReg$ = () => {};');
    expect(preambleSource).toContain('window.$RefreshSig$ = () => (type) => type;');
  });
});
