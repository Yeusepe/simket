/**
 * Purpose: Persist, duplicate, filter, and delete storefront page templates for builder-driven page creation.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, Storefront plugin)
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/domain-model.md (§1 Core records, Storefront Template)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/connection/transactional-connection.d.ts
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/template.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { TransactionalConnection, type RequestContext } from '@vendure/core';
import { StorePageEntity } from './storefront.entity.js';
import {
  TemplateEntity,
  type TemplateBlock,
  type TemplateBlocksDocument,
  type TemplateCategory,
} from './template.entity.js';

export type TemplateScope = 'all' | 'system' | 'personal';

interface TemplateRepository {
  create(input: Partial<TemplateEntity>): TemplateEntity;
  save(entity: TemplateEntity): Promise<TemplateEntity>;
  find(): Promise<TemplateEntity[]>;
  findOneBy(where: Partial<TemplateEntity>): Promise<TemplateEntity | null>;
  remove(entity: TemplateEntity): Promise<TemplateEntity>;
}

interface StorePageRepository {
  findOneBy(where: Partial<StorePageEntity>): Promise<StorePageEntity | null>;
}

export interface TemplateListFilter {
  readonly category?: TemplateCategory;
  readonly scope?: TemplateScope;
  readonly creatorId?: string;
  readonly skip?: number;
  readonly take?: number;
}

export interface CreateTemplateFromPageInput {
  readonly pageId: string;
  readonly name: string;
  readonly description?: string;
  readonly thumbnail?: string;
  readonly category: TemplateCategory;
  readonly creatorId?: string;
  readonly isSystem?: boolean;
}

export interface DuplicateTemplateInput {
  readonly templateId: string;
  readonly creatorId: string;
  readonly name?: string;
}

const tracer = trace.getTracer('simket-storefront-templates');

export function isTemplateCategory(value: string): value is TemplateCategory {
  return value === 'store-page' || value === 'product-page' || value === 'landing-page';
}

export function isTemplateScope(value: string): value is TemplateScope {
  return value === 'all' || value === 'system' || value === 'personal';
}

export function normalizeTemplateName(name: string): string {
  const normalized = name.trim();
  if (normalized.length === 0) {
    throw new Error('Template name is required.');
  }

  return normalized;
}

export function createDuplicateTemplateName(name: string): string {
  return `${normalizeTemplateName(name)} Copy`;
}

export function cloneTemplateBlocks(blocks: TemplateBlocksDocument): TemplateBlocksDocument {
  return JSON.parse(JSON.stringify(blocks)) as TemplateBlocksDocument;
}

export function extractTemplateBlocks(content: string): TemplateBlocksDocument {
  const parsed = JSON.parse(content) as unknown;

  if (Array.isArray(parsed) && parsed.every(isTemplateBlock)) {
    return cloneTemplateBlocks(parsed);
  }

  if (isRecord(parsed) && Array.isArray(parsed.blocks) && parsed.blocks.every(isTemplateBlock)) {
    return cloneTemplateBlocks(parsed.blocks);
  }

  throw new Error('Store page content must include a top-level "blocks" array.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTemplateBlock(value: unknown): value is TemplateBlock {
  return isRecord(value);
}

function normalizeOptionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeCreatorId(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function requireCreatorId(value: string | undefined, message: string): string {
  const creatorId = normalizeCreatorId(value);
  if (!creatorId) {
    throw new Error(message);
  }

  return creatorId;
}

function sortTemplates(templates: readonly TemplateEntity[]): TemplateEntity[] {
  return [...templates].sort((left, right) => {
    if (left.isSystem !== right.isSystem) {
      return left.isSystem ? -1 : 1;
    }

    if (left.usageCount !== right.usageCount) {
      return right.usageCount - left.usageCount;
    }

    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });
}

function matchesScope(template: TemplateEntity, scope: TemplateScope, creatorId: string | null): boolean {
  switch (scope) {
    case 'system':
      return template.isSystem;
    case 'personal':
      return !template.isSystem && template.creatorId === creatorId;
    case 'all':
    default:
      return template.isSystem || (!!creatorId && template.creatorId === creatorId);
  }
}

@Injectable()
export class TemplateService {
  constructor(private readonly connection: TransactionalConnection) {}

  async listTemplates(
    ctx: RequestContext | undefined,
    filter: TemplateListFilter = {},
  ): Promise<TemplateEntity[]> {
    return tracer.startActiveSpan('templates.list', async (span) => {
      try {
        const scope = filter.scope ?? 'all';
        const creatorId = normalizeCreatorId(filter.creatorId);

        if (scope === 'personal' && !creatorId) {
          throw new Error('Listing personal templates requires a creatorId.');
        }

        span.setAttribute('template.scope', scope);
        if (filter.category) {
          span.setAttribute('template.category', filter.category);
        }
        if (creatorId) {
          span.setAttribute('template.creator_id', creatorId);
        }

        const templates = await this.getTemplateRepository(ctx).find();
        const filtered = sortTemplates(
          templates.filter((template) => {
            const matchesCategory = !filter.category || template.category === filter.category;
            return matchesCategory && matchesScope(template, scope, creatorId);
          }),
        );
        const skip = filter.skip ?? 0;
        const take = filter.take ?? filtered.length;
        const results = filtered.slice(skip, skip + take);
        span.setAttribute('template.count', results.length);
        return results;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async createTemplateFromPage(
    ctx: RequestContext | undefined,
    input: CreateTemplateFromPageInput,
  ): Promise<TemplateEntity> {
    return tracer.startActiveSpan('templates.createFromPage', async (span) => {
      try {
        span.setAttribute('template.page_id', input.pageId);
        span.setAttribute('template.category', input.category);
        span.setAttribute('template.is_system', input.isSystem ?? false);

        const page = await this.getStorePageRepository(ctx).findOneBy({ id: input.pageId });
        if (!page) {
          throw new Error(`Store page "${input.pageId}" does not exist.`);
        }

        const isSystem = input.isSystem ?? false;
        const creatorId = isSystem
          ? null
          : requireCreatorId(
              input.creatorId,
              'Creating a personal template requires a creatorId.',
            );
        const blocks = extractTemplateBlocks(page.content);
        const repository = this.getTemplateRepository(ctx);
        const template = repository.create({
          name: normalizeTemplateName(input.name),
          description: normalizeOptionalText(input.description),
          thumbnail: normalizeOptionalText(input.thumbnail),
          category: input.category,
          blocks,
          isSystem,
          creatorId,
          usageCount: 0,
        });

        return await repository.save(template);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async duplicateTemplate(
    ctx: RequestContext | undefined,
    input: DuplicateTemplateInput,
  ): Promise<TemplateEntity> {
    return tracer.startActiveSpan('templates.duplicate', async (span) => {
      try {
        span.setAttribute('template.source_id', input.templateId);
        span.setAttribute('template.creator_id', input.creatorId);

        const repository = this.getTemplateRepository(ctx);
        const source = await repository.findOneBy({ id: input.templateId });
        if (!source) {
          throw new Error(`Template "${input.templateId}" does not exist.`);
        }

        if (!source.isSystem && source.creatorId !== input.creatorId) {
          throw new Error('Templates can only be duplicated by their owning creator.');
        }

        const duplicate = repository.create({
          name: input.name ? normalizeTemplateName(input.name) : createDuplicateTemplateName(source.name),
          description: source.description,
          thumbnail: source.thumbnail,
          category: source.category,
          blocks: cloneTemplateBlocks(source.blocks),
          isSystem: false,
          creatorId: requireCreatorId(
            input.creatorId,
            'Duplicating a template requires a creatorId.',
          ),
          usageCount: 0,
        });

        return await repository.save(duplicate);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async deletePersonalTemplate(
    ctx: RequestContext | undefined,
    templateId: string,
    creatorId: string,
  ): Promise<boolean> {
    return tracer.startActiveSpan('templates.delete', async (span) => {
      try {
        span.setAttribute('template.id', templateId);
        span.setAttribute('template.creator_id', creatorId);

        const repository = this.getTemplateRepository(ctx);
        const template = await repository.findOneBy({ id: templateId });
        if (!template) {
          return false;
        }

        if (template.isSystem) {
          throw new Error('System templates cannot be deleted.');
        }

        if (template.creatorId !== creatorId) {
          throw new Error('Templates can only be deleted by their owning creator.');
        }

        await repository.remove(template);
        return true;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private getTemplateRepository(ctx: RequestContext | undefined): TemplateRepository {
    return this.connection.getRepository(ctx, TemplateEntity) as TemplateRepository;
  }

  private getStorePageRepository(ctx: RequestContext | undefined): StorePageRepository {
    return this.connection.getRepository(ctx, StorePageEntity) as StorePageRepository;
  }
}
