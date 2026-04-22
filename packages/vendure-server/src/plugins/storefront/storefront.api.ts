/**
 * Purpose: Shop API schema extensions for creator-owned Framely store pages
 *          and public creator-store delivery.
 * Governing docs:
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership, Storefront plugin)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/storefront.resolver.test.ts
 */
import { gql } from 'graphql-tag';

export const storefrontShopApiExtensions = gql`
  type StorefrontPage implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    title: String!
    slug: String!
    scope: String!
    productId: String
    isPostSale: Boolean!
    isTemplate: Boolean!
    sortOrder: Int!
    enabled: Boolean!
    schema: JSON!
  }

  type CreatorStoreProfile {
    id: ID!
    slug: String!
    displayName: String!
    avatarUrl: String
    tagline: String!
    bio: String!
  }

  type CreatorStore {
    creator: CreatorStoreProfile!
    theme: JSON!
    pages: [StorefrontPage!]!
    products: [CatalogProduct!]!
  }

  input UpsertCreatorStorefrontPageInput {
    pageId: ID
    title: String!
    slug: String!
    scope: String!
    productId: ID
    content: JSON!
    sortOrder: Int
    enabled: Boolean
  }

  extend type Query {
    creatorStore(creatorSlug: String!): CreatorStore
    creatorStorefrontPage(scope: String!, slug: String!, productId: ID): StorefrontPage
  }

  extend type Mutation {
    upsertCreatorStorefrontPage(input: UpsertCreatorStorefrontPageInput!): StorefrontPage!
    deleteCreatorStorefrontPage(pageId: ID!): Boolean!
  }
`;
