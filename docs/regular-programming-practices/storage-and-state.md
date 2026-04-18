# Storage And State

This document defines state ownership across Simket services.

## 1. State ownership table

| System                | Owns                                                                                                                                 | Must NOT store                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Vendure (PostgreSQL)  | Products, orders, customers, channels, promotions, collections, tax, shipping                                                        | Recommendation embeddings, editorial content, real-time collaboration state |
| Convex                | Creator dashboards, collaboration agreements, checkout flows, upsale configuration, real-time reactive state, workflow orchestration | Product catalog (Vendure owns), raw assets (CDNgine owns), search indices   |
| Better Auth           | Users, identity accounts, sessions, OAuth clients, API keys                                                                          | Authorisation truth (Cedar owns), product data, payment state               |
| Cedar                 | Policies, roles, permissions, entitlements, decision evidence                                                                        | Sessions, product data, payment state                                       |
| Redis (cache cluster) | Short-lived cache, rate-limit counters, session cache                                                                                | Durable business truth, source-of-truth data                                |
| Redis (queue cluster) | BullMQ job queues, dead-letter queues                                                                                                | Cache data, session state                                                   |
| Typesense             | Product search index, facets, geo-search                                                                                             | Source-of-truth product data (Vendure owns)                                 |
| Qdrant                | Recommendation embeddings, ANN vectors                                                                                               | Product metadata, pricing, availability                                     |
| CDNgine               | Raw creator assets, processed derivatives, signed delivery URLs                                                                      | Product metadata, pricing, user data                                        |
| PayloadCMS            | Editorial content, today/featured sections, articles                                                                                 | Product catalog, user data, recommendations                                 |
| Stripe                | Payment intents, subscriptions, connected accounts, payouts                                                                          | Product catalog, user sessions                                              |
| Keygen                | Licence keys, licence validations, machine activations                                                                               | Product metadata, user sessions                                             |
| Svix                  | Webhook delivery state, message logs, retry state                                                                                    | Business logic, product data                                                |

## 2. Rules

1. Redis is never the source of truth for business data.
2. Raw assets (CDNgine) and derived artefacts stay separate from product metadata (Vendure).
3. State ownership must be obvious at design time — if it is ambiguous, resolve before coding.
4. Every cross-store flow needs an idempotency story.
5. Vendure PostgreSQL is the source of truth for the product catalogue.
6. Convex is the source of truth for real-time creator state and workflow orchestration.
7. Do not let Convex reactive queries become a backdoor source of truth for data owned by Vendure.
8. Search indices (Typesense) and embedding stores (Qdrant) are derived — they can be rebuilt from source.
9. Cache (Redis) must always be safe to flush — the system must remain correct without it.

## 3. Cross-store consistency

| From       | To          | Sync method                                           | Acceptable lag | Rebuild strategy                |
| ---------- | ----------- | ----------------------------------------------------- | -------------- | ------------------------------- |
| Vendure    | Typesense   | Event-driven (product events → BullMQ → index worker) | < 5 s          | Full re-index from Vendure      |
| Vendure    | Qdrant      | Batch embedding pipeline (BullMQ)                     | < 30 s         | Full re-embed from Vendure      |
| Vendure    | Redis cache | Delete-on-write (cache-aside)                         | < 1 s          | Flush and repopulate on-demand  |
| Vendure    | Edge CDN    | Purge-by-tag on mutation                              | < 10 s         | Purge all and let SWR refill    |
| PayloadCMS | Edge CDN    | Webhook on publish → purge                            | < 30 s         | Purge editorial tags            |
| Convex     | Client      | Reactive subscriptions                                | < 100 ms       | Client reconnects automatically |

## 4. References

- [Vendure Documentation](https://docs.vendure.io/)
- [Convex Documentation](https://docs.convex.dev/)
- [Redis Documentation](https://redis.io/docs/latest/)
- [Typesense Documentation](https://typesense.org/docs/)
