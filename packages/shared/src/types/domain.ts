// Bebop schema definitions (.bop)
// These define the canonical wire format for all Simket API contracts.
// When bebopc is available, compile with: bebopc --ts schemas/*.bop -o src/generated/

/**
 * Product schema — core catalog entity.
 *
 * .bop equivalent:
 * ```
 * struct Product {
 *   1 -> string id;
 *   2 -> string slug;
 *   3 -> string name;
 *   4 -> string description;       // TipTap JSONB serialized as string
 *   5 -> float64 price;
 *   6 -> string currencyCode;
 *   7 -> float64 platformTakeRate;  // minimum 0.05
 *   8 -> string termsOfService;     // TipTap JSONB serialized as string
 *   9 -> string heroAssetId;
 *   10 -> string? heroTransparentAssetId;
 *   11 -> string? heroBackgroundAssetId;
 *   12 -> string state;             // Draft | Published | Unpublished | Suspended
 *   13 -> string creatorId;
 *   14 -> string[] tags;
 *   15 -> date createdAt;
 *   16 -> date updatedAt;
 * }
 * ```
 */
export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currencyCode: string;
  platformTakeRate: number;
  termsOfService: string;
  heroAssetId: string;
  heroTransparentAssetId?: string;
  heroBackgroundAssetId?: string;
  state: ProductState;
  creatorId: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProductState = 'Draft' | 'Published' | 'Unpublished' | 'Suspended';

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  currencyCode: string;
  stockOnHand: number;
  enabled: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Cart {
  id: string;
  customerId: string;
  items: CartItem[];
  subTotal: number;
  currencyCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  code: string;
  customerId: string;
  state: OrderState;
  items: OrderLine[];
  subTotal: number;
  total: number;
  currencyCode: string;
  stripePaymentIntentId?: string;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderState =
  | 'Created'
  | 'PaymentPending'
  | 'PaymentAuthorized'
  | 'Completed'
  | 'Cancelled'
  | 'Refunded';

export interface OrderLine {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Customer {
  id: string;
  authUserId: string;
  emailAddress: string;
  firstName: string;
  lastName: string;
  isCreator: boolean;
  stripeConnectedAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  id: string;
  productId: string;
  productName: string;
  slug: string;
  description: string;
  price: number;
  currencyCode: string;
  heroAssetId: string;
  heroTransparentAssetId?: string;
  creatorName: string;
  tags: string[];
  score: number;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  page: number;
  perPage: number;
}

export interface SearchFilters {
  categories?: string[];
  priceMin?: number;
  priceMax?: number;
  tags?: string[];
  creatorId?: string;
}

export interface SearchSort {
  field: 'price' | 'createdAt' | 'popularity';
  direction: 'asc' | 'desc';
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  facets: SearchFacets;
  page: number;
  perPage: number;
}

export interface SearchFacets {
  categories: FacetCount[];
  tags: FacetCount[];
  priceRanges: FacetCount[];
}

export interface FacetCount {
  value: string;
  count: number;
}

/** Bundle — groups multiple products with a discount */
export interface Bundle {
  id: string;
  name: string;
  description: string;
  productIds: string[];
  discountPercent: number;
  price: number;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Dependency — enforces purchase prerequisites */
export interface ProductDependency {
  id: string;
  productId: string;
  requiredProductId: string;
  discountPercent: number;
}

/** Collaboration — revenue-sharing between creators */
export interface Collaboration {
  id: string;
  productId: string;
  collaboratorId: string;
  revenueSharePercent: number;
  state: CollaborationState;
  invitedAt: Date;
  respondedAt?: Date;
}

export type CollaborationState = 'Pending' | 'Invited' | 'Active' | 'Revoked';

/** Recommendation request/response */
export interface RecommendRequest {
  userId: string;
  cursor?: string;
  limit: number;
}

export interface RecommendResponse {
  candidates: RecommendCandidate[];
  nextCursor?: string;
}

export interface RecommendCandidate {
  productId: string;
  score: number;
  source: string;
}

export interface RecommendFeedback {
  userId: string;
  productId: string;
  action: 'click' | 'purchase' | 'dismiss';
  timestamp: Date;
}
