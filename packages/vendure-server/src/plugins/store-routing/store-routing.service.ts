/**
 * Purpose: Store routing — subdomain resolution, slug validation, and URL
 * building for creator custom stores (josephstore.simket.com).
 *
 * Governing docs:
 *   - docs/architecture.md §5 (Page Builder — Framely)
 * External references:
 *   - https://developers.cloudflare.com/workers/
 *   - RFC 1035 (DNS label rules)
 * Tests:
 *   - packages/vendure-server/src/plugins/store-routing/store-routing.service.test.ts
 */

/** Subdomains reserved for platform use — cannot be claimed as store slugs. */
const RESERVED_SLUGS = new Set([
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'smtp',
  'ftp',
  'cdn',
  'docs',
  'blog',
  'status',
  'dashboard',
  'help',
  'support',
]);

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 63; // DNS label max

export interface SlugValidation {
  readonly valid: boolean;
  readonly errors: string[];
}

/**
 * Extract the store slug from a hostname.
 * Returns null for root domain or reserved subdomains (www, api, etc.).
 */
export function parseStoreSubdomain(hostname: string): string | null {
  const parts = hostname.split('.');
  if (parts.length <= 2) return null; // root domain

  const subdomain = parts[0]?.toLowerCase();
  if (!subdomain || RESERVED_SLUGS.has(subdomain)) return null;

  return subdomain;
}

/**
 * Build a full store URL from a slug and base domain.
 */
export function buildStoreUrl(slug: string, baseDomain: string): string {
  return `https://${slug.toLowerCase()}.${baseDomain}`;
}

/**
 * Validate a store slug against DNS label rules and reservation list.
 */
export function validateStoreSlug(slug: string): SlugValidation {
  const errors: string[] = [];
  const normalized = slug.toLowerCase().trim();

  if (normalized.length < MIN_SLUG_LENGTH) {
    errors.push(`Slug must be at least ${MIN_SLUG_LENGTH} characters`);
  }
  if (normalized.length > MAX_SLUG_LENGTH) {
    errors.push(`Slug must be at most ${MAX_SLUG_LENGTH} characters`);
  }
  if (!SLUG_REGEX.test(normalized)) {
    errors.push('Slug must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen');
  }
  if (isReservedSlug(normalized)) {
    errors.push(`"${normalized}" is a reserved subdomain`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if a slug is in the reserved list.
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/**
 * Normalize a slug for storage (lowercase, trimmed).
 */
export function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim();
}
