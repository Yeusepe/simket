/**
 * Purpose: Verify template picker modal options for blank pages, templates, and page duplication.
 * Governing docs:
 *   - docs/architecture.md (§5 Storefront plugin)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://testing-library.com/docs/react-testing-library/intro/
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/TemplatePicker.test.tsx
 */
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createPageSchema } from '../../../builder';
import { TemplatePicker } from './TemplatePicker';
import type { PageTemplate, TemplatePageSource } from './template-types';

function createTemplate(overrides: Partial<PageTemplate> = {}): PageTemplate {
  return {
    id: overrides.id ?? 'template-1',
    name: overrides.name ?? 'Landing Starter',
    description: overrides.description ?? 'Hero and CTA starter.',
    thumbnail: overrides.thumbnail ?? null,
    category: overrides.category ?? 'landing-page',
    blocks:
      overrides.blocks ??
      createPageSchema({
        blocks: [{ id: 'hero-1', type: 'hero', props: { title: 'Welcome' } }],
      }).blocks,
    isSystem: overrides.isSystem ?? true,
    creatorId: overrides.creatorId ?? null,
    usageCount: overrides.usageCount ?? 5,
    createdAt: overrides.createdAt ?? '2025-02-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2025-02-02T00:00:00.000Z',
  };
}

function createPage(overrides: Partial<TemplatePageSource> = {}): TemplatePageSource {
  return {
    id: overrides.id ?? 'page-1',
    name: overrides.name ?? 'Creator Landing',
    category: overrides.category ?? 'landing-page',
    schema: overrides.schema ?? createPageSchema(),
    updatedAt: overrides.updatedAt ?? '2025-02-02T00:00:00.000Z',
  };
}

describe('TemplatePicker', () => {
  it('starts from scratch and selects saved options from the modal', async () => {
    const user = userEvent.setup();
    const onStartFromScratch = vi.fn();
    const onUseTemplate = vi.fn();
    const onDuplicatePage = vi.fn();

    render(
      <TemplatePicker
        systemTemplates={[createTemplate({ id: 'system-1', name: 'System Template' })]}
        personalTemplates={[createTemplate({ id: 'personal-1', name: 'Saved Template', isSystem: false, creatorId: 'creator-1' })]}
        existingPages={[createPage()]}
        onStartFromScratch={onStartFromScratch}
        onUseTemplate={onUseTemplate}
        onDuplicatePage={onDuplicatePage}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Create Page' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Blank Page' }));
    expect(onStartFromScratch).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Create Page' }));
    await user.click(screen.getByRole('tab', { name: 'Saved Templates' }));
    await user.click(screen.getByRole('button', { name: 'Use Saved Template' }));
    expect(onUseTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'personal-1' }),
    );

    await user.click(screen.getByRole('button', { name: 'Create Page' }));
    await user.click(screen.getByRole('tab', { name: 'Duplicate Page' }));
    await user.click(screen.getByRole('button', { name: 'Duplicate Page' }));
    expect(onDuplicatePage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'page-1' }),
    );
  });
});
