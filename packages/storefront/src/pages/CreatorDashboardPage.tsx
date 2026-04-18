import { Routes, Route } from 'react-router-dom';
import { CreatorDashboardLayout } from '../layouts/CreatorDashboardLayout';
import { DashboardHomePage } from './dashboard/DashboardHomePage';
import { DashboardLicensesPage } from './dashboard/DashboardLicensesPage';
import { DashboardProductsPage } from './dashboard/DashboardProductsPage';
import { DashboardTemplatesPage } from './dashboard/DashboardTemplatesPage';
import { DashboardCollaborationsPage } from './dashboard/DashboardCollaborationsPage';
import { DashboardFlowsPage } from './dashboard/DashboardFlowsPage';
import { DashboardSettingsPage } from './dashboard/DashboardSettingsPage';

/**
 * Purpose: Nested creator dashboard routes for overview, products, collaborations, flows, and settings.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://reactrouter.com/start/declarative/routing
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 */
export function CreatorDashboardPage() {
  return (
    <CreatorDashboardLayout>
      <Routes>
        <Route index element={<DashboardHomePage />} />
        <Route path="products" element={<DashboardProductsPage />} />
        <Route path="licenses" element={<DashboardLicensesPage />} />
        <Route path="templates" element={<DashboardTemplatesPage />} />
        <Route path="collaborations" element={<DashboardCollaborationsPage />} />
        <Route path="flows" element={<DashboardFlowsPage />} />
        <Route path="settings" element={<DashboardSettingsPage />} />
      </Routes>
    </CreatorDashboardLayout>
  );
}
