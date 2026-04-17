# Implementation Strategy

The platform should be delivered in slices.

## 1. Delivery principles

1. Prove platform primitives before custom replacements.
2. Slice work so each step is deployable and reversible.
3. Extract ownership boundaries deliberately (commerce, identity, assets, recommendations, editorial).
4. Delete compatibility paths aggressively once replacement is proven.
5. Keep migration debt explicit, time-bounded, and documented.
6. Prefer feature flags (OpenFeature), circuit breakers (Cockatiel), and isolation tools over all-at-once cutovers.
7. Do not trade security or availability to fit a release window.

## 2. Preferred delivery order

1. **Foundation**: Vendure core + Better Auth + Cedar + PostgreSQL + Bebop contracts
2. **Storefront MVP**: HeroUI storefront, product browse, search (Typesense), cart, checkout (Stripe)
3. **Creator dashboard**: Convex real-time state, product CRUD, basic analytics
4. **Asset pipeline**: CDNgine integration, upload flows, media processing
5. **Page builder**: Framely integration for custom product pages
6. **Rich text**: TipTap editor with iFramely embeds
7. **Bundles and dependencies**: Bundle creation, dependency validation, pricing rules
8. **Collaborations**: Revenue split, multi-creator products, Stripe Connect destination charges
9. **Recommendations**: Encore service, Qdrant embeddings, pluggable recommender adapters
10. **Editorial**: PayloadCMS, today section, featured content
11. **Licensing**: Keygen integration for software products
12. **Notifications and webhooks**: Svix, real-time notifications
13. **Hardening**: Load testing, resilience verification, security audit, observability completeness

## 3. Slice rules

Each slice should close with:

- Updated docs
- Updated traceability and implementation ledger
- Executable tests
- Explicit next-step boundaries

## 4. Good slices

Prefer one coherent concern per slice:

- One Vendure plugin
- One Convex function family
- One Bebop contract group
- One HeroUI component family
- One worker pipeline
- One integration (Stripe, Keygen, CDNgine, etc.)

## 5. Migration slice rules

For every migration slice, answer:

- What old responsibility is being removed?
- What new owner replaces it?
- What compatibility path is needed during migration?
- How is rollback performed?
- When is the old path deleted?

## 6. Rollout strategies

Choose based on risk:

| Strategy | When to use |
| --- | --- |
| Direct replacement | Low-risk internal changes with strong test coverage |
| Feature-flagged (OpenFeature) | User-visible changes needing gradual exposure |
| Dark read | New path compared silently to old path |
| Dual-run | High-risk payment or policy changes |
| Staged rollout | Geographic or user-segment phased deployment |

## 7. Compatibility path rules

- Only enable safe migration slices
- Every compatibility path has a documented owner
- Every compatibility path has a written removal condition
- Compatibility paths do not become hidden architecture
