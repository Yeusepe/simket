# Simket Documentation

> Start here to find the right document for your role.

---

## Platform (how the system works)

| Document                                          | What it covers                                                                                                                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Architecture](./architecture.md)                 | Purpose, non-negotiable rules, logical architecture, system boundary, service ownership, lifecycle flows, data ownership, reliability, security, deployment, tech stack, extensibility. |
| [Service Architecture](./service-architecture.md) | Service surfaces, Vendure plugin contracts, request-path posture, consistency model, state machines, auth posture, client architecture, media lifecycle, observability.                 |
| [Domain Model](./domain-model.md)                 | Core entities, identity model, entity relationships, record responsibilities, custom field registry, invariants.                                                                        |

## Reference

| Document                          | What it covers                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| [ADRs](./adr/)                    | Architecture Decision Records documented decisions with context, options, and rationale. |
| [Threat Models](./threat-models/) | Security threat analysis per service boundary.                                           |
| [Runbooks](./runbooks/)           | Operational procedures for incidents, deployments, and maintenance.                      |

## Contributor

| Document                                                          | What it covers                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------- |
| [Regular Programming Practices](./regular-programming-practices/) | Coding conventions, review guidelines, testing standards. |

## External references

| System                                      | Documentation                                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [Vendure](https://docs.vendure.io/)         | Commerce core framework                                                                       |
| [HeroUI](https://heroui.com)                | React component library                                                                       |
| [PayloadCMS](https://payloadcms.com/docs)   | Editorial CMS                                                                                 |
| [TipTap](https://tiptap.dev/docs)           | Rich text editor                                                                              |
| [Convex](https://docs.convex.dev/)          | Database + workflow engine                                                                    |
| [Encore](https://encore.dev/docs)           | Backend framework                                                                             |
| [OpenFeature](https://openfeature.dev/docs) | Feature flags                                                                                 |
| [Backstage](https://backstage.io/docs)      | Developer portal                                                                              |
| [OpenReplay](https://docs.openreplay.com/)  | Session replay                                                                                |
| CDNgine                                     | `../../../cdngine/docs/` Asset pipeline (internal)                                            |
| Better Auth                                 | [https://www.better-auth.com/docs](ttps://www.better-auth.com/docs) Identity + OAuth provider |
