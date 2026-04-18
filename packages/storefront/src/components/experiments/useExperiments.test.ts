/**
 * Purpose: Verify creator experiment dashboard state transitions and CRUD helpers.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://react.dev/reference/react/useState
 * Tests:
 *   - packages/storefront/src/components/experiments/useExperiments.test.ts
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useExperiments } from './useExperiments';

describe('useExperiments', () => {
  it('creates, starts, and stops experiments', async () => {
    const { result } = renderHook(() => useExperiments());

    let createdId = '';

    await act(async () => {
      const created = await result.current.actions.createExperiment({
        name: 'Hero copy test',
        description: 'Compare two headlines.',
        variants: [
          { name: 'control', weight: 50, config: { headline: 'Sell more' } },
          { name: 'variant-b', weight: 50, config: { headline: 'Launch faster' } },
        ],
        audienceRules: { mode: 'all-users' },
      });

      createdId = created.id;
    });

    expect(result.current.experiments).toHaveLength(1);
    expect(result.current.experiments[0]?.status).toBe('draft');

    await act(async () => {
      await result.current.actions.startExperiment(createdId);
    });

    expect(result.current.experiments[0]?.status).toBe('running');

    await act(async () => {
      await result.current.actions.stopExperiment(createdId);
    });

    expect(result.current.experiments[0]?.status).toBe('completed');
  });
});
