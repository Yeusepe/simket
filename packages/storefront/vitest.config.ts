import path from 'node:path';

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@gravity-ui\/icons$/,
        replacement: path.resolve(__dirname, './node_modules/@gravity-ui/icons/esm/index.js'),
      },
      {
        find: /^@gravity-ui\/icons\/(.+)$/,
        replacement: path.resolve(__dirname, './node_modules/@gravity-ui/icons/esm/$1.js'),
      },
      {
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 30_000,
    setupFiles: ['./src/test-setup.ts'],
    server: {
      deps: {
        inline: [
          /@gravity-ui\/icons/,
          /@heroui-pro\/react/,
        ],
      },
    },
  },
});
