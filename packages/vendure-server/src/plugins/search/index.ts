export {
  PRODUCTS_COLLECTION,
  PRODUCTS_SCHEMA,
  buildTypesenseConfig,
  createTypesenseClient,
  ensureProductsCollection,
  checkTypesenseHealth,
} from './typesense.js';
export type { TypesenseConfig, ProductDocument } from './typesense.js';

export {
  SearchSyncPlugin,
  searchProducts,
  upsertProduct,
  deleteProduct,
  bulkUpsertProducts,
  DEFAULT_QUERY_BY,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
} from './search-sync.js';
export type { SearchResult, SearchQuery } from './search-sync.js';
