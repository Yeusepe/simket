/**
 * CrowdSec abuse defence — thin wrapper around @crowdsec/nodejs-bouncer SDK.
 *
 * The SDK handles: LAPI communication, decision caching, remediation mapping.
 * This module provides: Express middleware, Simket-specific decision types,
 * and a rate-limit fallback when the LAPI is unreachable.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://docs.crowdsec.net/docs/bouncers/nodejs/
 *   - https://www.npmjs.com/package/@crowdsec/nodejs-bouncer
 *   - https://github.com/crowdsecurity/nodejs-cs-bouncer/blob/main/README.md
 * Tests:
 *   - packages/vendure-server/src/security/crowdsec.test.ts
 */
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { CrowdSecBouncer as CrowdSecBouncerSDK } from '@crowdsec/nodejs-bouncer';
import {
  BrokenCircuitError,
  SERVICE_POLICIES,
  type ResiliencePolicy,
} from '../resilience/resilience.js';
import { RateLimiter } from './rate-limiter.js';

export type CrowdSecDecision = 'allow' | 'deny' | 'captcha';

export interface CrowdSecBouncerOptions {
  lapiUrl: string;
  apiKey: string;
  /** Behaviour when LAPI is unreachable and SDK throws. Default: 'deny-all'. */
  fallbackMode?: 'rate-limit' | 'deny-all';
  policy?: ResiliencePolicy;
  rateLimiter?: RateLimiter;
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

function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

const tracer = trace.getTracer('simket-crowdsec');

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
  private readonly policy: ResiliencePolicy;

  constructor(opts: CrowdSecBouncerOptions) {
    this.client = new CrowdSecBouncerSDK({
      url: opts.lapiUrl,
      bouncerApiToken: opts.apiKey,
      fallbackRemediation: 'ban',
    });
    this.fallbackMode = opts.fallbackMode ?? 'deny-all';
    this.rateLimiter = opts.rateLimiter ?? new RateLimiter({
      maxTokens: 20,
      refillRate: 5,
      refillInterval: 10_000,
    });
    this.policy = opts.policy ?? SERVICE_POLICIES.crowdsec;
  }

  /**
   * Check an IP address against CrowdSec LAPI decisions.
   *
   * SDK handles caching internally — no manual LRU cache needed.
   */
  async checkIp(ip: string): Promise<CrowdSecDecision> {
    return tracer.startActiveSpan('crowdsec.check-ip', async (span) => {
      const normalizedIp = normalizeIp(ip);
      span.setAttribute('crowdsec.ip', normalizedIp);

      try {
        const result = await this.policy.execute(() => this.client.getIpRemediation(normalizedIp));
        const decision = mapRemediation(result.remediation);
        span.setAttribute('crowdsec.decision', decision);
        return decision;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });

        if (error instanceof BrokenCircuitError) {
          span.setAttribute('crowdsec.fallback', 'broken-circuit');
          span.setAttribute('crowdsec.decision', 'deny');
          return 'deny';
        }

        if (this.fallbackMode === 'rate-limit') {
          const decision = this.rateLimiter.tryConsume(normalizedIp) ? 'allow' : 'deny';
          span.setAttribute('crowdsec.fallback', 'rate-limit');
          span.setAttribute('crowdsec.decision', decision);
          return decision;
        }

        span.setAttribute('crowdsec.fallback', 'deny-all');
        span.setAttribute('crowdsec.decision', 'deny');
        return 'deny';
      } finally {
        span.end();
      }
    });
  }
}

/* ---------- Express middleware ---------- */

export interface CrowdSecRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: {
    remoteAddress?: string;
  };
}

interface MiddlewareResponse {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
}

type NextFunction = () => void;

export function extractClientIp(req: CrowdSecRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const raw = Array.isArray(xff) ? xff[0] : xff;
    const first = raw?.split(',')[0]?.trim();
    if (first) return normalizeIp(first);
  }

  const xri = req.headers['x-real-ip'];
  if (xri) {
    const val = Array.isArray(xri) ? xri[0] : xri;
    if (val) return normalizeIp(val.trim());
  }

  return normalizeIp(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0');
}

export function crowdSecMiddleware(
  bouncer: CrowdSecBouncer,
): (req: CrowdSecRequest, res: MiddlewareResponse, next: NextFunction) => Promise<void> {
  return async (req, res, next) => {
    const ip = extractClientIp(req);
    const decision = await bouncer.checkIp(ip);

    res.setHeader('X-CrowdSec-Decision', decision);

    if (decision === 'deny') {
      res.status(403).json({ error: 'Forbidden', reason: 'crowdsec' });
      return;
    }

    next();
  };
}
