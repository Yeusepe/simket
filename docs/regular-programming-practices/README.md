# Regular Programming Practices

This suite explains how to build Simket, not just what the platform is supposed to do.

It fills in the operating rules around:

- delivery and review discipline
- resilient coding, diagnosability, and performance
- language, module, and documentation style
- security and threat modeling
- secure software development lifecycle
- verification expectations
- storage and state ownership
- interfaces and data flow
- testing, scale, and resilience
- phased implementation strategy

## Reading order

1. [Delivery And Review](./delivery-and-review.md)
2. [Resilient Coding, Debugging, And Performance](./resilient-coding-debugging-and-performance.md)
3. [Language Style And Documentation](./language-style-and-documentation.md)
4. [Security And Threat Modeling](./security-and-threat-modeling.md)
5. [Secure Development Lifecycle](./secure-development-lifecycle.md)
6. [Security Verification Baseline](./security-verification-baseline.md)
7. [Storage And State](./storage-and-state.md)
8. [Interfaces And Data Flow](./interfaces-and-data-flow.md)
9. [Testing And Scale](./testing-and-scale.md)
10. [Implementation Strategy](./implementation-strategy.md)

## Standing rules

1. Do not leave inputs, outputs, or service ownership implicit.
2. Do not add new payment, identity, or security-sensitive behaviour without a threat model, verification plan, and rollback story.
3. Do not let scale, dependency failure, or key-rotation behaviour become "later" work.
4. Do not add dependencies, CI automation, or release behaviour without a secure-SDLC owner.
5. Do not keep compatibility paths without a documented removal rule.
6. Do not treat style, naming, or docs as ad-hoc per-file choices.
7. Do not let committed artefacts encode developer-local machine details.
8. Do not release security-sensitive changes without security and resilience gate evidence.
9. Do not stub, mock, or fake production behaviour outside test suites. Prefer errors over silent fakes.
10. Do not implement workarounds. Design the proper solution or stop and escalate.

## External foundations

This suite is deliberately grounded in:

- [Google Style Guides](https://google.github.io/styleguide/)
- [Google Engineering Practices](https://google.github.io/eng-practices/)
- [NIST SSDF](https://csrc.nist.gov/pubs/sp/800/218/final)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OpenSSF Concise Guide](https://best.openssf.org/Concise-Guide-for-Developing-More-Secure-Software.html)
- [Stripe Security Principles](https://stripe.com/docs/security)

These are adapted here for a digital-marketplace platform with real-time reactive state (Convex), a plugin-based commerce core (Vendure), binary API contracts (Bebop), and standardised asset processing (CDNgine).
