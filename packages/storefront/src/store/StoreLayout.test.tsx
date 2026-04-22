/**
 * Purpose: Verify creator-store layout fetches store data, applies theme variables, and renders either builder pages or the default template.
 * Governing docs:
 *   - docs/architecture.md (§1 storefront, §5 Framely integration)
 *   - docs/service-architecture.md (§1 client features, storefront routing)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing)
 * External references:
 *   - https://reactrouter.com/start/framework/routing
 *   - https://heroui.com/docs/react/components/card
 *   - https://heroui.com/docs/react/components/avatar
 * Tests:
 *   - packages/storefront/src/store/StoreLayout.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { StoreLayout } from './StoreLayout';
import { StorePageRoute } from './StorePageRoute';
import { seededStoreService } from './store-service';
import { useStore } from './use-store';

function StoreConsumer() {
  const { store, hrefs } = useStore();

  return (
    <div>
      <span data-testid="store-consumer-name">{store.creator.displayName}</span>
      <a href={hrefs.product('shader-starter-kit')}>Product link</a>
    </div>
  );
}

function renderStoreRoute(route: string, hostname = 'simket.com') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="store/:creatorSlug" element={<StoreLayout hostname={hostname} storeService={seededStoreService} />}>
          <Route index element={<><StoreConsumer /><StorePageRoute /></>} />
          <Route path=":pageSlug" element={<StorePageRoute />} />
        </Route>
        <Route path="*" element={<Outlet />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StoreLayout', () => {
  it('applies store theme variables and exposes store context', async () => {
    renderStoreRoute('/store/alex-artist');

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Alex Artist' })).toBeInTheDocument();
    });

    expect(screen.getByTestId('store-layout')).toHaveAttribute(
      'style',
      expect.stringContaining('--store-font-family: "CreatorFont", system-ui, sans-serif'),
    );
    expect(screen.getByTestId('store-consumer-name')).toHaveTextContent('Alex Artist');
    expect(screen.getByRole('link', { name: 'Product link' })).toHaveAttribute(
      'href',
      '/store/alex-artist/product/shader-starter-kit',
    );
  });

  it('renders a creator custom page through the builder page renderer', async () => {
    renderStoreRoute('/store/alex-artist/about');

    await waitFor(() => {
      expect(screen.getByTestId('builder-page-renderer')).toBeInTheDocument();
    });

    expect(screen.getByText('Built for realtime launches')).toBeInTheDocument();
  });

  it('falls back to the default store template when no custom pages exist', async () => {
    renderStoreRoute('/store/pixel-lab');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pixel Lab' })).toBeInTheDocument();
    });

    expect(screen.getByText(/No custom landing page yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /FX Matte Pack/ })).toHaveAttribute(
      'href',
      '/store/pixel-lab/product/fx-matte-pack',
    );
  });

  it('shows a store not found page for an unknown creator slug', async () => {
    renderStoreRoute('/store/unknown-creator');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Store not found/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/unknown-creator/i)).toBeInTheDocument();
  });
});
