/**
 * Purpose: Verify pure security audit validation helpers for headers, payloads, and threat classification.
 * Governing docs:
 *   - docs/architecture.md (§2 Fail-closed on security)
 *   - docs/service-architecture.md (§1 Service surfaces)
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 *   - https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 *   - https://owasp.org/www-community/attacks/SQL_Injection
 *   - https://owasp.org/www-community/attacks/xss/
 *   - https://owasp.org/www-community/attacks/Path_Traversal
 *   - https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats
 * Tests:
 *   - packages/vendure-server/src/testing/security/security-checks.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  checkSecureHeaders,
  classifyThreat,
  detectSensitiveDataExposure,
  validateCorsConfig,
  validateCspHeader,
  validateInputSanitization,
  validateRateLimitConfig,
} from './security-checks.js';

describe('security-checks', () => {
  describe('validateCspHeader', () => {
    it('passes a CSP with the required directives', () => {
      const result = validateCspHeader(
        "default-src 'self'; script-src 'self' 'nonce-abc123'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
      );

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('fails when a required directive is missing', () => {
      const result = validateCspHeader(
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'",
      );

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing required CSP directive: frame-ancestors');
    });

    it('detects unsafe-inline in script-src', () => {
      const result = validateCspHeader(
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self'; frame-ancestors 'none'",
      );

      expect(result.valid).toBe(false);
      expect(result.issues).toContain(
        "CSP script-src must not allow 'unsafe-inline' or 'unsafe-eval'",
      );
    });
  });

  describe('validateCorsConfig', () => {
    it('passes a CORS config with an explicit origin allowlist', () => {
      const result = validateCorsConfig({
        origins: ['https://app.simket.test', 'https://creator.simket.test'],
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
      });

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('fails when CORS uses a wildcard origin', () => {
      const result = validateCorsConfig({
        origins: ['*'],
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('CORS origins must use an explicit allowlist, not wildcards');
    });

    it('warns when credentials are not enabled', () => {
      const result = validateCorsConfig({
        origins: ['https://app.simket.test'],
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: false,
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'CORS credentials are disabled; confirm authenticated cross-origin flows are not required',
      );
    });
  });

  describe('detectSensitiveDataExposure', () => {
    it('finds email addresses in response bodies', () => {
      const result = detectSensitiveDataExposure('Customer email: alice@example.com');

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.map((finding) => finding.type)).toContain('email');
    });

    it('finds credit card numbers in response bodies', () => {
      const result = detectSensitiveDataExposure('4242 4242 4242 4242');

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.map((finding) => finding.type)).toContain('credit-card');
    });

    it('finds API keys in response bodies', () => {
      const result = detectSensitiveDataExposure(
        'Stripe key leaked: sk_test_0123456789abcdef0123456789abcdef',
      );

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.map((finding) => finding.type)).toContain('api-key');
    });

    it('does not flag normal text as sensitive data', () => {
      const result = detectSensitiveDataExposure(
        'Welcome to Simket. Browse digital goods and manage your storefront safely.',
      );

      expect(result.hasSensitiveData).toBe(false);
      expect(result.findings).toEqual([]);
    });
  });

  describe('validateRateLimitConfig', () => {
    it('passes a sane rate limit configuration', () => {
      const result = validateRateLimitConfig({
        windowMs: 60_000,
        maxRequests: 100,
        burst: 20,
      });

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('fails when the rate limit window is zero', () => {
      const result = validateRateLimitConfig({
        windowMs: 0,
        maxRequests: 100,
        burst: 20,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Rate limit windowMs must be a positive integer');
    });

    it('fails when max requests is negative', () => {
      const result = validateRateLimitConfig({
        windowMs: 60_000,
        maxRequests: -1,
        burst: 20,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Rate limit maxRequests must be a positive integer');
    });
  });

  describe('classifyThreat', () => {
    it('classifies spoofing threats', () => {
      const result = classifyThreat('An attacker steals a session token to impersonate a creator');
      expect(result.primaryCategory).toBe('Spoofing');
    });

    it('classifies tampering threats', () => {
      const result = classifyThreat('A user modifies order totals in transit before persistence');
      expect(result.primaryCategory).toBe('Tampering');
    });

    it('classifies repudiation threats', () => {
      const result = classifyThreat('An admin deletes records and later denies the action without audit logs');
      expect(result.primaryCategory).toBe('Repudiation');
    });

    it('classifies information disclosure threats', () => {
      const result = classifyThreat('A response leaks PII and secret configuration to unauthorized users');
      expect(result.primaryCategory).toBe('Information Disclosure');
    });

    it('classifies denial of service threats', () => {
      const result = classifyThreat('A bot floods the API until the checkout service becomes unavailable');
      expect(result.primaryCategory).toBe('Denial of Service');
    });

    it('classifies elevation of privilege threats', () => {
      const result = classifyThreat('A buyer escalates privileges to gain admin access');
      expect(result.primaryCategory).toBe('Elevation of Privilege');
    });
  });

  describe('validateInputSanitization', () => {
    it('detects SQL injection payloads', () => {
      const result = validateInputSanitization(`' OR 1=1 --`);

      expect(result.safe).toBe(false);
      expect(result.threats.map((threat) => threat.type)).toContain('sql-injection');
    });

    it('detects XSS payloads', () => {
      const result = validateInputSanitization('<script>alert("xss")</script>');

      expect(result.safe).toBe(false);
      expect(result.threats.map((threat) => threat.type)).toContain('xss');
    });

    it('detects path traversal payloads', () => {
      const result = validateInputSanitization('..\\..\\windows\\system32\\drivers\\etc\\hosts');

      expect(result.safe).toBe(false);
      expect(result.threats.map((threat) => threat.type)).toContain('path-traversal');
    });

    it('allows clean input', () => {
      const result = validateInputSanitization('Featured products sorted by newest release');

      expect(result.safe).toBe(true);
      expect(result.threats).toEqual([]);
    });
  });

  describe('checkSecureHeaders', () => {
    it('passes when all secure headers are present', () => {
      const result = checkSecureHeaders({
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'x-xss-protection': '1; mode=block',
      });

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('fails when HSTS is missing', () => {
      const result = checkSecureHeaders({
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block',
      });

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('Strict-Transport-Security');
    });

    it('fails when X-Frame-Options is missing', () => {
      const result = checkSecureHeaders({
        'x-content-type-options': 'nosniff',
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'x-xss-protection': '1; mode=block',
      });

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('X-Frame-Options');
    });
  });
});
