/**
 * Purpose: Shop API schema extensions for in-app notification feeds and read-state mutations.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/plugin/vendure-plugin.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/notification/notification.resolver.test.ts
 */
import { gql } from 'graphql-tag';

export const notificationShopApiExtensions = gql`
  enum NotificationType {
    purchase
    collaboration_invite
    collaboration_accepted
    product_update
    price_drop
    system
    gift_received
    review
    settlement
  }

  type Notification implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    recipientId: String!
    type: NotificationType!
    title: String!
    body: String!
    data: JSON
    read: Boolean!
    readAt: DateTime
  }

  type NotificationPageInfo {
    endCursor: String
    hasNextPage: Boolean!
  }

  type NotificationConnection {
    items: [Notification!]!
    pageInfo: NotificationPageInfo!
    unreadCount: Int!
  }

  extend type Query {
    notifications(
      first: Int
      after: String
      type: NotificationType
      read: Boolean
    ): NotificationConnection!
    unreadNotificationsCount: Int!
  }

  extend type Mutation {
    markNotificationRead(notificationId: String!, read: Boolean): Notification!
    markNotificationsRead(notificationIds: [String!]!, read: Boolean): [Notification!]!
    markAllNotificationsRead: Int!
  }
`;
