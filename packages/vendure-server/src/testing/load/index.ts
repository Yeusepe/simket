/**
 * Purpose: Re-exports load-testing scenario builders for vendure-server performance scripts.
 *
 * Governing docs:
 *   - docs/architecture.md §13.3
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/
 * Tests:
 *   - src/testing/load/scenarios.test.ts
 */

export {
  buildCartScenario,
  buildCheckoutScenario,
  buildRecommendationScenario,
  buildSearchScenario,
} from './scenarios.js';

export type {
  LoadDuration,
  LoadScenarioDefinition,
  LoadScenarioOverrides,
  LoadStage,
  LoadThresholds,
} from './scenarios.js';
