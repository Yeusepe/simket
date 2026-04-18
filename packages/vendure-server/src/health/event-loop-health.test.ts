import { describe, it, expect } from 'vitest';
import { EventLoopHealthIndicator } from './event-loop-health.js';

describe('EventLoopHealthIndicator', () => {
  it('reports healthy when event loop is responsive', async () => {
    const indicator = new EventLoopHealthIndicator();
    const result = await indicator.isHealthy('event-loop');
    expect(result['event-loop'].status).toBe('up');
    expect(typeof result['event-loop'].lagMs).toBe('number');
    expect(result['event-loop'].lagMs).toBeLessThan(500);
  });
});
