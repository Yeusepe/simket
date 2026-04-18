import { describe, it, expect } from 'vitest';
import { config } from './vendure-config.js';

describe('vendure-config', () => {
  it('has valid API paths', () => {
    expect(config.apiOptions?.adminApiPath).toBe('admin-api');
    expect(config.apiOptions?.shopApiPath).toBe('shop-api');
  });

  it('uses postgres with PgBouncer port', () => {
    expect(config.dbConnectionOptions.type).toBe('postgres');
    expect(config.dbConnectionOptions.port).toBe(6432);
  });

  it('disables synchronize for production safety', () => {
    expect(config.dbConnectionOptions.synchronize).toBe(false);
  });

  it('has bearer token auth', () => {
    expect(config.authOptions?.tokenMethod).toBe('bearer');
  });
});
