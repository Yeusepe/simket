/**
 * Purpose: Provide product metadata validation helpers plus Product-backed metadata persistence.
 *
 * Handles: try-avatar URL validation, compatibility flags parsing/validation,
 * avatar ranking clamping, known flag definitions, and persisted product metadata reads/writes.
 *
 * Governing docs:
 *   - docs/architecture.md §4.1 (Product entity)
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/custom-fields/
 * Tests:
 *   - packages/vendure-server/src/plugins/product-metadata/product-metadata.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import type { RequestContext } from '@vendure/core';
import { ProductService } from '@vendure/core';

/**
 * Known compatibility flags for products (especially VR avatars and game assets).
 * Unknown flags are allowed but will produce a warning.
 */
export const KNOWN_COMPATIBILITY_FLAGS: readonly string[] = [
  // VR avatar tools
  'vrcfury',
  'poiyomi',
  'lilToon',
  'av3emulator',
  'gogo-loco',
  'vrc-sdk3',
  'vrc-sdk2',
  'gesture-manager',
  'd4rkAvatarOptimizer',
  // Game engines / platforms
  'unity',
  'unreal',
  'godot',
  'blender',
  // Asset formats
  'fbx',
  'vrm',
  'glb',
  'gltf',
  'unitypackage',
  // Other common tools
  'substance-painter',
  'marvelous-designer',
  'zbrush',
] as const;

/** Avatar ranking range: 0 (unranked) to 5 (best). */
const MIN_AVATAR_RANKING = 0;
const MAX_AVATAR_RANKING = 5;

/**
 * Validate a try-avatar URL. Returns an error message or undefined if valid.
 * Empty/null values are accepted (field is optional).
 */
export function validateTryAvatarUrl(value: string | null | undefined): string | undefined {
  if (!value || value.trim().length === 0) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'tryAvatarUrl must use http or https protocol';
    }
    return undefined;
  } catch {
    return 'tryAvatarUrl must be a valid URL';
  }
}

/**
 * Parse a comma-separated compatibility flags string into an array.
 */
export function parseCompatibilityFlags(value: string | null | undefined): string[] {
  if (!value || value.trim().length === 0) return [];
  return value
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

/**
 * Validate compatibility flags — unknown flags produce warnings (not errors).
 * All flags are allowed; we just inform creators about unrecognized ones.
 */
export function validateCompatibilityFlags(flags: string[]): {
  valid: boolean;
  unknownFlags: string[];
} {
  const unknownFlags = flags.filter(
    (f) => !KNOWN_COMPATIBILITY_FLAGS.includes(f),
  );
  return { valid: true, unknownFlags };
}

/**
 * Clamp and round an avatar ranking to the valid range [0, 5].
 */
export function clampAvatarRanking(value: number): number {
  if (!Number.isFinite(value)) return MIN_AVATAR_RANKING;
  return Math.min(MAX_AVATAR_RANKING, Math.max(MIN_AVATAR_RANKING, Math.round(value)));
}

type ProductLike = NonNullable<Awaited<ReturnType<ProductService['findOne']>>>;

export interface ProductMetadataRecord {
  readonly productId: string;
  readonly tryAvatarUrl: string | null;
  readonly avatarRanking: number;
  readonly compatibilityFlags: readonly string[];
  readonly platformSupport: readonly string[];
  readonly usesVrcFury: boolean;
  readonly customIcons: Record<string, string>;
  readonly metadata: Record<string, unknown>;
}

function normalizeMetadataPayload(metadata: unknown): Record<string, unknown> {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    throw new Error('Product metadata must be a JSON object.');
  }

  return { ...metadata } as Record<string, unknown>;
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return parseCompatibilityFlags(value);
  }
  if (value == null) {
    return [];
  }

  throw new Error('Metadata list values must be provided as an array of strings or a comma-separated string.');
}

function parseMetadataJson(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}

