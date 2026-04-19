/**
 * Purpose: k6 load test — checkout flow (add to cart → checkout → payment).
 * Governing docs:
 *   - docs/architecture.md §13.3 (Performance budgets)
 *   - docs/service-architecture.md §1.13 (Hyperswitch payment)
 * External references:
 *   - https://grafana.com/docs/k6/latest/
 *   - https://docs.vendure.io/reference/graphql-api/shop/mutations/#additemtoorder
 * Tests:
 *   - This file IS the test — run with: k6 run checkout-flow.k6.js
 *
 * Performance budget: checkout < 500ms p95
 *
 * Usage:
 *   K6_VENDURE_URL=http://localhost:3000 k6 run checkout-flow.k6.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.K6_VENDURE_URL || 'http://localhost:3000';
const SHOP_API = `${BASE_URL}/shop-api`;

const checkoutDuration = new Trend('checkout_duration_ms', true);
const checkoutFailRate = new Rate('checkout_fail_rate');
const addToCartDuration = new Trend('add_to_cart_duration_ms', true);

export const options = {
  scenarios: {
    checkout_load: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '60s', target: 20 },
        { duration: '30s', target: 1 },
      ],
    },
  },
  thresholds: {
    checkout_duration_ms: ['p(95)<500', 'p(99)<1000'],
    add_to_cart_duration_ms: ['p(95)<200'],
    checkout_fail_rate: ['rate<0.02'],
  },
};

function gql(query, variables = {}) {
  const res = http.post(SHOP_API, JSON.stringify({ query, variables }), {
    headers: { 'Content-Type': 'application/json' },
  });
  return res;
}

export default function () {
  let success = true;

  group('add_to_cart', () => {
    const res = gql(`
      mutation AddToCart($productVariantId: ID!, $quantity: Int!) {
        addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
          ... on Order {
            id
            totalWithTax
            lines { id productVariant { id name } quantity }
          }
          ... on ErrorResult { errorCode message }
        }
      }
    `, {
      productVariantId: '1',
      quantity: 1,
    });

    addToCartDuration.add(res.timings.duration);

    const ok = check(res, {
      'add to cart 200': (r) => r.status === 200,
      'order returned': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data?.addItemToOrder?.id !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (!ok) success = false;
  });

  sleep(0.5);

  group('set_shipping', () => {
    const res = gql(`
      mutation SetShipping {
        setOrderShippingAddress(input: {
          fullName: "Load Test"
          streetLine1: "123 Test St"
          city: "Test City"
          countryCode: "US"
          postalCode: "12345"
        }) {
          ... on Order { id }
          ... on ErrorResult { errorCode message }
        }
      }
    `);

    check(res, { 'shipping set 200': (r) => r.status === 200 });
  });

  sleep(0.3);

  group('checkout', () => {
    const res = gql(`
      mutation TransitionOrder {
        transitionOrderToState(state: "ArrangingPayment") {
          ... on Order { id state }
          ... on OrderStateTransitionError { errorCode message transitionError }
        }
      }
    `);

    checkoutDuration.add(res.timings.duration);

    const ok = check(res, {
      'checkout 200': (r) => r.status === 200,
    });

    if (!ok) success = false;
  });

  checkoutFailRate.add(!success);
  sleep(1);
}
