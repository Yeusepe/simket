/**
 * Purpose: Tests for ReportingService — content reporting and moderation logic.
 *
 * Governing docs:
 *   - docs/architecture.md §10 (Trust & Safety)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  ReportReason,
  ReportStatus,
  validateReport,
  isReportActionable,
  getReportPriority,
  canUserReport,
} from './reporting.service.js';

describe('ReportingService', () => {
  describe('validateReport', () => {
    it('accepts valid report', () => {
      const result = validateReport({
        targetType: 'product',
        targetId: 'prod-123',
        reason: ReportReason.COPYRIGHT,
        description: 'This is a stolen model',
        reporterId: 'user-456',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects empty target type', () => {
      const result = validateReport({
        targetType: '',
        targetId: 'prod-123',
        reason: ReportReason.COPYRIGHT,
        description: 'stolen',
        reporterId: 'user-456',
      });
      expect(result.valid).toBe(false);
    });

    it('rejects empty target ID', () => {
      const result = validateReport({
        targetType: 'product',
        targetId: '',
        reason: ReportReason.COPYRIGHT,
        description: 'stolen',
        reporterId: 'user-456',
      });
      expect(result.valid).toBe(false);
    });

    it('rejects empty reporter ID', () => {
      const result = validateReport({
        targetType: 'product',
        targetId: 'prod-123',
        reason: ReportReason.COPYRIGHT,
        description: 'stolen',
        reporterId: '',
      });
      expect(result.valid).toBe(false);
    });

    it('rejects description over 2000 characters', () => {
      const result = validateReport({
        targetType: 'product',
        targetId: 'prod-123',
        reason: ReportReason.COPYRIGHT,
        description: 'x'.repeat(2001),
        reporterId: 'user-456',
      });
      expect(result.valid).toBe(false);
    });

    it('accepts report without description (optional)', () => {
      const result = validateReport({
        targetType: 'product',
        targetId: 'prod-123',
        reason: ReportReason.SPAM,
        reporterId: 'user-456',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('isReportActionable', () => {
    it('returns true for PENDING status', () => {
      expect(isReportActionable(ReportStatus.PENDING)).toBe(true);
    });

    it('returns true for UNDER_REVIEW status', () => {
      expect(isReportActionable(ReportStatus.UNDER_REVIEW)).toBe(true);
    });

    it('returns false for RESOLVED status', () => {
      expect(isReportActionable(ReportStatus.RESOLVED)).toBe(false);
    });

    it('returns false for DISMISSED status', () => {
      expect(isReportActionable(ReportStatus.DISMISSED)).toBe(false);
    });
  });

  describe('getReportPriority', () => {
    it('assigns HIGH priority to copyright reports', () => {
      expect(getReportPriority(ReportReason.COPYRIGHT)).toBe('HIGH');
    });

    it('assigns HIGH priority to illegal content reports', () => {
      expect(getReportPriority(ReportReason.ILLEGAL_CONTENT)).toBe('HIGH');
    });

    it('assigns MEDIUM priority to fraud reports', () => {
      expect(getReportPriority(ReportReason.FRAUD)).toBe('MEDIUM');
    });

    it('assigns MEDIUM priority to harassment reports', () => {
      expect(getReportPriority(ReportReason.HARASSMENT)).toBe('MEDIUM');
    });

    it('assigns LOW priority to spam reports', () => {
      expect(getReportPriority(ReportReason.SPAM)).toBe('LOW');
    });

    it('assigns LOW priority to other reports', () => {
      expect(getReportPriority(ReportReason.OTHER)).toBe('LOW');
    });
  });

  describe('canUserReport', () => {
    it('returns true for authenticated user reporting someone else', () => {
      expect(canUserReport('user-1', 'user-2')).toBe(true);
    });

    it('returns false for user reporting themselves', () => {
      expect(canUserReport('user-1', 'user-1')).toBe(false);
    });

    it('returns false for empty reporter ID', () => {
      expect(canUserReport('', 'user-2')).toBe(false);
    });
  });
});
