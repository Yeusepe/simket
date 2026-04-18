/**
 * Purpose: Manage creator AB experiments using OpenFeature targeting context and deterministic variant assignment.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://openfeature.dev/docs/reference/concepts/evaluation-context
 *   - https://openfeature.dev/docs/reference/sdks/server/javascript/
 *   - https://openfeature.dev/specification/sections/evaluation-context
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/
 * Tests:
 *   - packages/vendure-server/src/plugins/ab-testing/ab-testing.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import {
  OpenFeature,
  type EvaluationContext,
  InMemoryProvider,
  type JsonValue,
} from '@openfeature/server-sdk';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { RequestContext, TransactionalConnection } from '@vendure/core';
import { createHash } from 'node:crypto';
import {
  ExperimentEntity,
  ExperimentResultEntity,
  type ExperimentAudienceRules,
  type ExperimentEvent,
  type ExperimentStatus,
  type ExperimentVariantDefinition,
} from './experiment.entity.js';

const tracer = trace.getTracer('simket-ab-testing');
const OPENFEATURE_DOMAIN = 'ab-testing';

export interface CreateExperimentInput {
  readonly name: string;
  readonly description?: string;
  readonly productId?: string | null;
  readonly variants: readonly ExperimentVariantDefinition[];
  readonly audienceRules?: ExperimentAudienceRules;
  readonly startDate?: Date | null;
  readonly endDate?: Date | null;
}

export interface ExperimentVariantAssignment {
  readonly experimentId: string;
  readonly productId: string | null;
  readonly variantName: string;
  readonly config: Record<string, JsonValue>;
  readonly [key: string]: JsonValue;
}

export interface ExperimentVariantMetrics {
  readonly variantName: string;
  readonly impressions: number;
  readonly clicks: number;
  readonly purchases: number;
  readonly conversionRate: number;
}

interface ExperimentRepository {
  create(input: Partial<ExperimentEntity>): ExperimentEntity;
  save(entity: ExperimentEntity): Promise<ExperimentEntity>;
  find(): Promise<ExperimentEntity[]>;
  findBy(where: Partial<ExperimentEntity>): Promise<ExperimentEntity[]>;
  findOneBy(where: Partial<ExperimentEntity>): Promise<ExperimentEntity | null>;
}

interface ExperimentResultRepository {
  create(input: Partial<ExperimentResultEntity>): ExperimentResultEntity;
  save(entity: ExperimentResultEntity): Promise<ExperimentResultEntity>;
  find(): Promise<ExperimentResultEntity[]>;
  findBy(where: Partial<ExperimentResultEntity>): Promise<ExperimentResultEntity[]>;
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeAudienceRules(
  rules: ExperimentAudienceRules | null | undefined,
): ExperimentAudienceRules {
  const normalizedRegions = rules?.regions
    ?.map((region) => region.trim().toLowerCase())
    .filter(Boolean);
  const normalizedProducts = rules?.purchasedProductIds
    ?.map((productId) => productId.trim())
    .filter(Boolean);

  return {
    mode: rules?.mode ?? 'all-users',
    regions: normalizedRegions?.length ? normalizedRegions : undefined,
    minPurchases:
      typeof rules?.minPurchases === 'number' && Number.isFinite(rules.minPurchases)
        ? rules.minPurchases
        : undefined,
    maxPurchases:
      typeof rules?.maxPurchases === 'number' && Number.isFinite(rules.maxPurchases)
        ? rules.maxPurchases
        : undefined,
    purchasedProductIds: normalizedProducts?.length ? normalizedProducts : undefined,
  };
}

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toJsonValue(entry));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toJsonValue(entry)]),
    );
  }

  return String(value);
}

function toJsonRecord(value: Record<string, unknown>): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, toJsonValue(entry)]),
  );
}

export function normalizeVariants(
  variants: readonly ExperimentVariantDefinition[],
): ExperimentVariantDefinition[] {
  if (variants.length === 0) {
    throw new Error('Experiments require at least one variant.');
  }

  const normalized = variants.map((variant) => ({
    name: variant.name.trim(),
    weight: Number(variant.weight),
    config: variant.config ?? {},
  }));

  if (normalized.some((variant) => variant.name.length === 0)) {
    throw new Error('Every experiment variant requires a name.');
  }

  if (new Set(normalized.map((variant) => variant.name)).size !== normalized.length) {
    throw new Error('Experiment variant names must be unique.');
  }

  if (
    normalized.some(
      (variant) => !Number.isFinite(variant.weight) || variant.weight <= 0,
    )
  ) {
    throw new Error('Experiment variant weights must be positive finite numbers.');
  }

  return normalized;
}

export function matchesAudienceRules(
  rules: ExperimentAudienceRules | undefined,
  context: EvaluationContext,
): boolean {
  const normalizedRules = normalizeAudienceRules(rules);
  if (normalizedRules.mode === 'all-users') {
    return true;
  }

  if (normalizedRules.regions?.length) {
    const region = typeof context.region === 'string' ? context.region.trim().toLowerCase() : '';
    if (!normalizedRules.regions.includes(region)) {
      return false;
    }
  }

  const totalPurchases =
    typeof context.totalPurchases === 'number' && Number.isFinite(context.totalPurchases)
      ? context.totalPurchases
      : 0;

  if (
    typeof normalizedRules.minPurchases === 'number' &&
    totalPurchases < normalizedRules.minPurchases
  ) {
    return false;
  }

  if (
    typeof normalizedRules.maxPurchases === 'number' &&
    totalPurchases > normalizedRules.maxPurchases
  ) {
    return false;
  }

  if (normalizedRules.purchasedProductIds?.length) {
    const purchasedProductIds = Array.isArray(context.purchasedProductIds)
      ? context.purchasedProductIds.map((value) => String(value))
      : [];
    if (!normalizedRules.purchasedProductIds.every((productId) => purchasedProductIds.includes(productId))) {
      return false;
    }
  }

  return true;
}

export function computeDeterministicVariant(
  variants: readonly ExperimentVariantDefinition[],
  targetingKey: string,
): string {
  const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
  const digest = createHash('sha256').update(targetingKey).digest('hex').slice(0, 12);
  const bucket = Number.parseInt(digest, 16) % totalWeight;
  let running = 0;

  for (const variant of variants) {
    running += variant.weight;
    if (bucket < running) {
      return variant.name;
    }
  }

  return variants[variants.length - 1]!.name;
}

export function isExperimentActive(
  experiment: Pick<ExperimentEntity, 'status' | 'startDate' | 'endDate'>,
  now = new Date(),
): boolean {
  return (
    experiment.status === 'running' &&
    (!experiment.startDate || experiment.startDate <= now) &&
    (!experiment.endDate || experiment.endDate >= now)
  );
}

function toFlagKey(experimentId: string): string {
  return `experiment:${experimentId}`;
}

@Injectable()
export class AbTestingService {
  private readonly provider = new InMemoryProvider({});
  private providerReadyPromise: Promise<void> | null = null;

  constructor(private readonly connection: Pick<TransactionalConnection, 'getRepository'>) {}

  async createExperiment(
    creatorId: string,
    input: CreateExperimentInput,
    ctx?: RequestContext,
  ): Promise<ExperimentEntity> {
    return tracer.startActiveSpan('ab-tests.create', async (span) => {
      try {
        const variants = normalizeVariants(input.variants);
        const experiment = this.getExperimentRepository(ctx).create({
          name: input.name.trim(),
          description: normalizeText(input.description),
          productId: normalizeText(input.productId ?? null),
          creatorId: creatorId.trim(),
          status: 'draft',
          variants,
          audienceRules: normalizeAudienceRules(input.audienceRules),
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
        });

        span.setAttribute('experiment.creator_id', creatorId);
        span.setAttribute('experiment.variant_count', variants.length);
        return await this.getExperimentRepository(ctx).save(experiment);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async startExperiment(id: string, ctx?: RequestContext): Promise<ExperimentEntity> {
    return this.updateExperimentStatus(id, 'running', ctx);
  }

  async stopExperiment(id: string, ctx?: RequestContext): Promise<ExperimentEntity> {
    return this.updateExperimentStatus(id, 'completed', ctx);
  }

  async getExperiment(id: string, ctx?: RequestContext): Promise<ExperimentEntity | null> {
    return this.getExperimentRepository(ctx).findOneBy({ id });
  }

  async listExperiments(creatorId: string, ctx?: RequestContext): Promise<ExperimentEntity[]> {
    return tracer.startActiveSpan('ab-tests.list', async (span) => {
      try {
        span.setAttribute('experiment.creator_id', creatorId);
        return await this.getExperimentRepository(ctx).findBy({ creatorId });
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getVariantForUser(
    experimentId: string,
    userId: string,
    context: EvaluationContext = {},
    ctx?: RequestContext,
  ): Promise<ExperimentVariantAssignment | null> {
    return tracer.startActiveSpan('ab-tests.getVariant', async (span) => {
      try {
        span.setAttribute('experiment.id', experimentId);
        span.setAttribute('experiment.user_id', userId);

        const experiment = await this.getRequiredExperiment(experimentId, ctx);
        if (!isExperimentActive(experiment)) {
          return null;
        }

        await this.syncProviderConfiguration(ctx);
        await this.ensureProviderReady();

        const client = OpenFeature.getClient(OPENFEATURE_DOMAIN);
        const details = await client.getObjectDetails<ExperimentVariantAssignment | null>(
          toFlagKey(experimentId),
          null,
          {
            ...context,
            targetingKey:
              typeof context.targetingKey === 'string' && context.targetingKey.trim().length > 0
                ? context.targetingKey
                : userId,
          },
        );

        return details.value;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getActiveVariantForProduct(
    productId: string,
    userId: string,
    context: EvaluationContext = {},
    ctx?: RequestContext,
  ): Promise<ExperimentVariantAssignment | null> {
    return tracer.startActiveSpan('ab-tests.getActiveVariantForProduct', async (span) => {
      try {
        span.setAttribute('experiment.product_id', productId);
        span.setAttribute('experiment.user_id', userId);

        const experiments = (await this.getExperimentRepository(ctx).find())
          .filter((experiment) => isExperimentActive(experiment))
          .filter((experiment) => experiment.productId === productId || experiment.productId === null)
          .sort((left, right) => {
            if (left.productId !== right.productId) {
              return left.productId === productId ? -1 : 1;
            }

            return left.createdAt.getTime() - right.createdAt.getTime();
          });

        for (const experiment of experiments) {
          const assignment = await this.getVariantForUser(
            experiment.id,
            userId,
            {
              ...context,
              targetingKey:
                typeof context.targetingKey === 'string' && context.targetingKey.trim().length > 0
                  ? context.targetingKey
                  : userId,
            },
            ctx,
          );

          if (assignment) {
            return assignment;
          }
        }

        return null;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async trackEvent(
    experimentId: string,
    variantName: string,
    userId: string,
    event: ExperimentEvent,
    metadata?: Record<string, unknown>,
    ctx?: RequestContext,
  ): Promise<ExperimentResultEntity> {
    return tracer.startActiveSpan('ab-tests.trackEvent', async (span) => {
      try {
        span.setAttribute('experiment.id', experimentId);
        span.setAttribute('experiment.variant', variantName);
        span.setAttribute('experiment.event', event);

        const result = this.getResultRepository(ctx).create({
          experimentId,
          variantName,
          userId,
          event,
          metadata: metadata ?? null,
        });

        return await this.getResultRepository(ctx).save(result);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getResults(
    experimentId: string,
    ctx?: RequestContext,
  ): Promise<ExperimentVariantMetrics[]> {
    return tracer.startActiveSpan('ab-tests.getResults', async (span) => {
      try {
        span.setAttribute('experiment.id', experimentId);

        const experiment = await this.getRequiredExperiment(experimentId, ctx);
        const resultRows = await this.getResultRepository(ctx).findBy({ experimentId });

        return experiment.variants.map((variant) => {
          const rows = resultRows.filter((row) => row.variantName === variant.name);
          const impressions = rows.filter((row) => row.event === 'view').length;
          const clicks = rows.filter((row) => row.event === 'click').length;
          const purchases = rows.filter((row) => row.event === 'purchase').length;

          return {
            variantName: variant.name,
            impressions,
            clicks,
            purchases,
            conversionRate:
              impressions === 0
                ? 0
                : Number(((purchases / impressions) * 100).toFixed(1)),
          };
        });
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async updateExperimentStatus(
    id: string,
    status: ExperimentStatus,
    ctx?: RequestContext,
  ): Promise<ExperimentEntity> {
    return tracer.startActiveSpan('ab-tests.updateStatus', async (span) => {
      try {
        span.setAttribute('experiment.id', id);
        span.setAttribute('experiment.status', status);

        const experiment = await this.getRequiredExperiment(id, ctx);
        experiment.status = status;
        const saved = await this.getExperimentRepository(ctx).save(experiment);
        await this.syncProviderConfiguration(ctx);
        return saved;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async syncProviderConfiguration(ctx?: RequestContext): Promise<void> {
    const experiments = await this.getExperimentRepository(ctx).find();
    const activeExperiments = experiments.filter((experiment) => isExperimentActive(experiment));
    this.provider.putConfiguration(
      Object.fromEntries(
        activeExperiments.map((experiment) => [
          toFlagKey(experiment.id),
          {
            variants: Object.fromEntries(
              experiment.variants.map((variant) => [
                variant.name,
                {
                  experimentId: experiment.id,
                  productId: experiment.productId,
                  variantName: variant.name,
                  config: toJsonRecord(variant.config),
                } satisfies ExperimentVariantAssignment,
              ]),
            ),
            defaultVariant: experiment.variants[0]!.name,
            disabled: false,
            contextEvaluator: (evaluationContext: EvaluationContext) => {
              if (!matchesAudienceRules(experiment.audienceRules, evaluationContext)) {
                return '__ineligible__';
              }

              const targetingKey =
                typeof evaluationContext.targetingKey === 'string' &&
                evaluationContext.targetingKey.trim().length > 0
                  ? evaluationContext.targetingKey
                  : `anonymous:${experiment.id}`;

              return computeDeterministicVariant(experiment.variants, targetingKey);
            },
          },
        ]),
      ),
    );
  }

  private async ensureProviderReady(): Promise<void> {
    if (!this.providerReadyPromise) {
      this.providerReadyPromise = OpenFeature.setProviderAndWait(OPENFEATURE_DOMAIN, this.provider);
    }

    await this.providerReadyPromise;
  }

  private async getRequiredExperiment(
    id: string,
    ctx?: RequestContext,
  ): Promise<ExperimentEntity> {
    const experiment = await this.getExperimentRepository(ctx).findOneBy({ id });
    if (!experiment) {
      throw new Error(`Experiment "${id}" does not exist.`);
    }

    return experiment;
  }

  private getExperimentRepository(ctx?: RequestContext): ExperimentRepository {
    return this.connection.getRepository(ctx, ExperimentEntity) as ExperimentRepository;
  }

  private getResultRepository(ctx?: RequestContext): ExperimentResultRepository {
    return this.connection.getRepository(ctx, ExperimentResultEntity) as ExperimentResultRepository;
  }
}
