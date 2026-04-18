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
import { Breadcrumbs } from '@heroui/react';
import type { DashboardSection } from './dashboard-types';

interface DashboardHeaderProps {
  readonly currentSection: DashboardSection;
}

const SECTION_COPY: Record<DashboardSection, { readonly label: string; readonly description: string }> = {
  home: {
    label: 'Home',
    description: 'Track creator performance, recent activity, and shortcuts.',
  },
  products: {
    label: 'Products',
    description: 'Create, review, and maintain your product catalog.',
  },
  licenses: {
    label: 'Licenses',
    description: 'Manage Keygen-backed policies, issued keys, activations, and customer license lifecycle actions.',
  },
  templates: {
    label: 'Templates',
    description: 'Save reusable page layouts, browse system starters, and duplicate successful page structures.',
  },
  collaborations: {
    label: 'Collaborations',
    description: 'Coordinate revenue sharing and creator partnerships.',
  },
  flows: {
    label: 'Flows',
    description: 'Configure checkout journeys, upsells, and post-sale flows.',
  },
  settings: {
    label: 'Settings',
    description: 'Manage creator profile, storefront preferences, and dashboard defaults.',
  },
};

export function DashboardHeader({ currentSection }: DashboardHeaderProps) {
  const copy = SECTION_COPY[currentSection];

  return (
    <div className="space-y-3">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/dashboard">Creator Dashboard</Breadcrumbs.Item>
        {currentSection !== 'home' && <Breadcrumbs.Item>{copy.label}</Breadcrumbs.Item>}
      </Breadcrumbs>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{copy.label}</h1>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>
    </div>
  );
}
