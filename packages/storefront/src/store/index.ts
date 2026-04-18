/**
 * Purpose: Re-export creator-store routing, data, and context modules for the storefront package.
 * Governing docs:
 *   - docs/architecture.md (§1 storefront, §5 Framely integration)
 *   - docs/service-architecture.md (§1 client features)
 * External references:
 *   - https://reactrouter.com/start/framework/routing
 * Tests:
 *   - packages/storefront/src/store/routing.test.ts
 *   - packages/storefront/src/store/StoreLayout.test.tsx
 */
export * from './DefaultStoreTemplate';
export * from './routing';
export * from './StoreLayout';
export * from './StoreNotFoundPage';
export * from './StorePageRoute';
export * from './StoreProductRoute';
export * from './store-service';
export * from './types';
export * from './use-store';
