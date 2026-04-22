/**
 * Purpose: Template-inspired dashboard top navbar with quick actions and mobile navigation toggles.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 */
import { Button } from '@heroui/react';
import { AppLayout, Navbar, Sidebar } from '@heroui-pro/react';
import { Icon } from '../common/Icon';

interface DashboardNavbarProps {
  readonly title: string;
  readonly onPrimaryAction: () => void;
}

export function DashboardNavbar({ title, onPrimaryAction }: DashboardNavbarProps) {
  return (
    <Navbar maxWidth="full">
      <Navbar.Header>
        <AppLayout.MenuToggle aria-label="Toggle creator dashboard navigation" />
        <Sidebar.Trigger aria-label="Open creator dashboard navigation" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Simket Studio
          </p>
          <h1 className="truncate text-xl font-semibold text-foreground">{title}</h1>
        </div>
        <Navbar.Spacer />
        <div className="flex items-center gap-2">
          <Button isIconOnly aria-label="Search dashboard" size="sm" variant="ghost">
            <Icon name="search" size={18} />
          </Button>
          <Button isIconOnly aria-label="View notifications" size="sm" variant="ghost">
            <Icon name="notifications" size={18} />
          </Button>
          <Button size="sm" onPress={onPrimaryAction}>
            <Icon name="plus" size={18} />
            <span className="hidden sm:inline">New product</span>
          </Button>
        </div>
      </Navbar.Header>
    </Navbar>
  );
}
