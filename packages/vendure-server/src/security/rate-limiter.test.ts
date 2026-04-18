import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter } from './rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within the token limit', () => {
    const limiter = new RateLimiter({ maxTokens: 3, refillRate: 1, refillInterval: 1000 });
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
  });

  it('should deny requests when tokens are exhausted', () => {
    const limiter = new RateLimiter({ maxTokens: 2, refillRate: 1, refillInterval: 1000 });
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(false);
  });

  it('should refill tokens after the refill interval', () => {
    const limiter = new RateLimiter({ maxTokens: 2, refillRate: 1, refillInterval: 1000 });
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(false);

    // Advance time by one refill interval
    vi.advanceTimersByTime(1000);

    // Should have refilled 1 token
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(false);
  });

  it('should not refill beyond maxTokens', () => {
    const limiter = new RateLimiter({ maxTokens: 2, refillRate: 1, refillInterval: 1000 });
    // Don't consume any tokens, advance time
    vi.advanceTimersByTime(5000);
    // Should still only have maxTokens available
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    expect(limiter.tryConsume('1.2.3.4')).toBe(false);
  });

  it('should track tokens per IP independently', () => {
    const limiter = new RateLimiter({ maxTokens: 1, refillRate: 1, refillInterval: 1000 });
    expect(limiter.tryConsume('1.1.1.1')).toBe(true);
    expect(limiter.tryConsume('1.1.1.1')).toBe(false);
    // Different IP should have its own bucket
    expect(limiter.tryConsume('2.2.2.2')).toBe(true);
    expect(limiter.tryConsume('2.2.2.2')).toBe(false);
  });

  it('should refill multiple tokens over multiple intervals', () => {
    const limiter = new RateLimiter({ maxTokens: 5, refillRate: 2, refillInterval: 1000 });
    // Consume all 5 tokens
    for (let i = 0; i < 5; i++) {
      expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    }
    expect(limiter.tryConsume('1.2.3.4')).toBe(false);

    // After 2 intervals, should have refilled 4 tokens (2 per interval)
    vi.advanceTimersByTime(2000);
    for (let i = 0; i < 4; i++) {
      expect(limiter.tryConsume('1.2.3.4')).toBe(true);
    }
    expect(limiter.tryConsume('1.2.3.4')).toBe(false);
  });
});
