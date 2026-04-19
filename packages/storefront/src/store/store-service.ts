/**
 * Purpose: Provide creator-store configuration and catalog data to routed storefront layouts.
 * Governing docs:
 *   - docs/architecture.md (§1 storefront, §5 Framely integration)
 *   - docs/domain-model.md (§1 Product, FramelyProject, StorePage)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§6 data ownership)
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#product
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/store/StoreLayout.test.tsx
 *   - packages/storefront/src/App.test.tsx
 */
import { CURRENT_PAGE_SCHEMA_VERSION, type PageSchema } from '../builder';
import type { ProductDetail, ProductListItem } from '../types/product';
import type { CreatorStore } from './types';

function createStoreProduct(overrides: Partial<ProductDetail>): ProductDetail {
  return {
    id: 'product-id',
    slug: 'product-slug',
    name: 'Product name',
    tiptapDescription: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Creator-crafted digital product.' }],
        },
      ],
    },
    description: 'Creator-crafted digital product.',
    variants: [
      {
        id: 'variant-id',
        name: 'Default',
        price: 2400,
        currencyCode: 'USD',
        sku: 'SKU-DEFAULT',
        stockLevel: 'IN_STOCK',
      },
    ],
    currencyCode: 'USD',
    heroMediaUrl: 'https://cdn.simket.example/products/default/hero.webp',
    heroMediaType: 'image',
    heroTransparentUrl: null,
    heroBackgroundUrl: null,
    termsOfService: null,
    tags: ['creator-store'],
    categorySlug: 'tools',
    creator: {
      id: 'creator-id',
      name: 'Creator',
      avatarUrl: null,
    },
    requiredProductIds: [],
    dependencyRequirements: [],
    availableBundles: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createPageSchema(blocks: PageSchema['blocks']): PageSchema {
  return {
    version: CURRENT_PAGE_SCHEMA_VERSION,
    blocks,
  };
}

const alexArtistStore: CreatorStore = {
  creator: {
    id: 'creator-alex-artist',
    slug: 'alex-artist',
    displayName: 'Alex Artist',
    avatarUrl: 'https://cdn.simket.example/avatars/alex-artist.webp',
    tagline: 'Realtime shaders, lighting kits, and launch-ready VFX packs.',
    bio: 'Alex ships storefront-ready VFX kits built for cinematic reveals, launch trailers, and polished creator drops.',
  },
  theme: {
    primaryColor: '#7c3aed',
    backgroundColor: '#0f1020',
    foregroundColor: '#f8fafc',
    fontFamily: '"CreatorFont", system-ui, sans-serif',
    borderRadius: '1.5rem',
  },
  pages: [
    {
      slug: 'home',
      title: 'Home',
      isHomepage: true,
      schema: createPageSchema([
        {
          id: 'alex-hero',
          type: 'hero',
          props: {
            title: 'Alex Artist',
            subtitle: 'Realtime shaders, lighting kits, and launch-ready VFX packs.',
            ctaLabel: 'Browse the catalog',
            ctaHref: '#catalog',
          },
        },
      ]),
    },
    {
      slug: 'about',
      title: 'About',
      schema: createPageSchema([
        {
          id: 'alex-about',
          type: 'text',
          props: {
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Built for realtime launches' }],
                },
              ],
            },
          },
        },
      ]),
    },
  ],
  products: [
    createStoreProduct({
      id: 'alex-product-1',
      slug: 'shader-starter-kit',
      name: 'Shader Starter Kit',
      description: 'Stylized shader pack for creator storefront launches.',
      heroMediaUrl: 'https://cdn.simket.example/products/shader-starter-kit/hero.webp',
      creator: {
        id: 'creator-alex-artist',
        name: 'Alex Artist',
        avatarUrl: 'https://cdn.simket.example/avatars/alex-artist.webp',
      },
      tags: ['shaders', 'vfx'],
    }),
    createStoreProduct({
      id: 'alex-product-2',
      slug: 'lighting-atlas',
      name: 'Lighting Atlas',
      description: 'Lighting references and presets for showcase-ready scenes.',
      heroMediaUrl: 'https://cdn.simket.example/products/lighting-atlas/hero.webp',
      creator: {
        id: 'creator-alex-artist',
        name: 'Alex Artist',
        avatarUrl: 'https://cdn.simket.example/avatars/alex-artist.webp',
      },
      tags: ['lighting', 'reference'],
      variants: [
        {
          id: 'alex-product-2-variant',
          name: 'Default',
          price: 1800,
          currencyCode: 'USD',
          sku: 'LIGHT-ATLAS',
          stockLevel: 'IN_STOCK',
        },
      ],
    }),
  ],
};

const pixelLabStore: CreatorStore = {
  creator: {
    id: 'creator-pixel-lab',
    slug: 'pixel-lab',
    displayName: 'Pixel Lab',
    avatarUrl: 'https://cdn.simket.example/avatars/pixel-lab.webp',
    tagline: 'Matte packs and layered assets for storefront launches.',
    bio: 'Pixel Lab curates drop-ready illustration packs and storefront merch media.',
  },
  theme: {
    primaryColor: '#0ea5e9',
    backgroundColor: '#08111a',
    foregroundColor: '#ecfeff',
    fontFamily: '"CreatorFont", system-ui, sans-serif',
    borderRadius: '1.25rem',
  },
  pages: [],
  products: [
    createStoreProduct({
      id: 'pixel-product-1',
      slug: 'fx-matte-pack',
      name: 'FX Matte Pack',
      description: 'Layered matte illustrations for digital product pages.',
      heroMediaUrl: 'https://cdn.simket.example/products/fx-matte-pack/hero.webp',
      creator: {
        id: 'creator-pixel-lab',
        name: 'Pixel Lab',
        avatarUrl: 'https://cdn.simket.example/avatars/pixel-lab.webp',
      },
      tags: ['mattes', 'illustration'],
    }),
  ],
};

const STORES = new Map<string, CreatorStore>([
  [alexArtistStore.creator.slug, alexArtistStore],
  [pixelLabStore.creator.slug, pixelLabStore],
]);

export interface StoreService {
  readonly getStoreBySlug: (creatorSlug: string) => Promise<CreatorStore | null>;
}

export const seededStoreService: StoreService = {
  async getStoreBySlug(creatorSlug) {
    return STORES.get(creatorSlug) ?? null;
  },
};

export function toProductListItem(product: ProductDetail): ProductListItem {
  const firstVariant = product.variants[0];

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    priceMin: firstVariant?.price ?? 0,
    priceMax: firstVariant?.price ?? 0,
    currencyCode: firstVariant?.currencyCode ?? product.currencyCode,
    heroImageUrl: product.heroMediaType === 'image' ? product.heroMediaUrl : null,
    heroTransparentUrl: product.heroTransparentUrl,
    creatorName: product.creator.name,
    creatorAvatarUrl: product.creator.avatarUrl,
    tags: product.tags,
    categorySlug: product.categorySlug,
  };
}
