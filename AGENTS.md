# AGENTS.md

This is the working contract for any coding agent operating in the Simket repository.

An agent working in Simket must not write code as if it were a blank project. Every change must be grounded in:

1. Local architecture and operating docs in `docs/`
2. Relevant upstream package or protocol references
3. Executable tests written before or alongside implementation

**If an agent cannot identify governing docs and references for a change, it is not ready to code that change.**

---

## 1. Non-negotiable rules

### 1.1 Work TDD-first

- Start with docs and contracts if the change affects architecture or APIs.
- Write failing tests before implementation (when executable).
- Do not treat tests as cleanup or follow-up work.
- Run all relevant tests after every change. A change without a test run is not complete.
- Run audits (linting, type-checking, security scans) after every change.

### 1.2 NEVER mock or stub production functionality

**This is absolute. There are no exceptions in production code.**

- If a component needs a dependency, wire the real dependency.
- If the real dependency cannot be wired, fail with an explicit error. Do not fake it.
- The ONLY place mocks are tolerated is in unit test suites for pure logic functions, and even there, prefer running the real thing.
- Integration tests MUST use real services: TestContainers for PostgreSQL/Redis, Convex dev instance, Hyperswitch sandbox, real Typesense, real Qdrant.
- A stub in production code is a bug. Treat it as one.

**I would rather the system ERROR than have a stub.**

### 1.3 NEVER implement workarounds

A workaround is a change that produces the correct output for now but violates the architecture, bypasses the proper system, or creates hidden dependencies that will break later.

**Workarounds are NEVER acceptable.** If you find yourself writing one, stop and design the proper solution.

Signs you are writing a workaround:

- You are special-casing a single provider or entity instead of using the general system.
- You are reading data that "happens to be there" instead of the architecturally correct source (e.g., reading buyer sessions when you need creator sessions).
- You are duplicating logic that already exists somewhere else rather than calling it.
- You are using a `"use node"` directive, a flag, or a conditional just to avoid a proper architectural change.
- Your change works today but would silently break if the system around it changes.

The correct response to a workaround situation is always: **design the proper flow, implement it properly, test it properly.**

### 1.4 Map every change to governing docs

- Before coding, identify which local docs govern the change.
- Update those docs when the change affects architecture, contracts, operations, or behaviour.

### 1.5 Attach references to every code change

- Every new source file, major module, workflow, adapter, or route must have documentation and references.
- References must include local repository docs AND upstream external docs where behaviour depends on them.

### 1.6 Do not invent core platform semantics casually

- Reuse architecture established in `docs/`.
- If a change would alter core semantics, update architecture docs or ADRs first or alongside.

### 1.7 Keep implementation traceable

- Code, tests, docs, and operational expectations must move together.

### 1.8 ALWAYS search online before writing code

**Searching online is your friend. It is not optional.**

Before writing ANY code that integrates with, wraps, or calls an external library, framework, service, or component:

1. **Search online for the official documentation.** Read it. Understand what the library provides out of the box.
2. **Fetch the library's LLM-friendly docs if they exist.** Many libraries publish `llms.txt`, agent docs, or API references specifically for AI assistants. Use them.
3. **Do not rely on memory, training data, or cached knowledge of APIs.** Libraries change between versions. What you "know" may be wrong. The online docs are the source of truth.
4. **Do not guess component APIs, prop names, compound patterns, or configuration shapes.** Look them up online first, then verify against the installed `.d.ts` types.

**This applies to every library in the stack** — HeroUI, Vendure, Better Auth, Hyperswitch, Typesense, Convex, Cedar, Cockatiel, OpenTelemetry, PayloadCMS, TipTap, and any other.

The time spent searching online is always less than the time spent debugging wrong assumptions.

---

## 2. Required reading before coding

Before any non-trivial task, read:

1. `README.md`
2. `docs/README.md`
3. `docs/architecture.md`
4. `docs/service-architecture.md`
5. `docs/domain-model.md`
6. `docs/regular-programming-practices/resilient-coding-debugging-and-performance.md`

Then read domain-specific docs for the change area.

---

## 3. Documentation map for coding work

