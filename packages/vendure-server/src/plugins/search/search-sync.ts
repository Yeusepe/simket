/**
 * Purpose: Vendure plugin that synchronises product data to Typesense
 *          on CRUD events and provides search query capabilities.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://typesense.org/docs/27.1/api/documents.html
 *   - https://typesense.org/docs/27.1/api/search.html
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 * Tests:
 *   - packages/vendure-server/src/plugins/search/search-sync.test.ts
 */

import {
  PluginCommonModule,
  VendurePlugin,
  EventBus,
  ProductEvent,
  Logger,
} from '@vendure/core';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import type { Subscription } from 'rxjs';
import { Client } from 'typesense';
import type { ProductDocument } from './typesense.js';
import {
  PRODUCTS_COLLECTION,
  PRODUCTS_SCHEMA,
  buildTypesenseConfig,
  createTypesenseClient,
  ensureProductsCollection,
} from './typesense.js';

const loggerCtx = 'SearchSyncPlugin';

/**
 * Search result returned from Typesense queries.
 */
export interface SearchResult {
  hits: Array<{
    document: ProductDocument;
    textMatch: number;
    highlights: Array<{
      field: string;
      snippet?: string;
      matchedTokens: string[];
    }>;
  }>;
  found: number;
  page: number;
  searchTimeMs: number;
  facetCounts?: Array<{
    fieldName: string;
    counts: Array<{ value: string; count: number }>;
  }>;
}

/**
 * Search query parameters for faceted product search.
 *
 * @see https://typesense.org/docs/27.1/api/search.html#search-parameters
 */
export interface SearchQuery {
  q: string;
  queryBy?: string;
  filterBy?: string;
  sortBy?: string;
  facetBy?: string;
  page?: number;
  perPage?: number;
  typoTokensThreshold?: number;
}

const DEFAULT_QUERY_BY = 'title,description,tags';
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

/**
 * Searches products in Typesense with faceted filtering and typo tolerance.
 *
 * @see https://typesense.org/docs/27.1/api/search.html
 */
export async function searchProducts(
  client: Client,
  query: SearchQuery,
): Promise<SearchResult> {
  const perPage = Math.min(query.perPage ?? DEFAULT_PER_PAGE, MAX_PER_PAGE);

  const response = await client
    .collections<ProductDocument>(PRODUCTS_COLLECTION)
    .documents()
    .search({
      q: query.q,
      query_by: query.queryBy ?? DEFAULT_QUERY_BY,
      filter_by: query.filterBy,
      sort_by: query.sortBy,
      facet_by: query.facetBy,
      page: query.page ?? 1,
      per_page: perPage,
      typo_tokens_threshold: query.typoTokensThreshold ?? 1,
    });

  return {
    hits: (response.hits ?? []).map((hit) => ({
      document: hit.document as ProductDocument,
      textMatch: hit.text_match,
      highlights: (hit.highlights ?? []).map((h) => ({
        field: String(h.field),
        snippet: h.snippet,
        matchedTokens: (h.matched_tokens ?? []).flat(),
      })),
    })),
    found: response.found,
    page: response.page,
    searchTimeMs: response.search_time_ms,
    facetCounts: response.facet_counts?.map((fc) => ({
      fieldName: String(fc.field_name),
      counts: fc.counts.map((c) => ({ value: c.value, count: c.count })),
    })),
  };
}

/**
 * Upserts a single product document into Typesense.
 *
 * @see https://typesense.org/docs/27.1/api/documents.html#upsert-a-single-document
 */
export async function upsertProduct(
  client: Client,
  doc: ProductDocument,
): Promise<ProductDocument> {
  return client
    .collections<ProductDocument>(PRODUCTS_COLLECTION)
    .documents()
    .upsert(doc);
}

/**
 * Deletes a product document from Typesense by ID.
 *
 * @see https://typesense.org/docs/27.1/api/documents.html#delete-a-document
 */
export async function deleteProduct(
  client: Client,
  documentId: string,
): Promise<void> {
  try {
    await client
      .collections<ProductDocument>(PRODUCTS_COLLECTION)
      .documents(documentId)
      .delete();
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'httpStatus' in error) {
      if ((error as { httpStatus: number }).httpStatus === 404) {
        Logger.warn(
          `Attempted to delete non-existent document: ${documentId}`,
          loggerCtx,
        );
        return;
      }
    }
    throw error;
  }
}

