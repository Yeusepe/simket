import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HealthResponse } from './health.controller.js';

// Mock Redis connections so tests don't require a running Redis server.
// We mock the cache module, not the health controller itself.
vi.mock('../cache/index.js', () => {
  const mockRedis = {
    ping: vi.fn().mockResolvedValue('PONG'),
  };
  return {
    getCacheRedis: vi.fn(() => mockRedis),
    getQueueRedis: vi.fn(() => mockRedis),
    shutdownRedis: vi.fn(),
    cacheKey: vi.fn(),
    getOrFetch: vi.fn(),
    invalidate: vi.fn(),
    invalidatePattern: vi.fn(),
  };
});

// Import after mocks are set up
const { handleLive, handleReady, handleStartup } = await import('./health.controller.js');
const { getCacheRedis, getQueueRedis } = await import('../cache/index.js');

function assertHealthResponse(body: HealthResponse): void {
  expect(body).toHaveProperty('status');
  expect(['ok', 'error']).toContain(body.status);
  expect(body).toHaveProperty('checks');
  expect(typeof body.checks).toBe('object');
  for (const check of Object.values(body.checks)) {
    expect(['up', 'down']).toContain(check.status);
  }
}

describe('health.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to successful state
    const cacheMock = getCacheRedis() as unknown as { ping: ReturnType<typeof vi.fn> };
    const queueMock = getQueueRedis() as unknown as { ping: ReturnType<typeof vi.fn> };
    cacheMock.ping.mockResolvedValue('PONG');
    queueMock.ping.mockResolvedValue('PONG');
  });

  describe('handleLive', () => {
    it('returns 200 with ok status when event loop is healthy', async () => {
      const { code, body } = await handleLive();
      expect(code).toBe(200);
      expect(body.status).toBe('ok');
      assertHealthResponse(body);
    });

    it('includes process and event-loop checks', async () => {
      const { body } = await handleLive();
      expect(body.checks).toHaveProperty('process');
      expect(body.checks['process'].status).toBe('up');
      expect(body.checks).toHaveProperty('event-loop');
      expect(body.checks['event-loop'].status).toBe('up');
    });

    it('calls EventLoopHealthIndicator for the event-loop check', async () => {
      const { body } = await handleLive();
      // The event-loop check should include lagMs detail from the indicator
      expect(body.checks['event-loop'].detail).toBeDefined();
    });
  });

  describe('handleReady', () => {
    it('returns 200 with ok status when all dependencies are reachable', async () => {
      const { code, body } = await handleReady();
      expect(code).toBe(200);
      expect(body.status).toBe('ok');
      assertHealthResponse(body);
    });

    it('includes database and redis checks', async () => {
      const { body } = await handleReady();
      expect(body.checks).toHaveProperty('database');
      expect(body.checks['database'].status).toBe('up');
      expect(body.checks).toHaveProperty('redis-cache');
      expect(body.checks).toHaveProperty('redis-queue');
    });

    it('calls RedisHealthIndicator which pings both Redis instances', async () => {
      await handleReady();
      const cacheMock = getCacheRedis() as unknown as { ping: ReturnType<typeof vi.fn> };
      const queueMock = getQueueRedis() as unknown as { ping: ReturnType<typeof vi.fn> };
      expect(cacheMock.ping).toHaveBeenCalled();
      expect(queueMock.ping).toHaveBeenCalled();
    });

    it('returns 503 when Redis cache fails', async () => {
      const cacheMock = getCacheRedis() as unknown as { ping: ReturnType<typeof vi.fn> };
      cacheMock.ping.mockRejectedValue(new Error('Cache Redis: connection refused'));

      const { code, body } = await handleReady();
      expect(code).toBe(503);
      expect(body.status).toBe('error');
      assertHealthResponse(body);
    });

    it('returns 503 when Redis queue fails', async () => {
      const queueMock = getQueueRedis() as unknown as { ping: ReturnType<typeof vi.fn> };
      queueMock.ping.mockRejectedValue(new Error('Queue Redis: connection refused'));

      const { code, body } = await handleReady();
      expect(code).toBe(503);
      expect(body.status).toBe('error');
      assertHealthResponse(body);
    });
  });

  describe('handleStartup', () => {
    it('returns 200 with ok status when config and migrations are present', async () => {
      const { code, body } = await handleStartup();
      expect(code).toBe(200);
      expect(body.status).toBe('ok');
      assertHealthResponse(body);
    });

    it('includes config-loaded and migrations checks', async () => {
      const { body } = await handleStartup();
      expect(body.checks).toHaveProperty('config-loaded');
      expect(body.checks['config-loaded'].status).toBe('up');
      expect(body.checks).toHaveProperty('migrations');
      expect(body.checks['migrations'].status).toBe('up');
    });
  });

  describe('response format', () => {
    it('all endpoints return valid HealthResponse shape', async () => {
      const results = await Promise.all([handleLive(), handleReady(), handleStartup()]);
      for (const { code, body } of results) {
        expect([200, 503]).toContain(code);
        assertHealthResponse(body);
      }
    });

    it('status is ok when code is 200', async () => {
      const { code, body } = await handleLive();
      if (code === 200) {
        expect(body.status).toBe('ok');
      }
    });
  });
});
