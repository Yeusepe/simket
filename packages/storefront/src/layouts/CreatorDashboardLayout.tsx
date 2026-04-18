/**
 * Purpose: Route-aware wrapper that connects creator dashboard UI shell to React Router.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://reactrouter.com/api/hooks/useNavigate
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 */
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import type { DashboardSection } from '../components/dashboard/dashboard-types';

interface CreatorDashboardLayoutProps {
  readonly children: ReactNode;
}

export function CreatorDashboardLayout({ children }: CreatorDashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentSection = getDashboardSection(location.pathname);

  const handleNavigate = (section: DashboardSection) => {
    navigate(getDashboardPath(section));
  };

  return (
    <DashboardLayout currentSection={currentSection} onNavigate={handleNavigate}>
      {children}
    </DashboardLayout>
  );
}

function getDashboardSection(pathname: string): DashboardSection {
  if (pathname.startsWith('/dashboard/products')) {
    return 'products';
  }

  if (pathname.startsWith('/dashboard/licenses')) {
    return 'licenses';
  }

  if (pathname.startsWith('/dashboard/templates')) {
    return 'templates';
  }

  if (pathname.startsWith('/dashboard/collaborations')) {
    return 'collaborations';
  }

  if (pathname.startsWith('/dashboard/flows')) {
    return 'flows';
  }

  if (pathname.startsWith('/dashboard/settings')) {
    return 'settings';
  }

  return 'home';
}

function getDashboardPath(section: DashboardSection): string {
  switch (section) {
    case 'home':
      return '/dashboard';
    case 'products':
      return '/dashboard/products';
    case 'licenses':
      return '/dashboard/licenses';
    case 'templates':
      return '/dashboard/templates';
    case 'collaborations':
      return '/dashboard/collaborations';
    case 'flows':
      return '/dashboard/flows';
    case 'settings':
      return '/dashboard/settings';
  }
}
