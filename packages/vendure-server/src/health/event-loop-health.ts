import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

const EVENT_LOOP_LAG_THRESHOLD_MS = 500;

/**
 * Measures event-loop lag to detect thread saturation.
 * Used by the liveness probe per architecture §9.9.
 */
export class EventLoopHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const lag = await this.measureLag();
    if (lag > EVENT_LOOP_LAG_THRESHOLD_MS) {
      throw new HealthCheckError(
        `Event loop lag (${lag}ms) exceeds ${EVENT_LOOP_LAG_THRESHOLD_MS}ms`,
        this.getStatus(key, false, { lagMs: lag }),
      );
    }
    return this.getStatus(key, true, { lagMs: lag });
  }

  private measureLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      setImmediate(() => {
        resolve(Math.round(performance.now() - start));
      });
    });
  }
}
