/**
 * Purpose: Verify reporting resolver delegation, auth guards, and admin filter forwarding.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/reporting/reporting.resolver.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import { ReportingAdminResolver, ReportingShopResolver } from './reporting.api.js';
import {
  ReportReason,
  ReportStatus,
  type ReportingService,
} from './reporting.service.js';

describe('Reporting resolvers', () => {
  it('delegates report creation and myReports queries for the active user', async () => {
    const reportingService = {
      createReport: vi.fn().mockResolvedValue({ id: 'report-1' }),
      getMyReports: vi.fn().mockResolvedValue([{ id: 'report-1' }]),
      getReports: vi.fn(),
      getReport: vi.fn(),
      getReportStats: vi.fn(),
      updateReportStatus: vi.fn(),
    } as unknown as ReportingService;
    const resolver = new ReportingShopResolver(reportingService);
    const ctx = { activeUserId: 'user-1' } as RequestContext;

    await resolver.createReport(ctx, 'product-1', ReportReason.SPAM, 'Spam listing');
    const result = await resolver.myReports(ctx);

    expect((reportingService as { createReport: ReturnType<typeof vi.fn> }).createReport).toHaveBeenCalledWith(
      ctx,
      'user-1',
      {
        productId: 'product-1',
        reason: ReportReason.SPAM,
        details: 'Spam listing',
      },
    );
    expect((reportingService as { getMyReports: ReturnType<typeof vi.fn> }).getMyReports).toHaveBeenCalledWith(
      ctx,
      'user-1',
    );
    expect(result).toEqual([{ id: 'report-1' }]);
  });

  it('rejects unauthenticated shop reporting access', () => {
    const reportingService = {
      createReport: vi.fn(),
      getMyReports: vi.fn(),
      getReports: vi.fn(),
      getReport: vi.fn(),
      getReportStats: vi.fn(),
      updateReportStatus: vi.fn(),
    } as unknown as ReportingService;
    const resolver = new ReportingShopResolver(reportingService);

    expect(() =>
      resolver.createReport({} as RequestContext, 'product-1', ReportReason.OTHER),
    ).toThrow(/authenticated user/i);
    expect(() => resolver.myReports({} as RequestContext)).toThrow(/authenticated user/i);
  });

  it('delegates admin report queries and status updates', async () => {
    const reportingService = {
      createReport: vi.fn(),
      getMyReports: vi.fn(),
      getReports: vi.fn().mockResolvedValue([]),
      getReport: vi.fn().mockResolvedValue({ id: 'report-1' }),
      getReportStats: vi.fn().mockResolvedValue({ total: 1 }),
      updateReportStatus: vi.fn().mockResolvedValue({ id: 'report-1', status: ReportStatus.RESOLVED }),
    } as unknown as ReportingService;
    const resolver = new ReportingAdminResolver(reportingService);
    const ctx = { activeUserId: 'admin-1' } as RequestContext;

    await resolver.reports(ctx, ReportStatus.PENDING, 'HIGH');
    await resolver.report(ctx, 'report-1');
    await resolver.reportStats(ctx);
    await resolver.updateReportStatus(ctx, 'report-1', ReportStatus.RESOLVED, 'Reviewed');

    expect((reportingService as { getReports: ReturnType<typeof vi.fn> }).getReports).toHaveBeenCalledWith(
      ctx,
      { status: ReportStatus.PENDING, priority: 'HIGH' },
    );
    expect((reportingService as { getReport: ReturnType<typeof vi.fn> }).getReport).toHaveBeenCalledWith(
      ctx,
      'report-1',
    );
    expect((reportingService as { getReportStats: ReturnType<typeof vi.fn> }).getReportStats).toHaveBeenCalledWith(
      ctx,
    );
    expect((reportingService as { updateReportStatus: ReturnType<typeof vi.fn> }).updateReportStatus).toHaveBeenCalledWith(
      ctx,
      'report-1',
      ReportStatus.RESOLVED,
      'Reviewed',
      'admin-1',
    );
  });
});
