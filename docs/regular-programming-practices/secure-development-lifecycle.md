# Secure Development Lifecycle

This document adapts [NIST SSDF (SP 800-218)](https://csrc.nist.gov/pubs/sp/800/218/final) as the operating model for Simket.

## 1. NIST SSDF practice groups

### PO — Prepare the Organisation

- Define owners for auth, payments, assets, recommendations, editorial, and infrastructure
- Establish rules before work begins (this suite)
- Document release expectations and rollback procedures
- Maintain security training awareness for payment and identity flows

### PS — Protect the Software

- Protect source with branch protection and required reviews
- Protect CI with secret scanning, dependency scanning, and build verification
- Protect secrets with managed storage (never committed, environment-injected)
- Protect dependencies with explicit intake and update monitoring

### PW — Produce Well-Secured Software

- Secure design: threat-model before implementing security-sensitive changes
- Secure coding: follow this practices suite
- Secure review: security-relevant changes require explicit security review
- Secure verification: tests, audits, and evidence throughout

### RV — Respond to Vulnerabilities

- Document a reporting path for vulnerabilities
- Clear triage ownership
- Patch procedures with rollback plans
- Advisory publication when appropriate
- Post-incident follow-up and learning

## 2. Source and maintainer access

- MFA required for all maintainers
- Protected branches on main
- Security-sensitive changes require explicit review
- Least privilege for all access

## 3. Secrets and credentials

- Do not commit secrets to source control
- Use managed secret storage (environment variables, secret managers)
- Rotate intentionally with documented procedures
- Prefer short-lived credentials over long-lived ones
- Document every secret class, owner, and rotation schedule

## 4. Dependency intake

Before adding any dependency:

1. State the explicit reason for the dependency
2. Verify the package name and publisher
3. Check maintenance status and vulnerability history
4. Confirm no existing alternative already in the stack
5. Document the monitoring plan for updates
6. Assess the dependency's transitive dependency footprint

## 5. CI expectations

Every CI pipeline must include:

- Test execution (unit, integration, E2E as appropriate)
- Dependency and vulnerability scanning
- Secret scanning
- Bebop contract compatibility verification
- Linting and formatting checks
- Protected-branch enforcement

## 6. Secure-by-default principles

Adapted from AWS Well-Architected, GitLab, and OpenSSF:

1. Strong identity foundation (Better Auth)
2. Least privilege (Cedar policies)
3. Traceability (OpenTelemetry + audit events)
4. Security at all layers (Cloudflare edge → NestJS → Vendure → Convex → storage)
5. Automation first (CrowdSec, ClamAV, Dependabot)
6. Preventative controls over detective controls
7. Root-cause fixes, not symptom treatment

## 7. Secure supply chain

- Every dependency addition reviewed and documented
- Vulnerability monitoring active (Dependabot, Snyk, or equivalent)
- Easy dependency update path (no pinned-and-forgotten versions)
- Artefact integrity verified
- Sanitised artefacts (no local paths, no embedded secrets)
- SBOM generation for releases

## 8. Release discipline

- Do NOT rush security-sensitive behaviour to fit a release window
- Release when verified, rollback known, docs updated, risks explicit
- Feature flags (OpenFeature) for gradual rollout of risky changes
- Circuit breakers (Cockatiel) for new integrations

## 9. Vulnerability process

- Documented reporting method (SECURITY.md at repo root)
- Clear triage ownership
- Patch procedures with rollback
- Advisory publication when appropriate
- CVE request path for critical vulnerabilities
- Post-incident follow-up
