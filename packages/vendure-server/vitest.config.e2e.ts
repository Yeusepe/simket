import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['e2e/**/*.e2e-spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Integration tests must run sequentially — they share a Vendure server instance
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    // Allow .js imports to resolve to .ts files (ESM + TypeScript convention)
    extensions: ['.ts', '.js', '.mjs', '.mts', '.json'],
  },
  plugins: [
    // SWC transpiles TypeScript with experimentalDecorators support
    // which is required for Vendure's NestJS decorators
    swc.vite({
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
});
