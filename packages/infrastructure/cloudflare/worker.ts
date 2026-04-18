export interface Env {
  VENDURE_ORIGIN: string;
}

interface CacheConfig {
  ttl: number;
  swr: number;
  tags: string[];
}

const STATIC_TTL = 86400; // 24 hours
const API_TTL = 30;
const API_SWR = 60;
const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 1000; // requests per window

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUserSegment(request: Request): string {
  const cookie = request.headers.get('cookie') ?? '';
  const segmentMatch = cookie.match(/user_segment=([^;]+)/);
  if (segmentMatch) return segmentMatch[1];

  const headerSegment = request.headers.get('x-user-segment');
  if (headerSegment) return headerSegment;

  return 'default';
}

function buildCacheKey(request: Request): string {
  const url = new URL(request.url);
  const accept = request.headers.get('accept') ?? '*/*';
  const segment = getUserSegment(request);
  return `${url.origin}${url.pathname}${url.search}::accept=${accept}::seg=${segment}`;
}

function deriveCacheConfig(url: URL): CacheConfig | null {
  const path = url.pathname;

  // Never cache admin API
  if (path.startsWith('/admin-api')) return null;

  // Static assets — long TTL, no SWR needed
  if (path.startsWith('/assets/')) {
    return { ttl: STATIC_TTL, swr: 0, tags: ['static', 'assets'] };
  }

  // Shop API GET requests — short TTL with SWR
  if (path.startsWith('/shop-api')) {
    return { ttl: API_TTL, swr: API_SWR, tags: ['api', 'shop-api'] };
  }

  return null;
}

function shouldSkipCache(request: Request): boolean {
  if (request.method !== 'GET') return true;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/admin-api')) return true;
  return false;
}

function withCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Segment');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// ---------------------------------------------------------------------------
// Rate limiting (Cache API–based counter per IP)
// ---------------------------------------------------------------------------

async function isRateLimited(request: Request): Promise<boolean> {
  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const windowKey = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW);
  const counterUrl = `https://rate-limit.internal/__rl/${ip}/${windowKey}`;
  const counterRequest = new Request(counterUrl);

  const cache = caches.default;
  const existing = await cache.match(counterRequest);

  let count = 0;
  if (existing) {
    count = parseInt(await existing.text(), 10);
  }

  count += 1;

  const counterResponse = new Response(String(count), {
    headers: {
      'Cache-Control': `s-maxage=${RATE_LIMIT_WINDOW}`,
      'Content-Type': 'text/plain',
    },
  });
  await cache.put(counterRequest, counterResponse);

  return count > RATE_LIMIT_MAX;
}

// ---------------------------------------------------------------------------
// Origin fetch
// ---------------------------------------------------------------------------

async function fetchOrigin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const originUrl = `${env.VENDURE_ORIGIN}${url.pathname}${url.search}`;
  const originRequest = new Request(originUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  });
  return fetch(originRequest);
}

// ---------------------------------------------------------------------------
// SWR caching
// ---------------------------------------------------------------------------

async function handleWithCache(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  config: CacheConfig,
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(buildCacheKey(request));

  const cached = await cache.match(cacheKey);

  if (cached) {
    const age = parseInt(cached.headers.get('x-cache-age') ?? '0', 10);
    const storedAt = parseInt(cached.headers.get('x-cache-stored-at') ?? '0', 10);
    const elapsed = Math.floor(Date.now() / 1000) - storedAt;

    // Within TTL — serve from cache
    if (elapsed <= config.ttl) {
      const hit = new Response(cached.body, cached);
      hit.headers.set('X-Cache', 'HIT');
      return hit;
    }

    // Within SWR window — serve stale, revalidate in background
    if (config.swr > 0 && elapsed <= config.ttl + config.swr) {
      ctx.waitUntil(revalidate(request, env, cache, cacheKey, config));
      const stale = new Response(cached.body, cached);
      stale.headers.set('X-Cache', 'STALE');
      return stale;
    }
  }

  // Cache miss — fetch and store
  return revalidate(request, env, cache, cacheKey, config);
}

async function revalidate(
  request: Request,
  env: Env,
  cache: Cache,
  cacheKey: Request,
  config: CacheConfig,
): Promise<Response> {
  const origin = await fetchOrigin(request, env);

  if (!origin.ok) {
    const resp = new Response(origin.body, origin);
    resp.headers.set('X-Cache', 'ERROR');
    return resp;
  }

  const headers = new Headers(origin.headers);
  const now = Math.floor(Date.now() / 1000);
  headers.set('x-cache-stored-at', String(now));
  headers.set('x-cache-age', '0');
  headers.set('Cache-Control', `s-maxage=${config.ttl + config.swr}, stale-while-revalidate=${config.swr}`);

  if (config.tags.length > 0) {
    headers.set('Cache-Tag', config.tags.join(','));
  }

  const cacheable = new Response(origin.body, { status: origin.status, statusText: origin.statusText, headers });

  // Store a clone in cache; return the original
  await cache.put(cacheKey, cacheable.clone());

  cacheable.headers.set('X-Cache', 'MISS');
  return cacheable;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return withCorsHeaders(new Response(null, { status: 204 }));
    }

    // Rate limiting
    if (await isRateLimited(request)) {
      return withCorsHeaders(
        new Response(JSON.stringify({ error: 'Too Many Requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': String(RATE_LIMIT_WINDOW) },
        }),
      );
    }

    // Determine caching strategy
    const url = new URL(request.url);
    const config = shouldSkipCache(request) ? null : deriveCacheConfig(url);

    let response: Response;

    if (config) {
      response = await handleWithCache(request, env, ctx, config);
    } else {
      response = await fetchOrigin(request, env);
      response = new Response(response.body, response);
      response.headers.set('X-Cache', 'BYPASS');
    }

    return withCorsHeaders(response);
  },
} satisfies ExportedHandler<Env>;
