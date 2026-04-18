/**
 * Purpose: StorefrontPlugin — registers StorePageEntity and pure helpers for storefront page logic.
 * Governing docs:
 *   - docs/architecture.md (§5 Service ownership, Storefront plugin)
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/storefront.plugin.test.ts
 */
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import type { RuntimeVendureConfig } from '@vendure/core';
import { StorePageEntity } from './storefront.entity.js';
import type { StorePageScope } from './storefront.entity.js';

const STORE_PAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type StorePageLike = Pick<
  StorePageEntity,
  | 'title'
  | 'slug'
  | 'scope'
  | 'productId'
  | 'isPostSale'
  | 'isTemplate'
  | 'content'
  | 'sortOrder'
  | 'enabled'
  | 'createdAt'
>;

function storefrontConfiguration(config: RuntimeVendureConfig): RuntimeVendureConfig {
  return config;
}

function validateStorePage(page: StorePageLike): string[] {
  const errors: string[] = [];

  if (!page.title?.trim()) {
    errors.push('title is required');
  }

  if (!page.slug?.trim()) {
    errors.push('slug is required');
  } else if (!STORE_PAGE_SLUG_PATTERN.test(page.slug)) {
    errors.push(
      'slug must contain only lowercase letters, numbers, and single hyphens between segments',
    );
  }

  if (!page.content?.trim()) {
    errors.push('content is required');
  }

  if (typeof page.sortOrder !== 'number' || !Number.isFinite(page.sortOrder)) {
    errors.push('sortOrder must be a finite number');
  }

  if (!isStorePageScope(page.scope)) {
    errors.push('scope must be either "universal" or "product"');
  } else if (page.scope === 'product' && !page.productId?.trim()) {
    errors.push('productId is required when scope is product');
  } else if (page.scope === 'universal' && page.productId !== null) {
    errors.push('productId must be null when scope is universal');
  }

  return errors;
}

function isPageVisibleToUser(page: Pick<StorePageLike, 'enabled' | 'isPostSale'>, hasPurchased: boolean): boolean {
  return page.enabled && (!page.isPostSale || hasPurchased);
}

function sortPages<T extends Pick<StorePageLike, 'sortOrder' | 'createdAt'>>(pages: T[]): T[] {
  return [...pages].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });
}

function filterPagesByScope<T extends Pick<StorePageLike, 'scope' | 'productId'>>(
  pages: T[],
  productId?: string,
): T[] {
  return pages.filter((page) => {
    if (page.scope === 'universal') {
      return true;
    }

    return productId !== undefined && page.productId === productId;
  });
}

function duplicatePage(
  source: StorePageEntity,
  overrides: Partial<StorePageEntity> = {},
): StorePageEntity {
  return new StorePageEntity({
    title: source.title,
    slug: `${source.slug}-copy`,
    scope: source.scope,
    productId: source.productId,
    isPostSale: source.isPostSale,
    isTemplate: false,
    content: cloneContent(source.content),
    sortOrder: source.sortOrder,
    enabled: source.enabled,
    ...overrides,
  });
}

function isStorePageScope(scope: string): scope is StorePageScope {
  return scope === 'universal' || scope === 'product';
}

function cloneContent(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content));
  } catch {
    return `${content}`;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [StorePageEntity],
  configuration: storefrontConfiguration,
  compatibility: '^3.0.0',
})
export class StorefrontPlugin {}

export {
  STORE_PAGE_SLUG_PATTERN,
  storefrontConfiguration,
  validateStorePage,
  isPageVisibleToUser,
  sortPages,
  filterPagesByScope,
  duplicatePage,
};
