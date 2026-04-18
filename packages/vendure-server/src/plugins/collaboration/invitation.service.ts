/**
 * Purpose: Manage collaboration invitation creation, response, expiry, revocation, and notification preparation.
 * Governing docs:
 *   - docs/architecture.md (§5 Collaboration plugin, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.6 Convex functions, §1.7 Svix, §2 plugin contracts)
 *   - docs/domain-model.md (§1 Collaboration, §2 identity model)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://nodejs.org/api/crypto.html#cryptorandombytessize-callback
 *   - https://docs.svix.com/
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/#create-spans
 *   - packages/vendure-server/node_modules/typeorm/repository/Repository.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/invitation.service.test.ts
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { SpanStatusCode, trace, type Tracer } from '@opentelemetry/api';
import { CollaborationEntity, CollaborationStatus } from './collaboration.entity.js';
import { InvitationEntity } from './invitation.entity.js';

export enum InvitationStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Declined = 'declined',
  Expired = 'expired',
  Revoked = 'revoked',
}

interface InvitationRepository {
  create(input: Partial<InvitationEntity>): InvitationEntity;
  save(entity: InvitationEntity): Promise<InvitationEntity>;
  find(options?: { readonly where?: Partial<InvitationEntity> }): Promise<InvitationEntity[]>;
  findOneBy(where: Partial<InvitationEntity>): Promise<InvitationEntity | null>;
}

interface CollaborationRepository {
  create(input: Partial<CollaborationEntity>): CollaborationEntity;
  save(entity: CollaborationEntity): Promise<CollaborationEntity>;
  find(options?: { readonly where?: Partial<CollaborationEntity> }): Promise<CollaborationEntity[]>;
  existsBy(where: Partial<CollaborationEntity>): Promise<boolean>;
}

interface ProductDirectoryEntry {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly ownerEmail: string;
}

interface ProductDirectory {
  getProductById(productId: string): Promise<ProductDirectoryEntry | null>;
}

interface UserDirectory {
  getUserIdByEmail(email: string): Promise<string | null>;
  getEmailByUserId?(userId: string): Promise<string | null>;
}

interface InvitationNotifier {
  notifyInvitationCreated(notification: CollaborationInvitationNotification): Promise<void>;
}

export interface CollaborationInvitationNotification {
  readonly creatorId: string;
  readonly eventType: 'collaboration.invited';
  readonly invitationId: string;
  readonly inviteeEmail: string;
  readonly inviterId: string;
  readonly productId: string;
  readonly productName: string;
  readonly splitPercent: number;
  readonly token: string;
}

export interface CollaborationInvitationServiceDependencies {
  readonly invitations: InvitationRepository;
  readonly collaborations: CollaborationRepository;
  readonly productDirectory: ProductDirectory;
  readonly userDirectory: UserDirectory;
  readonly notifier?: InvitationNotifier;
  readonly tracer?: Tracer;
  readonly clock?: () => Date;
  readonly idFactory?: () => string;
  readonly tokenFactory?: () => string;
}

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

export function isInvitationExpired(
  invitation: Pick<InvitationEntity, 'expiresAt'>,
  now = new Date(),
): boolean {
  return invitation.expiresAt.getTime() <= now.getTime();
}

export function validateSplitPercentages(existing: number[], proposed: number): string | undefined {
  if (!Number.isFinite(proposed)) {
    return 'proposed split percent must be a finite number';
  }
  if (proposed <= 0) {
    return 'proposed split percent must be greater than 0';
  }
  if (proposed > 100) {
    return 'proposed split percent must be at most 100';
  }

  const total = existing.reduce((sum, value) => sum + value, 0) + proposed;
  if (total > 100) {
    return `total collaboration split percent (${total}%) exceeds 100%`;
  }

  return undefined;
}

export class CollaborationInvitationService {
  private readonly tracer: Tracer;
  private readonly clock: () => Date;
  private readonly idFactory: () => string;
  private readonly tokenFactory: () => string;
  private lastPreparedNotification: CollaborationInvitationNotification | null = null;

  constructor(private readonly deps: CollaborationInvitationServiceDependencies) {
    this.tracer = deps.tracer ?? trace.getTracer('simket-collaboration-invitations');
    this.clock = deps.clock ?? (() => new Date());
    this.idFactory = deps.idFactory ?? (() => randomUUID());
    this.tokenFactory = deps.tokenFactory ?? generateInvitationToken;
  }

  async createInvitation(
    productId: string,
    inviterEmail: string,
    inviteeEmail: string,
    splitPercent: number,
  ): Promise<InvitationEntity> {
    return this.tracer.startActiveSpan('collaborationInvitations.create', async (span) => {
      try {
        const normalizedInviterEmail = normalizeEmail(inviterEmail);
        const normalizedInviteeEmail = normalizeEmail(inviteeEmail);
        const now = this.clock();
        const product = await this.requireProduct(productId);
        span.setAttribute('collaboration.product_id', productId);
        span.setAttribute('collaboration.inviter_id', product.ownerId);

        if (product.ownerEmail !== normalizedInviterEmail) {
          throw new Error('Only the product owner can invite collaborators');
        }

        const activeCollaborationPercents = await this.getActiveSplitPercentages(productId);
        const splitValidationError = validateSplitPercentages(activeCollaborationPercents, splitPercent);
        if (splitValidationError) {
          throw new Error(splitValidationError);
        }

        const inviteeUserId = await this.deps.userDirectory.getUserIdByEmail(normalizedInviteeEmail);
        if (
          inviteeUserId &&
          (await this.deps.collaborations.existsBy({
            productId,
            creatorId: inviteeUserId,
            status: CollaborationStatus.Active,
          }))
        ) {
          throw new Error(`${normalizedInviteeEmail} is already a collaborator on this product`);
        }

        const activeCollaborations = await this.deps.collaborations.find({
          where: {
            productId,
            status: CollaborationStatus.Active,
          },
        });
        for (const collaboration of activeCollaborations) {
          const collaboratorEmail = await this.lookupCollaboratorEmail(collaboration.creatorId);
          if (collaboratorEmail === normalizedInviteeEmail) {
            throw new Error(`${normalizedInviteeEmail} is already a collaborator on this product`);
          }
        }

        const entity = this.deps.invitations.create({
          id: this.idFactory(),
          productId,
          inviterId: product.ownerId,
          inviteeEmail: normalizedInviteeEmail,
          inviteeId: null,
          splitPercent,
          status: InvitationStatus.Pending,
          token: this.tokenFactory(),
          expiresAt: new Date(now.getTime() + INVITATION_EXPIRY_MS),
        });
        const savedInvitation = await this.deps.invitations.save(entity);

        const notification: CollaborationInvitationNotification = {
          creatorId: product.ownerId,
          eventType: 'collaboration.invited',
          invitationId: savedInvitation.id,
          inviteeEmail: savedInvitation.inviteeEmail,
          inviterId: savedInvitation.inviterId,
          productId: savedInvitation.productId,
          productName: product.name,
          splitPercent: savedInvitation.splitPercent,
          token: savedInvitation.token,
        };
        this.lastPreparedNotification = notification;

        if (this.deps.notifier) {
          await this.deps.notifier.notifyInvitationCreated(notification);
        }

        return savedInvitation;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async acceptInvitation(token: string): Promise<CollaborationEntity> {
    return this.tracer.startActiveSpan('collaborationInvitations.accept', async (span) => {
      try {
        const invitation = await this.requireInvitationByToken(token);
        span.setAttribute('collaboration.invitation_id', invitation.id);
        if (isInvitationExpired(invitation, this.clock())) {
          invitation.status = InvitationStatus.Expired;
          await this.deps.invitations.save(invitation);
          throw new Error('Invitation has expired');
        }
        if (invitation.status === InvitationStatus.Accepted) {
          throw new Error('Invitation has already been accepted');
        }
        if (invitation.status !== InvitationStatus.Pending) {
          throw new Error(`Invitation cannot be accepted from status "${invitation.status}"`);
        }

        const inviteeId = await this.deps.userDirectory.getUserIdByEmail(invitation.inviteeEmail);
        if (!inviteeId) {
          throw new Error(`No collaborator account exists for ${invitation.inviteeEmail}`);
        }

        const splitValidationError = validateSplitPercentages(
          await this.getActiveSplitPercentages(invitation.productId),
          invitation.splitPercent,
        );
        if (splitValidationError) {
          throw new Error(splitValidationError);
        }

        const collaboration = this.deps.collaborations.create({
          productId: invitation.productId,
          creatorId: inviteeId,
          ownerCreatorId: invitation.inviterId,
          revenueSharePercent: invitation.splitPercent,
          status: CollaborationStatus.Active,
        });
        const savedCollaboration = await this.deps.collaborations.save(collaboration);

        invitation.inviteeId = inviteeId;
        invitation.status = InvitationStatus.Accepted;
        await this.deps.invitations.save(invitation);

        return savedCollaboration;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async declineInvitation(token: string): Promise<InvitationEntity> {
    return this.tracer.startActiveSpan('collaborationInvitations.decline', async (span) => {
      try {
        const invitation = await this.requireInvitationByToken(token);
        span.setAttribute('collaboration.invitation_id', invitation.id);

        if (isInvitationExpired(invitation, this.clock())) {
          invitation.status = InvitationStatus.Expired;
          return this.deps.invitations.save(invitation);
        }

        if (invitation.status !== InvitationStatus.Pending) {
          throw new Error('Only pending invitations can be declined');
        }

        invitation.status = InvitationStatus.Declined;
        return this.deps.invitations.save(invitation);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async revokeInvitation(id: string, inviterId: string): Promise<InvitationEntity> {
    return this.tracer.startActiveSpan('collaborationInvitations.revoke', async (span) => {
      try {
        const invitation = await this.requireInvitationById(id);
        span.setAttribute('collaboration.invitation_id', invitation.id);

        if (invitation.inviterId !== inviterId) {
          throw new Error('Only the inviter can revoke this invitation');
        }
        if (invitation.status !== InvitationStatus.Pending) {
          throw new Error('Only pending invitations can be revoked');
        }

        invitation.status = InvitationStatus.Revoked;
        return this.deps.invitations.save(invitation);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getInvitationsForProduct(productId: string): Promise<InvitationEntity[]> {
    return this.deps.invitations.find({ where: { productId } });
  }

  async getPendingInvitationsForUser(email: string): Promise<InvitationEntity[]> {
    return this.deps.invitations.find({
      where: {
        inviteeEmail: normalizeEmail(email),
        status: InvitationStatus.Pending,
      },
    });
  }

  getLastPreparedNotification(): CollaborationInvitationNotification | null {
    return this.lastPreparedNotification;
  }

  async lookupCollaboratorEmail(userId: string): Promise<string | null> {
    return this.deps.userDirectory.getEmailByUserId?.(userId) ?? null;
  }

  private async getActiveSplitPercentages(productId: string): Promise<number[]> {
    const activeCollaborations = await this.deps.collaborations.find({
      where: {
        productId,
        status: CollaborationStatus.Active,
      },
    });

    return activeCollaborations.map((collaboration) => collaboration.revenueSharePercent);
  }
  private async requireProduct(productId: string): Promise<ProductDirectoryEntry> {
    const product = await this.deps.productDirectory.getProductById(productId);
    if (!product) {
      throw new Error(`Product "${productId}" does not exist`);
    }
    return {
      ...product,
      ownerEmail: normalizeEmail(product.ownerEmail),
    };
  }

  private async requireInvitationByToken(token: string): Promise<InvitationEntity> {
    const invitation = await this.deps.invitations.findOneBy({ token });
    if (!invitation) {
      throw new Error('Invitation token is invalid');
    }
    return invitation;
  }

  private async requireInvitationById(id: string): Promise<InvitationEntity> {
    const invitation = await this.deps.invitations.findOneBy({ id });
    if (!invitation) {
      throw new Error(`Invitation "${id}" does not exist`);
    }
    return invitation;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
