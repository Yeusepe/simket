import { Client } from 'typesense';
import type { CollectionFieldSchema } from 'typesense';
import type { BaseCollectionCreateSchema } from 'typesense';

/** Concrete schema type for collection creation (without src_name). */
type ConcreteCollectionCreateSchema = BaseCollectionCreateSchema & {
  fields: CollectionFieldSchema[];
};

/**
 * Simket product collection schema for Typesense.
 *
 * Searchable: title, description, tags
 * Filterable: categoryIds, priceInCents, platformTakeRate
 * Sortable: createdAt, priceInCents, popularityScore
 *
 * @see https://typesense.org/docs/27.1/api/collections.html#schema-parameters
 */
export const PRODUCTS_COLLECTION = 'products';

export const PRODUCTS_SCHEMA: ConcreteCollectionCreateSchema = {
  name: PRODUCTS_COLLECTION,
  fields: [
    // Searchable text fields
    { name: 'title', type: 'string', facet: false },
    { name: 'description', type: 'string', facet: false, optional: true },
    { name: 'tags', type: 'string[]', facet: true },

    // Filterable fields
    { name: 'categoryIds', type: 'string[]', facet: true },
    { name: 'priceInCents', type: 'int32', facet: true },
    { name: 'platformTakeRate', type: 'int32', facet: false },

    // Sortable fields
    { name: 'createdAt', type: 'int64', facet: false },
    { name: 'popularityScore', type: 'int32', facet: false, optional: true },

    // Display-only (stored, not indexed in memory)
    { name: 'heroAssetId', type: 'string', index: false, optional: true },
    { name: 'creatorName', type: 'string', facet: true, optional: true },
    { name: 'slug', type: 'string', index: false },
    { name: 'vendureProductId', type: 'string', facet: false },
  ] satisfies CollectionFieldSchema[],
  default_sorting_field: 'createdAt',
  enable_nested_fields: false,
};

/**
 * Configuration for the Typesense client.
 * In production, use a 3-node Raft HA cluster.
 *
 * @see https://typesense.org/docs/27.1/api/#authentication
 */
export interface TypesenseConfig {
  nodes: Array<{
    host: string;
    port: number;
    protocol: 'http' | 'https';
  }>;
  apiKey: string;
  connectionTimeoutSeconds?: number;
  retryIntervalSeconds?: number;
  numRetries?: number;
}

/**
 * Build default Typesense config from environment variables.
 */
export function buildTypesenseConfig(): TypesenseConfig {
  const nodesStr = process.env['TYPESENSE_NODES'] ?? 'localhost:8108';
  const protocol = (process.env['TYPESENSE_PROTOCOL'] ?? 'http') as 'http' | 'https';

  const nodes = nodesStr.split(',').map((node) => {
    const [host, portStr] = node.trim().split(':');
    return {
      host: host ?? 'localhost',
      port: Number(portStr ?? 8108),
      protocol,
    };
  });

  return {
    nodes,
    apiKey: process.env['TYPESENSE_API_KEY'] ?? 'simket_dev_key',
    connectionTimeoutSeconds: 5,
    retryIntervalSeconds: 0.1,
    numRetries: 3,
  };
}

/**
 * Create a Typesense client instance.
 *
 * @see https://github.com/typesense/typesense-js#usage
 */
export function createTypesenseClient(config: TypesenseConfig): Client {
  return new Client({
    nodes: config.nodes,
    apiKey: config.apiKey,
    connectionTimeoutSeconds: config.connectionTimeoutSeconds ?? 5,
    retryIntervalSeconds: config.retryIntervalSeconds ?? 0.1,
    numRetries: config.numRetries ?? 3,
  });
}

/**
 * Document shape for indexed products.
 */
export interface ProductDocument {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  categoryIds: string[];
  priceInCents: number;
  platformTakeRate: number;
  createdAt: number;
  popularityScore?: number;
  heroAssetId?: string;
  creatorName?: string;
  slug: string;
  vendureProductId: string;
}

/**
 * Ensures the products collection exists in Typesense.
 * Creates it if missing; retrieves it if it already exists.
 *
 * @see https://typesense.org/docs/27.1/api/collections.html#create-a-collection
 */
export async function ensureProductsCollection(
  client: Client,
): Promise<void> {
  try {
    await client.collections(PRODUCTS_COLLECTION).retrieve();
  } catch (error: unknown) {
    if (isObjectNotFound(error)) {
      await client.collections().create(PRODUCTS_SCHEMA);
    } else {
      throw error;
    }
  }
}

/**
 * Check if a Typesense error is "Object Not Found" (404).
 */
function isObjectNotFound(error: unknown): boolean {
  if (error && typeof error === 'object' && 'httpStatus' in error) {
    return (error as { httpStatus: number }).httpStatus === 404;
  }
  return false;
}

/**
 * Health check for the Typesense cluster.
 *
 * @see https://typesense.org/docs/27.1/api/cluster-operations.html#health
 */
export async function checkTypesenseHealth(
  client: Client,
): Promise<boolean> {
  try {
    const health = await client.health.retrieve();
    return health.ok === true;
  } catch {
    return false;
  }
}
