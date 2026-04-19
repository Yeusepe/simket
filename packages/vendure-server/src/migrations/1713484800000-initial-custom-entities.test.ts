/**
 * Purpose: Verify migration export shape and that the migration emits expected schema statements.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://typeorm.io/migrations
 * Tests:
 *   - packages/vendure-server/src/migrations/1713484800000-initial-custom-entities.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { QueryRunner } from 'typeorm';
import * as migrationModule from './1713484800000-initial-custom-entities.js';

describe('InitialCustomEntities1713484800000', () => {
  it('exports the migration class with reversible hooks', () => {
    expect(migrationModule.InitialCustomEntities1713484800000).toBeDefined();

    const migration = new migrationModule.InitialCustomEntities1713484800000();
    expect(migration.name).toBe('InitialCustomEntities1713484800000');
    expect(typeof migration.up).toBe('function');
    expect(typeof migration.down).toBe('function');
  });

  it('creates and drops the custom entity tables in reverse order', async () => {
    const queryRunner = {
      query: vi.fn().mockResolvedValue(undefined),
    } as unknown as QueryRunner;
    const migration = new migrationModule.InitialCustomEntities1713484800000();

    await migration.up(queryRunner);
    const upStatements = vi.mocked(queryRunner.query).mock.calls.map(([sql]) => sql);

    expect(upStatements[0]).toContain('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    expect(upStatements.some((sql) => sql.includes('CREATE TABLE "bundle_entity"'))).toBe(true);
    expect(upStatements.some((sql) => sql.includes('CREATE TABLE "collaboration_settlement"'))).toBe(true);
    expect(upStatements.some((sql) => sql.includes('CREATE TABLE "wishlist_item"'))).toBe(true);
    expect(upStatements.some((sql) => sql.includes('CREATE TABLE "experiment_result"'))).toBe(true);

    vi.mocked(queryRunner.query).mockClear();

    await migration.down(queryRunner);
    const downStatements = vi.mocked(queryRunner.query).mock.calls.map(([sql]) => sql);

    expect(downStatements[0]).toContain('DROP INDEX IF EXISTS "idx_experiment_result_experiment_event"');
    expect(downStatements.at(-1)).toContain('DROP TABLE IF EXISTS "bundle_entity"');
  });
});
