/**
 * Purpose: Pure security audit helpers for validating headers, configuration, payload exposure, and STRIDE threat classification.
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

export type ThreatCategory =
  | 'Spoofing'
  | 'Tampering'
  | 'Repudiation'
  | 'Information Disclosure'
  | 'Denial of Service'
  | 'Elevation of Privilege';

export type SensitiveDataType = 'email' | 'credit-card' | 'ssn' | 'api-key';
export type InjectionThreatType =
  | 'sql-injection'
  | 'xss'
  | 'path-traversal'
  | 'command-injection';

export interface SecurityCheckResult {
  readonly valid: boolean;
  readonly issues: string[];
  readonly warnings: string[];
}

export interface CspValidationResult extends SecurityCheckResult {
  readonly directives: Readonly<Record<string, readonly string[]>>;
}

export interface CorsValidationConfig {
  readonly origins: string | readonly string[];
  readonly methods: readonly string[];
  readonly credentials?: boolean;
}

export interface SensitiveDataFinding {
  readonly type: SensitiveDataType;
  readonly match: string;
  readonly redacted: string;
  readonly index: number;
}

export interface SensitiveDataExposureResult {
  readonly hasSensitiveData: boolean;
  readonly findings: SensitiveDataFinding[];
}

export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly burst?: number;
}

export interface ThreatClassificationResult {
  readonly primaryCategory: ThreatCategory | 'Unknown';
  readonly categories: ThreatCategory[];
  readonly rationale: string[];
}

export interface InputThreat {
  readonly type: InjectionThreatType;
  readonly match: string;
}

export interface InputSanitizationResult {
  readonly safe: boolean;
  readonly threats: InputThreat[];
}

export interface SecureHeadersResult {
  readonly valid: boolean;
  readonly issues: string[];
  readonly missing: string[];
  readonly present: string[];
}

type HeadersInput = Record<string, string | readonly string[] | undefined>;

const REQUIRED_CSP_DIRECTIVES = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'frame-ancestors',
] as const;

const REQUIRED_SECURITY_HEADERS = {
  'x-frame-options': 'X-Frame-Options',
  'x-content-type-options': 'X-Content-Type-Options',
  'strict-transport-security': 'Strict-Transport-Security',
  'x-xss-protection': 'X-XSS-Protection',
} as const;

const THREAT_RULES: ReadonlyArray<{
  readonly category: ThreatCategory;
  readonly patterns: readonly RegExp[];
}> = [
  {
    category: 'Spoofing',
    patterns: [
      /\bspoof(?:ing)?\b/iu,
      /\bimpersonat(?:e|ion)\b/iu,
      /\bstolen?\s+(?:credential|session|token|cookie)s?\b/iu,
      /\bsession hijack(?:ing)?\b/iu,
      /\bforg(?:ed|e)\s+(?:identity|login|token)\b/iu,
    ],
  },
  {
    category: 'Tampering',
    patterns: [
      /\btamper(?:ing|ed)?\b/iu,
      /\bmodif(?:y|ies|ied|ication)\b/iu,
      /\balter(?:ing|ed)?\b/iu,
      /\bmanipulat(?:e|ion|ed)\b/iu,
      /\binjection\b/iu,
    ],
  },
  {
    category: 'Repudiation',
    patterns: [
      /\brepudiat(?:e|ion)\b/iu,
      /\bden(?:y|ies|ied)\b.*\baction\b/iu,
      /\bwithout audit logs?\b/iu,
      /\bcannot trace\b/iu,
      /\bmissing audit(?:ing)?\b/iu,
    ],
  },
  {
    category: 'Information Disclosure',
    patterns: [
      /\bleak(?:ed|ing)?\b/iu,
      /\bexpos(?:e|ed|ure)\b/iu,
      /\bdisclos(?:e|ure|ed)\b/iu,
      /\bunauthorized(?:\s+\w+){0,2}\s+read\b/iu,
      /\bpii\b/iu,
      /\bsecret(?:s)?\b/iu,
    ],
  },
  {
    category: 'Denial of Service',
    patterns: [
      /\bdenial of service\b/iu,
      /\bdos\b/iu,
      /\bflood(?:ing)?\b/iu,
      /\boverload(?:ed|ing)?\b/iu,
      /\bexhaust(?:ion|ed|ing)?\b/iu,
      /\bunavailable\b/iu,
    ],
  },
  {
    category: 'Elevation of Privilege',
    patterns: [
      /\belevation of privilege\b/iu,
      /\bescalat(?:e|ed|ion)\s+privilege/iu,
      /\bgain(?:ed|ing)?\s+admin access\b/iu,
      /\bunauthorized admin\b/iu,
      /\bprivileged access\b/iu,
    ],
  },
];

const INPUT_THREAT_RULES: ReadonlyArray<{
  readonly type: InjectionThreatType;
  readonly patterns: readonly RegExp[];
}> = [
  {
    type: 'sql-injection',
    patterns: [
      /'\s*(?:or|and)\s+['"]?\w+['"]?\s*=\s*['"]?\w+/iu,
      /\bunion\s+select\b/iu,
      /\bdrop\s+table\b/iu,
      /\bxp_cmdshell\b/iu,
      /\b(?:insert\s+into|delete\s+from|update\s+\w+\s+set)\b/iu,
      /--\s*$/u,
    ],
  },
  {
    type: 'xss',
    patterns: [
      /<script\b/iu,
      /\bjavascript:/iu,
      /\bon\w+\s*=/iu,
      /<svg\b/iu,
      /<iframe\b[^>]*\bsrc\s*=\s*['"]\s*javascript:/iu,
    ],
  },
  {
    type: 'path-traversal',
    patterns: [
      /\.\.[\\/]/u,
      /%2e%2e(?:%2f|%5c)/iu,
      /%252e%252e(?:%252f|%255c)/iu,
      /\.\.%2f/iu,
      /\.\.%5c/iu,
    ],
  },
  {
    type: 'command-injection',
    patterns: [
      /(?:;|&&|\|\|)\s*(?:cat|rm|curl|wget|bash|sh|cmd(?:\.exe)?|powershell(?:\.exe)?)\b/iu,
      /\$\([^)]*\)/u,
      /`[^`]+`/u,
      /\b(?:cat\s+\/etc\/passwd|rm\s+-rf|powershell(?:\.exe)?\s+-)/iu,
    ],
  },
];

const SENSITIVE_DATA_RULES: ReadonlyArray<{
  readonly type: SensitiveDataType;
  readonly pattern: RegExp;
  readonly isValid?: (match: string) => boolean;
}> = [
  {
    type: 'email',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
  },
  {
    type: 'credit-card',
    pattern: /\b(?:\d[ -]*?){13,19}\b/gu,
    isValid: (match) => isLikelyCreditCard(match),
  },
  {
    type: 'ssn',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/gu,
  },
  {
    type: 'api-key',
    pattern:
      /\b(?:sk_(?:live|test)_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{16,}|AKIA[0-9A-Z]{16})\b/gu,
  },
];

function dedupe(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeCspDirectiveValue(value: string): string[] {
  return value
    .trim()
    .split(/\s+/u)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function redact(match: string): string {
  if (match.length <= 6) {
    return '*'.repeat(match.length);
  }

  return `${match.slice(0, 2)}${'*'.repeat(Math.max(4, match.length - 4))}${match.slice(-2)}`;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function normalizeText(input: string | Record<string, unknown>): string {
  return typeof input === 'string' ? input : JSON.stringify(input);
}

function normalizeHeaderValue(value: string | readonly string[] | undefined): string | undefined {
  if (typeof value === 'string' || value === undefined) {
    return value;
  }

  return value.join(', ');
}

function isLikelyCreditCard(match: string): boolean {
  const digits = match.replace(/\D/gu, '');
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number.parseInt(digits[index] ?? '', 10);
    if (Number.isNaN(digit)) {
      return false;
    }
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function validateCspHeader(header: string): CspValidationResult {
  const directives = Object.fromEntries(
    header
      .split(';')
      .map((directive) => directive.trim())
      .filter((directive) => directive.length > 0)
      .map((directive) => {
        const [name, ...values] = directive.split(/\s+/u);
        return [(name ?? '').toLowerCase(), normalizeCspDirectiveValue(values.join(' '))];
      }),
  ) as Record<string, string[]>;

  const issues: string[] = [];
  const warnings: string[] = [];

  for (const requiredDirective of REQUIRED_CSP_DIRECTIVES) {
    if (!directives[requiredDirective]) {
      issues.push(`Missing required CSP directive: ${requiredDirective}`);
    }
  }

  const scriptSrc = directives['script-src'] ?? [];
  if (scriptSrc.includes(`'unsafe-inline'`) || scriptSrc.includes(`'unsafe-eval'`)) {
    issues.push("CSP script-src must not allow 'unsafe-inline' or 'unsafe-eval'");
  }

  const styleSrc = directives['style-src'] ?? [];
  if (styleSrc.includes(`'unsafe-inline'`)) {
    warnings.push("CSP style-src allows 'unsafe-inline'; prefer nonces or hashes");
  }

  return {
    valid: issues.length === 0,
    directives,
    issues: dedupe(issues),
    warnings: dedupe(warnings),
  };
}

export function validateCorsConfig(config: CorsValidationConfig): SecurityCheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const origins = (Array.isArray(config.origins) ? config.origins : [config.origins]).map((origin) =>
    origin.trim(),
  );
  const methods = config.methods.map((method) => method.trim().toUpperCase()).filter(Boolean);

  if (origins.length === 0 || origins.some((origin) => origin.length === 0)) {
    issues.push('CORS origins must contain at least one explicit origin');
  }

  if (origins.some((origin) => origin === '*' || origin.includes('*'))) {
    issues.push('CORS origins must use an explicit allowlist, not wildcards');
  }

  if (methods.length === 0) {
    issues.push('CORS methods must contain at least one allowed method');
  }

  if (!methods.includes('OPTIONS')) {
    warnings.push('CORS methods do not include OPTIONS; preflight requests may fail');
  }

  if (config.credentials !== true) {
    warnings.push(
      'CORS credentials are disabled; confirm authenticated cross-origin flows are not required',
    );
  }

  return {
    valid: issues.length === 0,
    issues: dedupe(issues),
    warnings: dedupe(warnings),
  };
}

export function detectSensitiveDataExposure(responseBody: unknown): SensitiveDataExposureResult {
  const text =
    typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody, null, 2);
  const findings: SensitiveDataFinding[] = [];

  for (const rule of SENSITIVE_DATA_RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      const matchedValue = match[0];
      if (!matchedValue) {
        continue;
      }
      if (rule.isValid && !rule.isValid(matchedValue)) {
        continue;
      }

      findings.push({
        type: rule.type,
        match: matchedValue,
        redacted: redact(matchedValue),
        index: match.index ?? -1,
      });
    }
  }

  return {
    hasSensitiveData: findings.length > 0,
    findings,
  };
}

export function validateRateLimitConfig(config: RateLimitConfig): SecurityCheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!isPositiveInteger(config.windowMs)) {
    issues.push('Rate limit windowMs must be a positive integer');
  }

  if (!isPositiveInteger(config.maxRequests)) {
    issues.push('Rate limit maxRequests must be a positive integer');
  }

  if (config.burst !== undefined) {
    if (!isPositiveInteger(config.burst)) {
      issues.push('Rate limit burst must be a positive integer when provided');
    } else if (isPositiveInteger(config.maxRequests) && config.burst > config.maxRequests) {
      warnings.push('Rate limit burst exceeds maxRequests; burst should normally be <= maxRequests');
    }
  }

  return {
    valid: issues.length === 0,
    issues: dedupe(issues),
    warnings: dedupe(warnings),
  };
}

export function classifyThreat(input: string | Record<string, unknown>): ThreatClassificationResult {
  const text = normalizeText(input).toLowerCase();
  const categories = THREAT_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(text))).map(
    (rule) => rule.category,
  );

  return {
    primaryCategory: categories[0] ?? 'Unknown',
    categories,
    rationale: categories.map((category) => `Matched STRIDE indicators for ${category}`),
  };
}

export function validateInputSanitization(input: string): InputSanitizationResult {
  const threats: InputThreat[] = [];

  for (const rule of INPUT_THREAT_RULES) {
    for (const pattern of rule.patterns) {
      const match = input.match(pattern);
      if (!match?.[0]) {
        continue;
      }

      threats.push({
        type: rule.type,
        match: match[0],
      });
      break;
    }
  }

  return {
    safe: threats.length === 0,
    threats,
  };
}

export function checkSecureHeaders(headers: HeadersInput): SecureHeadersResult {
  const normalizedHeaders = new Map<string, string | undefined>(
    Object.entries(headers).map(
      ([key, value]): [string, string | undefined] => [
        key.toLowerCase(),
        normalizeHeaderValue(value),
      ],
    ),
  );
  const missing: string[] = [];
  const issues: string[] = [];
  const present: string[] = [];

  for (const [headerName, canonicalName] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
    const value = normalizedHeaders.get(headerName)?.trim();
    if (!value) {
      missing.push(canonicalName);
      issues.push(`Missing required security header: ${canonicalName}`);
      continue;
    }

    present.push(canonicalName);

    if (headerName === 'x-frame-options' && !/^(deny|sameorigin)$/iu.test(value)) {
      issues.push('X-Frame-Options should be DENY or SAMEORIGIN');
    }

    if (headerName === 'x-content-type-options' && value.toLowerCase() !== 'nosniff') {
      issues.push('X-Content-Type-Options should be nosniff');
    }

    if (
      headerName === 'strict-transport-security' &&
      !/max-age=\d+/iu.test(value)
    ) {
      issues.push('Strict-Transport-Security should include a max-age directive');
    }
  }

  return {
    valid: issues.length === 0,
    issues: dedupe(issues),
    missing: dedupe(missing),
    present: dedupe(present),
  };
}
