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
import { Button, Chip } from '@heroui/react';
import type { DashboardSection } from './dashboard-types';
import { useDashboardPreferences } from './dashboard-preferences';
import { Icon } from '../common/Icon';
import type { IconName } from '../common/Icon';

interface DashboardNavProps {
  readonly currentSection: DashboardSection;
  readonly onNavigate: (section: DashboardSection) => void;
}

interface DashboardNavItem {
  readonly section: DashboardSection;
  readonly label: string;
  readonly description: string;
  readonly icon: IconName;
}

const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  { section: 'home', label: 'Home', description: 'Overview and performance', icon: 'home' },
  { section: 'products', label: 'Products', description: 'Catalog and live page slots', icon: 'products' },
  { section: 'licenses', label: 'Licenses', description: 'Keys, policies, and activations', icon: 'licenses' },
  { section: 'templates', label: 'Templates', description: 'Framely store and product surfaces', icon: 'templates' },
  { section: 'collaborations', label: 'Collaborations', description: 'Revenue-sharing workflows', icon: 'collaborations' },
  { section: 'flows', label: 'Flows', description: 'Checkout and post-sale journeys', icon: 'flows' },
  { section: 'settings', label: 'Settings', description: 'Creator profile and defaults', icon: 'settings' },
];

export function DashboardNav({ currentSection, onNavigate }: DashboardNavProps) {
  const { preferences } = useDashboardPreferences();

  return (
    <nav aria-label="Creator dashboard sections" className="flex flex-col gap-2">
      {DASHBOARD_NAV_ITEMS.map((item) => {
        const isActive = item.section === currentSection;

        return (
          <Button
            key={item.section}
            variant={isActive ? 'secondary' : 'ghost'}
            className={`min-h-14 justify-start rounded-2xl ${preferences.density === 'compact' ? 'px-3 py-2' : 'px-4 py-3'}`}
            aria-current={isActive ? 'page' : undefined}
            onPress={() => onNavigate(item.section)}
          >
            <span aria-hidden="true" className="mt-0.5 w-5 shrink-0 text-center">
              <Icon name={item.icon} size={18} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block text-xs text-muted-foreground">{item.description}</span>
            </span>
            {isActive ? (
              <Chip variant="soft" size="sm">
                <Chip.Label>Open</Chip.Label>
              </Chip>
            ) : null}
          </Button>
        );
      })}
    </nav>
  );
}
