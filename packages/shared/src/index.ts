/**
 * @simket/shared — Shared types, Bebop codecs, and resilience utilities.
 */
export type {
  Product,
  ProductState,
  ProductVariant,
  CartItem,
  Cart,
  Order,
  OrderState,
  OrderLine,
  Customer,
  SearchResult,
  SearchRequest,
  SearchFilters,
  SearchSort,
  SearchResponse,
  SearchFacets,
  FacetCount,
  Bundle,
  ProductDependency,
  Collaboration,
  CollaborationState,
  RecommendRequest,
  RecommendResponse,
  RecommendCandidate,
  RecommendFeedback,
} from './types/index.js';

export {
  validatePayloadSize,
  validateShopPayload,
  validateAdminPayload,
  MAX_SHOP_PAYLOAD_BYTES,
  MAX_ADMIN_PAYLOAD_BYTES,
} from './middleware/index.js';
export type { PayloadValidationResult } from './middleware/index.js';
