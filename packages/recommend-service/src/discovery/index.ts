/**
 * Purpose: Discovery feed exports for the recommend service package.
 *
 * Governing docs:
 *   - docs/architecture.md (§6 discovery)
 *   - docs/service-architecture.md (§1.2 Recommend service API)
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 * Tests:
 *   - packages/recommend-service/src/discovery/discovery.service.test.ts
 */

export type {
  DiscoveryItem,
  DiscoveryRequest,
  DiscoveryResponse,
} from './discovery.types.js';
export {
  decodeDiscoveryCursor,
  DiscoveryService,
  encodeDiscoveryCursor,
} from './discovery.service.js';
