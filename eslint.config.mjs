import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sourceFiles = ['**/*.{ts,tsx,js,mjs,cjs}'];
const testFiles = ['**/*.{test,spec}.{ts,tsx,js,mjs,cjs}'];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: sourceFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['packages/storefront/**/*.{ts,tsx}', 'packages/framely-app/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        ...globals.node,
      },
    },
  },
  {
    files: testFiles,
    languageOptions: {
      globals: {
        ...globals.vitest,
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['packages/vendure-server/src/testing/k6/**/*.js'],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
      },
    },
  },
  {
    files: ['packages/vendure-server/src/plugins/store-routing/store-routing.middleware.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  },
);
