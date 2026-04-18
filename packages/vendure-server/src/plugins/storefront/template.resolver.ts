/**
 * Purpose: Expose storefront template queries and mutations through Vendure's admin GraphQL API.
 * Governing docs:
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership, Storefront plugin)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/api/decorators/transaction.decorator.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/template.resolver.test.ts
 */
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  Allow,
  Ctx,
  Permission,
  Transaction,
  type RequestContext,
} from '@vendure/core';
import { TemplateEntity } from './template.entity.js';
import {
  TemplateService,
  isTemplateCategory,
  isTemplateScope,
  type CreateTemplateFromPageInput,
  type DuplicateTemplateInput,
  type TemplateListFilter,
  type TemplateScope,
} from './template.service.js';
import type { TemplateCategory } from './template.entity.js';

@Resolver()
export class TemplateResolver {
  constructor(private readonly templateService: TemplateService) {}

  @Query()
  @Allow(Permission.Owner)
  templates(
    @Ctx() ctx: RequestContext,
    @Args('category', { nullable: true }) category?: string,
    @Args('scope', { nullable: true }) scope?: string,
    @Args('creatorId', { nullable: true }) creatorId?: string,
    @Args('skip', { nullable: true }) skip?: number,
    @Args('take', { nullable: true }) take?: number,
  ): Promise<TemplateEntity[]> {
    const filter: TemplateListFilter = {
      category: category ? this.parseCategory(category) : undefined,
      scope: scope ? this.parseScope(scope) : undefined,
      creatorId,
      skip,
      take,
    };

    return this.templateService.listTemplates(ctx, filter);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  createTemplateFromPage(
    @Ctx() ctx: RequestContext,
    @Args('pageId') pageId: string,
    @Args('name') name: string,
    @Args('category') category: string,
    @Args('description', { nullable: true }) description?: string,
    @Args('thumbnail', { nullable: true }) thumbnail?: string,
    @Args('creatorId', { nullable: true }) creatorId?: string,
    @Args('isSystem', { nullable: true }) isSystem?: boolean,
  ): Promise<TemplateEntity> {
    const input: CreateTemplateFromPageInput = {
      pageId,
      name,
      description,
      thumbnail,
      category: this.parseCategory(category),
      creatorId,
      isSystem,
    };

    return this.templateService.createTemplateFromPage(ctx, input);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  duplicateTemplate(
    @Ctx() ctx: RequestContext,
    @Args('templateId') templateId: string,
    @Args('creatorId') creatorId: string,
    @Args('name', { nullable: true }) name?: string,
  ): Promise<TemplateEntity> {
    const input: DuplicateTemplateInput = {
      templateId,
      creatorId,
      name,
    };

    return this.templateService.duplicateTemplate(ctx, input);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  deleteTemplate(
    @Ctx() ctx: RequestContext,
    @Args('templateId') templateId: string,
    @Args('creatorId') creatorId: string,
  ): Promise<boolean> {
    return this.templateService.deletePersonalTemplate(ctx, templateId, creatorId);
  }

  private parseCategory(value: string): TemplateCategory {
    const normalized = value.trim().toLowerCase();
    if (!isTemplateCategory(normalized)) {
      throw new Error(`Unsupported template category "${value}"`);
    }

    return normalized;
  }

  private parseScope(value: string): TemplateScope {
    const normalized = value.trim().toLowerCase();
    if (!isTemplateScope(normalized)) {
      throw new Error(`Unsupported template scope "${value}"`);
    }

    return normalized;
  }
}
