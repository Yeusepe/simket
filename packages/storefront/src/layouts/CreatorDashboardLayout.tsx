import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';

const navItems = [
  { label: 'Home', path: '/dashboard' },
  { label: 'Products', path: '/dashboard/products' },
  { label: 'Collaborations', path: '/dashboard/collaborations' },
  { label: 'Flows', path: '/dashboard/flows' },
] as const;

interface CreatorDashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard shell with sidebar navigation.
 */
export function CreatorDashboardLayout({ children }: CreatorDashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0">
        <h2 className="mb-4 text-lg font-bold">Creator Dashboard</h2>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? 'secondary' : 'ghost'}
                className="justify-start"
                onPress={() => navigate(item.path)}
              >
                {item.label}
              </Button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
