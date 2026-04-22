/**
 * Purpose: Dashboard header with section title and breadcrumbs for creator navigation context.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/breadcrumbs
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 */
import { Breadcrumbs, Card } from '@heroui/react';
import type { DashboardSection } from './dashboard-types';
import { getDashboardSectionMeta } from './dashboard-sections';

interface DashboardHeaderProps {
  readonly currentSection: DashboardSection;
}

export function DashboardHeader({ currentSection }: DashboardHeaderProps) {
  const copy = getDashboardSectionMeta(currentSection);

  return (
    <Card className="rounded-[28px] border border-border/70 bg-surface/95">
      <Card.Content className="space-y-3 p-5">
        <Breadcrumbs>
          <Breadcrumbs.Item href="/dashboard">Creator Dashboard</Breadcrumbs.Item>
          {currentSection !== 'home' && <Breadcrumbs.Item>{copy.label}</Breadcrumbs.Item>}
        </Breadcrumbs>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{copy.label}</h1>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
      </Card.Content>
    </Card>
  );
}
