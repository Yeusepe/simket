/**
 * Purpose: Verify AB testing experiment lifecycle, deterministic targeting, and conversion aggregation.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://openfeature.dev/docs/reference/concepts/evaluation-context
 *   - https://openfeature.dev/docs/reference/sdks/server/javascript/
 *   - https://openfeature.dev/specification/sections/evaluation-context
 * Tests:
 *   - packages/vendure-server/src/plugins/ab-testing/ab-testing.service.test.ts
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenFeature } from '@openfeature/server-sdk';
import type { TransactionalConnection } from '@vendure/core';
import { ExperimentEntity, ExperimentResultEntity } from './experiment.entity.js';
import { AbTestingService } from './ab-testing.service.js';

class MemoryExperimentRepository {
  private readonly rows = new Map<string, ExperimentEntity>();
  private nextId = 1;

  create(input: Partial<ExperimentEntity>): ExperimentEntity {
    return new ExperimentEntity(input);
  }

  async save(entity: ExperimentEntity): Promise<ExperimentEntity> {
    if (!entity.id) {
      entity.id = `experiment-${this.nextId++}`;
    }

    entity.createdAt = entity.createdAt ?? new Date('2025-03-01T00:00:00.000Z');
    entity.updatedAt = new Date('2025-03-01T00:00:00.000Z');
    this.rows.set(entity.id, cloneExperiment(entity));
    return cloneExperiment(entity);
  }

  async find(): Promise<ExperimentEntity[]> {
    return [...this.rows.values()].map(cloneExperiment);
  }

  async findBy(where: Partial<ExperimentEntity>): Promise<ExperimentEntity[]> {
    return [...this.rows.values()].filter((row) => matchesWhere(row, where)).map(cloneExperiment);
  }

  async findOneBy(where: Partial<ExperimentEntity>): Promise<ExperimentEntity | null> {
    return [...this.rows.values()].find((row) => matchesWhere(row, where)) ?? null;
  }
}

class MemoryResultRepository {
  private readonly rows = new Map<string, ExperimentResultEntity>();
  private nextId = 1;

  create(input: Partial<ExperimentResultEntity>): ExperimentResultEntity {
    return new ExperimentResultEntity(input);
  }

  async save(entity: ExperimentResultEntity): Promise<ExperimentResultEntity> {
    if (!entity.id) {
      entity.id = `result-${this.nextId++}`;
    }

    entity.createdAt = entity.createdAt ?? new Date('2025-03-01T00:00:00.000Z');
    entity.updatedAt = entity.createdAt;
    this.rows.set(entity.id, cloneResult(entity));
    return cloneResult(entity);
  }

  async findBy(where: Partial<ExperimentResultEntity>): Promise<ExperimentResultEntity[]> {
    return [...this.rows.values()].filter((row) => matchesWhere(row, where)).map(cloneResult);
  }

  async find(): Promise<ExperimentResultEntity[]> {
    return [...this.rows.values()].map(cloneResult);
  }
}

function matchesWhere<T extends object>(entity: T, where: Partial<T>): boolean {
  return Object.entries(where).every(([key, value]) => entity[key as keyof T] === value);
}

function cloneExperiment(entity: ExperimentEntity): ExperimentEntity {
  return new ExperimentEntity({
    ...entity,
    variants: structuredClone(entity.variants),
    audienceRules: structuredClone(entity.audienceRules),
    startDate: entity.startDate ? new Date(entity.startDate) : null,
    endDate: entity.endDate ? new Date(entity.endDate) : null,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  });
}

function cloneResult(entity: ExperimentResultEntity): ExperimentResultEntity {
  return new ExperimentResultEntity({
    ...entity,
    metadata: structuredClone(entity.metadata),
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  });
}

function createService() {
  const experiments = new MemoryExperimentRepository();
  const results = new MemoryResultRepository();
  const connection = {
    getRepository: vi.fn().mockImplementation((_ctx, entity) => {
      if (entity === ExperimentEntity) {
        return experiments;
      }

      return results;
    }),
  } as unknown as Pick<TransactionalConnection, 'getRepository'>;

  return {
    service: new AbTestingService(connection),
    experiments,
    results,
  };
}

afterEach(async () => {
  await OpenFeature.close();
});

describe('AbTestingService', () => {
  it('creates a draft experiment and returns deterministic variants for eligible users', async () => {
    const { service } = createService();

    const experiment = await service.createExperiment('creator-1', {
      name: 'CTA headline test',
      description: 'Compare CTA copy for EU customers.',
      productId: 'product-1',
      variants: [
        { name: 'control', weight: 50, config: { ctaText: 'Add to cart' } },
        { name: 'variant-b', weight: 50, config: { ctaText: 'Get instant access' } },
      ],
      audienceRules: {
        mode: 'segment',
        regions: ['eu'],
        minPurchases: 1,
      },
    });

    expect(experiment.status).toBe('draft');

    await service.startExperiment(experiment.id);

    const first = await service.getVariantForUser(experiment.id, 'user-1', {
      targetingKey: 'user-1',
      region: 'eu',
      totalPurchases: 3,
    });
    const second = await service.getVariantForUser(experiment.id, 'user-1', {
      targetingKey: 'user-1',
      region: 'eu',
      totalPurchases: 3,
    });

    expect(first).not.toBeNull();
    expect(first).toEqual(second);
    expect(['control', 'variant-b']).toContain(first?.variantName);
    expect(first?.config).toEqual(
      expect.objectContaining({
        ctaText: expect.any(String),
      }),
    );
  });

  it('returns null for ineligible audiences and after an experiment is stopped', async () => {
    const { service } = createService();

    const experiment = await service.createExperiment('creator-2', {
      name: 'Pricing segmentation',
      variants: [
        { name: 'control', weight: 60, config: { priceDisplay: '$19' } },
        { name: 'variant-b', weight: 40, config: { priceDisplay: '$17' } },
      ],
      audienceRules: {
        mode: 'segment',
        regions: ['us'],
      },
    });

    await service.startExperiment(experiment.id);

    await expect(
      service.getVariantForUser(experiment.id, 'user-2', {
        targetingKey: 'user-2',
        region: 'eu',
      }),
    ).resolves.toBeNull();

    await service.stopExperiment(experiment.id);

    await expect(
      service.getVariantForUser(experiment.id, 'user-2', {
        targetingKey: 'user-2',
        region: 'us',
      }),
    ).resolves.toBeNull();
  });

  it('aggregates impressions, clicks, purchases, and conversion rates by variant', async () => {
    const { service } = createService();

    const experiment = await service.createExperiment('creator-3', {
      name: 'Description experiment',
      variants: [
        { name: 'control', weight: 50, config: { description: 'Short copy' } },
        { name: 'variant-b', weight: 50, config: { description: 'Long copy' } },
      ],
      audienceRules: { mode: 'all-users' },
    });

    await service.startExperiment(experiment.id);

    await service.trackEvent(experiment.id, 'control', 'user-1', 'view');
    await service.trackEvent(experiment.id, 'control', 'user-1', 'click');
    await service.trackEvent(experiment.id, 'control', 'user-1', 'purchase');
    await service.trackEvent(experiment.id, 'variant-b', 'user-2', 'view');
    await service.trackEvent(experiment.id, 'variant-b', 'user-3', 'view');
    await service.trackEvent(experiment.id, 'variant-b', 'user-2', 'click');

    const results = await service.getResults(experiment.id);

    expect(results).toEqual([
      expect.objectContaining({
        variantName: 'control',
        impressions: 1,
        clicks: 1,
        purchases: 1,
        conversionRate: 100,
      }),
      expect.objectContaining({
        variantName: 'variant-b',
        impressions: 2,
        clicks: 1,
        purchases: 0,
        conversionRate: 0,
      }),
    ]);
  });

  it('resolves the active product experiment by preferring product-specific experiments over global ones', async () => {
    const { service } = createService();

    const globalExperiment = await service.createExperiment('creator-4', {
      name: 'Global CTA',
      variants: [{ name: 'global-a', weight: 100, config: { ctaText: 'Buy globally' } }],
      audienceRules: { mode: 'all-users' },
    });
    const productExperiment = await service.createExperiment('creator-4', {
      name: 'Product CTA',
      productId: 'product-99',
      variants: [{ name: 'product-a', weight: 100, config: { ctaText: 'Buy this plugin' } }],
      audienceRules: { mode: 'all-users' },
    });

    await service.startExperiment(globalExperiment.id);
    await service.startExperiment(productExperiment.id);

    const activeVariant = await service.getActiveVariantForProduct('product-99', 'user-44', {
      targetingKey: 'user-44',
    });

    expect(activeVariant).toEqual(
      expect.objectContaining({
        experimentId: productExperiment.id,
        variantName: 'product-a',
        config: { ctaText: 'Buy this plugin' },
      }),
    );
  });
});
