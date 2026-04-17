# Resilient Coding, Debugging, And Performance

This document turns a broad engineering research sweep into repository rules.

Its purpose is simple: **someone coding in Simket should produce code that is resistant to errors, easy to understand, easy to debug, and fast enough for production reality**.

The rules here are intentionally operational. They are meant to shape design, implementation, tests, review, and incident response.

## 1. Core expectations

1. Prefer code that is easy to reason about over code that is merely clever.
2. Make invalid states hard to represent.
3. Make failures obvious, structured, and diagnosable.
4. Keep interfaces stable and explicit.
5. Treat retries, concurrency, and partial failure as normal conditions.
6. Measure performance before and after hot-path changes.
7. Keep documentation, tests, and code in the same change.
8. Make product, order, creator, and recommendation lineage visible across logs, traces, and audit records.

## 2. Readability and maintainability rules

1. Keep functions and modules focused on one responsibility.
2. Name things by domain meaning, not local implementation trivia.
3. Prefer explicit inputs and outputs over hidden ambient state.
4. Move repeated policy into clear helpers or shared modules, not copy-paste branches.
5. Keep happy-path code visually obvious.
6. Comment why a rule exists, not what the syntax already says.
7. Encode invariants in types, Bebop schema validation, and assertions near the boundary.
8. Use formatting and linting to remove style debate from review.

## 3. Failure handling rules

1. Validate external input at first receipt.
2. Return structured errors with actionable context (prefer RFC 9457 problem-details).
3. Do not swallow exceptions, use silent fallbacks, or hide partial-write failures.
4. Bound network calls, background work, and locks with explicit timeouts.
5. Retry only operations that are safe to retry.
6. Retries must be bounded, jittered, and observable — always through Cockatiel.
7. Prefer idempotent write paths and deterministic replay behaviour.
8. Treat dependency outages, malformed input, stale state, and duplicate requests as normal test cases.
9. For mutating APIs, define the idempotency key scope, conflict behaviour, and durable evidence of completion.
10. Never stub or mock failure paths in production code. If a dependency is unavailable, fail explicitly.

## 4. Debuggability and observability rules

1. Emit structured logs rather than free-form strings for important events.
2. Include correlation identifiers (trace ID, span ID) across API, Convex function, and worker boundaries.
3. Log enough context to explain a failure without leaking secrets.
4. Expose metrics around user-visible outcomes, queue health, retry pressure, and failure classes.
5. Trace cross-service operations that can stall, retry, or fan out.
6. Prefer RFC 9457 problem-details responses and diagnostic metadata over generic 500-style failures.
7. Make operator actions and state transitions auditable.
8. Every new request path, mutation, action, webhook, background job, and verification flow must preserve or extend existing analytics coverage (OpenTelemetry).
9. When a change creates a new boundary between systems, propagate trace context across that boundary and emit the relevant spans, timing, or diagnostics through the existing analytics stack.
10. Do not remove, bypass, or silently degrade analytics coverage unless explicitly asked.

## 5. Testing and change-safety rules

1. Follow the repository TDD order: docs, contract, failing test, implementation, evidence.
2. Add a regression test for every defect that escaped.
3. Test both success and failure paths.
4. Make tests deterministic by controlling time, randomness, and external I/O.
5. Keep unit tests narrow and integration tests realistic.
6. Use end-to-end tests for critical flows, not as a substitute for lower-layer coverage.
7. Favour assertions on externally visible behaviour rather than incidental implementation details.
8. For concurrency, retries, and workflow logic, prove idempotency and replay behaviour explicitly.
9. Never mock or stub production dependencies in integration tests. Use real services (TestContainers, Convex dev instance, test Stripe keys). The only acceptable mocks are in isolated unit tests for pure logic, and even there prefer the real thing.
10. Run all relevant tests after every change. A change without a test run is not complete.

## 6. Interface, state, and data rules

1. Normalise input once and pass validated data inward.
2. Keep public contracts versioned and intentionally compatible (Bebop schema evolution).
3. Do not let provider-specific storage or queue terms leak into stable API models.
4. Keep transactional ownership explicit.
5. Avoid shared mutable state unless the concurrency contract is documented and tested.
6. Persist durable truth in the system that owns it; do not let cache or workflow state impersonate the source of truth.
7. Use migrations and schema change discipline for persisted data.
8. For registry and publication paths, document the transaction, isolation, locking, or optimistic-concurrency expectations.

## 7. Performance rules

1. Measure before optimising.
2. Profile hot paths instead of guessing.
3. Prefer fewer round-trips, fewer copies, and fewer unnecessary transformations.
4. Batch work where semantics allow it.
5. Keep memory growth, queue backlog, and retry amplification visible.
6. Optimise for the expected production workload shape, not microbenchmarks alone.
7. Treat performance regressions as correctness issues on hot paths.
8. Bebop serialisation must stay under 0.2 ms p99; measure after schema changes.

## 8. Security and operational safety rules

1. Treat all external input as hostile until validated.
2. Favour least privilege and narrow credentials.
3. Keep secrets out of logs, exceptions, and test fixtures.
4. Pin or review critical dependencies and keep them current.
5. Design failure behaviour to fail closed when access control, signature validation, or payment verification is ambiguous.
6. Make administrative and replay surfaces auditable and permissioned.
7. For ingest (CDNgine), verify file signatures, not just filename or declared MIME type, and preserve a quarantine path for suspicious inputs.
8. Follow Stripe's security principles: defence in depth, secure by default, least privilege, fail closed.

## 9. No-stubs and no-workarounds rules

1. **Never stub or mock production functionality.** If a component needs a dependency, wire the real dependency. If it cannot be wired, fail with an explicit error. The only place mocks are tolerated is in unit test suites for pure logic, and even there prefer integration with real services.
2. **Never implement workarounds.** A workaround is a change that produces the correct output for now but violates the architecture, bypasses the proper system, or creates hidden dependencies that will break later. Signs you are writing a workaround:
   - You are special-casing a single entity instead of using the general system.
   - You are reading data that "happens to be there" instead of the architecturally correct source.
   - You are duplicating logic that already exists somewhere else rather than calling it.
   - You are using a flag or conditional just to avoid a proper architectural change.
   - Your change works today but would silently break if the system around it changes.
3. The correct response to a workaround situation is always: **design the proper flow, implement it properly, test it properly.**

## 10. Review checklist

Use this checklist in addition to the review guidance in delivery-and-review.md:

1. Is the code easier to reason about after this change?
2. Are invariants explicit?
3. Are failures diagnosable?
4. Are retries, timeouts, and idempotency handled deliberately?
5. Are tests proving the risky behaviour?
6. Is the public or internal contract clearer rather than more implicit?
7. Are logs, metrics, traces, or audit events good enough for production debugging?
8. Is performance impact known for hot paths?
9. Are docs and references updated with the code?
10. Is analytics/tracing coverage preserved or extended?
11. Are there any stubs, mocks, or workarounds? If yes, reject.

## 11. Source highlights

The strongest baseline references for this document are:

- [Google Engineering Practices](https://google.github.io/eng-practices/)
- [Google Style Guides](https://google.github.io/styleguide/)
- [Site Reliability Engineering](https://sre.google/sre-book/table-of-contents/)
- [AWS Well-Architected Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)
- [AWS Builders Library: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [AWS Builders Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Google API Design Guide](https://cloud.google.com/apis/design)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [NIST Secure Software Development Framework](https://csrc.nist.gov/projects/ssdf)
- [Stripe Security Engineering](https://stripe.com/docs/security)
- [Diataxis](https://diataxis.fr/)
