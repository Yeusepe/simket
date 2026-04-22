/**
 * Purpose: Fetch Simket-owned catalog and creator-dashboard data from Vendure's
 *          Better Auth bridge GraphQL extensions.
 * Governing docs:
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/
 * Tests:
 *   - packages/storefront/src/hooks/use-trending-products.test.tsx
 */
import type { ActivityItem, DashboardStats, QuickAction } from '../components/dashboard/dashboard-types';
import type { CreatorProductsApi } from '../components/dashboard/products/use-products';
import type { ProductFormData, ProductSummary } from '../components/dashboard/products/product-types';
import type {
  CreatorStorefrontPageApi,
  CreatorStorefrontPageRecord,
  UpsertCreatorStorefrontPageInput,
} from '../components/dashboard/templates/use-storefront-pages';
import type { CreatorStore } from '../store/types';
import type { ProductDetail, ProductListItem } from '../types/product';
import { fetchShopGraphql } from '../lib/shop-api';

const CATALOG_PRODUCTS_QUERY = `
  query CatalogProducts($limit: Int) {
    catalogProducts(limit: $limit) {
      id
      slug
      name
      description
      priceMin
      priceMax
      currencyCode
      heroImageUrl
      heroTransparentUrl
      creatorName
      creatorAvatarUrl
      tags
      categorySlug
      previewColor
    }
  }
`;

const CATALOG_PRODUCT_QUERY = `
  query CatalogProduct($slug: String!) {
    catalogProduct(slug: $slug) {
      id
      slug
      name
      description
      tiptapDescription
      currencyCode
      heroMediaUrl
      heroMediaType
      heroTransparentUrl
      heroBackgroundUrl
      termsOfService
      tags
      categorySlug
      creator {
        id
        name
        avatarUrl
      }
      variants {
        id
        name
        price
        currencyCode
        sku
        stockLevel
      }
      requiredProductIds
      dependencyRequirements
      availableBundles
      framelyPageSchema
      createdAt
      updatedAt
    }
  }
`;

const CREATOR_DASHBOARD_QUERY = `
  query CreatorDashboardData {
    creatorDashboardData {
      creatorName
      stats {
        totalRevenue
        totalSales
        totalViews
        conversionRate
        revenueChange
        salesChange
      }
      activityItems {
        id
        type
        title
        description
        timestamp
      }
      quickActions {
        id
        label
        icon
        href
      }
    }
  }
`;

const CREATOR_PRODUCTS_QUERY = `
  query CreatorProducts {
    creatorProducts {
      id
      name
      slug
      price
      currency
      visibility
      salesCount
      revenue
      heroImageUrl
      createdAt
      updatedAt
    }
  }
`;

const UPSERT_CREATOR_PRODUCT_MUTATION = `
  mutation UpsertCreatorProduct($productId: ID, $input: CreatorProductInput!) {
    upsertCreatorProduct(productId: $productId, input: $input) {
      id
      name
      slug
      price
      currency
      visibility
      salesCount
      revenue
      heroImageUrl
      createdAt
      updatedAt
    }
  }
`;

const DELETE_CREATOR_PRODUCT_MUTATION = `
  mutation DeleteCreatorProduct($productId: ID!) {
    deleteCreatorProduct(productId: $productId)
  }
`;

const DUPLICATE_CREATOR_PRODUCT_MUTATION = `
  mutation DuplicateCreatorProduct($productId: ID!) {
    duplicateCreatorProduct(productId: $productId) {
      id
      name
      slug
      price
      currency
      visibility
      salesCount
      revenue
      heroImageUrl
      createdAt
      updatedAt
    }
  }
`;

const CREATOR_STORE_QUERY = `
  query CreatorStore($creatorSlug: String!) {
    creatorStore(creatorSlug: $creatorSlug) {
      creator {
        id
        slug
        displayName
        avatarUrl
        tagline
        bio
      }
      theme
      pages {
        id
        title
        slug
        scope
        productId
        enabled
        schema
      }
      products {
        id
        slug
        name
        description
        priceMin
        priceMax
        currencyCode
        heroImageUrl
        heroTransparentUrl
        creatorName
        creatorAvatarUrl
        tags
        categorySlug
        previewColor
      }
    }
  }
`;

const CREATOR_STOREFRONT_PAGE_QUERY = `
  query CreatorStorefrontPage($scope: String!, $slug: String!, $productId: ID) {
    creatorStorefrontPage(scope: $scope, slug: $slug, productId: $productId) {
      id
      title
      slug
      scope
      productId
      enabled
      schema
      createdAt
      updatedAt
    }
  }
`;

const UPSERT_CREATOR_STOREFRONT_PAGE_MUTATION = `
  mutation UpsertCreatorStorefrontPage($input: UpsertCreatorStorefrontPageInput!) {
    upsertCreatorStorefrontPage(input: $input) {
      id
      title
      slug
      scope
      productId
      enabled
      schema
      createdAt
      updatedAt
    }
  }
`;

