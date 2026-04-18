/**
 * Purpose: Verify collaboration invitation helpers and lifecycle service flows.
 * Governing docs:
 *   - docs/architecture.md (§5 Collaboration plugin, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.6 Convex functions, §1.7 Svix, §2 plugin contracts)
 *   - docs/domain-model.md (§1 Collaboration, §2 identity model)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/docs/working-with-entity-manager/repository-api/
 *   - https://nodejs.org/api/crypto.html#cryptorandombytessize-callback
 *   - https://docs.svix.com/
 *   - packages/vendure-server/node_modules/typeorm/repository/Repository.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/invitation.service.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import {
  CollaborationInvitationService,
  InvitationStatus,
  generateInvitationToken,
  isInvitationExpired,
  validateSplitPercentages,
  type CollaborationInvitationNotification,
} from './invitation.service.js';
import { CollaborationEntity, CollaborationStatus } from './collaboration.entity.js';
import { InvitationEntity } from './invitation.entity.js';

class MemoryInvitationRepository {
  private readonly rows = new Map<string, InvitationEntity>();

  create(input: Partial<InvitationEntity>): InvitationEntity {
    return new InvitationEntity(input);
  }

  async save(entity: InvitationEntity): Promise<InvitationEntity> {
    const createdAt = entity.createdAt ?? new Date();
    entity.createdAt = createdAt;
    entity.updatedAt = new Date();
    this.rows.set(entity.id, cloneInvitation(entity));
    return cloneInvitation(entity);
  }

  async find(options?: { readonly where?: Partial<InvitationEntity> }): Promise<InvitationEntity[]> {
    return [...this.rows.values()]
      .filter((row) => (options?.where ? matchesWhere(row, options.where) : true))
      .map(cloneInvitation);
  }

  async findOneBy(where: Partial<InvitationEntity>): Promise<InvitationEntity | null> {
    return [...this.rows.values()].find((row) => matchesWhere(row, where)) ?? null;
  }

  seed(entity: InvitationEntity): void {
    this.rows.set(entity.id, cloneInvitation(entity));
  }
}

class MemoryCollaborationRepository {
  private readonly rows = new Map<string | number, CollaborationEntity>();
  private nextId = 1;

  create(input: Partial<CollaborationEntity>): CollaborationEntity {
    return new CollaborationEntity(input);
  }

  async save(entity: CollaborationEntity): Promise<CollaborationEntity> {
    if (!entity.id) {
      entity.id = this.nextId++;
    }
    entity.createdAt = entity.createdAt ?? new Date();
    entity.updatedAt = new Date();
    this.rows.set(entity.id, cloneCollaboration(entity));
    return cloneCollaboration(entity);
  }

  async find(options?: { readonly where?: Partial<CollaborationEntity> }): Promise<CollaborationEntity[]> {
    return [...this.rows.values()]
      .filter((row) => (options?.where ? matchesWhere(row, options.where) : true))
      .map(cloneCollaboration);
  }

  async existsBy(where: Partial<CollaborationEntity>): Promise<boolean> {
    return [...this.rows.values()].some((row) => matchesWhere(row, where));
  }

  seed(entity: CollaborationEntity): void {
    if (!entity.id) {
      entity.id = this.nextId++;
    }
    entity.createdAt = entity.createdAt ?? new Date();
    entity.updatedAt = entity.updatedAt ?? new Date();
    this.rows.set(entity.id, cloneCollaboration(entity));
  }
}

function cloneInvitation(entity: InvitationEntity): InvitationEntity {
  return new InvitationEntity({
    id: entity.id,
    productId: entity.productId,
    inviterId: entity.inviterId,
    inviteeEmail: entity.inviteeEmail,
    inviteeId: entity.inviteeId,
    splitPercent: entity.splitPercent,
    status: entity.status,
    token: entity.token,
    expiresAt: entity.expiresAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

function cloneCollaboration(entity: CollaborationEntity): CollaborationEntity {
  return new CollaborationEntity({
    id: entity.id,
    productId: entity.productId,
    creatorId: entity.creatorId,
    ownerCreatorId: entity.ownerCreatorId,
    revenueSharePercent: entity.revenueSharePercent,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

function matchesWhere<T extends object>(entity: T, where: Partial<T>): boolean {
  return Object.entries(where).every(([key, value]) => entity[key as keyof T] === value);
}

function createInvitationEntity(overrides: Partial<InvitationEntity> = {}): InvitationEntity {
  return new InvitationEntity({
    id: overrides.id ?? 'invitation-1',
    productId: overrides.productId ?? 'product-1',
    inviterId: overrides.inviterId ?? 'owner-1',
    inviteeEmail: overrides.inviteeEmail ?? 'collab@example.com',
    inviteeId: overrides.inviteeId ?? null,
    splitPercent: overrides.splitPercent ?? 25,
    status: overrides.status ?? InvitationStatus.Pending,
    token: overrides.token ?? 'token-1',
    expiresAt: overrides.expiresAt ?? new Date('2099-01-01T00:00:00.000Z'),
    createdAt: overrides.createdAt ?? new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-01T00:00:00.000Z'),
  });
}

function createService(options?: {
  readonly invitations?: MemoryInvitationRepository;
  readonly collaborations?: MemoryCollaborationRepository;
  readonly notifications?: CollaborationInvitationNotification[];
}) {
  const invitations = options?.invitations ?? new MemoryInvitationRepository();
  const collaborations = options?.collaborations ?? new MemoryCollaborationRepository();
  const notifications = options?.notifications ?? [];

  const service = new CollaborationInvitationService({
    invitations,
    collaborations,
    clock: () => new Date('2025-01-01T00:00:00.000Z'),
    idFactory: () => 'invitation-1',
    tokenFactory: () => 'generated-token',
    productDirectory: {
      async getProductById(productId) {
        if (productId === 'missing-product') {
          return null;
        }
        return {
          id: productId,
          name: productId === 'product-2' ? 'Sprite Sheet Pack' : 'Terrain Kit',
          ownerId: 'owner-1',
          ownerEmail: 'owner@example.com',
        };
      },
    },
    userDirectory: {
      async getUserIdByEmail(email) {
        if (email === 'missing-user@example.com') {
          return null;
        }
        return email === 'collab@example.com' ? 'creator-2' : 'creator-3';
      },
    },
    notifier: {
      async notifyInvitationCreated(notification) {
        notifications.push(notification);
      },
    },
  });

  return { service, invitations, collaborations, notifications };
}

describe('generateInvitationToken', () => {
  it('returns unique secure-looking tokens', () => {
    const first = generateInvitationToken();
    const second = generateInvitationToken();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[a-f0-9]+$/);
    expect(first.length).toBeGreaterThanOrEqual(64);
  });
});

describe('isInvitationExpired', () => {
  it('returns true when the invitation expiry is in the past', () => {
    expect(
      isInvitationExpired(
        createInvitationEntity({
          expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        }),
        new Date('2025-01-01T00:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('returns false when the invitation expiry is in the future', () => {
    expect(
      isInvitationExpired(
        createInvitationEntity({
          expiresAt: new Date('2025-01-08T00:00:00.000Z'),
        }),
        new Date('2025-01-01T00:00:00.000Z'),
      ),
    ).toBe(false);
  });
});

describe('validateSplitPercentages', () => {
  it('allows totals up to 100%', () => {
    expect(validateSplitPercentages([20, 30], 50)).toBeUndefined();
  });

  it('rejects totals above 100%', () => {
    expect(validateSplitPercentages([70], 40)).toMatch(/100/i);
  });
});

describe('CollaborationInvitationService', () => {
  it('only allows the product owner to create an invitation', async () => {
    const { service } = createService();

    await expect(
      service.createInvitation('product-1', 'intruder@example.com', 'collab@example.com', 25),
    ).rejects.toThrow(/owner/i);
  });

  it('rejects proposed splits that would push active collaboration totals over 100%', async () => {
    const collaborations = new MemoryCollaborationRepository();
    collaborations.seed(
      new CollaborationEntity({
        productId: 'product-1',
        creatorId: 'creator-9',
        ownerCreatorId: 'owner-1',
        revenueSharePercent: 70,
        status: CollaborationStatus.Active,
      }),
    );

    const { service } = createService({ collaborations });

    await expect(
      service.createInvitation('product-1', 'owner@example.com', 'collab@example.com', 40),
    ).rejects.toThrow(/100/i);
  });

  it('marks expired invitations as expired and rejects acceptance', async () => {
    const invitations = new MemoryInvitationRepository();
    invitations.seed(
      createInvitationEntity({
        expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        token: 'expired-token',
      }),
    );

    const { service } = createService({ invitations });

    await expect(service.acceptInvitation('expired-token')).rejects.toThrow(/expired/i);

    const updated = await invitations.findOneBy({ token: 'expired-token' });
    expect(updated?.status).toBe(InvitationStatus.Expired);
  });

  it('only allows the inviter to revoke a pending invitation', async () => {
    const invitations = new MemoryInvitationRepository();
    invitations.seed(createInvitationEntity({ id: 'invitation-2' }));
    const { service } = createService({ invitations });

    await expect(service.revokeInvitation('invitation-2', 'owner-2')).rejects.toThrow(/inviter/i);
  });

  it('accepting an invitation creates an active collaboration record', async () => {
    const invitations = new MemoryInvitationRepository();
    invitations.seed(
      createInvitationEntity({
        token: 'accept-token',
        inviteeEmail: 'collab@example.com',
        splitPercent: 35,
      }),
    );

    const { service, collaborations } = createService({ invitations });

    const collaboration = await service.acceptInvitation('accept-token');

    expect(collaboration).toMatchObject({
      productId: 'product-1',
      creatorId: 'creator-2',
      ownerCreatorId: 'owner-1',
      revenueSharePercent: 35,
      status: CollaborationStatus.Active,
    });

    const persisted = await collaborations.find({ where: { productId: 'product-1' } });
    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.creatorId).toBe('creator-2');

    const updatedInvitation = await invitations.findOneBy({ token: 'accept-token' });
    expect(updatedInvitation?.status).toBe(InvitationStatus.Accepted);
    expect(updatedInvitation?.inviteeId).toBe('creator-2');
  });

  it('createInvitation records a pending invitation and prepares a notification payload', async () => {
    const { service, notifications } = createService();

    const invitation = await service.createInvitation(
      'product-2',
      'owner@example.com',
      'collab@example.com',
      20,
    );

    expect(invitation.status).toBe(InvitationStatus.Pending);
    expect(invitation.token).toBe('generated-token');
    expect(invitation.expiresAt.toISOString()).toBe('2025-01-08T00:00:00.000Z');
    expect(notifications).toEqual([
      {
        creatorId: 'owner-1',
        eventType: 'collaboration.invited',
        invitationId: 'invitation-1',
        inviteeEmail: 'collab@example.com',
        inviterId: 'owner-1',
        productId: 'product-2',
        productName: 'Sprite Sheet Pack',
        splitPercent: 20,
        token: 'generated-token',
      },
    ]);
  });

  it('getPendingInvitationsForUser returns only pending invitations for the email', async () => {
    const invitations = new MemoryInvitationRepository();
    invitations.seed(createInvitationEntity({ inviteeEmail: 'collab@example.com', token: 'a' }));
    invitations.seed(
      createInvitationEntity({
        id: 'invitation-2',
        inviteeEmail: 'collab@example.com',
        token: 'b',
        status: InvitationStatus.Accepted,
      }),
    );
    invitations.seed(
      createInvitationEntity({
        id: 'invitation-3',
        inviteeEmail: 'other@example.com',
        token: 'c',
      }),
    );

    const { service } = createService({ invitations });

    const pending = await service.getPendingInvitationsForUser('collab@example.com');

    expect(pending.map((invitation) => invitation.token)).toEqual(['a']);
  });

  it('declineInvitation marks a pending invitation as declined', async () => {
    const invitations = new MemoryInvitationRepository();
    invitations.seed(createInvitationEntity({ token: 'decline-token' }));
    const { service } = createService({ invitations });

    const invitation = await service.declineInvitation('decline-token');

    expect(invitation.status).toBe(InvitationStatus.Declined);
  });

  it('exposes the last prepared notification when no notifier is configured', async () => {
    const invitations = new MemoryInvitationRepository();
    const collaborations = new MemoryCollaborationRepository();
    const service = new CollaborationInvitationService({
      invitations,
      collaborations,
      clock: () => new Date('2025-01-01T00:00:00.000Z'),
      idFactory: () => 'invitation-9',
      tokenFactory: () => 'token-9',
      productDirectory: {
        async getProductById(productId) {
          return {
            id: productId,
            name: 'Terrain Kit',
            ownerId: 'owner-1',
            ownerEmail: 'owner@example.com',
          };
        },
      },
      userDirectory: {
        async getUserIdByEmail() {
          return 'creator-2';
        },
      },
    });

    await service.createInvitation('product-1', 'owner@example.com', 'collab@example.com', 25);

    expect(service.getLastPreparedNotification()).toMatchObject({
      eventType: 'collaboration.invited',
      invitationId: 'invitation-9',
      token: 'token-9',
    });
  });

  it('does not send duplicate invitations to an existing collaborator email', async () => {
    const collaborations = new MemoryCollaborationRepository();
    collaborations.seed(
      new CollaborationEntity({
        productId: 'product-1',
        creatorId: 'creator-2',
        ownerCreatorId: 'owner-1',
        revenueSharePercent: 25,
        status: CollaborationStatus.Active,
      }),
    );
    const { service } = createService({ collaborations });
    vi.spyOn(service, 'lookupCollaboratorEmail').mockResolvedValue('collab@example.com');

    await expect(
      service.createInvitation('product-1', 'owner@example.com', 'collab@example.com', 10),
    ).rejects.toThrow(/already a collaborator/i);
  });
});
