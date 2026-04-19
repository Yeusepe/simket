/**
 * Purpose: Pure functions for content reporting and moderation.
 *
 * Handles: report validation, priority assignment, status checks,
 * and user eligibility. IO-free for testability.
 *
 * Governing docs:
 *   - docs/architecture.md §10 (Trust & Safety)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 * Tests:
 *   - packages/vendure-server/src/plugins/reporting/reporting.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { RequestContext, TransactionalConnection } from '@vendure/core';
import { ProductService } from '@vendure/core';
import { ReportEntity } from './reporting.entity.js';

/** Reasons for reporting content. */
export enum ReportReason {
  COPYRIGHT = 'COPYRIGHT',
  ILLEGAL_CONTENT = 'ILLEGAL_CONTENT',
  FRAUD = 'FRAUD',
  HARASSMENT = 'HARASSMENT',
  SPAM = 'SPAM',
  MISLEADING = 'MISLEADING',
  OTHER = 'OTHER',
}

/** Report lifecycle states. */
export enum ReportStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

/** Priority levels for triage. */
export type ReportPriority = 'HIGH' | 'MEDIUM' | 'LOW';

const MAX_DESCRIPTION_LENGTH = 2000;

interface ReportInput {
  targetType: string;
  targetId: string;
  reason: ReportReason;
  description?: string;
  reporterId: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ReportRepository {
  create(input: Partial<ReportEntity>): ReportEntity;
  save(entity: ReportEntity): Promise<ReportEntity>;
  find(options?: {
    readonly where?: Partial<ReportEntity>;
    readonly order?: {
      readonly createdAt?: 'ASC' | 'DESC';
      readonly id?: 'ASC' | 'DESC';
    };
  }): Promise<ReportEntity[]>;
  findOneBy(where: Partial<ReportEntity>): Promise<ReportEntity | null>;
}

type ProductLike = NonNullable<Awaited<ReturnType<ProductService['findOne']>>>;

export interface CreateReportInput {
  readonly productId: string;
  readonly reason: ReportReason;
  readonly details?: string;
}

export interface ReportListFilters {
  readonly status?: ReportStatus;
  readonly priority?: ReportPriority;
}

export interface ReportStats {
  readonly total: number;
  readonly pending: number;
  readonly underReview: number;
  readonly resolved: number;
  readonly dismissed: number;
  readonly highPriority: number;
  readonly mediumPriority: number;
  readonly lowPriority: number;
}

const tracer = trace.getTracer('simket-reporting');

/**
 * Validate a report submission.
 */
export function validateReport(input: ReportInput): ValidationResult {
  const errors: string[] = [];

  if (!input.targetType || input.targetType.trim().length === 0) {
    errors.push('Target type is required');
  }
  if (!input.targetId || input.targetId.trim().length === 0) {
    errors.push('Target ID is required');
  }
  if (!input.reporterId || input.reporterId.trim().length === 0) {
    errors.push('Reporter ID is required');
  }
  if (input.description && input.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if a report in the given status can still be acted upon.
 */
export function isReportActionable(status: ReportStatus): boolean {
  return status === ReportStatus.PENDING || status === ReportStatus.UNDER_REVIEW;
}

/**
 * Assign priority based on report reason for triage.
 *
 * - HIGH: Copyright, illegal content (legal risk)
 * - MEDIUM: Fraud, harassment (user safety)
 * - LOW: Spam, misleading, other
 */
export function getReportPriority(reason: ReportReason): ReportPriority {
  switch (reason) {
    case ReportReason.COPYRIGHT:
    case ReportReason.ILLEGAL_CONTENT:
      return 'HIGH';
    case ReportReason.FRAUD:
    case ReportReason.HARASSMENT:
      return 'MEDIUM';
    case ReportReason.SPAM:
    case ReportReason.MISLEADING:
    case ReportReason.OTHER:
    default:
      return 'LOW';
  }
}

/**
 * Check if a user is eligible to submit a report.
 * Users cannot report themselves.
 */
export function canUserReport(reporterId: string, targetOwnerId: string): boolean {
  if (!reporterId || reporterId.trim().length === 0) return false;
  return reporterId !== targetOwnerId;
}

function normalizeId(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`Report ${fieldName} is required.`);
  }

  return normalized;
}

function orderReports(reports: readonly ReportEntity[]): ReportEntity[] {
  return [...reports].sort((left, right) => {
    const createdAtDelta = right.createdAt.getTime() - left.createdAt.getTime();
    if (createdAtDelta !== 0) {
      return createdAtDelta;
    }

    return right.id.localeCompare(left.id);
  });
}

@Injectable()
export class ReportingService {
  constructor(
    private readonly connection: Pick<TransactionalConnection, 'getRepository'>,
    private readonly productService: ProductService,
  ) {}

