/**
 * CrowdSec bouncer — checks IPs against CrowdSec LAPI and provides
 * Express middleware for automated abuse defence.
 */

import { createResiliencePolicy } from '../resilience/resilience.js';
import type { ResiliencePolicy } from '../resilience/resilience.js';
import { RateLimiter } from './rate-limiter.js';

export type CrowdSecDecision = 'allow' | 'deny' | 'captcha';

export interface CrowdSecBouncerOptions {
  lapiUrl: string;
  apiKey: string;
  /** Behaviour when LAPI is unreachable and IP not in cache. Default: 'deny-all'. */
  fallbackMode?: 'rate-limit' | 'deny-all';
}

interface CacheEntry {
  decision: CrowdSecDecision;
  expiry: number;
}

const CACHE_MAX = 1000;
const CACHE_TTL_MS = 60_000;

/**
 * Simple LRU cache using a Map (insertion-order iteration).
 * Evicts least-recently-used entries when the map exceeds `max`.
 */
class LruCache {
  private readonly map = new Map<string, CacheEntry>();
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.map.delete(key);
      return undefined;
    }

    // Move to end (most-recently-used)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry;
  }

  set(key: string, decision: CrowdSecDecision): void {
    // Delete first so re-insertion goes to end
    this.map.delete(key);
    if (this.map.size >= this.max) {
      // Evict oldest (first key)
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) {
        this.map.delete(oldest);
      }
    }
    this.map.set(key, { decision, expiry: Date.now() + CACHE_TTL_MS });
  }
}

export class CrowdSecBouncer {
  private readonly lapiUrl: string;
  private readonly apiKey: string;
  private readonly fallbackMode: 'rate-limit' | 'deny-all';
  private readonly cache = new LruCache(CACHE_MAX);
  private readonly policy: ResiliencePolicy;
  private readonly rateLimiter: RateLimiter;

  constructor(opts: CrowdSecBouncerOptions) {
    this.lapiUrl = opts.lapiUrl.replace(/\/+$/, '');
    this.apiKey = opts.apiKey;
    this.fallbackMode = opts.fallbackMode ?? 'deny-all';

    this.policy = createResiliencePolicy('crowdsec-lapi', {
      timeout: 2_000,
      retry: { maxAttempts: 1, initialDelay: 100, maxDelay: 500 },
      circuitBreaker: { threshold: 0.5, duration: 30_000, minimumRps: 0 },
    });

    this.rateLimiter = new RateLimiter({
      maxTokens: 20,
      refillRate: 5,
      refillInterval: 10_000,
    });
  }

  async checkIp(ip: string): Promise<CrowdSecDecision> {
    // Check cache first
    const cached = this.cache.get(ip);
    if (cached) return cached.decision;

    try {
      const decision = await this.policy.execute(() => this.fetchDecision(ip));
      this.cache.set(ip, decision);
      return decision;
    } catch {
      // LAPI unreachable — fail-closed
      return this.handleFallback(ip);
    }
  }

  private async fetchDecision(ip: string): Promise<CrowdSecDecision> {
    const url = `${this.lapiUrl}/v1/decisions?ip=${encodeURIComponent(ip)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2_000);
    try {
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': this.apiKey,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`CrowdSec LAPI error: ${response.status}`);
      }

      const body: unknown = await response.json();

      // CrowdSec returns null or empty array when no decision exists
      if (body === null || (Array.isArray(body) && body.length === 0)) {
        return 'allow';
      }

      if (Array.isArray(body) && body.length > 0) {
        const first = body[0] as { type?: string };
        if (first.type === 'ban') return 'deny';
        if (first.type === 'captcha') return 'captcha';
        // Unknown decision types are treated as deny (fail-closed)
        return 'deny';
      }

      return 'allow';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private handleFallback(ip: string): CrowdSecDecision {
    if (this.fallbackMode === 'rate-limit') {
      return this.rateLimiter.tryConsume(ip) ? 'allow' : 'deny';
    }
    return 'deny';
  }
}

/* ---------- Express middleware ---------- */

interface MiddlewareRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface MiddlewareResponse {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
}

type NextFunction = () => void;

function extractIp(req: MiddlewareRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const raw = Array.isArray(xff) ? xff[0] : xff;
    const first = raw?.split(',')[0]?.trim();
    if (first) return first;
  }

  const xri = req.headers['x-real-ip'];
  if (xri) {
    const val = Array.isArray(xri) ? xri[0] : xri;
    if (val) return val.trim();
  }

  return req.ip ?? '0.0.0.0';
}

export function crowdSecMiddleware(
  bouncer: CrowdSecBouncer,
): (req: MiddlewareRequest, res: MiddlewareResponse, next: NextFunction) => Promise<void> {
  return async (req, res, next) => {
    const ip = extractIp(req);
    const decision = await bouncer.checkIp(ip);

    res.setHeader('X-CrowdSec-Decision', decision);

    if (decision === 'deny') {
      res.status(403).json({ error: 'Forbidden', reason: 'crowdsec' });
      return;
    }

    next();
  };
}
