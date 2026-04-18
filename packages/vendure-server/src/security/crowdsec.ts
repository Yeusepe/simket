/**
 * CrowdSec abuse defence — thin wrapper around @crowdsec/nodejs-bouncer SDK.
 *
 * The SDK handles: LAPI communication, decision caching, remediation mapping.
 * This module provides: Express middleware, Simket-specific decision types,
 * and a rate-limit fallback when the LAPI is unreachable.
 *
 * Governing docs:
 *   - docs/architecture.md §9.5 (CrowdSec abuse defence)
 * External references:
 *   - https://docs.crowdsec.net/docs/bouncers/nodejs/
 *   - https://www.npmjs.com/package/@crowdsec/nodejs-bouncer
 * Tests:
 *   - packages/vendure-server/src/security/crowdsec.test.ts
 */
import { CrowdSecBouncer as CrowdSecBouncerSDK } from '@crowdsec/nodejs-bouncer';
import { RateLimiter } from './rate-limiter.js';

export type CrowdSecDecision = 'allow' | 'deny' | 'captcha';

export interface CrowdSecBouncerOptions {
  lapiUrl: string;
  apiKey: string;
  /** Behaviour when LAPI is unreachable and SDK throws. Default: 'deny-all'. */
  fallbackMode?: 'rate-limit' | 'deny-all';
}

/** Map SDK remediation strings to Simket decision types. */
function mapRemediation(remediation: string): CrowdSecDecision {
  switch (remediation) {
    case 'ban':
      return 'deny';
    case 'captcha':
      return 'captcha';
    case 'bypass':
      return 'allow';
    default:
      // Fail-closed: unknown remediation types are denied
      return 'deny';
  }
}

/**
 * Simket CrowdSec bouncer — delegates to @crowdsec/nodejs-bouncer SDK.
 *
 * The SDK provides built-in caching (`cleanIpCacheDuration`, `badIpCacheDuration`)
 * and LAPI communication. This wrapper adds Express middleware integration
 * and a configurable fallback strategy.
 */
export class CrowdSecBouncer {
  private readonly client: CrowdSecBouncerSDK;
  private readonly fallbackMode: 'rate-limit' | 'deny-all';
  private readonly rateLimiter: RateLimiter;

  constructor(opts: CrowdSecBouncerOptions) {
    this.client = new CrowdSecBouncerSDK({
      url: opts.lapiUrl,
      bouncerApiToken: opts.apiKey,
      fallbackRemediation: 'ban',
    });
    this.fallbackMode = opts.fallbackMode ?? 'deny-all';
    this.rateLimiter = new RateLimiter({
      maxTokens: 20,
      refillRate: 5,
      refillInterval: 10_000,
    });
  }

  /**
   * Check an IP address against CrowdSec LAPI decisions.
   *
   * SDK handles caching internally — no manual LRU cache needed.
   */
  async checkIp(ip: string): Promise<CrowdSecDecision> {
    try {
      const result = await this.client.getIpRemediation(ip);
      return mapRemediation(result.remediation);
    } catch {
      // LAPI unreachable — fail-closed
      if (this.fallbackMode === 'rate-limit') {
        return this.rateLimiter.tryConsume(ip) ? 'allow' : 'deny';
      }
      return 'deny';
    }
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
