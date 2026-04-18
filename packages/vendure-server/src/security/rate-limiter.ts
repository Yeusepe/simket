/**
 * Token-bucket rate limiter — per-IP, in-memory.
 * Used as a fallback when CrowdSec LAPI is unreachable.
 */

export interface RateLimiterOptions {
  /** Maximum tokens per bucket */
  maxTokens: number;
  /** Tokens added per refill */
  refillRate: number;
  /** Milliseconds between refills */
  refillInterval: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly opts: RateLimiterOptions;

  constructor(opts: RateLimiterOptions) {
    this.opts = opts;
  }

  tryConsume(ip: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(ip);

    if (!bucket) {
      bucket = { tokens: this.opts.maxTokens, lastRefill: now };
      this.buckets.set(ip, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    const refills = Math.floor(elapsed / this.opts.refillInterval);
    if (refills > 0) {
      bucket.tokens = Math.min(this.opts.maxTokens, bucket.tokens + refills * this.opts.refillRate);
      bucket.lastRefill += refills * this.opts.refillInterval;
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
  }
}
