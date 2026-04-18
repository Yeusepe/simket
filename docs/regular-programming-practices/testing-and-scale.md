# Testing And Scale

## 1. Delivery order

1. Docs and contracts
2. Failing expectation
3. Narrower tests
4. Implementation
5. Resilience and replay evidence

## 2. Test layers

| Layer                     | Primary purpose                                                                 | Tools                                |
| ------------------------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| Docs checks               | Architecture, links, contract alignment                                         | Custom scripts                       |
| Schema and contract tests | Bebop schema compatibility, API contract drift                                  | Bebop compiler, snapshot tests       |
| Unit tests                | Pure logic: pricing calculation, collaboration split, validation rules          | Vitest                               |
| Integration tests         | Vendure plugin behaviour, Convex function behaviour, auth flows, Cedar policies | Vitest + TestContainers + Convex dev |
| API integration tests     | Route contracts, auth, validation, idempotent mutations                         | Vitest + supertest                   |
| E2E tests                 | Visible user outcomes: browse, search, cart, checkout, creator dashboard        | Playwright                           |
| Load and soak tests       | Throughput, saturation, degradation behaviour                                   | k6 or Artillery                      |

## 3. High-risk behaviours that must be tested

The platform should explicitly test:

- Checkout idempotency (Stripe idempotency keys)
- Payment webhook deduplication (Stripe event.id)
- Collaboration revenue split accuracy (to the cent)
- Product search index consistency after mutations
- Recommendation freshness after product changes
- CDNgine upload completion and asset linking
- Licence key issuance after purchase
- Bundle pricing and dependency validation
- Creator dashboard real-time updates (Convex reactive)
- Page builder save and publish (Framely)
- Editorial content publication and cache purge
- Rate-limiting and abuse prevention
- Cedar policy enforcement for all protected resources
- Cross-service trace propagation (OpenTelemetry)

## 4. Integration testing posture

The platform needs real integration tests for:

- Vendure product CRUD and order lifecycle
- Convex function execution with real Convex dev instance
- Stripe payment flow with test keys
- Typesense indexing and search
- Redis cache and queue behaviour
- Cedar policy evaluation
- Better Auth session lifecycle
- CDNgine upload and processing pipeline

**Mock-heavy tests are not enough for storage, payment, and workflow boundaries.** Use real dependencies via TestContainers, Convex dev instances, and Stripe test mode. The only acceptable mock is for isolated unit tests of pure logic functions.

## 5. Scale posture

Before declaring a high-risk path ready, verify:

- Failure handling under retries
- Queue and worker backlog behaviour
- Cache and lock degradation behaviour
- Concurrent checkout handling
- Search index lag under write bursts
- Recommendation serving latency under load
- CDNgine upload throughput under parallel uploads

## 6. Failure injection scenarios

The platform must handle:

- Stripe API outage (minutes to hours)
- Typesense cluster node failure
- Convex function timeout
- Redis cache unavailable
- CDNgine upload service degraded
- Qdrant embedding service slow
- PayloadCMS webhook flood
- Better Auth session store degraded
- BullMQ queue backlog spike

## 7. Evidence gate before cutover

No path goes to production without:

1. Core user flows work (browse, search, cart, checkout, dashboard)
2. Payment processing verified with Stripe test mode
3. Collaboration splits calculated correctly
4. Worker activity off critical checkout path
5. Scale/resilience scenarios run
6. Security verification evidence exists for changed flows
7. Analytics and tracing coverage verified end-to-end
8. No stubs, mocks, or workarounds in production code
