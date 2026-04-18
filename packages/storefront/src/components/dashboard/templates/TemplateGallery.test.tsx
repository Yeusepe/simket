/**
 * Purpose: Verify template gallery filtering, use-template actions, and builder save-as-template submission.
 * Governing docs:
 *   - docs/architecture.md (§5 Storefront plugin)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://testing-library.com/docs/react-testing-library/intro/
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/TemplateGallery.test.tsx
 */
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createPageSchema } from '../../../builder';
import { TemplateGallery } from './TemplateGallery';
import type { PageTemplate } from './template-types';

function createTemplate(overrides: Partial<PageTemplate> = {}): PageTemplate {
  return {
    id: overrides.id ?? 'template-1',
    name: overrides.name ?? 'Landing Starter',
    description: overrides.description ?? 'Hero and CTA starter.',
    thumbnail: overrides.thumbnail ?? 'https://cdn.example.com/template.png',
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

describe('TemplateGallery', () => {
  it('filters templates by category and applies a template', async () => {
    const user = userEvent.setup();
    const onUseTemplate = vi.fn();

    render(
      <TemplateGallery
        templates={[
          createTemplate({ id: 'template-1', category: 'landing-page' }),
          createTemplate({ id: 'template-2', name: 'Product Template', category: 'product-page' }),
        ]}
        onUseTemplate={onUseTemplate}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Product Page' }));
    expect(screen.getByText('Product Template')).toBeInTheDocument();
    expect(screen.queryByText('Landing Starter')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use Template' }));
    expect(onUseTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'template-2' }),
    );
  });

  it('submits save-as-template details and only shows delete on personal templates', async () => {
    const user = userEvent.setup();
    const onSaveAsTemplate = vi.fn().mockResolvedValue(undefined);
    const onDeleteTemplate = vi.fn();

    render(
      <TemplateGallery
        currentPageId="page-1"
        templates={[
          createTemplate({ id: 'system-1', isSystem: true }),
          createTemplate({ id: 'personal-1', isSystem: false, creatorId: 'creator-1', name: 'My Template' }),
        ]}
        onSaveAsTemplate={onSaveAsTemplate}
        onDeleteTemplate={onDeleteTemplate}
      />,
    );

    await user.type(screen.getByLabelText('Template name'), 'Reusable Landing');
    await user.click(screen.getByRole('button', { name: 'Save as Template' }));

    expect(onSaveAsTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Reusable Landing',
        category: 'store-page',
      }),
    );

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons).toHaveLength(1);

    await user.click(deleteButtons[0]!);
    expect(onDeleteTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'personal-1' }),
    );
  });
});
