/**
 * Purpose: Verify HeroUI v3 modal builder blocks open and close through their trigger actions.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing and change-safety)
 * External references:
 *   - https://heroui.com/docs/react/components/modal.mdx
 * Tests:
 *   - packages/storefront/src/builder/blocks/ModalBlock.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ModalBlock } from './ModalBlock';

describe('ModalBlock', () => {
  it('opens and closes the modal dialog', async () => {
    const user = userEvent.setup();

    render(
      <ModalBlock
        confirmLabel="Got it"
        description="Modal body copy"
        title="Store update"
        triggerLabel="Open modal"
      />,
    );

    await user.click(screen.getByRole('button', { name: /open modal/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Store update')).toBeInTheDocument();
    expect(screen.getByText('Modal body copy')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /got it/i }));

    await waitFor(() => {
      expect(screen.queryByText('Store update')).not.toBeInTheDocument();
    });
  });
});
