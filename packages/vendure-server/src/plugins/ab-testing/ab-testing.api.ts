/**
 * Purpose: Expose AB testing admin management and storefront evaluation GraphQL operations.
 * Governing docs:
 *   - docs/service-architecture.md
 *   - docs/architecture.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - https://openfeature.dev/docs/reference/concepts/evaluation-context
 * Tests:
 *   - packages/vendure-server/src/plugins/ab-testing/ab-testing.service.test.ts
 */
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { gql } from 'graphql-tag';
import {
  Allow,
  Ctx,
  Permission,
  Transaction,
  type RequestContext,
} from '@vendure/core';
import { AbTestingService, type CreateExperimentInput } from './ab-testing.service.js';
import { isExperimentEvent } from './experiment.entity.js';

export const abTestingAdminApiExtensions = gql`
  type Experiment implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    description: String
    productId: String
    creatorId: String!
    status: String!
    variants: JSON!
    audienceRules: JSON!
    startDate: DateTime
    endDate: DateTime
  }

  type ExperimentVariantAssignment {
    experimentId: ID!
    productId: String
    variantName: String!
    config: JSON!
  }

  type ExperimentVariantMetrics {
    variantName: String!
    impressions: Int!
    clicks: Int!
    purchases: Int!
    conversionRate: Float!
  }

  extend type Query {
    experiment(id: String!): Experiment
    experiments(creatorId: String): [Experiment!]!
    experimentResults(id: String!): [ExperimentVariantMetrics!]!
  }

  extend type Mutation {
    createExperiment(
      name: String!
      description: String
      productId: String
      variants: JSON!
      audienceRules: JSON
      startDate: DateTime
      endDate: DateTime
    ): Experiment!
    startExperiment(id: String!): Experiment!
    stopExperiment(id: String!): Experiment!
  }
`;

export const abTestingShopApiExtensions = gql`
  type ExperimentVariantAssignment {
    experimentId: ID!
    productId: String
    variantName: String!
    config: JSON!
  }

  extend type Query {
    activeExperimentVariant(productId: String!): ExperimentVariantAssignment
  }

  extend type Mutation {
    trackEvent(
      experimentId: String!
      variantName: String!
      event: String!
      metadata: JSON
    ): Boolean!
  }
`;

function coerceCreateInput(args: {
  readonly name: string;
  readonly description?: string;
  readonly productId?: string;
  readonly variants: unknown;
  readonly audienceRules?: unknown;
  readonly startDate?: Date;
  readonly endDate?: Date;
}): CreateExperimentInput {
  if (!Array.isArray(args.variants)) {
    throw new Error('Experiment variants must be an array.');
  }

  return {
    name: args.name,
    description: args.description,
    productId: args.productId,
    variants: args.variants as CreateExperimentInput['variants'],
    audienceRules: (args.audienceRules ?? { mode: 'all-users' }) as CreateExperimentInput['audienceRules'],
    startDate: args.startDate,
    endDate: args.endDate,
  };
}

@Resolver()
export class AbTestingAdminResolver {
  constructor(private readonly abTestingService: AbTestingService) {}

  @Query()
  @Allow(Permission.Owner)
  experiment(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    return this.abTestingService.getExperiment(id, ctx);
  }

  @Query()
  @Allow(Permission.Owner)
  experiments(@Ctx() ctx: RequestContext, @Args('creatorId', { nullable: true }) creatorId?: string) {
    return this.abTestingService.listExperiments(
      creatorId ?? this.requireActiveUserId(ctx),
      ctx,
    );
  }

  @Query()
  @Allow(Permission.Owner)
  experimentResults(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    return this.abTestingService.getResults(id, ctx);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  createExperiment(
    @Ctx() ctx: RequestContext,
    @Args('name') name: string,
    @Args('variants') variants: unknown,
    @Args('description', { nullable: true }) description?: string,
    @Args('productId', { nullable: true }) productId?: string,
    @Args('audienceRules', { nullable: true }) audienceRules?: unknown,
    @Args('startDate', { nullable: true }) startDate?: Date,
    @Args('endDate', { nullable: true }) endDate?: Date,
  ) {
    return this.abTestingService.createExperiment(
      this.requireActiveUserId(ctx),
      coerceCreateInput({
        name,
        description,
        productId,
        variants,
        audienceRules,
        startDate,
        endDate,
      }),
      ctx,
    );
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  startExperiment(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    return this.abTestingService.startExperiment(id, ctx);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  stopExperiment(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    return this.abTestingService.stopExperiment(id, ctx);
  }

  private requireActiveUserId(ctx: RequestContext): string {
    if (!ctx.activeUserId) {
      throw new Error('Experiment management requires an authenticated creator.');
    }

    return String(ctx.activeUserId);
  }
}

@Resolver()
export class AbTestingShopResolver {
  constructor(private readonly abTestingService: AbTestingService) {}

  @Query()
  activeExperimentVariant(@Ctx() ctx: RequestContext, @Args('productId') productId: string) {
    const activeUserId = ctx.activeUserId ? String(ctx.activeUserId) : 'anonymous';
    return this.abTestingService.getActiveVariantForProduct(
      productId,
      activeUserId,
      {
        targetingKey: activeUserId,
        languageCode: String(ctx.languageCode),
      },
      ctx,
    );
  }

  @Mutation()
  @Transaction()
  async trackEvent(
    @Ctx() ctx: RequestContext,
    @Args('experimentId') experimentId: string,
    @Args('variantName') variantName: string,
    @Args('event') event: string,
    @Args('metadata', { nullable: true }) metadata?: unknown,
  ): Promise<boolean> {
    if (!isExperimentEvent(event)) {
      throw new Error(`Unsupported experiment event "${event}".`);
    }

    const activeUserId = ctx.activeUserId ? String(ctx.activeUserId) : 'anonymous';
    await this.abTestingService.trackEvent(
      experimentId,
      variantName,
      activeUserId,
      event,
      (metadata ?? undefined) as Record<string, unknown> | undefined,
      ctx,
    );
    return true;
  }
}
