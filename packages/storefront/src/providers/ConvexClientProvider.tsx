/**
 * Purpose: Convex React provider that wraps the app with a ConvexReactClient
 * for reactive real-time subscriptions (notifications, preferences, workflows).
 *
 * Governing docs:
 *   - docs/architecture.md §3 (Convex — real-time state)
 * External references:
 *   - https://docs.convex.dev/client/react
 *   - https://docs.convex.dev/client/react#convexprovider
 * Tests:
 *   - packages/storefront/src/providers/ConvexClientProvider.test.tsx
 */
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;

let convexClient: ConvexReactClient | null = null;

function getConvexClient(): ConvexReactClient | null {
  if (convexClient) return convexClient;
  if (!CONVEX_URL) return null;
  convexClient = new ConvexReactClient(CONVEX_URL);
  return convexClient;
}

interface ConvexClientProviderProps {
  readonly children: ReactNode;
}

/**
 * Wraps children with Convex's reactive provider. If VITE_CONVEX_URL is not set,
 * renders children without Convex (graceful degradation for local dev without Convex).
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const client = getConvexClient();

  if (!client) {
    return <>{children}</>;
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
