/**
 * Purpose: k6 load test — product search via Vendure Shop API.
 * Governing docs:
 *   - docs/architecture.md §13.3 (Performance budgets)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://grafana.com/docs/k6/latest/
 *   - https://docs.vendure.io/reference/graphql-api/shop/queries/#search
 * Tests:
 *   - This file IS the test — run with: k6 run product-search.k6.js
 *
 * Performance budget: search < 50ms p95
 *
 * Usage:
 *   K6_VENDURE_URL=http://localhost:3000 k6 run product-search.k6.js
 *   k6 run --vus 50 --duration 60s product-search.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.K6_VENDURE_URL || 'http://localhost:3000';
const SHOP_API = `${BASE_URL}/shop-api`;

const searchDuration = new Trend('search_duration_ms', true);
const searchFailRate = new Rate('search_fail_rate');

export const options = {
  scenarios: {
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '15s', target: 10 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '15s', target: 0 },
      ],
    },
    steady_state: {
      executor: 'constant-vus',
      vus: 25,
      duration: '60s',
      startTime: '95s',
    },
  },
  thresholds: {
    search_duration_ms: ['p(95)<50', 'p(99)<200'],
    search_fail_rate: ['rate<0.01'],
    http_req_duration: ['p(95)<100'],
  },
};

const SEARCH_QUERY = `
  query SearchProducts($input: SearchInput!) {
    search(input: $input) {
      totalItems
      items {
        productId
        productName
        slug
        price { ... on SinglePrice { value } }
      }
      facetValues { facetValue { id name } count }
    }
  }
`;

const SEARCH_TERMS = [
  'avatar', 'shader', 'animation', 'texture', 'model',
  'unity', 'blender', 'vrc', 'clothing', 'accessory',
];

export default function () {
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];

  const payload = JSON.stringify({
    query: SEARCH_QUERY,
    variables: {
      input: {
        term,
        take: 20,
        groupByProduct: true,
      },
    },
  });

  const res = http.post(SHOP_API, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'SearchProducts' },
  });

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.search !== undefined;
      } catch {
        return false;
      }
    },
    'no errors': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors || body.errors.length === 0;
      } catch {
        return false;
      }
    },
  });

  searchDuration.add(res.timings.duration);
  searchFailRate.add(!ok);

  sleep(Math.random() * 0.5 + 0.1);
}
