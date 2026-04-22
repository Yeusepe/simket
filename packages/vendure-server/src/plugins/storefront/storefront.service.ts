/**
 * Purpose: Persist creator-owned Framely store/product pages and expose public
 *          creator-store data through the Storefront plugin.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, §12 source of truth)
 *   - docs/service-architecture.md (§2 Vendure plugin contracts, §7.7 Storefront plugin)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/connection/transactional-connection.d.ts
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/storefront.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { CustomerService, ProductService, TransactionalConnection, type RequestContext } from '@vendure/core';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import { resolveBetterAuthDatabasePath } from '../../auth/config.js';
import { StorePageEntity, type StorePageScope } from './storefront.entity.js';
import { STORE_PAGE_SLUG_PATTERN, sortPages, validateStorePage } from './storefront.shared.js';

type BetterAuthUserRow = {
  readonly id: string;
  readonly name: string;
  readonly image: string | null;
  readonly creatorSlug: string | null;
};

type BetterAuthDatabase = {
  user: BetterAuthUserRow;
};

export const DEFAULT_STORE_HOME_PAGE_SLUG = 'home';
export const DEFAULT_PRODUCT_PAGE_SLUG = 'product-detail';

interface StorePageRepository {
  create(input: Partial<StorePageEntity>): StorePageEntity;
  save(entity: StorePageEntity): Promise<StorePageEntity>;
  find(): Promise<StorePageEntity[]>;
  findOneBy(where: Partial<StorePageEntity>): Promise<StorePageEntity | null>;
  remove(entity: StorePageEntity): Promise<StorePageEntity>;
}

type ProductSummaryShape = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly priceMin: number;
  readonly priceMax: number;
  readonly currencyCode: string;
  readonly heroImageUrl: string | null;
  readonly heroTransparentUrl: string | null;
  readonly creatorName: string;
  readonly creatorAvatarUrl: string | null;
  readonly tags: readonly string[];
  readonly categorySlug: string | null;
  readonly previewColor: string | null;
};

export interface PublicStorefrontPage {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly title: string;
  readonly slug: string;
  readonly scope: StorePageScope;
  readonly productId: string | null;
  readonly isPostSale: boolean;
  readonly isTemplate: boolean;
  readonly sortOrder: number;
  readonly enabled: boolean;
  readonly schema: Record<string, unknown>;
}

export interface CreatorStoreProfile {
  readonly id: string;
  readonly slug: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly tagline: string;
  readonly bio: string;
}

export interface CreatorStoreData {
  readonly creator: CreatorStoreProfile;
  readonly theme: Record<string, unknown>;
  readonly pages: readonly PublicStorefrontPage[];
  readonly products: readonly ProductSummaryShape[];
}

export interface UpsertCreatorStorefrontPageInput {
  readonly pageId?: string;
  readonly title: string;
  readonly slug: string;
  readonly scope: StorePageScope;
  readonly productId?: string | null;
  readonly content: Record<string, unknown>;
  readonly sortOrder?: number;
  readonly enabled?: boolean;
}

function createAuthDatabase(): Kysely<BetterAuthDatabase> {
  return new Kysely<BetterAuthDatabase>({
    dialect: new SqliteDialect({
      database: new Database(resolveBetterAuthDatabasePath(), { readonly: true }),
    }),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getProductCustomFields(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function parseTags(value: unknown): readonly string[] {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    return [];
  }
}

function normalizeVisibility(value: unknown, enabled: boolean): 'draft' | 'published' | 'archived' {
  if (value === 'draft' || value === 'published' || value === 'archived') {
    return value;
  }

  return enabled ? 'published' : 'draft';
}

function parseStorefrontSchema(content: string): Record<string, unknown> {
  const parsed = JSON.parse(content) as unknown;

  if (!isRecord(parsed) || !Array.isArray(parsed.blocks)) {
    throw new Error('Store page content must contain a top-level page schema with a blocks array.');
  }

  return parsed;
}

function normalizeSchemaContent(content: Record<string, unknown>): string {
  if (!Array.isArray(content.blocks)) {
    throw new Error('Store page content must include a blocks array.');
  }

  return JSON.stringify(content);
}

function toPublicStorefrontPage(page: StorePageEntity): PublicStorefrontPage {
  return {
    id: String(page.id),
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    title: page.title,
    slug: page.slug,
    scope: page.scope,
    productId: page.productId,
    isPostSale: page.isPostSale,
    isTemplate: page.isTemplate,
    sortOrder: page.sortOrder,
    enabled: page.enabled,
    schema: parseStorefrontSchema(page.content),
  };
}

function deriveStoreTheme(
  pages: readonly PublicStorefrontPage[],
  products: readonly ProductSummaryShape[],
): Record<string, unknown> {
  const homepage = pages.find((page) => page.slug === DEFAULT_STORE_HOME_PAGE_SLUG);
  const pageTheme = homepage?.schema.theme;

  if (isRecord(pageTheme)) {
    return pageTheme;
  }

  const previewColor = products.find((product) => typeof product.previewColor === 'string')?.previewColor;
  return previewColor ? { primaryColor: previewColor } : {};
}

function deriveTagline(displayName: string, products: readonly ProductSummaryShape[]): string {
  const latestProduct = products[0];
  if (latestProduct?.description) {
    return latestProduct.description;
  }

  return `${displayName}'s creator storefront on Simket.`;
}

function deriveBio(displayName: string, products: readonly ProductSummaryShape[]): string {
  if (products.length === 0) {
    return `${displayName} has not published any products yet.`;
  }

  return `Browse ${products.length} published products from ${displayName}.`;
}

const tracer = trace.getTracer('simket-storefront-pages');

@Injectable()
export class StorefrontPageService {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly customerService: CustomerService,
    private readonly productService: ProductService,
  ) {}

  async getCreatorStore(
    ctx: RequestContext | undefined,
    creatorSlug: string,
  ): Promise<CreatorStoreData | null> {
    return tracer.startActiveSpan('storefront.creatorStore', async (span) => {
      try {
        span.setAttribute('storefront.creator_slug', creatorSlug);

        const authDb = createAuthDatabase();
        try {
          const creator = await authDb
            .selectFrom('user')
            .select(['id', 'name', 'image', 'creatorSlug'])
            .where('creatorSlug', '=', creatorSlug)
            .executeTakeFirst();

          if (!creator || !creator.creatorSlug) {
            return null;
          }

          const products = await this.listPublishedCreatorProducts(ctx, creator.creatorSlug);
          const pages = sortPages(
            (await this.getStorePageRepository(ctx).find())
              .filter(
                (page) =>
                  page.creatorId === creator.id
                  && page.scope === 'universal'
                  && page.enabled
                  && !page.isPostSale,
              ),
          ).map((page) => toPublicStorefrontPage(page));

          return {
            creator: {
              id: creator.id,
              slug: creator.creatorSlug,
              displayName: creator.name,
              avatarUrl: creator.image,
              tagline: deriveTagline(creator.name, products),
              bio: deriveBio(creator.name, products),
            },
            theme: deriveStoreTheme(pages, products),
            pages,
            products,
          };
        } finally {
          await authDb.destroy();
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getCreatorStorefrontPage(
    ctx: RequestContext,
    scope: StorePageScope,
    slug: string,
    productId?: string,
  ): Promise<PublicStorefrontPage | null> {
    return tracer.startActiveSpan('storefront.creatorStorefrontPage', async (span) => {
      try {
        span.setAttribute('storefront.scope', scope);
        span.setAttribute('storefront.slug', slug);

        const creatorId = await this.requireCreatorId(ctx);
        const page = await this.getStorePageRepository(ctx).findOneBy({
          creatorId,
          scope,
          slug,
          productId: scope === 'product' ? productId ?? null : null,
        });

        return page ? toPublicStorefrontPage(page) : null;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async upsertCreatorStorefrontPage(
    ctx: RequestContext,
    input: UpsertCreatorStorefrontPageInput,
  ): Promise<PublicStorefrontPage> {
    return tracer.startActiveSpan('storefront.upsertCreatorStorefrontPage', async (span) => {
      try {
        const creatorId = await this.requireCreatorId(ctx);
        const repository = this.getStorePageRepository(ctx);
        const normalizedScope = input.scope;
        const normalizedSlug = input.slug.trim();
        const normalizedTitle = input.title.trim();
        const normalizedContent = normalizeSchemaContent(input.content);
        const productId = normalizedScope === 'product' ? input.productId?.trim() ?? null : null;

        span.setAttribute('storefront.scope', normalizedScope);
        span.setAttribute('storefront.slug', normalizedSlug);
        span.setAttribute('storefront.creator_id', creatorId);

        const validationErrors = validateStorePage(
          new StorePageEntity({
            title: normalizedTitle,
            slug: normalizedSlug,
            creatorId,
            scope: normalizedScope,
            productId,
            isPostSale: false,
            isTemplate: false,
            content: normalizedContent,
            sortOrder: input.sortOrder ?? 0,
            enabled: input.enabled ?? true,
          }),
        );

        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join('; '));
        }

        if (!STORE_PAGE_SLUG_PATTERN.test(normalizedSlug)) {
          throw new Error('Store page slug is invalid.');
        }

        if (normalizedScope === 'product' && !productId) {
          throw new Error('Product pages require a productId.');
        }

        const page = input.pageId
          ? await this.requireOwnedPage(ctx, input.pageId, creatorId)
          : repository.create({});

        page.title = normalizedTitle;
        page.slug = normalizedSlug;
        page.creatorId = creatorId;
        page.scope = normalizedScope;
        page.productId = productId;
        page.isPostSale = false;
        page.isTemplate = false;
        page.content = normalizedContent;
        page.sortOrder = input.sortOrder ?? 0;
        page.enabled = input.enabled ?? true;

        return toPublicStorefrontPage(await repository.save(page));
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async deleteCreatorStorefrontPage(ctx: RequestContext, pageId: string): Promise<boolean> {
    return tracer.startActiveSpan('storefront.deleteCreatorStorefrontPage', async (span) => {
      try {
        const creatorId = await this.requireCreatorId(ctx);
        span.setAttribute('storefront.page_id', pageId);
        span.setAttribute('storefront.creator_id', creatorId);

        const repository = this.getStorePageRepository(ctx);
        const page = await repository.findOneBy({ id: pageId, creatorId });
        if (!page) {
          return false;
        }

        await repository.remove(page);
        return true;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async requireCreatorId(ctx: RequestContext): Promise<string> {
    if (!ctx.activeUserId) {
      throw new Error('Creator page editing requires an authenticated user.');
    }

    const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId, true);
    if (!customer) {
      throw new Error(`Active user "${String(ctx.activeUserId)}" does not have a customer record.`);
    }

    const customFields = (customer.customFields ?? {}) as Record<string, unknown>;
    if (customFields['betterAuthRole'] !== 'creator') {
      throw new Error('Creator page editing requires a creator account.');
    }

    const creatorId = customFields['betterAuthUserId'];
    if (typeof creatorId !== 'string' || creatorId.length === 0) {
      throw new Error('Creator customer is missing Better Auth linkage.');
    }

    return creatorId;
  }

  private async requireOwnedPage(
    ctx: RequestContext,
    pageId: string,
    creatorId: string,
  ): Promise<StorePageEntity> {
    const page = await this.getStorePageRepository(ctx).findOneBy({ id: pageId, creatorId });
    if (!page) {
      throw new Error(`Store page "${pageId}" does not belong to the active creator.`);
    }

    return page;
  }

  private async listPublishedCreatorProducts(
    ctx: RequestContext | undefined,
    creatorSlug: string,
  ): Promise<readonly ProductSummaryShape[]> {
    const products = await this.productService.findAll(ctx as RequestContext, {
      take: 100,
      sort: { updatedAt: 'DESC' },
    });

    return products.items
      .filter((product) => {
        const customFields = getProductCustomFields(product.customFields);
        return (
          customFields['creatorSlug'] === creatorSlug
          && normalizeVisibility(customFields['listingVisibility'], product.enabled) === 'published'
        );
      })
      .map((product) => {
        const customFields = getProductCustomFields(product.customFields);
        return {
          id: String(product.id),
          slug: product.slug,
          name: product.name,
          description:
            typeof customFields['shortDescription'] === 'string'
              ? String(customFields['shortDescription'])
              : product.description,
          priceMin: typeof customFields['priceMin'] === 'number' ? Number(customFields['priceMin']) : 0,
          priceMax: typeof customFields['priceMax'] === 'number' ? Number(customFields['priceMax']) : 0,
          currencyCode: 'USD',
          heroImageUrl:
            typeof customFields['heroImageUrl'] === 'string'
              ? String(customFields['heroImageUrl'])
              : null,
          heroTransparentUrl:
            typeof customFields['heroTransparentUrl'] === 'string'
              ? String(customFields['heroTransparentUrl'])
              : null,
          creatorName:
            typeof customFields['creatorName'] === 'string'
              ? String(customFields['creatorName'])
              : 'Simket Creator',
          creatorAvatarUrl:
            typeof customFields['creatorAvatarUrl'] === 'string'
              ? String(customFields['creatorAvatarUrl'])
              : null,
          tags: parseTags(customFields['tagsJson']),
          categorySlug: null,
          previewColor:
            typeof customFields['previewColor'] === 'string'
              ? String(customFields['previewColor'])
              : null,
        } satisfies ProductSummaryShape;
      });
  }

  private getStorePageRepository(ctx: RequestContext | undefined): StorePageRepository {
    return this.connection.getRepository(ctx, StorePageEntity) as StorePageRepository;
  }
}
