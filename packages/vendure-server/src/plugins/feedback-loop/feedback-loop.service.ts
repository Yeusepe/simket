/**
 * Purpose: Feedback loop — captures user interaction signals (click, purchase,
 * dismiss, add-to-cart) for the recommendation pipeline.
 *
 * Governing docs:
 *   - docs/architecture.md §8 (Recommendations)
 * External references:
 *   - https://qdrant.tech/documentation/concepts/points/#set-payload
 * Tests:
 *   - packages/vendure-server/src/plugins/feedback-loop/feedback-loop.service.test.ts
 */

export enum FeedbackSignalType {
  CLICK = 'CLICK',
  PURCHASE = 'PURCHASE',
  ADD_TO_CART = 'ADD_TO_CART',
  DISMISS = 'DISMISS',
}

export interface FeedbackSignal {
  readonly userId: string;
  readonly productId: string;
  readonly signalType: FeedbackSignalType;
  readonly timestamp: string;
}

export interface FeedbackValidation {
  readonly valid: boolean;
  readonly errors: string[];
}

export interface FeedbackPayload {
  readonly userId: string;
  readonly productId: string;
  readonly signalType: string;
  readonly weight: number;
  readonly timestamp: string;
}

/** Signal weights — higher = stronger positive signal. */
const SIGNAL_WEIGHTS: Record<FeedbackSignalType, number> = {
  [FeedbackSignalType.PURCHASE]: 1.0,
  [FeedbackSignalType.ADD_TO_CART]: 0.5,
  [FeedbackSignalType.CLICK]: 0.1,
  [FeedbackSignalType.DISMISS]: -0.3,
};

export function validateFeedbackSignal(signal: FeedbackSignal): FeedbackValidation {
  const errors: string[] = [];
  if (!signal.userId) errors.push('userId is required');
  if (!signal.productId) errors.push('productId is required');
  if (!signal.timestamp) errors.push('timestamp is required');
  return { valid: errors.length === 0, errors };
}

export function calculateSignalWeight(signalType: FeedbackSignalType): number {
  return SIGNAL_WEIGHTS[signalType];
}

/**
 * Build a payload suitable for the recommendation service feedback endpoint.
 */
export function buildFeedbackPayload(signal: FeedbackSignal): FeedbackPayload {
  return {
    userId: signal.userId,
    productId: signal.productId,
    signalType: signal.signalType,
    weight: calculateSignalWeight(signal.signalType),
    timestamp: signal.timestamp,
  };
}

/**
 * Deduplicate signals — keep the latest per (userId, productId, signalType).
 */
export function deduplicateSignals(
  signals: readonly FeedbackSignal[],
): FeedbackSignal[] {
  const latest = new Map<string, FeedbackSignal>();

  for (const signal of signals) {
    const key = `${signal.userId}:${signal.productId}:${signal.signalType}`;
    const existing = latest.get(key);
    if (!existing || new Date(signal.timestamp) > new Date(existing.timestamp)) {
      latest.set(key, signal);
    }
  }

  return Array.from(latest.values());
}
