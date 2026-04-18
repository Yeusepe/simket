/**
 * Purpose: Route-level wrapper for the storefront wishlist page.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * Tests:
 *   - packages/storefront/src/components/wishlist/WishlistPage.test.tsx
 */
import { WishlistPage as WishlistPageComponent } from '../components/wishlist';

export function WishlistPage() {
  return <WishlistPageComponent />;
}
