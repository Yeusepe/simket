/**
 * Purpose: Verify HeroUI v3 tables render builder-managed columns, rows, and footer state.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing and change-safety)
 * External references:
 *   - https://heroui.com/docs/react/components/table.mdx
 * Tests:
 *   - packages/storefront/src/builder/blocks/TableBlock.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TableBlock } from './TableBlock';

describe('TableBlock', () => {
  it('renders table headings, rows, and footer text', () => {
    render(
      <TableBlock
        ariaLabel="Pricing table"
        columns={[
          { id: 'pack', label: 'Pack' },
          { id: 'price', label: 'Price' },
        ]}
        rows={[
          { id: 'row-1', cells: ['Starter Pack', '$12'] },
          { id: 'row-2', cells: ['Studio Bundle', '$39'] },
        ]}
      />,
    );

    expect(screen.getByRole('grid', { name: /pricing table/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /pack/i })).toBeInTheDocument();
    expect(screen.getByText('Studio Bundle')).toBeInTheDocument();
    expect(screen.getByText('2 rows')).toBeInTheDocument();
  });
});
