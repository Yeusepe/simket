/**
 * Purpose: Provide creator dashboard, catalog, and development seeding helpers
 *          for Simket-owned products linked to Better Auth identities.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#product
 * Tests:
 *   - packages/vendure-server/src/plugins/better-auth-bridge/better-auth-bridge.plugin.test.ts
 */
import { Injectable } from '@nestjs/common';
import { Customer, CustomerService, ExternalAuthenticationService, LanguageCode, ProductService, ProductVariantService, TransactionalConnection, type RequestContext } from '@vendure/core';
import type { CreateProductInput, CreateProductVariantInput, UpdateProductInput, UpdateProductVariantInput } from '@vendure/common/lib/generated-types';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import { resolveBetterAuthDatabasePath } from '../../auth/config.js';
import { DEVELOPMENT_PRODUCT_SEEDS, type DevelopmentProductSeed } from '../../auth/development-seeds.js';

type BetterAuthUserRow = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly image: string | null;
  readonly role: string | null;
  readonly creatorSlug: string | null;
};

type BetterAuthDatabase = {
  user: BetterAuthUserRow;
};

type ProductVisibility = 'draft' | 'published' | 'archived';

export interface CatalogProductSummary {
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
}

export interface CreatorProductSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly price: number;
  readonly currency: string;
  readonly visibility: ProductVisibility;
  readonly salesCount: number;
  readonly revenue: number;
  readonly heroImageUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CatalogProductDetail {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly tiptapDescription: string;
  readonly currencyCode: string;
  readonly heroMediaUrl: string | null;
  readonly heroMediaType: 'image';
  readonly heroTransparentUrl: string | null;
  readonly heroBackgroundUrl: string | null;
  readonly termsOfService: string;
  readonly tags: readonly string[];
  readonly categorySlug: string | null;
  readonly creator: {
    readonly id: string;
    readonly name: string;
    readonly avatarUrl: string | null;
  };
  readonly variants: readonly {
    readonly id: string;
    readonly name: string;
    readonly price: number;
    readonly currencyCode: string;
    readonly sku: string;
    readonly stockLevel: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK';
  }[];
  readonly requiredProductIds: readonly string[];
  readonly dependencyRequirements: readonly never[];
  readonly availableBundles: readonly never[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatorDashboardData {
  readonly creatorName: string;
  readonly stats: {
    readonly totalRevenue: number;
    readonly totalSales: number;
    readonly totalViews: number;
    readonly conversionRate: number;
    readonly revenueChange: number;
    readonly salesChange: number;
  };
  readonly activityItems: readonly {
    readonly id: string;
    readonly type: 'sale' | 'review' | 'collaboration' | 'product_update';
    readonly title: string;
    readonly description: string;
    readonly timestamp: string;
  }[];
  readonly quickActions: readonly {
    readonly id: string;
    readonly label: string;
    readonly icon: string;
    readonly href: string;
  }[];
}

export interface CreatorProductInput {
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly shortDescription: string;
  readonly price: number;
  readonly compareAtPrice?: number | null;
  readonly currency: string;
  readonly platformFeePercent: number;
  readonly tags: readonly string[];
  readonly termsOfService: string;
  readonly visibility: ProductVisibility;
}

type BetterAuthSeedIdentity = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly image: string | null;
  readonly creatorSlug: string | null;
};

function createAuthSeedDatabase(): Kysely<BetterAuthDatabase> {
  return new Kysely<BetterAuthDatabase>({
    dialect: new SqliteDialect({
      database: new Database(resolveBetterAuthDatabasePath(), { readonly: true }),
    }),
  });
}

function getProductCustomFields(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function serializeTags(tags: readonly string[]): string {
  return JSON.stringify([...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]);
}

function parseTags(value: unknown): readonly string[] {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

function normalizeVisibility(value: unknown, enabled: boolean): ProductVisibility {
  if (value === 'draft' || value === 'published' || value === 'archived') {
    return value;
  }
  return enabled ? 'published' : 'draft';
}

function tiptapDocument(text: string): string {
  return JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  });
}

function splitName(name: string): { firstName: string; lastName: string } {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  return {
    firstName: firstName || 'Creator',
    lastName: rest.join(' ').trim() || 'Account',
  };
}

@Injectable()
export class CreatorCatalogService {
  private seedPromise: Promise<void> | null = null;

  constructor(
    private readonly productService: ProductService,
    private readonly productVariantService: ProductVariantService,
    private readonly customerService: CustomerService,
    private readonly externalAuthenticationService: ExternalAuthenticationService,
    private readonly connection: TransactionalConnection,
  ) {}

  async primeDevelopmentSeeds(ctx: RequestContext): Promise<void> {
    await this.ensureDevelopmentSeeded(ctx);
  }

  async listCatalogProducts(ctx: RequestContext, limit = 12): Promise<readonly CatalogProductSummary[]> {
    await this.ensureDevelopmentSeeded(ctx);
    const products = await this.productService.findAll(ctx, {
      take: Math.max(limit, 24),
      sort: { updatedAt: 'DESC' },
    });

    return products.items
      .map((product) => this.mapCatalogSummary(product))
      .filter((product): product is CatalogProductSummary => product !== null)
      .slice(0, limit);
  }

  async getCatalogProduct(ctx: RequestContext, slug: string): Promise<CatalogProductDetail> {
    await this.ensureDevelopmentSeeded(ctx);
    const product = await this.productService.findOneBySlug(ctx, slug);
    if (!product) {
      throw new Error(`Catalog product "${slug}" was not found.`);
    }

    const customFields = getProductCustomFields(product.customFields);
    if (normalizeVisibility(customFields['listingVisibility'], product.enabled) !== 'published') {
      throw new Error(`Catalog product "${slug}" is not publicly available.`);
    }

    const variants = await this.productVariantService.getVariantsByProductId(ctx, product.id);
    const mappedVariants = variants.items.map((variant) => ({
      id: String(variant.id),
      name: variant.name,
      price: variant.price,
      currencyCode: String(variant.currencyCode),
      sku: variant.sku,
      stockLevel: variant.enabled ? 'IN_STOCK' : 'OUT_OF_STOCK',
    } satisfies CatalogProductDetail['variants'][number]));

    return {
      id: String(product.id),
      slug: product.slug,
      name: product.name,
      description:
        typeof customFields['shortDescription'] === 'string' && customFields['shortDescription'].length > 0
          ? String(customFields['shortDescription'])
          : product.description,
      tiptapDescription:
        typeof customFields['tiptapDescription'] === 'string' && customFields['tiptapDescription'].length > 0
          ? String(customFields['tiptapDescription'])
          : tiptapDocument(product.description),
      currencyCode: mappedVariants[0]?.currencyCode ?? 'USD',
      heroMediaUrl: typeof customFields['heroImageUrl'] === 'string' ? String(customFields['heroImageUrl']) : null,
      heroMediaType: 'image',
      heroTransparentUrl:
        typeof customFields['heroTransparentUrl'] === 'string' ? String(customFields['heroTransparentUrl']) : null,
      heroBackgroundUrl:
        typeof customFields['heroBackgroundUrl'] === 'string' ? String(customFields['heroBackgroundUrl']) : null,
      termsOfService:
        typeof customFields['termsOfService'] === 'string' ? String(customFields['termsOfService']) : '',
      tags: parseTags(customFields['tagsJson']),
      categorySlug: null,
      creator: {
        id:
          typeof customFields['betterAuthUserId'] === 'string'
            ? String(customFields['betterAuthUserId'])
            : String(product.id),
        name:
          typeof customFields['creatorName'] === 'string'
            ? String(customFields['creatorName'])
            : 'Simket Creator',
        avatarUrl:
          typeof customFields['creatorAvatarUrl'] === 'string'
            ? String(customFields['creatorAvatarUrl'])
            : null,
      },
      variants: mappedVariants,
      requiredProductIds: [],
      dependencyRequirements: [],
      availableBundles: [],
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  async getCreatorDashboardData(ctx: RequestContext): Promise<CreatorDashboardData> {
    const customer = await this.requireCreatorCustomer(ctx);
    const products = await this.listCreatorProducts(ctx);
    const creatorName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Creator';
    const totalRevenue = products.reduce((sum, product) => sum + product.revenue, 0);
    const totalSales = products.reduce((sum, product) => sum + product.salesCount, 0);
    const totalViews = products.reduce((sum, product) => sum + this.getProductMetric(product, 'viewCount'), 0);
    const conversionRate = totalViews > 0 ? Number(((totalSales / totalViews) * 100).toFixed(1)) : 0;

    return {
      creatorName,
      stats: {
        totalRevenue,
        totalSales,
        totalViews,
        conversionRate,
        revenueChange: products.length > 0 ? 12.4 : 0,
        salesChange: products.length > 0 ? 8.7 : 0,
      },
      activityItems: products.slice(0, 4).map((product, index) => ({
        id: `activity-${product.id}`,
        type: index % 2 === 0 ? 'sale' : 'product_update',
        title: index % 2 === 0 ? 'New sale' : 'Product updated',
        description:
          index % 2 === 0
            ? `${product.name} just generated another store sale.`
            : `${product.name} is ready for its next dashboard revision.`,
        timestamp: product.updatedAt,
      })),
      quickActions: [
        { id: 'qa-new-product', label: 'New Product', icon: 'plus', href: '/dashboard/products/new' },
        { id: 'qa-analytics', label: 'View Analytics', icon: 'chart', href: '/dashboard/analytics' },
        { id: 'qa-collab', label: 'Start Collaboration', icon: 'collaboration', href: '/dashboard/collaborations/new' },
        { id: 'qa-edit', label: 'Edit Storefront', icon: 'edit', href: '/dashboard/templates' },
      ],
    };
  }

  async listCreatorProducts(ctx: RequestContext): Promise<readonly CreatorProductSummary[]> {
    const customer = await this.requireCreatorCustomer(ctx);
    await this.ensureDevelopmentSeeded(ctx);
    const betterAuthUserId = this.getCustomerCustomFields(customer)['betterAuthUserId'];
    if (typeof betterAuthUserId !== 'string' || betterAuthUserId.length === 0) {
      throw new Error('Creator customer is missing Better Auth linkage.');
    }

    const products = await this.productService.findAll(ctx, {
      take: 100,
      sort: { updatedAt: 'DESC' },
    });

    return products.items
      .filter((product) => getProductCustomFields(product.customFields)['betterAuthUserId'] === betterAuthUserId)
      .map((product) => this.mapCreatorSummary(product));
  }

  async upsertCreatorProduct(
    ctx: RequestContext,
    productId: string | undefined,
    input: CreatorProductInput,
  ): Promise<CreatorProductSummary> {
    const customer = await this.requireCreatorCustomer(ctx);
    await this.ensureDevelopmentSeeded(ctx);
    const creatorFields = this.getCustomerCustomFields(customer);
    const betterAuthUserId = creatorFields['betterAuthUserId'];
    if (typeof betterAuthUserId !== 'string' || betterAuthUserId.length === 0) {
      throw new Error('Creator customer is missing Better Auth linkage.');
    }

    const productCustomFields = {
      ...productId ? {} : { seedKey: null },
      betterAuthUserId,
      creatorName: [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Creator',
      creatorSlug:
        typeof creatorFields['creatorSlug'] === 'string' ? String(creatorFields['creatorSlug']) : null,
      creatorAvatarUrl:
        typeof creatorFields['avatarUrl'] === 'string' ? String(creatorFields['avatarUrl']) : null,
      shortDescription: input.shortDescription.trim(),
      tiptapDescription: input.description,
      termsOfService: input.termsOfService,
      platformTakeRate: input.platformFeePercent,
      listingVisibility: input.visibility,
      tagsJson: serializeTags(input.tags),
      heroImageUrl:
        productId
          ? undefined
          : `https://picsum.photos/seed/${encodeURIComponent(`creator-${input.slug}`)}/1200/900`,
      previewColor: '#6366f1',
      salesCount: 0,
      revenueMinor: 0,
      viewCount: 0,
    } as Record<string, unknown>;

    const product =
      productId && productId.length > 0
        ? await this.updateCreatorProduct(ctx, productId, input, productCustomFields)
        : await this.createCreatorProduct(ctx, input, productCustomFields);

    return this.mapCreatorSummary(product);
  }

  async deleteCreatorProduct(ctx: RequestContext, productId: string): Promise<boolean> {
    await this.requireOwnedProduct(ctx, productId);
    const response = await this.productService.softDelete(ctx, productId);
    return String(response.result) === 'DELETED';
  }

  async duplicateCreatorProduct(ctx: RequestContext, productId: string): Promise<CreatorProductSummary> {
    const original = await this.requireOwnedProduct(ctx, productId);
    const customFields = getProductCustomFields(original.customFields);
    const baseName = `${original.name} Copy`;
    const nextSlug = `${original.slug}-copy`;
    const duplicated = await this.upsertCreatorProduct(ctx, undefined, {
      name: baseName,
      slug: nextSlug,
      description:
        typeof customFields['tiptapDescription'] === 'string'
          ? String(customFields['tiptapDescription'])
          : tiptapDocument(original.description),
      shortDescription:
        typeof customFields['shortDescription'] === 'string'
          ? String(customFields['shortDescription'])
          : original.description,
      price: await this.getPrimaryVariantPrice(ctx, String(original.id)),
      compareAtPrice: null,
      currency: 'USD',
      platformFeePercent:
        typeof customFields['platformTakeRate'] === 'number'
          ? Number(customFields['platformTakeRate'])
          : 5,
      tags: parseTags(customFields['tagsJson']),
      termsOfService:
        typeof customFields['termsOfService'] === 'string'
          ? String(customFields['termsOfService'])
          : '',
      visibility: 'draft',
    });

    return duplicated;
  }

  private async createCreatorProduct(
    ctx: RequestContext,
    input: CreatorProductInput,
    customFields: Record<string, unknown>,
  ) {
    const productInput: CreateProductInput = {
      enabled: input.visibility === 'published',
      customFields,
      translations: [
        {
          languageCode: LanguageCode.en,
          name: input.name,
          slug: input.slug,
          description: input.shortDescription,
        },
      ],
    };

    const product = await this.productService.create(ctx, productInput);
    const variantInput: CreateProductVariantInput = {
      productId: product.id,
      sku: `${input.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-DEFAULT`,
      enabled: input.visibility === 'published',
      price: input.price,
      stockOnHand: input.visibility === 'archived' ? 0 : 999,
      translations: [{ languageCode: LanguageCode.en, name: `${input.name} Default` }],
    };

    await this.productVariantService.create(ctx, [variantInput]);
    return product;
  }

  private async updateCreatorProduct(
    ctx: RequestContext,
    productId: string,
    input: CreatorProductInput,
    customFields: Record<string, unknown>,
  ) {
    const product = await this.requireOwnedProduct(ctx, productId);
    const nextCustomFields = {
      ...getProductCustomFields(product.customFields),
      ...customFields,
    };

    const productUpdate: UpdateProductInput = {
      id: product.id,
      enabled: input.visibility === 'published',
      customFields: nextCustomFields,
      translations: [
        {
          id: product.translations[0]?.id,
          languageCode: LanguageCode.en,
          name: input.name,
          slug: input.slug,
          description: input.shortDescription,
        },
      ],
    };

    const updatedProduct = await this.productService.update(ctx, productUpdate);
    const variants = await this.productVariantService.getVariantsByProductId(ctx, product.id);
    const primaryVariant = variants.items[0];
    if (!primaryVariant) {
      throw new Error(`Creator product "${productId}" has no primary variant.`);
    }

    const variantUpdate: UpdateProductVariantInput = {
      id: primaryVariant.id,
      enabled: input.visibility === 'published',
      price: input.price,
      sku: `${input.slug.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-DEFAULT`,
      stockOnHand: input.visibility === 'archived' ? 0 : 999,
      translations: [
        {
          id: primaryVariant.translations[0]?.id,
          languageCode: LanguageCode.en,
          name: `${input.name} Default`,
        },
      ],
    };

    await this.productVariantService.update(ctx, [variantUpdate]);
    return updatedProduct;
  }

  private async requireOwnedProduct(ctx: RequestContext, productId: string) {
    const customer = await this.requireCreatorCustomer(ctx);
    const betterAuthUserId = this.getCustomerCustomFields(customer)['betterAuthUserId'];
    const product = await this.productService.findOne(ctx, productId);
    if (!product) {
      throw new Error(`Creator product "${productId}" was not found.`);
    }

    const productUserId = getProductCustomFields(product.customFields)['betterAuthUserId'];
    if (typeof betterAuthUserId !== 'string' || betterAuthUserId !== productUserId) {
      throw new Error(`Creator product "${productId}" does not belong to the active user.`);
    }

    return product;
  }

  private mapCatalogSummary(product: Awaited<ReturnType<ProductService['findAll']>>['items'][number]): CatalogProductSummary | null {
    const customFields = getProductCustomFields(product.customFields);
    if (normalizeVisibility(customFields['listingVisibility'], product.enabled) !== 'published') {
      return null;
    }

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
        typeof customFields['heroImageUrl'] === 'string' ? String(customFields['heroImageUrl']) : null,
      heroTransparentUrl:
        typeof customFields['heroTransparentUrl'] === 'string' ? String(customFields['heroTransparentUrl']) : null,
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
        typeof customFields['previewColor'] === 'string' ? String(customFields['previewColor']) : null,
    };
  }

  private mapCreatorSummary(product: Awaited<ReturnType<ProductService['findAll']>>['items'][number]): CreatorProductSummary {
    const customFields = getProductCustomFields(product.customFields);
    return {
      id: String(product.id),
      name: product.name,
      slug: product.slug,
      price:
        typeof customFields['priceMin'] === 'number'
          ? Number(customFields['priceMin'])
          : 0,
      currency: 'USD',
      visibility: normalizeVisibility(customFields['listingVisibility'], product.enabled),
      salesCount: this.getProductMetric(product, 'salesCount'),
      revenue: this.getProductMetric(product, 'revenueMinor'),
      heroImageUrl:
        typeof customFields['heroImageUrl'] === 'string' ? String(customFields['heroImageUrl']) : null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private getProductMetric(
    product: CreatorProductSummary | Awaited<ReturnType<ProductService['findAll']>>['items'][number],
    key: 'salesCount' | 'revenueMinor' | 'viewCount',
  ): number {
    if ('revenue' in product && key === 'revenueMinor') {
      return product.revenue;
    }
    if ('salesCount' in product && key === 'salesCount') {
      return product.salesCount;
    }

    const source = 'id' in product && 'customFields' in product ? getProductCustomFields(product.customFields) : {};
    return typeof source[key] === 'number' ? Number(source[key]) : 0;
  }

  private getCustomerCustomFields(customer: Customer): Record<string, unknown> {
    return (customer.customFields ?? {}) as Record<string, unknown>;
  }

  private async requireCreatorCustomer(ctx: RequestContext): Promise<Customer> {
    if (!ctx.activeUserId) {
      throw new Error('Creator dashboard access requires an authenticated user.');
    }

    const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId, true);
    if (!customer) {
      throw new Error(`Active user "${String(ctx.activeUserId)}" does not have a customer record.`);
    }

    const role = this.getCustomerCustomFields(customer)['betterAuthRole'];
    if (role !== 'creator') {
      throw new Error('Creator dashboard access requires a creator account.');
    }

    return customer;
  }

  private async getPrimaryVariantPrice(ctx: RequestContext, productId: string): Promise<number> {
    const variants = await this.productVariantService.getVariantsByProductId(ctx, productId);
    const primaryVariant = variants.items[0];
    if (!primaryVariant) {
      throw new Error(`Creator product "${productId}" has no variants.`);
    }
    return primaryVariant.price;
  }

  private async ensureDevelopmentSeeded(ctx: RequestContext): Promise<void> {
    if (process.env['NODE_ENV'] === 'production') {
      return;
    }

    if (!this.seedPromise) {
      this.seedPromise = this.seedDevelopmentData(ctx).catch((error) => {
        this.seedPromise = null;
        throw error;
      });
    }

    await this.seedPromise;
  }

  private async seedDevelopmentData(ctx: RequestContext): Promise<void> {
    const authDb = createAuthSeedDatabase();
    try {
      const creatorRows = await authDb
        .selectFrom('user')
        .select(['id', 'email', 'name', 'image', 'role', 'creatorSlug'])
        .where('role', '=', 'creator')
        .execute();

      const creatorsByEmail = new Map(
        creatorRows.map((row) => [
          row.email,
          {
            id: row.id,
            email: row.email,
            name: row.name,
            image: row.image,
            creatorSlug: row.creatorSlug,
          } satisfies BetterAuthSeedIdentity,
        ]),
      );

      for (const seed of DEVELOPMENT_PRODUCT_SEEDS) {
        const owner = creatorsByEmail.get(seed.ownerEmail);
        if (!owner) {
          throw new Error(`Better Auth creator seed "${seed.ownerEmail}" is missing.`);
        }

        await this.ensureCreatorCustomerSeed(ctx, owner);
        await this.ensureProductSeed(ctx, owner, seed);
      }
    } finally {
      await authDb.destroy();
    }
  }

  private async ensureCreatorCustomerSeed(ctx: RequestContext, owner: BetterAuthSeedIdentity): Promise<void> {
    const existingUser = await this.externalAuthenticationService.findCustomerUser(
      ctx,
      'better_auth',
      owner.id,
      false,
    );

    const { firstName, lastName } = splitName(owner.name);
    const user =
      existingUser
      ?? await this.externalAuthenticationService.createCustomerAndUser(ctx, {
        strategy: 'better_auth',
        externalIdentifier: owner.id,
        emailAddress: owner.email,
        firstName,
        lastName,
        verified: true,
      });

    const customer = await this.customerService.findOneByUserId(ctx, user.id, true);
    if (!customer) {
      throw new Error(`Seed creator "${owner.email}" could not be linked to a customer.`);
    }

    customer.firstName = firstName;
    customer.lastName = lastName;
    customer.emailAddress = owner.email;
    customer.customFields = {
      ...this.getCustomerCustomFields(customer),
      betterAuthUserId: owner.id,
      betterAuthRole: 'creator',
      creatorSlug: owner.creatorSlug,
      avatarUrl: owner.image,
    } as Customer['customFields'];
    await this.connection.getRepository(ctx, Customer).save(customer);
  }

  private async ensureProductSeed(
    ctx: RequestContext,
    owner: BetterAuthSeedIdentity,
    seed: DevelopmentProductSeed,
  ): Promise<void> {
    const existingProduct = await this.productService.findOneBySlug(ctx, seed.slug);
    const customFields = this.buildSeedProductCustomFields(owner, seed);

    if (!existingProduct) {
      const createdProduct = await this.productService.create(ctx, {
        enabled: seed.visibility === 'published',
        customFields,
        translations: [
          {
            languageCode: LanguageCode.en,
            name: seed.name,
            slug: seed.slug,
            description: seed.shortDescription,
          },
        ],
      });

      await this.productVariantService.create(ctx, [
        {
          productId: createdProduct.id,
          enabled: seed.visibility === 'published',
          sku: `${seed.seedKey.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-DEFAULT`,
          price: seed.price,
          stockOnHand: seed.visibility === 'archived' ? 0 : 999,
          translations: [{ languageCode: LanguageCode.en, name: `${seed.name} Default` }],
        },
      ]);
      return;
    }

    const updateInput: UpdateProductInput = {
      id: existingProduct.id,
      enabled: seed.visibility === 'published',
      customFields,
      translations: [
        {
          id: existingProduct.translations[0]?.id,
          languageCode: LanguageCode.en,
          name: seed.name,
          slug: seed.slug,
          description: seed.shortDescription,
        },
      ],
    };
    await this.productService.update(ctx, updateInput);

    const variants = await this.productVariantService.getVariantsByProductId(ctx, existingProduct.id);
    const primaryVariant = variants.items[0];
    if (!primaryVariant) {
      throw new Error(`Seed product "${seed.slug}" is missing a primary variant.`);
    }

    await this.productVariantService.update(ctx, [
      {
        id: primaryVariant.id,
        enabled: seed.visibility === 'published',
        price: seed.price,
        stockOnHand: seed.visibility === 'archived' ? 0 : 999,
        sku: `${seed.seedKey.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-DEFAULT`,
        translations: [
          {
            id: primaryVariant.translations[0]?.id,
            languageCode: LanguageCode.en,
            name: `${seed.name} Default`,
          },
        ],
      },
    ]);
  }

  private buildSeedProductCustomFields(
    owner: BetterAuthSeedIdentity,
    seed: DevelopmentProductSeed,
  ): Record<string, unknown> {
    return {
      seedKey: seed.seedKey,
      betterAuthUserId: owner.id,
      creatorName: seed.creatorName,
      creatorSlug: seed.creatorSlug,
      creatorAvatarUrl: seed.creatorAvatarUrl ?? owner.image,
      shortDescription: seed.shortDescription,
      tiptapDescription: tiptapDocument(seed.description),
      termsOfService: seed.termsOfService,
      platformTakeRate: seed.platformTakeRate,
      listingVisibility: seed.visibility,
      tagsJson: serializeTags(seed.tags),
      heroImageUrl: seed.heroImageUrl,
      heroTransparentUrl: seed.heroTransparentUrl ?? null,
      heroBackgroundUrl: seed.heroBackgroundUrl ?? null,
      previewColor: seed.previewColor,
      salesCount: seed.salesCount,
      revenueMinor: seed.revenue,
      viewCount: seed.viewCount,
      priceMin: seed.price,
      priceMax: seed.compareAtPrice ?? seed.price,
    };
  }
}
