/**
 * Purpose: Tests for FeedbackLoopService — user interaction signals for recommendations.
 *
 * Governing docs:
 *   - docs/architecture.md §8 (Recommendations)
 * External references:
 *   - https://qdrant.tech/documentation/concepts/points/#set-payload
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  FeedbackSignalType,
  validateFeedbackSignal,
  calculateSignalWeight,
  buildFeedbackPayload,
  deduplicateSignals,
  type FeedbackSignal,
} from './feedback-loop.service.js';

describe('FeedbackLoopService', () => {
  describe('validateFeedbackSignal', () => {
    it('accepts valid click signal', () => {
      const signal: FeedbackSignal = {
        userId: 'user-1',
        productId: 'prod-1',
        signalType: FeedbackSignalType.CLICK,
        timestamp: '2025-01-15T10:00:00Z',
      };
      expect(validateFeedbackSignal(signal).valid).toBe(true);
    });

    it('accepts valid purchase signal', () => {
      const signal: FeedbackSignal = {
        userId: 'user-1',
        productId: 'prod-1',
        signalType: FeedbackSignalType.PURCHASE,
        timestamp: '2025-01-15T10:00:00Z',
      };
      expect(validateFeedbackSignal(signal).valid).toBe(true);
    });

    it('rejects missing userId', () => {
      const signal: FeedbackSignal = {
        userId: '',
        productId: 'prod-1',
        signalType: FeedbackSignalType.CLICK,
        timestamp: '2025-01-15T10:00:00Z',
      };
      expect(validateFeedbackSignal(signal).valid).toBe(false);
    });

    it('rejects missing productId', () => {
      const signal: FeedbackSignal = {
        userId: 'user-1',
        productId: '',
        signalType: FeedbackSignalType.CLICK,
        timestamp: '2025-01-15T10:00:00Z',
      };
      expect(validateFeedbackSignal(signal).valid).toBe(false);
    });

    it('rejects missing timestamp', () => {
      const signal: FeedbackSignal = {
        userId: 'user-1',
        productId: 'prod-1',
        signalType: FeedbackSignalType.CLICK,
        timestamp: '',
      };
      expect(validateFeedbackSignal(signal).valid).toBe(false);
    });
  });

  describe('calculateSignalWeight', () => {
    it('gives highest weight to purchase', () => {
      expect(calculateSignalWeight(FeedbackSignalType.PURCHASE)).toBe(1.0);
    });

    it('gives medium weight to add_to_cart', () => {
      expect(calculateSignalWeight(FeedbackSignalType.ADD_TO_CART)).toBe(0.5);
    });

    it('gives low weight to click', () => {
      expect(calculateSignalWeight(FeedbackSignalType.CLICK)).toBe(0.1);
    });

    it('gives negative weight to dismiss', () => {
      expect(calculateSignalWeight(FeedbackSignalType.DISMISS)).toBe(-0.3);
    });
  });

  describe('buildFeedbackPayload', () => {
    it('builds payload for recommendation service', () => {
      const signal: FeedbackSignal = {
        userId: 'user-1',
        productId: 'prod-1',
        signalType: FeedbackSignalType.PURCHASE,
        timestamp: '2025-01-15T10:00:00Z',
      };
      const payload = buildFeedbackPayload(signal);
      expect(payload.userId).toBe('user-1');
      expect(payload.productId).toBe('prod-1');
      expect(payload.weight).toBe(1.0);
      expect(payload.signalType).toBe('PURCHASE');
    });
  });

  describe('deduplicateSignals', () => {
    it('keeps the latest signal per user+product+type', () => {
      const signals: FeedbackSignal[] = [
        { userId: 'u1', productId: 'p1', signalType: FeedbackSignalType.CLICK, timestamp: '2025-01-01T00:00:00Z' },
        { userId: 'u1', productId: 'p1', signalType: FeedbackSignalType.CLICK, timestamp: '2025-01-02T00:00:00Z' },
        { userId: 'u1', productId: 'p2', signalType: FeedbackSignalType.CLICK, timestamp: '2025-01-01T00:00:00Z' },
      ];
      const deduped = deduplicateSignals(signals);
      expect(deduped).toHaveLength(2);
      // The one for p1 should be the later one
      const p1Signal = deduped.find((s) => s.productId === 'p1');
      expect(p1Signal?.timestamp).toBe('2025-01-02T00:00:00Z');
    });

    it('handles empty array', () => {
      expect(deduplicateSignals([])).toHaveLength(0);
    });
  });
});
