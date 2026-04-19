/**
 * Purpose: Cloudflare Worker entry point for the Simket storefront.
 *
 * This Worker runs at the edge and handles:
 *   1. API proxying — forwards /shop-api and /admin-api to the Vendure backend
 *   2. Subdomain routing — resolves creatorname.simket.com to the correct store
 *   3. Edge caching — caches API responses at the edge where appropriate
 *
 * Static assets (the React SPA build) are served by Cloudflare's asset
 * handling before reaching this Worker. Only non-asset requests hit this code.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://developers.cloudflare.com/workers/
 *   - https://developers.cloudflare.com/workers/vite-plugin/
 *   - https://developers.cloudflare.com/workers/runtime-apis/fetch/
 * Tests:
 *   - packages/storefront/worker/__tests__/index.test.ts
 */

export interface Env {
  VENDURE_API_URL: string;
  ENVIRONMENT: string;
  // Future bindings:
  // STORE_CACHE: KVNamespace;
  // ASSETS_BUCKET: R2Bucket;
  // DB: Hyperdrive;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // --- API Proxy ---
    // Forward /shop-api and /admin-api requests to the Vendure backend.
    if (url.pathname.startsWith('/shop-api') || url.pathname.startsWith('/admin-api')) {
      return proxyToVendure(request, url, env);
    }

    // --- Subdomain Store Routing ---
    // Extract store slug from subdomain: creatorname.simket.com
    const storeSlug = extractStoreSlug(url.hostname);
    if (storeSlug) {
      // Pass store context as a header so the SPA can use it
      const headers = new Headers(request.headers);
      headers.set('X-Simket-Store', storeSlug);

      // Return the SPA — the client-side router handles store-specific rendering.
      // The asset handling (not_found_handling: "single-page-application") serves
      // index.html for all unmatched routes.
      return new Response(null, {
        status: 200,
        headers: {
          'X-Simket-Store': storeSlug,
        },
      });
    }

    // --- Default ---
    // All other requests fall through to Cloudflare's asset handling (the SPA).
    // The `not_found_handling: "single-page-application"` in wrangler.jsonc
    // ensures index.html is served for client-side routes.
    return fetch(request);
  },
} satisfies ExportedHandler<Env>;

/**
 * Proxies a request to the Vendure backend API.
 */
async function proxyToVendure(
  request: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  const vendureUrl = new URL(url.pathname + url.search, env.VENDURE_API_URL);

  const proxyRequest = new Request(vendureUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  const response = await fetch(proxyRequest);

  // Clone response with CORS headers for the storefront
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', url.origin);
  responseHeaders.set('Access-Control-Allow-Credentials', 'true');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

/**
 * Extracts the store slug from a subdomain.
 * E.g., "josephstore.simket.com" → "josephstore"
 *       "simket.com" → null (main site)
 *       "localhost" → null (dev)
 */
function extractStoreSlug(hostname: string): string | null {
  // Dev: no subdomains on localhost
  if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('[')) {
    return null;
  }

  const parts = hostname.split('.');

  // "creatorname.simket.com" has 3 parts, "simket.com" has 2
  if (parts.length >= 3) {
    const subdomain = parts[0]!;
    // Skip common non-store subdomains
    if (['www', 'api', 'admin', 'app'].includes(subdomain)) {
      return null;
    }
    return subdomain;
  }

  return null;
}
