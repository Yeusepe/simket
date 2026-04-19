/**
 * Purpose: Gift code generation, validation, and status management.
 *
 * All functions are pure/IO-free for testability. The plugin layer
 * handles persistence (Vendure entities) and event publishing.
 *
 * Governing docs:
 *   - docs/architecture.md §4.3 (Orders and entitlements)
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/custom-fields/
 * Tests:
 *   - packages/vendure-server/src/plugins/gifts/gift.service.test.ts
 */
import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { ProductService, type RequestContext, type TransactionalConnection } from '@vendure/core';
import { GiftEntity } from './gift.entity.js';
import { GiftStatus, type GiftFilter, type GiftRecord } from './gift.types.js';

/**
 * Characters used in gift codes. Ambiguous characters (0, O, I, 1, L) are
 * excluded to improve readability when sharing codes.
 */
const GIFT_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 16;
const GROUP_SIZE = 4;
const tracer = trace.getTracer('simket-gifts');

interface GiftRepository {
  create(input: Partial<GiftEntity>): GiftEntity;
  save(entity: GiftEntity): Promise<GiftEntity>;
  find(options?: {
    readonly where?: unknown;
    readonly order?: {
      readonly createdAt?: 'ASC' | 'DESC';
    };
  }): Promise<GiftEntity[]>;
  findOneBy(where: Partial<GiftEntity>): Promise<GiftEntity | null>;
  existsBy(where: Partial<GiftEntity>): Promise<boolean>;
}

/**
 * Generate a cryptographically random gift code.
 *
 * Format: XXXX-XXXX-XXXX-XXXX (16 alphanumeric chars, grouped by 4)
 * Alphabet excludes: 0, O, I, 1, L (ambiguous characters)
 *
 * @returns Formatted gift code string
 */
export function generateGiftCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let raw = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const byte = bytes[i] ?? 0;
    raw += GIFT_CODE_ALPHABET[byte % GIFT_CODE_ALPHABET.length] ?? GIFT_CODE_ALPHABET[0] ?? 'A';
  }
  return formatGiftCodeForDisplay(raw);
}

/**
 * Validate a gift code format. Does NOT check if the code exists in the database.
 */
export function validateGiftCode(code: string): {
  valid: boolean;
  error?: string;
  normalizedCode?: string;
} {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: 'Gift code must not be empty' };
  }

  const normalized = code.toUpperCase().replace(/-/g, '');

  if (normalized.length !== CODE_LENGTH) {
    return {
      valid: false,
      error: `Gift code must be ${CODE_LENGTH} characters (got ${normalized.length})`,
    };
  }

  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return { valid: false, error: 'Gift code contains invalid characters' };
  }

  return { valid: true, normalizedCode: normalized };
}

/**
 * Check if a gift in the given status can be claimed.
 */
export function isGiftClaimable(status: GiftStatus): boolean {
  return status === GiftStatus.PURCHASED;
}

/**
 * Format a raw gift code string with hyphens for display.
 *
 * @param code - Raw or formatted code (hyphens are stripped first)
 * @returns Formatted code: XXXX-XXXX-XXXX-XXXX
 */
export function formatGiftCodeForDisplay(code: string): string {
  const raw = code.toUpperCase().replace(/-/g, '');
  const groups: string[] = [];
  for (let i = 0; i < raw.length; i += GROUP_SIZE) {
    groups.push(raw.slice(i, i + GROUP_SIZE));
  }
  return groups.join('-');
}

@Injectable()
export class GiftService {
  constructor(
    private readonly connection: Pick<TransactionalConnection, 'getRepository'>,
    private readonly productService: ProductService,
  ) {}

