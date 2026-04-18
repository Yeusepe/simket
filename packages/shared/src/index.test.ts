import { describe, it, expect } from 'vitest';
import {
  validateShopPayload,
  validateAdminPayload,
  validatePayloadSize,
  MAX_SHOP_PAYLOAD_BYTES,
  MAX_ADMIN_PAYLOAD_BYTES,
} from './index.js';

describe('@simket/shared', () => {
  it('exports domain types and middleware', async () => {
    const mod = await import('./index.js');
    expect(mod.validateShopPayload).toBeInstanceOf(Function);
    expect(mod.validateAdminPayload).toBeInstanceOf(Function);
    expect(mod.MAX_SHOP_PAYLOAD_BYTES).toBe(65536);
    expect(mod.MAX_ADMIN_PAYLOAD_BYTES).toBe(262144);
  });
});

describe('Payload validation', () => {
  it('accepts shop payloads within 64KB', () => {
    const small = 'x'.repeat(1000);
    const result = validateShopPayload(small);
    expect(result.valid).toBe(true);
    expect(result.sizeBytes).toBe(1000);
    expect(result.maxBytes).toBe(MAX_SHOP_PAYLOAD_BYTES);
  });

  it('rejects shop payloads exceeding 64KB', () => {
    const large = 'x'.repeat(MAX_SHOP_PAYLOAD_BYTES + 1);
    const result = validateShopPayload(large);
    expect(result.valid).toBe(false);
  });

  it('accepts admin payloads within 256KB', () => {
    const medium = 'x'.repeat(MAX_SHOP_PAYLOAD_BYTES + 100);
    const result = validateAdminPayload(medium);
    expect(result.valid).toBe(true);
  });

  it('rejects admin payloads exceeding 256KB', () => {
    const huge = 'x'.repeat(MAX_ADMIN_PAYLOAD_BYTES + 1);
    const result = validateAdminPayload(huge);
    expect(result.valid).toBe(false);
  });

  it('validates Uint8Array payloads', () => {
    const bytes = new Uint8Array(500);
    const result = validatePayloadSize(bytes, 1024);
    expect(result.valid).toBe(true);
    expect(result.sizeBytes).toBe(500);
  });

  it('handles exact boundary correctly', () => {
    const exact = new Uint8Array(MAX_SHOP_PAYLOAD_BYTES);
    const result = validateShopPayload(exact);
    expect(result.valid).toBe(true);
  });
});
