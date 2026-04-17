# Delivery And Review

## 1. Standing rules

1. Start from the expected outcome.
2. Keep one coherent slice per change.
3. Update docs, contracts, tests, and implementation together.
4. Do not hide architectural decisions in chat.
5. Prefer deletion and reuse over custom subsystems.

## 2. What makes a good slice

A good slice addresses one coherent concern:

- one boundary decision
- one Vendure plugin or NestJS module
- one Bebop contract change
- one Convex function family
- one storage boundary change + tests
- one migration step
- one HeroUI component family

Split cleanup from feature work when it would hide the main change.

## 3. Review standard

The review standard is continuous improvement. After every change, the reviewer should be able to answer:

- Does this improve the codebase?
- Are boundaries clearer?
- Are failures safer?
- Is security more explicit?
- Is debt documented rather than hidden?

## 4. Resolve disagreements

When reviewers and authors disagree, the resolution order is:

1. Contract and security requirements
2. Repository rules (this suite, architecture docs)
3. Style guide (Google TypeScript/JavaScript/Markdown)
4. Surrounding code conventions
5. Author preference

## 5. Documentation as delivery

When the platform shape changes, docs are part of the delivery. Update:

- Architecture docs when service topology, data flow, or non-negotiable rules change
- API docs when Bebop contracts, routes, or auth boundaries change
- Domain model when entity shapes or relationships change
- This practices suite when operating rules change
- ADRs when durable architectural decisions are made or reversed

## 6. Portable artefacts

No developer-local absolute paths, usernames, OneDrive folders, or workstation-specific URLs in committed content. This applies to:

- source code
- documentation
- test fixtures
- configuration examples
- CI scripts

## 7. Closure checklist

Before closing a change:

1. Smallest coherent slice that improves the system
2. Reviewer understands goal without hidden context
3. Change does not mix unrelated concerns
4. Deferred work has an explicit follow-up (issue, TODO with owner)
5. Docs changed alongside implementation
6. No developer-local paths in artefacts, examples, or tests
7. Tests exist for the changed behaviour
8. Analytics and tracing coverage preserved or extended
