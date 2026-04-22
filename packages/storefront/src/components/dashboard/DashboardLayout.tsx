/**
 * Purpose: Template-backed creator dashboard shell that keeps Simket's existing
 *          routes while swapping in the provided HeroUI Pro app-shell pattern.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 */
import type { ReactNode } from 'react';
import { AppLayout } from '@heroui-pro/react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardNavbar } from './DashboardNavbar';
import { DashboardShellSidebar } from './DashboardShellSidebar';
import type { DashboardSection } from './dashboard-types';

interface DashboardLayoutProps {
  readonly currentSection: DashboardSection;
  readonly onNavigate: (section: DashboardSection) => void;
  readonly onNavigateToHref: (href: string) => void;
  readonly children: ReactNode;
}

import { getDashboardSectionMeta } from './dashboard-sections';

export function DashboardLayout({
  currentSection,
  onNavigate,
  onNavigateToHref,
  children,
}: DashboardLayoutProps) {
  const sectionMeta = getDashboardSectionMeta(currentSection);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,var(--simket-accent100),transparent_40%),linear-gradient(180deg,var(--background)_0%,color-mix(in_oklab,var(--background)_84%,var(--simket-neutral100))_100%)]">
      <AppLayout
        className="mx-auto max-w-[1680px]"
        navigate={onNavigateToHref}
        navbar={
          <DashboardNavbar
            title={sectionMeta.navbarTitle}
            onPrimaryAction={() => onNavigate('products')}
          />
        }
        sidebar={<DashboardShellSidebar currentSection={currentSection} />}
        sidebarCollapsible="offcanvas"
        sidebarVariant="floating"
      >
        {currentSection === 'home' ? (
          children
        ) : (
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-10 pt-4">
            <DashboardHeader currentSection={currentSection} />
            {children}
          </div>
        )}
      </AppLayout>
    </div>
  );
}
