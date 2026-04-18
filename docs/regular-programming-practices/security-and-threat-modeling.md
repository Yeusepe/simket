# Security And Threat Modeling

## 1. Default posture

- Fail closed on authorisation-sensitive paths (Cedar policies, CrowdSec, ClamAV)
- Validate signatures, MIME, and declared content
- Keep secrets server-side
- Keep operator actions auditable
- Follow Stripe's security principles: defence in depth, secure by default, least privilege

## 2. Secure-by-default principles

1. Build strong identity foundation (Better Auth as single identity provider)
2. Apply least privilege (Cedar fine-grained policies, scoped API keys)
3. Maintain traceability (OpenTelemetry end-to-end, audit events)
4. Apply security at all layers (edge → API → service → storage)
5. Automate security controls (CrowdSec, dependency scanning, secret scanning)
6. Protect data in transit and at rest (TLS everywhere, encrypted secrets)
7. Keep humans away from sensitive data through automation
8. Prepare for security events (runbooks, incident response, rollback)

## 3. Threat-model triggers

Threat-model changes that affect:

- sign-in and session flows (Better Auth)
- OAuth/OIDC authorisation and token issuance
- payment and checkout flows (Stripe Connect)
- webhook ingestion (Svix, Stripe)
- product upload and asset ingestion (CDNgine, ClamAV)
- creator collaboration and revenue splits
- licence key issuance and validation (Keygen)
- admin/internal-service APIs
- secret handling and storage
- recommendation data and user behaviour tracking
- editorial content publication (PayloadCMS)

## 4. Lightweight STRIDE model

For every threat-modelled change, produce at minimum:

| Question                        | Answer                                                              |
| ------------------------------- | ------------------------------------------------------------------- |
| What is changing?               | (description)                                                       |
| Where is the trust boundary?    | (service, edge, storage)                                            |
| What are the assets?            | (user data, payment info, secrets, products)                        |
| What does the attacker control? | (inputs, timing, network)                                           |
| What are the threats?           | (spoofing, tampering, repudiation, info disclosure, DoS, elevation) |
| What are the mitigations?       | (validation, auth, rate-limiting, audit, encryption)                |

## 5. External assertion validation

- Validate signatures against trusted keys or JWKS endpoints
- Validate issuer, audience, and time-based claims
- Handle key rotation intentionally with overlap windows
- Fail closed when trust validation is ambiguous
- Stripe webhook pattern: verify signature with `stripe.webhooks.constructEvent`, reject invalid
- Svix webhook pattern: verify via Svix SDK, reject invalid

## 6. Secrets and tokens as high-value data

- Keep server-side only
- Encrypt at rest
- Document every token class and its owner
- Document rotation and revocation procedures
- Do not expose provider access tokens to the browser unless the contract requires it
- Do not duplicate token storage without a declared source of truth

| Token class           | Owner         | Storage                     | Rotation             |
| --------------------- | ------------- | --------------------------- | -------------------- |
| User sessions         | Better Auth   | Better Auth DB              | Sliding expiry       |
| Creator API keys      | Better Auth   | Better Auth DB              | Manual revocation    |
| Stripe Connect tokens | Stripe        | Stripe (not stored locally) | Stripe manages       |
| Licence keys          | Keygen        | Keygen                      | Per-product policy   |
| Cedar policy versions | Cedar service | Policy DB                   | Versioned deployment |
| Svix signing keys     | Svix          | Svix                        | Svix rotation        |

## 7. Payment security (Stripe principles)

- Never store raw card data — Stripe handles PCI compliance
- Use Stripe Elements or Checkout for card collection
- Verify webhook signatures on every event
- Use idempotency keys for all Stripe API mutations
- Connected account access scoped to minimum required
- Destination charges preferred over direct charges for collaboration splits
- Log payment events with trace context but never log card details
