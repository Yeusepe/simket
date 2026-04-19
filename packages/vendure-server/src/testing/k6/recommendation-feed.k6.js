/**
 * Purpose: k6 load test — recommendation/discovery feed endpoint.
 * Governing docs:
 *   - docs/architecture.md §9 (Recommendations)
 *   - docs/service-architecture.md
 * External references:
 *   - https://grafana.com/docs/k6/latest/
 * Tests:
 *   - This file IS the test — run with: k6 run recommendation-feed.k6.js
 *
 * Performance budget: discovery feed < 100ms p95 (cached), < 300ms p95 (cold)
 *
 * Usage:
 *   K6_VENDURE_URL=http://localhost:3000 k6 run recommendation-feed.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.K6_VENDURE_URL || 'http://localhost:3000';
const SHOP_API = `${BASE_URL}/shop-api`;

const feedDuration = new Trend('feed_duration_ms', true);
const feedFailRate = new Rate('feed_fail_rate');

export const options = {
  scenarios: {
    feed_scroll: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '20s', target: 30 },
        { duration: '40s', target: 100 },
        { duration: '20s', target: 200 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    feed_duration_ms: ['p(95)<300', 'p(99)<500'],
    feed_fail_rate: ['rate<0.01'],
  },
};

const FEED_QUERY = `
  query DiscoveryFeed($take: Int!, $cursor: String) {
    discoveryFeed(take: $take, cursor: $cursor) {
      items {
        productId
        productName
        score
      }
      nextCursor
      totalItems
    }
  }
`;

export default function () {
  let cursor = null;

  // Simulate 3 pages of infinite scroll
  for (let page = 0; page < 3; page++) {
    const payload = JSON.stringify({
      query: FEED_QUERY,
      variables: { take: 20, cursor },
    });

    const res = http.post(SHOP_API, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'DiscoveryFeed' },
    });

    feedDuration.add(res.timings.duration);

    const ok = check(res, {
      'status 200': (r) => r.status === 200,
      'has items': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data?.discoveryFeed?.items !== undefined;
        } catch {
          return false;
        }
      },
    });

    feedFailRate.add(!ok);

    // Extract cursor for next page
    try {
      const body = JSON.parse(res.body);
      cursor = body.data?.discoveryFeed?.nextCursor || null;
    } catch {
      cursor = null;
    }

    // Simulate user reading time between scrolls
    sleep(Math.random() * 2 + 0.5);
  }
}
