/**
 * Purpose: PayloadCMS v3 configuration for the Simket editorial package.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://payloadcms.com/docs
 *   - https://github.com/payloadcms/payload
 * Tests:
 *   - packages/editorial/tests/articles.test.ts
 *   - packages/editorial/tests/featured-products.test.ts
 */

import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { Config } from 'payload';
import { buildConfig } from 'payload';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { articlesCollection } from './collections/articles.js';
import { editorialSectionsCollection } from './collections/editorial-sections.js';
import { featuredProductsCollection } from './collections/featured-products.js';
import { mediaCollection } from './collections/media.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createEditorialPayloadConfig(): Config {
  return {
    collections: [
      mediaCollection,
      featuredProductsCollection,
      editorialSectionsCollection,
      articlesCollection,
    ],
    db: postgresAdapter({
      pool: {
        connectionString: requiredEnv('PAYLOAD_DATABASE_URL'),
      },
    }),
    editor: lexicalEditor(),
    secret: requiredEnv('PAYLOAD_SECRET'),
    typescript: {
      outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
  };
}

export default buildConfig(createEditorialPayloadConfig());
