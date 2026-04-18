/**
 * Purpose: Verify storefront template resolver argument parsing and service delegation.
 * Governing docs:
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership, Storefront plugin)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/template.resolver.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import { TemplateResolver } from './template.resolver.js';
import type { TemplateService } from './template.service.js';

describe('TemplateResolver', () => {
  it('delegates list queries with parsed filters', async () => {
    const templateService = {
      listTemplates: vi.fn().mockResolvedValue([]),
      createTemplateFromPage: vi.fn(),
      duplicateTemplate: vi.fn(),
      deletePersonalTemplate: vi.fn(),
    } as unknown as TemplateService;
    const resolver = new TemplateResolver(templateService);
    const ctx = {} as RequestContext;

    await resolver.templates(ctx, 'store-page', 'all', 'creator-1', 5, 10);

    expect((templateService as { listTemplates: ReturnType<typeof vi.fn> }).listTemplates).toHaveBeenCalledWith(
      ctx,
      {
        category: 'store-page',
        scope: 'all',
        creatorId: 'creator-1',
        skip: 5,
        take: 10,
      },
    );
  });

  it('delegates create, duplicate, and delete mutations', async () => {
    const templateService = {
      listTemplates: vi.fn(),
      createTemplateFromPage: vi.fn().mockResolvedValue({ id: 'template-1' }),
      duplicateTemplate: vi.fn().mockResolvedValue({ id: 'template-2' }),
      deletePersonalTemplate: vi.fn().mockResolvedValue(true),
    } as unknown as TemplateService;
    const resolver = new TemplateResolver(templateService);
    const ctx = {} as RequestContext;

    await resolver.createTemplateFromPage(
      ctx,
      'page-1',
      'Landing',
      'landing-page',
      'Builder copy',
      'https://cdn.example.com/thumb.png',
      'creator-1',
      false,
    );
    await resolver.duplicateTemplate(ctx, 'template-1', 'creator-1', 'Landing Copy');
    await resolver.deleteTemplate(ctx, 'template-1', 'creator-1');

    expect(
      (templateService as { createTemplateFromPage: ReturnType<typeof vi.fn> }).createTemplateFromPage,
    ).toHaveBeenCalledWith(ctx, {
      pageId: 'page-1',
      name: 'Landing',
      description: 'Builder copy',
      thumbnail: 'https://cdn.example.com/thumb.png',
      category: 'landing-page',
      creatorId: 'creator-1',
      isSystem: false,
    });
    expect((templateService as { duplicateTemplate: ReturnType<typeof vi.fn> }).duplicateTemplate).toHaveBeenCalledWith(
      ctx,
      {
        templateId: 'template-1',
        creatorId: 'creator-1',
        name: 'Landing Copy',
      },
    );
    expect(
      (templateService as { deletePersonalTemplate: ReturnType<typeof vi.fn> }).deletePersonalTemplate,
    ).toHaveBeenCalledWith(ctx, 'template-1', 'creator-1');
  });

  it('rejects unsupported categories and scopes', async () => {
    const templateService = {
      listTemplates: vi.fn(),
      createTemplateFromPage: vi.fn(),
      duplicateTemplate: vi.fn(),
      deletePersonalTemplate: vi.fn(),
    } as unknown as TemplateService;
    const resolver = new TemplateResolver(templateService);

    expect(() => resolver.templates({} as RequestContext, 'unknown-category')).toThrow(
      /unsupported template category/i,
    );
    expect(() => resolver.templates({} as RequestContext, undefined, 'unknown-scope')).toThrow(
      /unsupported template scope/i,
    );
  });
});
