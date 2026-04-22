/**
 * Vite configuration for the Simket storefront.
 *
 * Uses the Cloudflare Vite plugin to run the Worker in the local workerd
 * runtime during development — matching production behaviour exactly.
 *
 * Docs: https://developers.cloudflare.com/workers/vite-plugin/
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
  ],
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
        find: '@simket/framely-app',
        replacement: path.resolve(__dirname, '../framely-app/src/index.ts'),
      },
      {
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
    ],
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
