/**
 * Purpose: Verify HeroUI v3 tabs render and switch content inside builder blocks.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing and change-safety)
 * External references:
 *   - https://heroui.com/docs/react/components/tabs.mdx
 * Tests:
 *   - packages/storefront/src/builder/blocks/TabsBlock.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TabsBlock } from './TabsBlock';

describe('TabsBlock', () => {
  it('renders tabs and switches the active panel', async () => {
    const user = userEvent.setup();

    render(
      <TabsBlock
        defaultSelectedKey="overview"
        items={[
          { id: 'overview', label: 'Overview', content: 'Overview content' },
          { id: 'releases', label: 'Releases', content: 'Release notes content' },
        ]}
      />,
    );

    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByText('Overview content')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /releases/i }));

    expect(screen.getByText('Release notes content')).toBeInTheDocument();
  });
});
