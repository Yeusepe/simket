/**
 * Purpose: Verify creator experiment list rendering and status badges.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/badge
 * Tests:
 *   - packages/storefront/src/components/experiments/ExperimentList.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExperimentList } from './ExperimentList';

describe('ExperimentList', () => {
  it('renders experiment summaries and status badges', () => {
    render(
      <ExperimentList
        experiments={[
          {
            id: 'exp-1',
            name: 'Pricing copy',
            description: 'Test CTA copy.',
            productId: 'product-1',
            creatorId: 'creator-1',
            status: 'running',
            variants: [
              { name: 'control', weight: 50, config: {} },
              { name: 'variant-b', weight: 50, config: {} },
            ],
            audienceRules: { mode: 'all-users' },
            createdAt: '2025-03-01T00:00:00.000Z',
          },
          {
            id: 'exp-2',
            name: 'Description length',
            description: '',
            productId: null,
            creatorId: 'creator-1',
            status: 'draft',
            variants: [{ name: 'control', weight: 100, config: {} }],
            audienceRules: { mode: 'segment', regions: ['eu'] },
            createdAt: '2025-03-02T00:00:00.000Z',
          },
        ]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Pricing copy')).toBeInTheDocument();
    expect(screen.getByText('Description length')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('2 variants')).toBeInTheDocument();
    expect(screen.getByText('Global audience')).toBeInTheDocument();
  });
});
