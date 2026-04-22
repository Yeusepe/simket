/**
 * Purpose: Builds reusable k6 ramping-VU scenario definitions for Simket's critical request paths.
 *
 * Governing docs:
 *   - docs/architecture.md §13.3
 *   - docs/service-architecture.md §1.1
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/
 *   - https://grafana.com/docs/k6/latest/using-k6/thresholds/
 * Tests:
 *   - src/testing/load/scenarios.test.ts
 */

export type LoadDuration = `${number}${'s' | 'm' | 'h'}`;

export interface LoadStage {
  duration: LoadDuration;
  target: number;
}

export interface LoadThresholds {
  http_req_duration: string[];
  http_req_failed: string[];
}

export interface LoadScenarioOverrides {
  startVUs?: number;
  sustainedVUs?: number;
  spikeVUs?: number;
  rampUpDuration?: LoadDuration;
  sustainDuration?: LoadDuration;
  spikeDuration?: LoadDuration;
  recoveryDuration?: LoadDuration;
  rampDownDuration?: LoadDuration;
  gracefulRampDown?: LoadDuration;
  latencyP95Ms?: number;
  errorRateThreshold?: number;
}

export interface LoadScenarioDefinition {
  executor: 'ramping-vus';
  startVUs: number;
  maxVUs: number;
  gracefulRampDown: LoadDuration;
  stages: LoadStage[];
  thresholds: LoadThresholds;
}

type LoadScenarioConfig = Required<LoadScenarioOverrides>;

const DURATION_PATTERN = /^\d+(s|m|h)$/;
const DEFAULT_ERROR_RATE_THRESHOLD = 0.001;

const SEARCH_DEFAULTS: LoadScenarioConfig = {
  startVUs: 0,
  sustainedVUs: 30,
  spikeVUs: 60,
  rampUpDuration: '1m',
  sustainDuration: '3m',
  spikeDuration: '30s',
  recoveryDuration: '1m',
  rampDownDuration: '30s',
  gracefulRampDown: '5s',
  latencyP95Ms: 200,
  errorRateThreshold: DEFAULT_ERROR_RATE_THRESHOLD,
};

const CART_DEFAULTS: LoadScenarioConfig = {
  startVUs: 0,
  sustainedVUs: 20,
  spikeVUs: 35,
  rampUpDuration: '45s',
  sustainDuration: '2m',
  spikeDuration: '20s',
  recoveryDuration: '30s',
  rampDownDuration: '20s',
  gracefulRampDown: '5s',
  latencyP95Ms: 300,
  errorRateThreshold: DEFAULT_ERROR_RATE_THRESHOLD,
};

const CHECKOUT_DEFAULTS: LoadScenarioConfig = {
  startVUs: 0,
  sustainedVUs: 12,
  spikeVUs: 20,
  rampUpDuration: '45s',
  sustainDuration: '90s',
  spikeDuration: '20s',
  recoveryDuration: '20s',
  rampDownDuration: '20s',
  gracefulRampDown: '10s',
  latencyP95Ms: 500,
  errorRateThreshold: DEFAULT_ERROR_RATE_THRESHOLD,
};

const RECOMMENDATION_DEFAULTS: LoadScenarioConfig = {
  startVUs: 0,
  sustainedVUs: 24,
  spikeVUs: 42,
  rampUpDuration: '45s',
  sustainDuration: '2m',
  spikeDuration: '20s',
  recoveryDuration: '30s',
  rampDownDuration: '20s',
  gracefulRampDown: '5s',
  latencyP95Ms: 400,
  errorRateThreshold: DEFAULT_ERROR_RATE_THRESHOLD,
};

export function buildSearchScenario(
  overrides: LoadScenarioOverrides = {},
): LoadScenarioDefinition {
  return buildScenarioDefinition(SEARCH_DEFAULTS, overrides);
}

export function buildCartScenario(
  overrides: LoadScenarioOverrides = {},
): LoadScenarioDefinition {
  return buildScenarioDefinition(CART_DEFAULTS, overrides);
}

export function buildCheckoutScenario(
  overrides: LoadScenarioOverrides = {},
): LoadScenarioDefinition {
  return buildScenarioDefinition(CHECKOUT_DEFAULTS, overrides);
}

export function buildRecommendationScenario(
  overrides: LoadScenarioOverrides = {},
): LoadScenarioDefinition {
  return buildScenarioDefinition(RECOMMENDATION_DEFAULTS, overrides);
}

function buildScenarioDefinition(
  defaults: LoadScenarioConfig,
  overrides: LoadScenarioOverrides,
): LoadScenarioDefinition {
  const config = { ...defaults, ...overrides } satisfies LoadScenarioConfig;

  validateScenarioConfig(config);

  const stages: LoadStage[] = [
    { duration: config.rampUpDuration, target: config.sustainedVUs },
    { duration: config.sustainDuration, target: config.sustainedVUs },
    { duration: config.spikeDuration, target: config.spikeVUs },
    { duration: config.recoveryDuration, target: config.sustainedVUs },
    { duration: config.rampDownDuration, target: 0 },
  ];

  return {
    executor: 'ramping-vus',
    startVUs: config.startVUs,
    maxVUs: Math.max(config.startVUs, ...stages.map((stage) => stage.target)),
    gracefulRampDown: config.gracefulRampDown,
    stages,
    thresholds: {
      http_req_duration: [`p(95)<${config.latencyP95Ms}`],
      http_req_failed: [`rate<${config.errorRateThreshold}`],
    },
  };
}

function validateScenarioConfig(config: LoadScenarioConfig): void {
  validateDuration(config.rampUpDuration, 'rampUpDuration');
  validateDuration(config.sustainDuration, 'sustainDuration');
  validateDuration(config.spikeDuration, 'spikeDuration');
  validateDuration(config.recoveryDuration, 'recoveryDuration');
  validateDuration(config.rampDownDuration, 'rampDownDuration');
  validateDuration(config.gracefulRampDown, 'gracefulRampDown');

  validateWholeNumber(config.startVUs, 'startVUs');
  validateWholeNumber(config.sustainedVUs, 'sustainedVUs');
  validateWholeNumber(config.spikeVUs, 'spikeVUs');

  if (config.sustainedVUs <= config.startVUs) {
    throw new RangeError('sustainedVUs must be greater than startVUs');
  }

  if (config.spikeVUs <= config.sustainedVUs) {
    throw new RangeError('spikeVUs must be greater than sustainedVUs');
  }

  if (!Number.isFinite(config.latencyP95Ms) || config.latencyP95Ms <= 0) {
    throw new RangeError('latencyP95Ms must be a positive number');
  }

  if (
    !Number.isFinite(config.errorRateThreshold) ||
    config.errorRateThreshold <= 0 ||
    config.errorRateThreshold >= 1
  ) {
    throw new RangeError('errorRateThreshold must be greater than 0 and less than 1');
  }
}

function validateDuration(duration: string, fieldName: string): asserts duration is LoadDuration {
  if (!DURATION_PATTERN.test(duration)) {
    throw new TypeError(`${fieldName} must be a k6 duration like 30s, 2m, or 1h`);
  }
}

function validateWholeNumber(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a non-negative integer`);
  }
}