/**
 * Bulk imports product documents into Typesense using the import API.
 * Uses upsert action for idempotent full reindex.
 *
 * @see https://typesense.org/docs/27.1/api/documents.html#import-documents
 */
export async function bulkUpsertProducts(
  client: Client,
  docs: ProductDocument[],
): Promise<{ success: number; failed: number }> {
  if (docs.length === 0) return { success: 0, failed: 0 };

  const results = await client
    .collections<ProductDocument>(PRODUCTS_COLLECTION)
    .documents()
    .import(docs, { action: 'upsert' });

  let success = 0;
  let failed = 0;
  for (const result of results) {
    if (result.success) {
      success++;
    } else {
      failed++;
      Logger.error(
        `Failed to import document: ${result.error}`,
        loggerCtx,
      );
    }
  }

  return { success, failed };
}

/**
 * SearchSyncPlugin — syncs Vendure product mutations to Typesense.
 *
 * On bootstrap:
 *   1. Creates the Typesense products collection if missing
 *   2. Subscribes to ProductEvent for real-time sync
 *
 * On shutdown:
 *   Unsubscribes from events cleanly.
 *
 * @see https://docs.vendure.io/guides/developer-guide/plugins/
 * @see https://typesense.org/docs/27.1/api/documents.html
 */
@VendurePlugin({
  imports: [PluginCommonModule],
})
export class SearchSyncPlugin implements OnApplicationBootstrap, OnApplicationShutdown {
  private subscription: Subscription | undefined;
  private client: Client;

  constructor(private eventBus: EventBus) {
    const config = buildTypesenseConfig();
    this.client = createTypesenseClient(config);
  }

  async onApplicationBootstrap(): Promise<void> {
    try {
      await ensureProductsCollection(this.client);
      Logger.info('Typesense products collection ensured', loggerCtx);
    } catch (error) {
      Logger.error(
        `Failed to ensure Typesense collection: ${String(error)}`,
        loggerCtx,
      );
    }

    this.subscription = this.eventBus
      .ofType(ProductEvent)
      .subscribe(async (event) => {
        try {
          if (event.type === 'deleted') {
            await deleteProduct(this.client, String(event.entity.id));
            Logger.info(
              `Deleted product ${event.entity.id} from Typesense`,
              loggerCtx,
            );
          } else {
            const product = event.entity;
            const customFields = (product as Record<string, unknown>)['customFields'] as
              | Record<string, unknown>
              | undefined;

            const doc: ProductDocument = {
              id: String(product.id),
              title: product.name ?? '',
              description: customFields?.['tiptapDescription']
                ? String(customFields['tiptapDescription'])
                : undefined,
              tags: [],
              categoryIds: [],
              priceInCents: 0,
              platformTakeRate: Number(customFields?.['platformTakeRate'] ?? 5),
              createdAt: product.createdAt
                ? new Date(product.createdAt).getTime()
                : Date.now(),
              slug: product.slug ?? '',
              vendureProductId: String(product.id),
              heroAssetId: customFields?.['heroAssetId']
                ? String(customFields['heroAssetId'])
                : undefined,
            };

            await upsertProduct(this.client, doc);
            Logger.info(
              `Synced product ${product.id} [${event.type}] to Typesense`,
              loggerCtx,
            );
          }
        } catch (error) {
          Logger.error(
            `Failed to sync product ${event.entity.id}: ${String(error)}`,
            loggerCtx,
          );
        }
      });

    Logger.info('SearchSyncPlugin listening for ProductEvent', loggerCtx);
  }

  onApplicationShutdown(): void {
    this.subscription?.unsubscribe();
    Logger.info('SearchSyncPlugin unsubscribed from events', loggerCtx);
  }

  /** Expose client for health checks and testing. */
  getClient(): Client {
    return this.client;
  }
}

export {
  PRODUCTS_COLLECTION,
  PRODUCTS_SCHEMA,
  DEFAULT_QUERY_BY,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
};
