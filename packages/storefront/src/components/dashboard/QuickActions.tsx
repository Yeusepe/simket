/**
 * Purpose: Quick-action button grid for common creator dashboard workflows.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/dashboard/QuickActions.test.tsx
 */
import { Button, Card } from '@heroui/react';
import type { QuickAction } from './dashboard-types';
import { Icon } from '../common/Icon';
import type { IconName } from '../common/Icon';

interface QuickActionsProps {
  readonly actions: readonly QuickAction[];
  readonly onNavigate?: (href: string) => void;
}

const ACTION_ICON_MAP: Record<string, IconName> = {
  plus: 'plus',
  chart: 'chart',
  collaboration: 'collaborations',
  edit: 'edit',
};

export function QuickActions({ actions, onNavigate }: QuickActionsProps) {
  return (
    <Card className="h-full">
      <Card.Header className="space-y-1">
        <Card.Title>Quick Actions</Card.Title>
        <Card.Description>Jump straight into your most common creator tasks.</Card.Description>
      </Card.Header>
      <Card.Content className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            className="justify-start"
            onPress={() => onNavigate?.(action.href)}
          >
            <span aria-hidden="true" className="w-5 text-center">
              <Icon name={ACTION_ICON_MAP[action.icon] ?? 'plus'} size={18} />
            </span>
            <span>{action.label}</span>
          </Button>
        ))}
      </Card.Content>
    </Card>
  );
}
