/**
 * Purpose: Regression tests for the creator dashboard layout shell.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/drawer
 *   - https://www.heroui.com/docs/react/components/breadcrumbs
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardLayout } from './DashboardLayout';

describe('DashboardLayout', () => {
  it('renders navigation, header, and main content', () => {
    render(
      <DashboardLayout
        currentSection="products"
        onNavigate={vi.fn()}
      >
        <div>Products content</div>
      </DashboardLayout>,
    );

    expect(screen.getByRole('navigation', { name: 'Creator dashboard sections' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument();
    expect(screen.getByText('Products content')).toBeInTheDocument();
    expect(screen.getAllByText('Creator Dashboard')).toHaveLength(2);
  });
});
