/**
 * Purpose: Verify main router integration mounts creator stores for both /store paths and creator subdomains.
 * Governing docs:
 *   - docs/architecture.md (§1 storefront, §5 Framely integration)
 *   - docs/service-architecture.md (§1 client features)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing)
 * External references:
 *   - https://reactrouter.com/api/data-routers/createMemoryRouter
 * Tests:
 *   - packages/storefront/src/App.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App';

function renderRoutes(route: string, hostname = 'simket.com') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes hostname={hostname} />
    </MemoryRouter>,
  );
}

describe('AppRoutes', () => {
  it('renders the creator-store homepage for /store path routes', async () => {
    renderRoutes('/store/alex-artist');

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Alex Artist' })).toBeInTheDocument();
    });
  });

  it('renders store-scoped product detail routes on creator subdomains', async () => {
    renderRoutes('/product/shader-starter-kit', 'alex-artist.simket.com');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Shader Starter Kit' }),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Alex Artist' })).toBeInTheDocument();
  });
});
