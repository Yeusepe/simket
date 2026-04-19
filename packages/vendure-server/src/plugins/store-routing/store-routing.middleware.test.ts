/**
 * Purpose: Unit tests for StoreRoutingMiddleware hostname parsing.
 */
import { describe, it, expect } from 'vitest';
import { parseStoreSubdomain } from './store-routing.service.js';

describe('StoreRoutingMiddleware hostname resolution', () => {
  it('extracts store slug from valid subdomain', () => {
    expect(parseStoreSubdomain('josephstore.simket.com')).toBe('josephstore');
  });

  it('extracts slug from uppercase hostname', () => {
    expect(parseStoreSubdomain('MyStore.simket.com')).toBe('mystore');
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

  it('returns null for admin subdomain', () => {
    expect(parseStoreSubdomain('admin.simket.com')).toBeNull();
  });

  it('returns null for cdn subdomain', () => {
    expect(parseStoreSubdomain('cdn.simket.com')).toBeNull();
  });

  it('handles deep subdomains', () => {
    expect(parseStoreSubdomain('mystore.us.simket.com')).toBe('mystore');
  });
});
