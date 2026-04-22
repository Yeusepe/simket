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
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

const useAuthMock = vi.fn();

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../components/today', () => ({
  TodaySection: () => (
    <section aria-label="Today's picks">
      <h2>Today</h2>
      <p>Mock Today section</p>
    </section>
  ),
}));

describe('HomePage', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({
      session: null,
    });
  });

  function renderHomePage() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('renders the Today section', () => {
    renderHomePage();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders the Discover section', () => {
    renderHomePage();
    expect(screen.getByText('Discover')).toBeInTheDocument();
  });

  it('renders the Today section component', () => {
    renderHomePage();
    expect(screen.getByText('Mock Today section')).toBeInTheDocument();
  });

  it('renders a public welcome section for signed-out visitors', () => {
    renderHomePage();

    expect(screen.getByRole('heading', { name: 'Discover creator-made digital goods' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in to your account' })).toHaveAttribute('href', '/sign-in');
  });

  it('hides the public welcome section for signed-in visitors', () => {
    useAuthMock.mockReturnValue({
      session: {
        user: {
          id: 'buyer-1',
          email: 'buyer@simket.test',
          name: 'Simket Buyer',
        },
        session: {
          id: 'session-1',
        },
      },
    });

    renderHomePage();

    expect(screen.queryByRole('heading', { name: 'Discover creator-made digital goods' })).not.toBeInTheDocument();
  });
});