  async sendGift(
    senderUserId: string,
    productId: string,
    recipientEmail: string,
    ctx: RequestContext,
  ): Promise<GiftRecord> {
    return tracer.startActiveSpan('gifts.send', async (span) => {
      try {
        const normalizedSenderUserId = normalizeEntityId(senderUserId, 'senderUserId');
        const normalizedProductId = normalizeEntityId(productId, 'productId');
        const normalizedRecipientEmail = normalizeEmail(recipientEmail);

        await this.requireProduct(ctx, normalizedProductId);
        const giftCode = await this.generateUniqueGiftCode(ctx);
        const entity = await this.getRepository(ctx).save(
          this.getRepository(ctx).create({
            giftCode,
            productId: normalizedProductId,
            senderUserId: normalizedSenderUserId,
            recipientEmail: normalizedRecipientEmail,
            status: GiftStatus.PURCHASED,
          }),
        );

        return mapGift(entity);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async claimGift(recipientUserId: string, giftCode: string, ctx: RequestContext): Promise<GiftRecord> {
    return tracer.startActiveSpan('gifts.claim', async (span) => {
      try {
        const normalizedRecipientUserId = normalizeEntityId(recipientUserId, 'recipientUserId');
        const validation = validateGiftCode(giftCode);

        if (!validation.valid || !validation.normalizedCode) {
          throw new Error(validation.error ?? 'Gift code is invalid.');
        }

        const gift = await this.getRepository(ctx).findOneBy({ giftCode: validation.normalizedCode });
        if (!gift) {
          throw new Error(`Gift code "${giftCode}" does not exist.`);
        }
        if (gift.recipientUserId && gift.recipientUserId !== normalizedRecipientUserId) {
          throw new Error('This gift has already been claimed by another user.');
        }
        if (!isGiftClaimable(gift.status as GiftStatus)) {
          throw new Error(`Gift code "${giftCode}" is not claimable.`);
        }

        gift.recipientUserId = normalizedRecipientUserId;
        gift.claimedAt = new Date();
        gift.status = GiftStatus.CLAIMED;

        return mapGift(await this.getRepository(ctx).save(gift));
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getMyGifts(activeUserId: string, ctx: RequestContext): Promise<GiftRecord[]> {
    const normalizedUserId = normalizeEntityId(activeUserId, 'activeUserId');
    const gifts = await this.getRepository(ctx).find({
      where: [
        { senderUserId: normalizedUserId },
        { recipientUserId: normalizedUserId },
      ],
      order: { createdAt: 'DESC' },
    });

    return gifts.map((gift) => mapGift(gift));
  }

  async getGift(id: string, ctx: RequestContext): Promise<GiftRecord | null> {
    const gift = await this.getRepository(ctx).findOneBy({ id: normalizeEntityId(id, 'giftId') });
    return gift ? mapGift(gift) : null;
  }

  async listGifts(filter: GiftFilter | undefined, ctx: RequestContext): Promise<GiftRecord[]> {
    const gifts = await this.getRepository(ctx).find({
      order: { createdAt: 'DESC' },
    });

    return gifts
      .filter((gift) => matchesGiftFilter(gift, filter))
      .map((gift) => mapGift(gift));
  }

  private getRepository(ctx: RequestContext): GiftRepository {
    return this.connection.getRepository(ctx, GiftEntity) as unknown as GiftRepository;
  }

  private async requireProduct(ctx: RequestContext, productId: string): Promise<void> {
    const product = await this.productService.findOne(ctx, productId);
    if (!product) {
      throw new Error(`Gift product "${productId}" does not exist.`);
    }
  }

  private async generateUniqueGiftCode(ctx: RequestContext): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const rawCode = generateGiftCode();
      const validation = validateGiftCode(rawCode);
      if (!validation.valid || !validation.normalizedCode) {
        continue;
      }

      if (!(await this.getRepository(ctx).existsBy({ giftCode: validation.normalizedCode }))) {
        return validation.normalizedCode;
      }
    }

    throw new Error('Unable to generate a unique gift code.');
  }
}

function normalizeEntityId(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`Gift ${fieldName} is required.`);
  }

  return normalized;
}

function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Gift recipientEmail must be a valid email address.');
  }
  return normalized;
}

function mapGift(entity: GiftEntity): GiftRecord {
  return {
    id: String(entity.id),
    giftCode: formatGiftCodeForDisplay(entity.giftCode),
    productId: entity.productId,
    senderUserId: entity.senderUserId,
    recipientEmail: entity.recipientEmail,
    recipientUserId: entity.recipientUserId,
    status: entity.status as GiftStatus,
    claimedAt: entity.claimedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function matchesGiftFilter(entity: GiftEntity, filter: GiftFilter | undefined): boolean {
  if (!filter) {
    return true;
  }

  return (
    (!filter.status || entity.status === filter.status)
    && (!filter.recipientEmail || entity.recipientEmail === filter.recipientEmail.trim().toLowerCase())
    && (!filter.senderUserId || entity.senderUserId === filter.senderUserId.trim())
    && (!filter.recipientUserId || entity.recipientUserId === filter.recipientUserId.trim())
    && (!filter.productId || entity.productId === filter.productId.trim())
  );
}

export { GiftStatus };
export type { GiftFilter, GiftRecord };
