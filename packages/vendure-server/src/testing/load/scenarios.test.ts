/**
 * Purpose: Verifies pure k6 load-scenario builders for Simket's critical storefront flows.
 *
 * Governing docs:
 *   - docs/architecture.md §13.3
 *   - docs/service-architecture.md §1.1
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/
 *   - https://grafana.com/docs/k6/latest/using-k6/thresholds/
 * Tests:
 *   - This file
 */

import { describe, expect, it } from 'vitest';
import {
  buildCartScenario,
  buildCheckoutScenario,
  buildRecommendationScenario,
  buildSearchScenario,
} from './scenarios.js';

const DURATION_PATTERN = /^\d+(s|m|h)$/;

describe('load scenario builders', () => {
  const builders = [
    ['search', buildSearchScenario, 200],
    ['cart', buildCartScenario, 300],
    ['checkout', buildCheckoutScenario, 500],
    ['recommendation', buildRecommendationScenario, 400],
  ] as const;

  describe.each(builders)('%s scenario', (name, buildScenario, latencyBudgetMs) => {
    it('builds a ramp-up, sustained, spike, recovery, and ramp-down profile', () => {
      const scenario = buildScenario();

      expect(scenario.startVUs).toBeGreaterThanOrEqual(0);
      expect(scenario.stages).toHaveLength(5);

      const [rampUp, sustained, spike, recovery, rampDown] = scenario.stages;

      expect(rampUp!.target).toBeGreaterThan(scenario.startVUs);
      expect(sustained!.target).toBe(rampUp!.target);
      expect(spike!.target).toBeGreaterThan(sustained!.target);
      expect(recovery!.target).toBeLessThan(spike!.target);
      expect(recovery!.target).toBe(sustained!.target);
      expect(rampDown!.target).toBe(0);
    });

    it('defines p95 latency and error-rate thresholds', () => {
      const scenario = buildScenario();

      expect(scenario.thresholds.http_req_duration).toContain(`p(95)<${latencyBudgetMs}`);
      expect(scenario.thresholds.http_req_failed).toContain('rate<0.001');
    });

    it('reports maxVUs equal to the highest stage target', () => {
      const scenario = buildScenario();
      const peakStageTarget = Math.max(...scenario.stages.map((stage) => stage.target));

      expect(scenario.maxVUs).toBe(peakStageTarget);
      expect(scenario.maxVUs).toBeGreaterThanOrEqual(scenario.startVUs);
    });

    it('uses k6-compatible stage duration strings', () => {
      const scenario = buildScenario();

      for (const stage of scenario.stages) {
        expect(stage.duration).toMatch(DURATION_PATTERN);
      }

      expect(scenario.gracefulRampDown).toMatch(DURATION_PATTERN);
    });

    it('supports overriding virtual users, durations, and thresholds', () => {
      const scenario = buildScenario({
        startVUs: 2,
        sustainedVUs: 12,
        spikeVUs: 20,
        rampUpDuration: '45s',
        sustainDuration: '2m',
        spikeDuration: '30s',
        recoveryDuration: '15s',
        rampDownDuration: '20s',
        gracefulRampDown: '5s',
        latencyP95Ms: latencyBudgetMs + 50,
        errorRateThreshold: 0.005,
      });

      expect(scenario.startVUs).toBe(2);
      expect(scenario.maxVUs).toBe(20);
      expect(scenario.stages).toEqual([
        { duration: '45s', target: 12 },
        { duration: '2m', target: 12 },
        { duration: '30s', target: 20 },
        { duration: '15s', target: 12 },
        { duration: '20s', target: 0 },
      ]);
      expect(scenario.gracefulRampDown).toBe('5s');
      expect(scenario.thresholds.http_req_duration).toContain(`p(95)<${latencyBudgetMs + 50}`);
      expect(scenario.thresholds.http_req_failed).toContain('rate<0.005');
    });
  });
});
