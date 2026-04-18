/**
 * Purpose: Verify the home page renders the Today experience and the discovery
 * section shell.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/pages/HomePage.test.tsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

vi.mock('../components/today', () => ({
  TodaySection: () => (
    <section aria-label="Today's picks">
      <h2>Today</h2>
      <p>Mock Today section</p>
    </section>
  ),
}));

describe('HomePage', () => {
  it('renders the Today section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders the Discover section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Discover')).toBeInTheDocument();
  });

  it('renders the Today section component', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Mock Today section')).toBeInTheDocument();
  });
});