interface CreatorDashboardResponse {
  readonly creatorDashboardData: {
    readonly creatorName: string;
    readonly stats: DashboardStats;
    readonly activityItems: readonly ActivityItem[];
    readonly quickActions: readonly QuickAction[];
  };
}

interface CreatorProductsResponse {
  readonly creatorProducts: readonly ProductSummary[];
}

interface CatalogProductsResponse {
  readonly catalogProducts: readonly ProductListItem[];
}

interface CatalogProductResponse {
  readonly catalogProduct: ProductDetail;
}

interface CreatorStoreResponse {
  readonly creatorStore: CreatorStore | null;
}

interface CreatorStorefrontPageResponse {
  readonly creatorStorefrontPage: CreatorStorefrontPageRecord | null;
}

function toCreatorProductInput(data: ProductFormData) {
  return {
    name: data.name,
    slug: data.slug,
    description: data.description,
    shortDescription: data.shortDescription,
    price: data.price,
    compareAtPrice: data.compareAtPrice ?? null,
    currency: data.currency,
    platformFeePercent: data.platformFeePercent,
    tags: data.tags,
    termsOfService: data.termsOfService,
    visibility: data.visibility,
  };
}

export async function fetchCatalogProducts(limit = 12): Promise<readonly ProductListItem[]> {
  const data = await fetchShopGraphql<CatalogProductsResponse>(CATALOG_PRODUCTS_QUERY, { limit });
  return data.catalogProducts;
}

export async function fetchCatalogProduct(slug: string): Promise<ProductDetail> {
  const data = await fetchShopGraphql<CatalogProductResponse>(CATALOG_PRODUCT_QUERY, { slug });
  return data.catalogProduct;
}

export async function fetchCreatorStore(creatorSlug: string): Promise<CreatorStore | null> {
  const data = await fetchShopGraphql<CreatorStoreResponse>(CREATOR_STORE_QUERY, { creatorSlug });
  return data.creatorStore;
}

export async function fetchCreatorDashboardData(): Promise<CreatorDashboardResponse['creatorDashboardData']> {
  const data = await fetchShopGraphql<CreatorDashboardResponse>(CREATOR_DASHBOARD_QUERY, {});
  return data.creatorDashboardData;
}

export function createCreatorProductsApi(): CreatorProductsApi {
  return {
    async list() {
      const data = await fetchShopGraphql<CreatorProductsResponse>(CREATOR_PRODUCTS_QUERY, {});
      return data.creatorProducts;
    },
    async create(product) {
      const data = await fetchShopGraphql<{ upsertCreatorProduct: ProductSummary }>(
        UPSERT_CREATOR_PRODUCT_MUTATION,
        {
          productId: null,
          input: toCreatorProductInput(product),
        },
      );
      return data.upsertCreatorProduct;
    },
    async update(productId, product) {
      const data = await fetchShopGraphql<{ upsertCreatorProduct: ProductSummary }>(
        UPSERT_CREATOR_PRODUCT_MUTATION,
        {
          productId,
          input: toCreatorProductInput(product),
        },
      );
      return data.upsertCreatorProduct;
    },
    async delete(productId) {
      const data = await fetchShopGraphql<{ deleteCreatorProduct: boolean }>(
        DELETE_CREATOR_PRODUCT_MUTATION,
        { productId },
      );
      if (!data.deleteCreatorProduct) {
        throw new Error(`Creator product "${productId}" could not be deleted.`);
      }
    },
    async duplicate(productId) {
      const data = await fetchShopGraphql<{ duplicateCreatorProduct: ProductSummary }>(
        DUPLICATE_CREATOR_PRODUCT_MUTATION,
        { productId },
      );
      return data.duplicateCreatorProduct;
    },
  };
}

export function createCreatorStorefrontPagesApi(): CreatorStorefrontPageApi {
  return {
    async loadPage({ scope, slug, productId }) {
      const data = await fetchShopGraphql<CreatorStorefrontPageResponse>(
        CREATOR_STOREFRONT_PAGE_QUERY,
        {
          scope,
          slug,
          productId: productId ?? null,
        },
      );

      return data.creatorStorefrontPage;
    },
    async savePage(input: UpsertCreatorStorefrontPageInput) {
      const data = await fetchShopGraphql<{ upsertCreatorStorefrontPage: CreatorStorefrontPageRecord }>(
        UPSERT_CREATOR_STOREFRONT_PAGE_MUTATION,
        {
          input: {
            pageId: input.pageId ?? null,
            title: input.title,
            slug: input.slug,
            scope: input.scope,
            productId: input.productId ?? null,
            content: input.schema,
            enabled: input.enabled ?? true,
          },
        },
      );

      return data.upsertCreatorStorefrontPage;
    },
  };
}