  async createReport(
    ctx: RequestContext,
    reporterId: string,
    input: CreateReportInput,
  ): Promise<ReportEntity> {
    return tracer.startActiveSpan('reporting.create', async (span) => {
      try {
        const normalizedReporterId = normalizeId(reporterId, 'reporterId');
        const normalizedProductId = normalizeId(input.productId, 'productId');
        const validation = validateReport({
          targetType: 'product',
          targetId: normalizedProductId,
          reason: input.reason,
          description: input.details,
          reporterId: normalizedReporterId,
        });
        if (!validation.valid) {
          throw new Error(validation.errors.join('; '));
        }

        await this.requireProduct(ctx, normalizedProductId);
        span.setAttribute('report.product_id', normalizedProductId);
        span.setAttribute('report.reporter_id', normalizedReporterId);
        span.setAttribute('report.reason', input.reason);

        return await this.getRepository(ctx).save(this.getRepository(ctx).create({
          productId: normalizedProductId,
          reporterId: normalizedReporterId,
          reason: input.reason,
          priority: getReportPriority(input.reason),
          status: ReportStatus.PENDING,
          details: input.details?.trim() || null,
          adminNotes: null,
          resolvedBy: null,
          resolvedAt: null,
        }));
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getMyReports(ctx: RequestContext, reporterId: string): Promise<ReportEntity[]> {
    return orderReports(await this.getRepository(ctx).find({
      where: { reporterId: normalizeId(reporterId, 'reporterId') },
      order: { createdAt: 'DESC', id: 'DESC' },
    }));
  }

  async getReports(ctx: RequestContext, filters: ReportListFilters = {}): Promise<ReportEntity[]> {
    const reports = await this.getRepository(ctx).find({
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return orderReports(reports.filter((report) => {
      const matchesStatus = !filters.status || report.status === filters.status;
      const matchesPriority = !filters.priority || report.priority === filters.priority;
      return matchesStatus && matchesPriority;
    }));
  }

  async getReport(ctx: RequestContext, id: string): Promise<ReportEntity | null> {
    return this.getRepository(ctx).findOneBy({ id: normalizeId(id, 'id') });
  }

  async updateReportStatus(
    ctx: RequestContext,
    id: string,
    status: ReportStatus,
    adminNotes?: string,
    actedBy?: string,
  ): Promise<ReportEntity> {
    const report = await this.getRepository(ctx).findOneBy({ id: normalizeId(id, 'id') });
    if (!report) {
      throw new Error(`Report "${id}" was not found.`);
    }

    report.status = status;
    report.adminNotes = adminNotes?.trim() || null;
    if (status === ReportStatus.RESOLVED || status === ReportStatus.DISMISSED) {
      report.resolvedBy = actedBy?.trim() || null;
      report.resolvedAt = new Date();
    } else {
      report.resolvedBy = null;
      report.resolvedAt = null;
    }

    return this.getRepository(ctx).save(report);
  }

  async getReportStats(ctx: RequestContext): Promise<ReportStats> {
    const reports = await this.getRepository(ctx).find({
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return reports.reduce<ReportStats>((stats, report) => ({
      total: stats.total + 1,
      pending: stats.pending + (report.status === ReportStatus.PENDING ? 1 : 0),
      underReview: stats.underReview + (report.status === ReportStatus.UNDER_REVIEW ? 1 : 0),
      resolved: stats.resolved + (report.status === ReportStatus.RESOLVED ? 1 : 0),
      dismissed: stats.dismissed + (report.status === ReportStatus.DISMISSED ? 1 : 0),
      highPriority: stats.highPriority + (report.priority === 'HIGH' ? 1 : 0),
      mediumPriority: stats.mediumPriority + (report.priority === 'MEDIUM' ? 1 : 0),
      lowPriority: stats.lowPriority + (report.priority === 'LOW' ? 1 : 0),
    }), {
      total: 0,
      pending: 0,
      underReview: 0,
      resolved: 0,
      dismissed: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
    });
  }

  private getRepository(ctx: RequestContext): ReportRepository {
    return this.connection.getRepository(ctx, ReportEntity) as unknown as ReportRepository;
  }

  private async requireProduct(ctx: RequestContext, productId: string): Promise<ProductLike> {
    const product = await this.productService.findOne(ctx, productId);
    if (!product) {
      throw new Error(`Product "${productId}" could not be found for reporting.`);
    }

    return product;
  }
}