| If you touch...                                      | Read and follow...                                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API routes, Bebop contracts, auth boundaries         | `docs/service-architecture.md`, `docs/regular-programming-practices/interfaces-and-data-flow.md`, `docs/regular-programming-practices/security-and-threat-modeling.md`   |
| Vendure plugins, product CRUD, orders                | `docs/architecture.md`, `docs/domain-model.md`, [Vendure docs](https://docs.vendure.io/)                                                                                 |
| Convex functions, creator dashboard, real-time state | `docs/architecture.md`, `docs/service-architecture.md`, [Convex docs](https://docs.convex.dev/)                                                                          |
| HeroUI components, storefront UI, page builder       | `docs/architecture.md`, [HeroUI React llms.txt](https://heroui.com/react/llms.txt) **(MUST fetch before any HeroUI work)**, [HeroUI component docs](https://heroui.com/docs/react/components), [Framely docs](https://github.com/belastrittmatter/Framely) |
| Payment, checkout, Hyperswitch integration           | `docs/service-architecture.md` §1.13, `docs/regular-programming-practices/security-and-threat-modeling.md`, [Hyperswitch API docs](https://api-reference.hyperswitch.io/), [Hyperswitch docs](https://docs.hyperswitch.io/) |
| Search, Typesense indexing                           | `docs/architecture.md`, [Typesense docs](https://typesense.org/docs/)                                                                                                    |
| Recommendations, embeddings, Qdrant                  | `docs/architecture.md`, [Qdrant docs](https://qdrant.tech/documentation/), [Voyager docs](https://github.com/spotify/voyager)                                            |
| Asset upload, CDNgine integration                    | `docs/architecture.md`, CDNgine repo docs                                                                                                                                |
| Identity, auth, Better Auth                          | `docs/architecture.md`, `docs/regular-programming-practices/security-and-threat-modeling.md`, [Better Auth docs](https://www.better-auth.com/docs)                       |
| Authorisation, Cedar policies                        | `docs/architecture.md`, [Cedar docs](https://docs.cedarpolicy.com/)                                                                                                      |
| Editorial, PayloadCMS                                | `docs/architecture.md`, [PayloadCMS docs](https://payloadcms.com/docs)                                                                                                   |
| Licensing, Keygen                                    | `docs/service-architecture.md`, [Keygen docs](https://keygen.sh/docs/)                                                                                                   |
| Webhooks, Svix                                       | `docs/service-architecture.md`, [Svix docs](https://docs.svix.com/)                                                                                                      |
| Resilience, circuit breakers, retries                | `docs/architecture.md` §9, `docs/regular-programming-practices/resilient-coding-debugging-and-performance.md`, [Cockatiel docs](https://github.com/connor4312/cockatiel) |
| Observability, tracing, metrics                      | `docs/service-architecture.md`, [OpenTelemetry docs](https://opentelemetry.io/docs/)                                                                                     |
| Feature flags                                        | `docs/architecture.md`, [OpenFeature docs](https://openfeature.dev/docs)                                                                                                 |
| CI/CD, deployment                                    | `docs/architecture.md` §11, `docs/regular-programming-practices/secure-development-lifecycle.md`                                                                         |
| Colors, theming, palettes, WCAG contrast             | AGENTS.md §4.4, `packages/storefront/src/color/`, [Leonardo GitHub](https://github.com/adobe/leonardo), [Leonardo npm](https://www.npmjs.com/package/@adobe/leonardo-contrast-colors) |

---

## 4. External API reference rule

For ANY external API call (Hyperswitch, Vendure, Convex, Typesense, Qdrant, Keygen, Svix, CDNgine, PayloadCMS, Better Auth, Cedar, CrowdSec, or any other), the agent MUST:

1. **Cite the documentation URL** in a code comment or in the plan before writing any code.
2. **Verify the endpoint is correct BEFORE implementing** — check the official docs or community spec.
3. **Verify AFTER implementing** — confirm the response shape matches what the code expects.
4. **Never assume an endpoint path.** Always look it up.

A wrong endpoint path wastes significant time and produces bugs that are hard to diagnose.

```typescript
/**
 * Creates a Hyperswitch payment with split payments for collaboration revenue splits.
 *
 * Docs: https://docs.hyperswitch.io/explore/merchant-controls/integration-guide/connectors/available-connectors/stripe#2-setup-a-payment
 * Endpoint: POST /payments
 * Verified: response includes { payment_id, client_secret, status, split_payments }
 */
```

### 4.1 Library and SDK API verification rule

**This rule applies to every npm package, SDK, and library — not just HTTP APIs.**

Before writing ANY code that calls a library function, accesses a type, or uses a configuration object from an external package:

1. **Read the installed package's type definitions first.** Run `cat node_modules/<package>/dist/*.d.ts | head -200` or inspect the specific `.d.ts` file for the function you intend to use.
2. **Never assume method signatures, constructor arguments, type shapes, or configuration keys from memory.** Libraries change between major versions — what you remember may be wrong.
3. **Verify discriminated unions.** If a return type is a union (e.g., `{ type: 'success' } | { type: 'failure'; errors: Error[] }`), narrow on the actual discriminant property — never assume `.success` or `.ok` exists.
4. **Verify named vs default exports.** ESM interop is fragile. Check the actual export from the `.d.ts` — `import X from` vs `import { X } from` matters.
5. **Verify config object shapes.** Don't assume a library config accepts `{ policyText }` when it actually wants `{ staticPolicies }`. Read the type.

**Known examples of this rule being violated (do not repeat):**

| Package | Wrong assumption | Actual API |
|---------|-----------------|------------|
| `@cedar-policy/cedar-wasm` | `PolicySet = { policyText: string }` | `PolicySet = { staticPolicies?: StaticPolicySet }` |
| `@cedar-policy/cedar-wasm` | `CheckParseAnswer` has `.success` property | Discriminated union on `.type: 'success' \| 'failure'` |
| `@cedar-policy/cedar-wasm` | `principal.id` accesses entity UID | Entity refs require `{ __entity: { type, id } }` |
| `cockatiel` v3 | `new CircuitBreakerPolicy()` class constructors | Free functions: `circuitBreaker()`, `retry()`, `timeout()` |
| `ioredis` | `import Redis from 'ioredis'` (default export) | `import { Redis } from 'ioredis'` (named export in ESM) |
| `@opentelemetry/semantic-conventions` | `ATTR_DEPLOYMENT_ENVIRONMENT_NAME` | `SEMRESATTRS_DEPLOYMENT_ENVIRONMENT` (version-dependent) |
| `@opentelemetry/api` | `span.attributes = {}` | `span.setAttributes({})` (method, not property) |

**The 30-second rule:** Spending 30 seconds reading a `.d.ts` file saves 30 minutes debugging a wrong assumption. Always read first.

### 4.2 HeroUI component usage rule

**HeroUI is our ONLY UI library. Every UI component in Simket uses HeroUI v3.**

Before writing ANY HeroUI component code:

1. **Fetch `https://heroui.com/react/llms.txt` first.** This is the authoritative index of all HeroUI v3 React documentation. It lists every component with a link to its full docs page.
2. **Then fetch the specific component doc page** from the index (e.g., `https://www.heroui.com/docs/react/components/select` for Select). Read the full API: props, compound sub-components, variants, events, and usage examples.
3. **Then verify against the installed `.d.ts`** in `node_modules/@heroui/react/dist/components/<component>/`. The online docs tell you the intended API; the `.d.ts` tells you the exact types for your installed version.

**Do ALL THREE steps. Do not skip any.**

HeroUI v3 uses compound component patterns (e.g., `Select > Select.Trigger > Select.Value > Select.Popover > ListBox > ListBoxItem`). These are NOT the same as v2 flat props. Never assume a component's sub-component names, prop names, or composition patterns — always look them up.

**Known HeroUI v3 gotchas (do not repeat):**

| Wrong assumption | Actual API |
|-----------------|------------|
| `Select` has a `Select.Item` sub-component | Use `ListBox > ListBoxItem` inside `Select.Popover` |
| `Alert` takes `color` prop | Uses `status` prop and compound: `Alert > Alert.Content > Alert.Title + Alert.Description` |
| `Button` has `color` or `as` props | Uses `variant` prop; use `onPress` not `onClick` |
| Components accept children directly | Most use compound pattern: Root > Sub-components |

### 4.3 Use what libraries provide — NEVER reinvent the wheel

**Before writing ANY module that wraps, calls, or integrates an external library, search online and read the library's documentation to understand what it already provides.** If the library ships a solution for what you need, use it. Do not reimplement it.

This is not optional. Reimplementing functionality that a library already provides is:

- **A maintenance burden** — you now own code the library team maintains for free.
- **A correctness risk** — the library handles edge cases you will miss.
- **A security risk** — the library patches vulnerabilities you won't track.
- **A waste of time** — you are writing and testing code that already exists.

#### The rule

1. **Search online first.** Before writing a new module, search: "does [library] provide [functionality]?" Check npm, GitHub, and official docs.
2. **Check for official sub-packages.** Many libraries split functionality into companion packages (e.g., `@openfeature/in-memory-provider` alongside `@openfeature/server-sdk`). Search for these.
3. **Check for built-in middleware/integration.** Many libraries ship framework integrations (e.g., `better-auth` ships `toNodeHandler()` for Express).
4. **If the library provides 80%+ of what you need**, use the library and extend only the gap. Do not rewrite from scratch.
5. **If you must wrap a library**, your wrapper should be a thin adapter — not a reimplementation of the library's internals.

#### Signs you are reinventing the wheel

- You are writing an HTTP client to call an API when an official SDK exists for that API.
- You are writing a cache layer when the library has built-in caching.
- You are writing a provider/adapter when an official one is published as a separate package.
- You are writing authentication/token validation logic when the auth library provides `getSession()` or `verifyToken()`.
- You are writing middleware when the library ships framework-specific middleware.
- You are manually parsing responses when the SDK returns typed objects.

#### Known violations (do not repeat)

| What we wrote | What we should use instead |
|---------------|--------------------------|
| Hand-rolled `CrowdSecBouncer` class with custom LRU cache, HTTP client, response parsing | `@crowdsec/nodejs-bouncer` — official npm package that handles LAPI communication, caching, and decision checking |
| Hand-rolled JWT validation with `node:crypto` (JWKS fetch, RSA verify, key cache) in `better-auth.ts` | `better-auth` SDK — provides `auth.api.getSession({ headers })` for server-side session validation and `toNodeHandler()` for Express |
| Custom `InMemoryProvider` class implementing the OpenFeature `Provider` interface from scratch | `@openfeature/in-memory-provider` — official companion package with events, context support, and `putConfiguration()` |
| Custom `x-correlation-id` middleware with `AsyncLocalStorage` | OpenTelemetry already propagates W3C Trace Context (trace ID) automatically — use trace ID as correlation ID, or if a custom header is needed, the middleware should be a thin 5-line wrapper, not a full module |

#### Pre-implementation checklist

Before writing any new integration module, answer these questions:

1. Does the library/service have an official Node.js/TypeScript SDK? → **Search npm and GitHub.**
2. Does the SDK have companion packages for common needs? → **Search `@scope/*` on npm.**
3. Does the SDK provide framework middleware (Express, Fastify, etc.)? → **Check the SDK docs.**
4. Does the SDK handle caching, retries, or error handling internally? → **Read the SDK source/docs before adding your own.**
5. Can I achieve my goal with ≤ 20 lines of adapter code on top of the SDK? → **If yes, do that. If no, justify in a code comment why a larger wrapper is needed.**

### 4.4 Adobe Leonardo adaptive color system rule

**All color palettes in Simket — marketplace UI and creator stores — MUST be generated through `@adobe/leonardo-contrast-colors`.** Do not hard-code hex values for semantic colors, do not pick colors manually, and do not use raw CSS color values for UI surfaces/text/borders.

Leonardo generates WCAG-compliant palettes from a single key color at specified contrast ratios against a background. This guarantees accessibility across light/dark modes without manual auditing.

#### How to use Leonardo in Simket

1. **Marketplace UI**: Call `createSimketPalette({ mode: 'light' | 'dark' })` from `packages/storefront/src/color/leonardo-theme.ts`. This produces the full palette keyed by semantic names (`accent100`–`accent600`, `neutral100`–`neutral600`, `success100`–`success600`, `warning100`–`warning600`, `danger100`–`danger600`, plus `background`).
2. **Creator stores**: Call `createCreatorStorePalette({ primaryColor, mode })` with the creator's chosen primary color. Leonardo builds a full accessible palette from it.
3. **CSS variables**: Call `applyPaletteAsCSSVariables(palette, prefix)` to get `--{prefix}-{key}: #hex` pairs. The `useAdaptiveColors` hook handles this automatically.
4. **React hook**: Use `useAdaptiveColors({ mode, primaryColor?, prefix? })` in layout components. It generates the palette, applies CSS variables, and cleans up on unmount.

#### The rules

- **Never hard-code semantic colors.** Use `var(--simket-accent400)` or `var(--store-accent400)`, not `#7C3AED`.
- **Never bypass Leonardo for palette generation.** If you need a new color, add it as a Leonardo `Color` with contrast ratios.
- **Always generate from contrast ratios.** The 6 standard contrast ratios (1.25, 2, 3, 4.5, 7, 10) map to WCAG levels — decorative, large-text AA, normal-text AA, enhanced AAA, high-contrast.
- **Creator stores must use `createCreatorStorePalette`.** A single `primaryColor` input produces the full accessible palette. Never apply a raw hex as `--store-primary-color`.

#### External references

- GitHub: https://github.com/adobe/leonardo
- Package: https://www.npmjs.com/package/@adobe/leonardo-contrast-colors
- API: `BackgroundColor`, `Color`, `Theme` classes — see `node_modules/@adobe/leonardo-contrast-colors/index.d.ts`

---

## 5. Analytics-first implementation rule

The analytics and tracing infrastructure is part of the architecture, not an optional extra.

- Every new request path, mutation, action, webhook, background job, verification flow, and provider integration must preserve or extend existing analytics coverage.
- When touching existing flows, wire them into the shared observability utilities (OpenTelemetry) instead of adding isolated logic that bypasses tracing, timing, or correlated diagnostics.
- If a change creates a new boundary between systems, propagate the trace context across that boundary and emit the relevant spans, timing, or diagnostics through the existing analytics stack.
- Do not remove, bypass, or silently degrade analytics coverage unless explicitly asked for that tradeoff.
- When choosing between equivalent implementations, prefer the one that keeps behaviour observable in OpenTelemetry so debugging always leads back to analytics.

### Trace context propagation

```typescript
import { context, propagation, trace } from '@opentelemetry/api';

// Inject W3C Trace Context headers into outbound requests
const headers: Record<string, string> = {};
propagation.inject(context.active(), headers);

// Create spans for business-critical operations
const tracer = trace.getTracer('simket-service');
const span = tracer.startSpan('process-checkout');
try {
  // business logic
} finally {
  span.end();
}
```

---

## 6. Security rules

### 6.1 Security engineering principles

Follow industry-standard security engineering practices (inspired by Stripe's model):

- **Defence in depth**: multiple layers of security controls
- **Secure by default**: new code must be secure without additional configuration
- **Least privilege**: services and users get minimum required access
- **Fail closed**: when in doubt about authorisation, deny

### 6.2 OWASP compliance

- Validate all input at the first boundary (OWASP Input Validation)
- Use parameterised queries (never string concatenation for SQL/NoSQL)
- Encode output to prevent XSS
- Use CSRF protection on state-changing requests
- Follow OWASP ASVS for verification requirements

### 6.3 Secrets

- Never commit secrets to source control
- Never log secrets, tokens, or PII
- Never include secrets in error responses
- Use environment variables or secret managers for all credentials

---

## 7. TDD workflow

Follow this order for every non-documentation-only task:

1. Identify governing docs
2. Identify upstream references
3. Update docs or contracts if needed
4. Write failing tests
5. Implement the smallest change that makes tests pass
6. Run ALL relevant tests
7. Run linting and type-checking
8. Update traceability if the change is architecturally meaningful

### Test execution commands

```bash
# Run all tests
bun test

# Run unit tests
bun run test:unit

# Run integration tests
bun run test:integration

# Run E2E tests
bun run test:e2e

# Run linting
bun run lint

# Run type-checking
bun run typecheck

# Run all checks (tests + lint + typecheck)
bun run check
```

> Note: These commands will be established as the project is scaffolded. Until they exist, the agent must set them up following NestJS/Vitest conventions before writing implementation code.

---

## 8. Resilient coding rules for agents

Agents are expected to produce code that is resilient, diagnosable, and reviewable by default.

1. Make invariants explicit in types, validation, and tests.
2. Validate external input at the first boundary.
3. Do not hide failures behind silent fallbacks or broad catches.
4. Attach enough context to errors and logs for production diagnosis.
5. Bound I/O and remote work with explicit timeouts.
6. Retry only safe and idempotent operations, with bounded backoff, always through Cockatiel.
7. Prefer explicit data flow over ambient mutable state.
8. Keep modules single-purpose and named by domain responsibility.
9. Write tests for failure paths, replay behaviour, and idempotency.
10. Measure hot paths before claiming optimisation.
11. Keep structured logs, metrics, and traces in mind for operator-relevant paths.
12. Treat cache, queue, and workflow state as supporting state (not business truth) unless docs say otherwise.
13. For mutating APIs, write the idempotency plan: key scope, duplicate behaviour, durable completion evidence.
14. For database changes, write transaction, isolation, lock, and optimistic-concurrency expectations.
15. For workflow changes, cover replay, versioning behaviour, and retry semantics in tests.
16. For ingest changes, validate file signature and preserve quarantine path for suspicious inputs.
17. Use typed API errors (RFC 9457) unless a narrower contract is defined.
18. Do not leave floating promises or undocumented fire-and-forget behaviour.

---

## 9. What "documentation attached to code" means

### For every new source file

Attach:

- File/module purpose
- Governing local docs
- Upstream external references
- Test location or test evidence

Minimum reference header format:

```typescript
/**
 * Purpose: Handles checkout session creation and payment finalisation.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://stripe.com/docs/api/checkout/sessions
 *   - https://docs.vendure.io/guides/extending-the-admin-ui/
 * Tests:
 *   - tests/checkout/create-session.test.ts
 */
```

### For every changed module or subsystem

Update or create the nearest supporting documentation:

- Module README
- Design note
- Governing doc section in `docs/`

---

## 10. Required change bundle

For every meaningful code change, the agent must deliver:

- Implementation code
- Tests (at the correct layer)
- Documentation updates
- Local doc references
- External references

If one is missing, the work is probably incomplete.

---

## 11. Definition of done

An agent is NOT done when code compiles or tests pass once.

Work is done when:

1. Governing docs identified and updated if necessary.
2. Code has attached documentation and references.
3. Tests exist at the correct layer.
4. Implementation matches architecture.
5. Operational implications reflected where relevant.
6. Traceability preserved.
7. Analytics and tracing coverage preserved or extended.
8. No stubs, mocks, or workarounds in production code.
9. All tests pass. All linting passes. All type-checking passes.

---

## 12. Anti-patterns for agents

Do NOT:

- **Write ANY HeroUI code without first fetching `https://heroui.com/react/llms.txt` and the specific component's doc page.** This is non-negotiable. Every HeroUI mistake so far came from guessing component APIs instead of reading the docs online.
- **Write ANY library integration code without searching online first.** The online docs are the source of truth — not your training data, not cached knowledge, not memory.
- **Reinvent functionality that installed libraries already provide.** Search online and read library docs before writing any wrapper, client, cache, provider, or middleware. If an official SDK or companion package exists, use it.
- **Code library calls from memory.** Always read the installed `.d.ts` types first. This is the #1 source of wasted time.
- **Write HTTP clients for APIs that have official SDKs.** Use the SDK.
- **Write custom providers/adapters when official ones exist as companion packages.** Search npm for `@scope/in-memory-provider`, `@scope/express-middleware`, etc.
- **Write authentication/token logic when the auth library provides it.** Use `getSession()`, `verifyToken()`, or whatever the library exposes.
- Code from memory when upstream docs matter.
- Add a package without documenting why it is preferred over alternatives.
- Add routes without updating API docs.
- Add Convex functions without Convex function tests.
- Add Vendure plugins without plugin tests.
- Add storage logic without documenting canonical vs derived responsibilities.
- Hide core behaviour in undocumented utility functions.
- Claim TDD while writing tests only after implementation.
- Optimise by folklore instead of measurement on relevant hot paths.
- Make failures hard to diagnose by stripping context from errors or logs.
- Stub, mock, or fake any production dependency.
- Implement workarounds instead of proper architectural solutions.
- Assume external API endpoint paths without verifying them.
- **Assume library method signatures, type shapes, or config objects without reading the `.d.ts`.**
- Remove or bypass analytics coverage.
- Commit developer-local paths, usernames, or machine-specific details.
- **Hard-code hex colors for UI surfaces, text, or borders.** Use Leonardo-generated CSS variables (`var(--simket-accent400)`, `var(--store-accent400)`) instead. See §4.4.

---

## 13. Fleet and sub-agent configuration

When dispatching fleet agents (parallel sub-agents for coding tasks), always use:

- **Model: `gpt-5.4`** for all coding/implementation agents (`general-purpose`, `task` agent types).
- **Model: `claude-haiku-4.5`** is acceptable only for `explore` agents (read-only research/audit).

Every sub-agent prompt **MUST** include:

1. A reminder to **search online** before writing any library integration code.
2. A reminder to **read `.d.ts` types** before calling any library function.
3. A reminder to **never reinvent the wheel** — use official SDKs, companion packages, and built-in library features.
4. A reminder to **fetch `https://heroui.com/react/llms.txt`** before writing any HeroUI component code.
5. A reminder to **wrap all outbound service calls** in the appropriate `SERVICE_POLICIES.xxx.execute()` from `src/resilience/resilience.ts`.
6. A reminder to **add OpenTelemetry spans** for all outbound service calls.
7. A reminder to **write tests first** (TDD), then implement.
8. A reminder to **add proper doc headers** per §9 of this document.
9. A reminder to **use Leonardo (`@adobe/leonardo-contrast-colors`) for all color generation** — never hard-code hex values for semantic colors. See §4.4.

Sub-agents that do not follow these rules produce code that fails audit and must be rewritten. Front-load the rules to avoid rework.

---

## 14. Working principle

**In Simket, code is never "just code."**

Every meaningful implementation artefact must be linked to:

- **why it exists** (requirement, user story, or architectural decision)
- **which docs govern it** (local architecture and practices docs)
- **which upstream behaviour it relies on** (external API docs, library docs)
- **which tests prove it** (test file location and coverage)

---

## Learned User Preferences

- For hero tiles with a colored outer frame, the image overlay should fade from transparent at the top to the same color as the shell at the bottom so the art stays clear above and blends into the frame below; on smaller or compact layouts, the shell-colored region should read in roughly the lower third of the image (not only as a thin band along the bottom edge).
- Storefront home “Today” prefers a two-tier bento: one large featured square plus a 2×2 grid of small square editor picks, with discovery rows using a larger “medium” tile—three visual tiers (big, medium, small).
- Bento spotlight footers should keep long product titles and creator lines readable on narrow viewports (wrapping, truncation or line clamps, responsive stacking) without breaking the layout.
- Small bento/editor tiles should use the most compact responsive configuration (spacing, type scale, and overlay/gradient treatment) so the UI matches their small footprint.

## Learned Workspace Facts

- When a `hero-banner` editorial section is immediately followed by a `card-grid-4` section (after sort order), the storefront merges them into one bento block (`BentoTodayHero` / `today-layout-bento`).
- Reusable bento spotlight UI lives under `packages/storefront/src/components/today/` (`BentoHeroFrame`, `SpotlightHeroFooter`; `HeroBanner` with `variant="bento"` supports a configurable `shellColor`).
- In `docs/architecture.md` Mermaid diagrams: use `direction LR` inside subgraphs (not misspellings); avoid duplicate node IDs in one graph; close parentheses in quoted node labels.
- GitHub-flavored Markdown tables only render when the header row has the same number of columns as every body row.
- Mock/demo product surfaces in the storefront favor stable seeded full-color placeholder imagery, star glyphs for ratings, and a dedicated left-aligned price line with color on the price text rather than tinting a full-width price strip.
