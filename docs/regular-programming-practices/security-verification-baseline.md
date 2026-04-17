# Security Verification Baseline

The platform should verify:

## 1. Authentication and session controls

- Better Auth sign-in, sign-up, and session lifecycle
- OAuth/OIDC flows for creator identity
- Session revocation and renewal
- API key issuance and verification
- MFA enforcement for creator accounts

## 2. Authorisation controls

- Cedar policy enforcement for all protected resources
- Creator ownership verification for product mutations
- Collaboration permission enforcement
- Admin scope restrictions

## 3. Payment controls

- Stripe webhook signature verification
- Checkout idempotency
- Collaboration revenue split accuracy
- Refund and dispute handling
- Connected account permission scoping

## 4. Upload and ingest controls

- CDNgine upload authorisation
- ClamAV malware scan completion before publication
- File signature validation (not just MIME type)
- Asset quarantine path for suspicious inputs
- Signed URL expiration and scope

## 5. Replay and idempotency protections

- Webhook deduplication (Stripe event.id, Svix message.id)
- Checkout mutation idempotency (Stripe idempotency keys)
- Convex function idempotency
- BullMQ job deduplication

## 6. Rate-limiting and abuse controls

- Cloudflare edge rate-limiting (1000 req/min/IP)
- NestJS application rate-limiting (100 req/min/user)
- CrowdSec bot detection and IP reputation
- Cart and checkout abuse prevention

## 7. Data protection

- Secrets never in logs or error responses
- PII handling (GDPR-aware)
- Encrypted secrets at rest
- TLS for all data in transit

## 8. Operator and admin controls

- Admin actions auditable
- Operator-only endpoints protected
- Replay and reconciliation surfaces permissioned

Security-sensitive changes should land with evidence, not assumptions. Every item above should be verified through executable tests, not prose claims.