function parseCustomIcons(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

@Injectable()
export class ProductMetadataService {
  constructor(private readonly productService: ProductService) {}

  async setProductMetadata(
    ctx: RequestContext,
    productId: string,
    metadata: unknown,
  ): Promise<ProductMetadataRecord> {
    const product = await this.requireProduct(ctx, productId);
    const current = this.mapProductMetadata(product);
    const payload = normalizeMetadataPayload(metadata);

    const compatibilityFlags =
      'compatibilityFlags' in payload
        ? parseStringList(payload.compatibilityFlags)
        : [...current.compatibilityFlags];
    const platformSupport =
      'platformSupport' in payload ? parseStringList(payload.platformSupport) : [...current.platformSupport];

    if (payload.usesVrcFury === true && !compatibilityFlags.includes('vrcfury')) {
      compatibilityFlags.push('vrcfury');
    }
    if (payload.usesVrcFury === false) {
      const withoutVrcFury = compatibilityFlags.filter((flag) => flag !== 'vrcfury');
      compatibilityFlags.splice(0, compatibilityFlags.length, ...withoutVrcFury);
    }

    const tryAvatarUrl =
      'tryAvatarUrl' in payload
        ? payload.tryAvatarUrl == null
          ? null
          : String(payload.tryAvatarUrl)
        : current.tryAvatarUrl;
    const tryAvatarError = validateTryAvatarUrl(tryAvatarUrl);
    if (tryAvatarError) {
      throw new Error(tryAvatarError);
    }

    const avatarRanking =
      'avatarRanking' in payload
        ? clampAvatarRanking(Number(payload.avatarRanking))
        : current.avatarRanking;

    const mergedMetadata: Record<string, unknown> = {
      ...current.metadata,
      ...payload,
      tryAvatarUrl,
      avatarRanking,
      compatibilityFlags,
      platformSupport,
      usesVrcFury: compatibilityFlags.includes('vrcfury'),
    };

    await this.productService.update(ctx, {
      id: String(productId),
      customFields: {
        ...((product.customFields ?? {}) as Record<string, unknown>),
        tryAvatarUrl,
        avatarRanking,
        compatibilityFlags: compatibilityFlags.join(','),
        platformSupport: platformSupport.join(','),
        metadataJson: JSON.stringify(mergedMetadata),
      },
    });

    return this.getProductMetadata(ctx, productId) as Promise<ProductMetadataRecord>;
  }

  async getProductMetadata(
    ctx: RequestContext,
    productId: string,
  ): Promise<ProductMetadataRecord | null> {
    const product = await this.productService.findOne(ctx, String(productId));
    return product ? this.mapProductMetadata(product) : null;
  }

  private async requireProduct(ctx: RequestContext, productId: string): Promise<ProductLike> {
    const product = await this.productService.findOne(ctx, String(productId));
    if (!product) {
      throw new Error(`Product "${productId}" was not found.`);
    }

    return product;
  }

  private mapProductMetadata(product: ProductLike): ProductMetadataRecord {
    const customFields = (product.customFields ?? {}) as Record<string, unknown>;
    const metadata = parseMetadataJson(customFields.metadataJson);
    const compatibilityFlags = parseCompatibilityFlags(
      typeof customFields.compatibilityFlags === 'string' ? customFields.compatibilityFlags : '',
    );
    const platformSupport = parseCompatibilityFlags(
      typeof customFields.platformSupport === 'string' ? customFields.platformSupport : '',
    );
    const customIcons = parseCustomIcons(metadata.customIcons);
    const tryAvatarUrl =
      typeof customFields.tryAvatarUrl === 'string' && customFields.tryAvatarUrl.trim().length > 0
        ? customFields.tryAvatarUrl
        : null;
    const avatarRanking = clampAvatarRanking(Number(customFields.avatarRanking ?? 0));

    return {
      productId: String(product.id),
      tryAvatarUrl,
      avatarRanking,
      compatibilityFlags,
      platformSupport,
      usesVrcFury: compatibilityFlags.includes('vrcfury'),
      customIcons,
      metadata: {
        ...metadata,
        tryAvatarUrl,
        avatarRanking,
        compatibilityFlags,
        platformSupport,
        usesVrcFury: compatibilityFlags.includes('vrcfury'),
        customIcons,
      },
    };
  }
}
