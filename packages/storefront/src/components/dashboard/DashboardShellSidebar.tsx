/**
 * Purpose: Template-style creator dashboard sidebar wired to the existing dashboard route set.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 */
import { Chip } from '@heroui/react';
import { Sidebar } from '@heroui-pro/react';
import { Icon } from '../common/Icon';
import type { DashboardSection } from './dashboard-types';
import { DASHBOARD_SECTIONS } from './dashboard-sections';

interface DashboardShellSidebarProps {
  readonly currentSection: DashboardSection;
}

export function DashboardShellSidebar({ currentSection }: DashboardShellSidebarProps) {
  return (
    <>
      <Sidebar>
        <SidebarContents currentSection={currentSection} />
      </Sidebar>
      <Sidebar.Mobile>
        <SidebarContents currentSection={currentSection} idPrefix="mobile-" />
      </Sidebar.Mobile>
    </>
  );
}

function SidebarContents({
  currentSection,
  idPrefix = '',
}: {
  readonly currentSection: DashboardSection;
  readonly idPrefix?: string;
}) {
  return (
    <>
      <Sidebar.Header>
        <div className="space-y-4 px-1 py-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Simket Studio
            </p>
            <h2 className="text-lg font-semibold text-foreground">Creator workspace</h2>
            <p className="text-sm text-muted-foreground">
              Manage your catalog, templates, collaborations, and creator operations from one shell.
            </p>
          </div>
          <Chip variant="soft">Live creator routes</Chip>
        </div>
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Menu aria-label="Creator dashboard sections">
            {DASHBOARD_SECTIONS.map((item) => (
              <Sidebar.MenuItem
                key={item.section}
                href={item.href}
                id={`${idPrefix}${item.section}`}
                isCurrent={item.section === currentSection}
                textValue={item.label}
              >
                <Sidebar.MenuIcon>
                  <Icon name={item.icon} size={18} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
                {item.section === currentSection ? (
                  <Sidebar.MenuChip>
                    <Chip size="sm" variant="soft">
                      Open
                    </Chip>
                  </Sidebar.MenuChip>
                ) : null}
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>

      <Sidebar.Footer>
        <div className="space-y-1 px-1">
          <p className="text-sm font-medium text-foreground">Template shell</p>
          <p className="text-sm text-muted-foreground">
            The provided dashboard template now drives the navigation chrome while Simket keeps its existing routes and data.
          </p>
        </div>
      </Sidebar.Footer>
    </>
  );
}
