/**
 * Purpose: Verify active experiment variant loading, auto view tracking, and assignment persistence.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://react.dev/reference/react/useEffect
 * Tests:
 *   - packages/storefront/src/hooks/useExperimentVariant.test.ts
 */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useExperimentVariant, readStoredExperimentAssignment } from './useExperimentVariant';

afterEach(() => {
  window.sessionStorage.clear();
});

describe('useExperimentVariant', () => {
  it('loads a variant, tracks the first view, and stores the assignment', async () => {
    const fetchVariant = vi.fn().mockResolvedValue({
      experimentId: 'exp-1',
      productId: 'product-1',
      variantName: 'variant-b',
      config: {
        ctaText: 'Get instant access',
        description: 'Experiment description',
      },
    });
    const trackEvent = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useExperimentVariant('product-1', {
        userId: 'user-1',
        fetchVariant,
        trackEvent,
      }),
    );

    await waitFor(() => {
      expect(result.current.variant?.variantName).toBe('variant-b');
    });

    expect(trackEvent).toHaveBeenCalledWith({
      experimentId: 'exp-1',
      variantName: 'variant-b',
      productId: 'product-1',
      userId: 'user-1',
      event: 'view',
    });
    expect(readStoredExperimentAssignment('product-1')).toEqual(
      expect.objectContaining({
        experimentId: 'exp-1',
        variantName: 'variant-b',
      }),
    );
  });
});
