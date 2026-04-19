/**
 * Purpose: Expose shop and admin GraphQL operations for moderation reporting workflows.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/api/decorators/request-context.decorator.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/reporting/reporting.resolver.test.ts
 */
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  Allow,
  Ctx,
  Permission,
  Transaction,
  type RequestContext,
} from '@vendure/core';
import { gql } from 'graphql-tag';
import {
  type ReportPriority,
  ReportReason,
  ReportStatus,
  type ReportStats,
  ReportingService,
} from './reporting.service.js';

export const reportingShopApiExtensions = gql`
  enum ReportReason {
    COPYRIGHT
    ILLEGAL_CONTENT
    FRAUD
    HARASSMENT
    SPAM
    MISLEADING
    OTHER
  }

  enum ReportStatus {
    PENDING
    UNDER_REVIEW
    RESOLVED
    DISMISSED
  }

  enum ReportPriority {
    HIGH
    MEDIUM
    LOW
  }

  type ContentReport implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    productId: ID!
    reporterId: String!
    reason: ReportReason!
    priority: ReportPriority!
    status: ReportStatus!
    details: String
    adminNotes: String
    resolvedBy: String
    resolvedAt: DateTime
  }

  extend type Query {
    myReports: [ContentReport!]!
  }

  extend type Mutation {
    createReport(productId: ID!, reason: ReportReason!, details: String): ContentReport!
  }
`;

export const reportingAdminApiExtensions = gql`
  enum ReportReason {
    COPYRIGHT
    ILLEGAL_CONTENT
    FRAUD
    HARASSMENT
    SPAM
    MISLEADING
    OTHER
  }

  enum ReportStatus {
    PENDING
    UNDER_REVIEW
    RESOLVED
    DISMISSED
  }

  enum ReportPriority {
    HIGH
    MEDIUM
    LOW
  }

  type ContentReport implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    productId: ID!
    reporterId: String!
    reason: ReportReason!
    priority: ReportPriority!
    status: ReportStatus!
    details: String
    adminNotes: String
    resolvedBy: String
    resolvedAt: DateTime
  }

  type ReportStats {
    total: Int!
    pending: Int!
    underReview: Int!
    resolved: Int!
    dismissed: Int!
    highPriority: Int!
    mediumPriority: Int!
    lowPriority: Int!
  }

  extend type Query {
    reports(status: ReportStatus, priority: ReportPriority): [ContentReport!]!
    report(id: ID!): ContentReport
    reportStats: ReportStats!
  }

  extend type Mutation {
    updateReportStatus(id: ID!, status: ReportStatus!, adminNotes: String): ContentReport!
  }
`;

@Resolver()
export class ReportingShopResolver {
  constructor(private readonly reportingService: ReportingService) {}

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  createReport(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
    @Args('reason') reason: ReportReason,
    @Args('details', { nullable: true }) details?: string,
  ) {
    return this.reportingService.createReport(ctx, this.requireActiveUserId(ctx), {
      productId: String(productId),
      reason,
      details,
    });
  }

  @Query()
  @Allow(Permission.Owner)
  myReports(@Ctx() ctx: RequestContext) {
    return this.reportingService.getMyReports(ctx, this.requireActiveUserId(ctx));
  }

  private requireActiveUserId(ctx: RequestContext): string {
    if (!ctx.activeUserId) {
      throw new Error('Reporting requires an authenticated user.');
    }

    return String(ctx.activeUserId);
  }
}

@Resolver()
export class ReportingAdminResolver {
  constructor(private readonly reportingService: ReportingService) {}

  @Query()
  @Allow(Permission.SuperAdmin)
  reports(
    @Ctx() ctx: RequestContext,
    @Args('status', { nullable: true }) status?: ReportStatus,
    @Args('priority', { nullable: true }) priority?: ReportPriority,
  ) {
    return this.reportingService.getReports(ctx, { status, priority });
  }

  @Query()
  @Allow(Permission.SuperAdmin)
  report(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    return this.reportingService.getReport(ctx, String(id));
  }

  @Query()
  @Allow(Permission.SuperAdmin)
  reportStats(@Ctx() ctx: RequestContext): Promise<ReportStats> {
    return this.reportingService.getReportStats(ctx);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.SuperAdmin)
  updateReportStatus(
    @Ctx() ctx: RequestContext,
    @Args('id') id: string,
    @Args('status') status: ReportStatus,
    @Args('adminNotes', { nullable: true }) adminNotes?: string,
  ) {
    return this.reportingService.updateReportStatus(
      ctx,
      String(id),
      status,
      adminNotes,
      ctx.activeUserId ? String(ctx.activeUserId) : 'superadmin',
    );
  }
}
