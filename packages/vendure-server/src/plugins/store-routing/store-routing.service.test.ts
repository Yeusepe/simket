/**
 * Purpose: Tests for StoreRoutingService — subdomain resolution for creator stores.
 *
 * Governing docs:
 *   - docs/architecture.md §5 (Page Builder — Framely)
 * External references:
 *   - https://developers.cloudflare.com/workers/
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  parseStoreSubdomain,
  buildStoreUrl,
  validateStoreSlug,
  isReservedSlug,
  normalizeSlug,
} from './store-routing.service.js';

describe('StoreRoutingService', () => {
  describe('parseStoreSubdomain', () => {
    it('extracts store slug from subdomain', () => {
      expect(parseStoreSubdomain('josephstore.simket.com')).toBe('josephstore');
    });

    it('returns null for root domain', () => {
      expect(parseStoreSubdomain('simket.com')).toBeNull();
    });

    it('returns null for www subdomain', () => {
      expect(parseStoreSubdomain('www.simket.com')).toBeNull();
    });

    it('returns null for api subdomain', () => {
      expect(parseStoreSubdomain('api.simket.com')).toBeNull();
    });

    it('handles nested subdomains (takes first part)', () => {
      expect(parseStoreSubdomain('deep.josephstore.simket.com')).toBe('deep');
    });
  });

  describe('buildStoreUrl', () => {
    it('builds subdomain URL from slug', () => {
      expect(buildStoreUrl('josephstore', 'simket.com')).toBe(
        'https://josephstore.simket.com',
      );
    });

    it('lowercases slug', () => {
      expect(buildStoreUrl('JosephStore', 'simket.com')).toBe(
        'https://josephstore.simket.com',
      );
    });
  });

  describe('validateStoreSlug', () => {
    it('accepts valid alphanumeric slug', () => {
      expect(validateStoreSlug('josephstore').valid).toBe(true);
    });

    it('accepts slugs with hyphens', () => {
      expect(validateStoreSlug('joseph-store').valid).toBe(true);
    });

    it('rejects empty slug', () => {
      expect(validateStoreSlug('').valid).toBe(false);
    });

    it('rejects slug with spaces', () => {
      expect(validateStoreSlug('joseph store').valid).toBe(false);
    });

    it('rejects slug starting with hyphen', () => {
      expect(validateStoreSlug('-joseph').valid).toBe(false);
    });

    it('rejects slug ending with hyphen', () => {
      expect(validateStoreSlug('joseph-').valid).toBe(false);
    });

    it('rejects too-short slug (< 3 chars)', () => {
      expect(validateStoreSlug('ab').valid).toBe(false);
    });

    it('rejects too-long slug (> 63 chars)', () => {
      expect(validateStoreSlug('a'.repeat(64)).valid).toBe(false);
    });

    it('rejects reserved slugs', () => {
      expect(validateStoreSlug('www').valid).toBe(false);
      expect(validateStoreSlug('api').valid).toBe(false);
      expect(validateStoreSlug('admin').valid).toBe(false);
    });
  });

  describe('isReservedSlug', () => {
    it('detects reserved slugs', () => {
      expect(isReservedSlug('www')).toBe(true);
      expect(isReservedSlug('api')).toBe(true);
      expect(isReservedSlug('admin')).toBe(true);
      expect(isReservedSlug('app')).toBe(true);
      expect(isReservedSlug('mail')).toBe(true);
    });

    it('allows non-reserved slugs', () => {
      expect(isReservedSlug('josephstore')).toBe(false);
    });
  });

  describe('normalizeSlug', () => {
    it('lowercases and trims', () => {
      expect(normalizeSlug('  JosephStore  ')).toBe('josephstore');
    });
  });
});
