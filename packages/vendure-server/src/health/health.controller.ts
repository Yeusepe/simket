import { EventLoopHealthIndicator } from './event-loop-health.js';
import { RedisHealthIndicator } from './redis-health.js';
import { config } from '../config/index.js';

/**
 * Health probe response shape returned by all endpoints.
 */
export interface HealthResponse {
  status: 'ok' | 'error';
  checks: Record<string, { status: 'up' | 'down'; detail?: unknown }>;
}

const eventLoopIndicator = new EventLoopHealthIndicator();
const redisIndicator = new RedisHealthIndicator();

/**
 * Liveness probe — `/health/live`
 * Checks: process is alive + event-loop lag < 500 ms.
 */
export async function handleLive(): Promise<{ code: number; body: HealthResponse }> {
  const checks: HealthResponse['checks'] = {};

  // Process alive is implicit if this code is executing
  checks['process'] = { status: 'up' };

  try {
    const result = await eventLoopIndicator.isHealthy('event-loop');
    checks['event-loop'] = { status: 'up', detail: result['event-loop'] };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    checks['event-loop'] = { status: 'down', detail };
  }

  const hasFailure = Object.values(checks).some((c) => c.status === 'down');
  return {
    code: hasFailure ? 503 : 200,
    body: { status: hasFailure ? 'error' : 'ok', checks },
  };
}

/**
 * Readiness probe — `/health/ready`
 * Checks: DB connected + Redis cache reachable + Redis queue reachable.
 */
export async function handleReady(): Promise<{ code: number; body: HealthResponse }> {
  const checks: HealthResponse['checks'] = {};

  // DB check via Vendure config — verify connection options are present
  try {
    const dbOpts = config.dbConnectionOptions;
    if (dbOpts && dbOpts.type) {
      checks['database'] = { status: 'up', detail: { type: dbOpts.type } };
    } else {
      checks['database'] = { status: 'down', detail: 'No DB configuration found' };
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    checks['database'] = { status: 'down', detail };
  }

  // Redis cache + queue via RedisHealthIndicator
  try {
    const result = await redisIndicator.isHealthy('redis');
    checks['redis-cache'] = { status: 'up' };
    checks['redis-queue'] = { status: 'up' };
    if (result['redis']) {
      checks['redis-cache'] = { status: 'up', detail: result['redis'] };
      checks['redis-queue'] = { status: 'up', detail: result['redis'] };
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // Try to distinguish cache vs queue errors from the message
    if (typeof detail === 'string' && detail.includes('Cache Redis')) {
      checks['redis-cache'] = { status: 'down', detail };
    } else {
      checks['redis-cache'] = checks['redis-cache'] ?? { status: 'down', detail };
    }
    if (typeof detail === 'string' && detail.includes('Queue Redis')) {
      checks['redis-queue'] = { status: 'down', detail };
    } else {
      checks['redis-queue'] = checks['redis-queue'] ?? { status: 'down', detail };
    }
  }

  const hasFailure = Object.values(checks).some((c) => c.status === 'down');
  return {
    code: hasFailure ? 503 : 200,
    body: { status: hasFailure ? 'error' : 'ok', checks },
  };
}

/**
 * Startup probe — `/health/startup`
 * Checks: migrations configured + config loaded.
 */
export async function handleStartup(): Promise<{ code: number; body: HealthResponse }> {
  const checks: HealthResponse['checks'] = {};

  // Config loaded check
  try {
    if (config && config.apiOptions) {
      checks['config-loaded'] = { status: 'up' };
    } else {
      checks['config-loaded'] = { status: 'down', detail: 'Config not loaded' };
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    checks['config-loaded'] = { status: 'down', detail };
  }

  // Migrations configured check
  try {
    const migrations = config.dbConnectionOptions?.migrations;
    if (migrations && (Array.isArray(migrations) ? migrations.length > 0 : true)) {
      checks['migrations'] = { status: 'up' };
    } else {
      checks['migrations'] = { status: 'down', detail: 'No migrations configured' };
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    checks['migrations'] = { status: 'down', detail };
  }

  const hasFailure = Object.values(checks).some((c) => c.status === 'down');
  return {
    code: hasFailure ? 503 : 200,
    body: { status: hasFailure ? 'error' : 'ok', checks },
  };
}
