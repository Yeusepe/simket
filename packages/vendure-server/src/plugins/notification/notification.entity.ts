/**
 * Purpose: Persist in-app notifications for authenticated Vendure users.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/domain-model.md (§1 core records)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/entities
 * Tests:
 *   - packages/vendure-server/src/plugins/notification/notification.service.test.ts
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const NOTIFICATION_TYPES = [
  'purchase',
  'collaboration_invite',
  'collaboration_accepted',
  'product_update',
  'price_drop',
  'system',
  'gift_received',
  'review',
  'settlement',
] as const;

export type NotificationPayload = Record<string, unknown>;
export type NotificationTypeValue = typeof NOTIFICATION_TYPES[number];

export enum NotificationType {
  Purchase = 'purchase',
  CollaborationInvite = 'collaboration_invite',
  CollaborationAccepted = 'collaboration_accepted',
  ProductUpdate = 'product_update',
  PriceDrop = 'price_drop',
  System = 'system',
  GiftReceived = 'gift_received',
  Review = 'review',
  Settlement = 'settlement',
}

@Entity('notification')
@Index('idx_notification_recipient_created', ['recipientId', 'createdAt'])
@Index('idx_notification_recipient_read_created', ['recipientId', 'read', 'createdAt'])
@Index('idx_notification_recipient_type_created', ['recipientId', 'type', 'createdAt'])
export class NotificationEntity {
  constructor(input?: Partial<NotificationEntity>) {
    if (input) {
      Object.assign(this, input);
    }
  }

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  recipientId!: string;

  @Column({ type: 'varchar', length: 64 })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'jsonb', nullable: true, default: null })
  data: NotificationPayload | null = null;

  @Column({ type: 'boolean', default: false })
  read = false;

  @Column({ type: 'datetime', nullable: true, default: null })
  readAt: Date | null = null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}

export function isNotificationType(value: string): value is NotificationType {
  return NOTIFICATION_TYPES.includes(value as NotificationTypeValue);
}
