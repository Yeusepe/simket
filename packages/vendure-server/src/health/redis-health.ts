import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { getCacheRedis, getQueueRedis } from '../cache/index.js';

/**
 * Redis health indicator for @nestjs/terminus.
 * Checks both cache and queue clusters are responsive.
 */
export class RedisHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const errors: string[] = [];

    try {
      const cacheResult = await getCacheRedis().ping();
      if (cacheResult !== 'PONG') errors.push('Cache Redis: unexpected ping response');
    } catch (e) {
      errors.push(`Cache Redis: ${(e as Error).message}`);
    }

    try {
      const queueResult = await getQueueRedis().ping();
      if (queueResult !== 'PONG') errors.push('Queue Redis: unexpected ping response');
    } catch (e) {
      errors.push(`Queue Redis: ${(e as Error).message}`);
    }

    if (errors.length > 0) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { errors }),
      );
    }
    return this.getStatus(key, true);
  }
}
