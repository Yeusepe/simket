/**
 * Purpose: Responsive creator dashboard shell with sidebar navigation, mobile drawer, and top header.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/button
 *   - https://www.heroui.com/docs/react/components/drawer
 *   - https://www.heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 */
import type { ReactNode } from 'react';
import { Button, Card, Drawer, useOverlayState } from '@heroui/react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardNav } from './DashboardNav';
import type { DashboardSection } from './dashboard-types';
import { Icon } from '../common/Icon';

interface DashboardLayoutProps {
  readonly currentSection: DashboardSection;
  readonly onNavigate: (section: DashboardSection) => void;
  readonly children: ReactNode;
}

export function DashboardLayout({
  currentSection,
  onNavigate,
  children,
}: DashboardLayoutProps) {
  const navigationDrawer = useOverlayState();

  const handleNavigate = (section: DashboardSection) => {
    onNavigate(section);
    navigationDrawer.close();
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl gap-6 px-4 py-6">
      <Card className="sticky top-20 hidden h-fit w-72 shrink-0 lg:block">
          <Card.Header className="space-y-1">
          <Card.Title>Creator Dashboard</Card.Title>
          <Card.Description>Manage products, licenses, collaborations, flows, and creator settings.</Card.Description>
        </Card.Header>
        <Card.Content>
          <DashboardNav currentSection={currentSection} onNavigate={handleNavigate} />
        </Card.Content>
      </Card>

      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex items-start gap-3">
          <Drawer state={navigationDrawer}>
            <Drawer.Trigger>
              <Button
                variant="ghost"
                className="lg:hidden"
                aria-label="Open dashboard navigation"
              >
                <Icon name="menu" size={20} />
              </Button>
            </Drawer.Trigger>
            <Drawer.Backdrop className="lg:hidden">
              <Drawer.Content placement="left" className="lg:hidden">
                <Drawer.Dialog aria-label="Creator dashboard navigation" className="max-w-xs">
                  <Drawer.Header className="items-center justify-between gap-3">
                    <Drawer.Heading>Creator Dashboard</Drawer.Heading>
                    <Drawer.CloseTrigger aria-label="Close dashboard navigation">
                      <Icon name="close" size={18} />
                    </Drawer.CloseTrigger>
                  </Drawer.Header>
                  <Drawer.Body>
                    <DashboardNav currentSection={currentSection} onNavigate={handleNavigate} />
                  </Drawer.Body>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </Drawer>
          <div className="min-w-0 flex-1">
            <DashboardHeader currentSection={currentSection} />
          </div>
        </div>

        <main>{children}</main>
      </div>
    </div>
  );
}
