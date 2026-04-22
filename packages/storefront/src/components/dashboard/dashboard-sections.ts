/**
 * Purpose: Shared creator dashboard route metadata for shell navigation and section headers.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 *   - packages/storefront/src/components/dashboard/DashboardNav.test.tsx
 */
import type { IconName } from '../common/Icon';
import type { DashboardSection } from './dashboard-types';

export interface DashboardSectionMeta {
  readonly section: DashboardSection;
  readonly label: string;
  readonly description: string;
  readonly href: string;
  readonly icon: IconName;
  readonly navbarTitle: string;
}

export const DASHBOARD_SECTIONS: readonly DashboardSectionMeta[] = [
  {
    section: 'home',
    label: 'Dashboard',
    description: 'Track creator performance, recent activity, and shortcuts.',
    href: '/dashboard',
    icon: 'home',
    navbarTitle: 'Creator dashboard',
  },
  {
    section: 'products',
    label: 'Products',
    description: 'Create, review, and maintain your product catalog.',
    href: '/dashboard/products',
    icon: 'products',
    navbarTitle: 'Products',
  },
  {
    section: 'licenses',
    label: 'Licenses',
    description: 'Manage Keygen-backed policies, issued keys, activations, and customer license lifecycle actions.',
    href: '/dashboard/licenses',
    icon: 'licenses',
    navbarTitle: 'Licenses',
  },
  {
    section: 'templates',
    label: 'Templates',
    description: 'Save reusable page layouts, browse system starters, and duplicate successful page structures.',
    href: '/dashboard/templates',
    icon: 'templates',
    navbarTitle: 'Templates',
  },
  {
    section: 'collaborations',
    label: 'Collaborations',
    description: 'Coordinate revenue sharing and creator partnerships.',
    href: '/dashboard/collaborations',
    icon: 'collaborations',
    navbarTitle: 'Collaborations',
  },
  {
    section: 'flows',
    label: 'Flows',
    description: 'Configure checkout journeys, upsells, and post-sale flows.',
    href: '/dashboard/flows',
    icon: 'flows',
    navbarTitle: 'Flows',
  },
  {
    section: 'settings',
    label: 'Settings',
    description: 'Manage creator profile, storefront preferences, and dashboard defaults.',
    href: '/dashboard/settings',
    icon: 'settings',
    navbarTitle: 'Settings',
  },
] as const;

const DASHBOARD_SECTION_BY_KEY = DASHBOARD_SECTIONS.reduce(
  (accumulator, section) => {
    accumulator[section.section] = section;
    return accumulator;
  },
  {} as Record<DashboardSection, DashboardSectionMeta>,
);

export function getDashboardSectionMeta(section: DashboardSection): DashboardSectionMeta {
  return DASHBOARD_SECTION_BY_KEY[section];
}

export function getDashboardPath(section: DashboardSection): string {
  return getDashboardSectionMeta(section).href;
}
