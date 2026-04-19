/**
 * Purpose: Sidebar navigation for creator dashboard sections with active-state highlighting.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardNav.test.tsx
 */
import { Button } from '@heroui/react';
import type { DashboardSection } from './dashboard-types';
import { Icon } from '../common/Icon';
import type { IconName } from '../common/Icon';

interface DashboardNavProps {
  readonly currentSection: DashboardSection;
  readonly onNavigate: (section: DashboardSection) => void;
}

interface DashboardNavItem {
  readonly section: DashboardSection;
  readonly label: string;
  readonly icon: IconName;
}

const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { section: 'home', label: 'Home', icon: 'home' },
  { section: 'products', label: 'Products', icon: 'products' },
  { section: 'licenses', label: 'Licenses', icon: 'licenses' },
  { section: 'templates', label: 'Templates', icon: 'templates' },
  { section: 'collaborations', label: 'Collaborations', icon: 'collaborations' },
  { section: 'flows', label: 'Flows', icon: 'flows' },
  { section: 'settings', label: 'Settings', icon: 'settings' },
];

export function DashboardNav({ currentSection, onNavigate }: DashboardNavProps) {
  return (
    <nav aria-label="Creator dashboard sections" className="flex flex-col gap-2">
      {DASHBOARD_NAV_ITEMS.map((item) => {
        const isActive = item.section === currentSection;

        return (
          <Button
            key={item.section}
            variant={isActive ? 'secondary' : 'ghost'}
            className="justify-start"
            aria-current={isActive ? 'page' : undefined}
            onPress={() => onNavigate(item.section)}
          >
            <span aria-hidden="true" className="w-5 text-center">
              <Icon name={item.icon} size={18} />
            </span>
            <span>{item.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}
