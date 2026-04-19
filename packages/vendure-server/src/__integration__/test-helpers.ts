/**
 * Purpose: Test helper utilities for integration tests that run against real services.
 * Governing docs:
 *   - AGENTS.md §1.2 (NEVER mock production functionality)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/testing/
 *   - https://vitest.dev/guide/
 * Tests:
 *   - packages/vendure-server/src/__integration__/*.integration.test.ts
 *
 * NOTE: Integration tests require Docker Compose services running:
 *   docker compose up -d postgres redis-cache redis-queue typesense qdrant
 */

/**
 * Environment variables expected for integration tests.
 * These match docker-compose.yml defaults.
 */
export const INTEGRATION_ENV = {
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://simket:simket_dev@localhost:5432/simket',
  REDIS_CACHE_URL: process.env.REDIS_CACHE_URL ?? 'redis://localhost:6379',
  REDIS_QUEUE_URL: process.env.REDIS_QUEUE_URL ?? 'redis://localhost:6380',
  TYPESENSE_URL: process.env.TYPESENSE_URL ?? 'http://localhost:8108',
  TYPESENSE_API_KEY: process.env.TYPESENSE_API_KEY ?? 'simket_dev_key',
  QDRANT_URL: process.env.QDRANT_URL ?? 'http://localhost:6333',
} as const;

/**
 * Checks if a TCP port is reachable. Returns true if the service is up.
 */
export async function isPortReachable(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  const { createConnection } = await import('node:net');
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: timeoutMs });
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * Checks if Docker Compose services are running.
 * Skips the test suite with a clear message if not.
 */
export async function requireDockerServices(
  services: Array<{ name: string; host: string; port: number }>,
): Promise<void> {
  const missing: string[] = [];
  for (const svc of services) {
    const reachable = await isPortReachable(svc.host, svc.port);
    if (!reachable) {
      missing.push(`${svc.name} (${svc.host}:${svc.port})`);
    }
  }
  if (missing.length > 0) {
    const msg = `Integration test skipped — missing services: ${missing.join(', ')}. Run: docker compose up -d`;
    console.warn(msg);
    // Use vitest's skip API
    const { describe } = await import('vitest');
    describe.skip(msg, () => {});
    throw new Error(msg);
  }
}

/** Standard service definitions for requireDockerServices */
export const DOCKER_SERVICES = {
  postgres: { name: 'PostgreSQL', host: 'localhost', port: 5432 },
  redisCache: { name: 'Redis Cache', host: 'localhost', port: 6379 },
  redisQueue: { name: 'Redis Queue', host: 'localhost', port: 6380 },
  typesense: { name: 'Typesense', host: 'localhost', port: 8108 },
  qdrant: { name: 'Qdrant', host: 'localhost', port: 6333 },
} as const;
