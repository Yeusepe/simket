import { Routes, Route } from 'react-router-dom';
import { CreatorDashboardLayout } from '../layouts/CreatorDashboardLayout';
import { DashboardHomePage } from './dashboard/DashboardHomePage';
import { DashboardProductsPage } from './dashboard/DashboardProductsPage';
import { DashboardCollaborationsPage } from './dashboard/DashboardCollaborationsPage';
import { DashboardFlowsPage } from './dashboard/DashboardFlowsPage';

/**
 * Creator Dashboard — nested routes for Home, Products, Collaborations, Flows.
 */
export function CreatorDashboardPage() {
  return (
    <CreatorDashboardLayout>
      <Routes>
        <Route index element={<DashboardHomePage />} />
        <Route path="products" element={<DashboardProductsPage />} />
        <Route path="collaborations" element={<DashboardCollaborationsPage />} />
        <Route path="flows" element={<DashboardFlowsPage />} />
      </Routes>
    </CreatorDashboardLayout>
  );
}
