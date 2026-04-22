/**
 * Purpose: Dashboard-home toolbar adapted from the provided template for route shortcuts and timeframe controls.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/tabs
 *   - https://www.heroui.com/docs/react/components/dropdown
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardHome.test.tsx
 */
import { useState } from 'react';
import { Button, ButtonGroup, Dropdown, Label, Tabs } from '@heroui/react';
import { Icon } from '../common/Icon';

interface DashboardToolbarProps {
  readonly onNavigate?: (href: string) => void;
}

const HOME_TABS = [
  { id: 'overview', label: 'Overview', href: '/dashboard' },
  { id: 'catalog', label: 'Catalog', href: '/dashboard/products' },
  { id: 'operations', label: 'Operations', href: '/dashboard/collaborations' },
] as const;

const PERIOD_OPTIONS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
] as const;

export function DashboardToolbar({ onNavigate }: DashboardToolbarProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<(typeof PERIOD_OPTIONS)[number]['id']>('monthly');

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs
        selectedKey="overview"
        onSelectionChange={(key) => {
          const matchingTab = HOME_TABS.find((tab) => tab.id === key);
          if (matchingTab) {
            onNavigate?.(matchingTab.href);
          }
        }}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Dashboard tabs">
            {HOME_TABS.map((tab) => (
              <Tabs.Tab key={tab.id} id={tab.id}>
                {tab.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <Button isIconOnly aria-label="Refresh dashboard" size="sm" variant="ghost">
          <Icon name="arrow-right" size={18} className="-rotate-45" />
        </Button>
        <ButtonGroup size="sm" variant="ghost">
          <Button>
            <Icon name="settings" size={16} />
            <span className="capitalize">{selectedPeriod}</span>
          </Button>
          <Dropdown>
            <Button isIconOnly aria-label="Choose dashboard timeframe" size="sm" variant="ghost">
              <Icon name="arrow-down" size={16} />
            </Button>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu
                aria-label="Dashboard timeframe options"
                onAction={(key) => setSelectedPeriod(String(key) as (typeof PERIOD_OPTIONS)[number]['id'])}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <Dropdown.Item key={option.id} id={option.id} textValue={option.label}>
                    <Label>{option.label}</Label>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </ButtonGroup>
        <Button size="sm" variant="secondary" onPress={() => onNavigate?.('/dashboard/templates')}>
          View templates
        </Button>
      </div>
    </div>
  );
}
