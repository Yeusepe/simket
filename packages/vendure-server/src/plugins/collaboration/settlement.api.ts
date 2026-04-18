/**
 * Purpose: Admin API schema extensions for creator settlement history and earnings.
 * Governing docs:
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership, §6 purchase flow)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/plugin/vendure-plugin.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/settlement.resolver.test.ts
 */
import { gql } from 'graphql-tag';

export const settlementAdminApiExtensions = gql`
  type Settlement implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    orderId: String!
    orderCode: String
    orderLineId: String!
    productId: String!
    productName: String
    creatorId: String!
    ownerCreatorId: String!
    stripeAccountId: String!
    currencyCode: String!
    amount: Int!
    sharePercent: Float!
    status: String!
    attemptCount: Int!
    transferGroup: String
    sourceTransactionId: String
    paymentReference: String
    failureMessage: String
    processedAt: DateTime
    failedAt: DateTime
  }

  type SettlementEarningsSummary {
    creatorId: String!
    currencyCode: String!
    pendingAmount: Int!
    processingAmount: Int!
    completedAmount: Int!
    failedAmount: Int!
    totalAmount: Int!
    settlementCount: Int!
  }

  extend type Query {
    settlementHistory(
      creatorId: String!
      status: String
      orderId: String
      skip: Int
      take: Int
    ): [Settlement!]!
    settlementEarnings(creatorId: String!): SettlementEarningsSummary!
  }
`;
