/**
 * Purpose: Admin API schema extensions for storefront template browsing and creator-managed template CRUD.
 * Governing docs:
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership, Storefront plugin)
 *   - docs/domain-model.md (§1 Core records, Storefront Template)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/plugin/vendure-plugin.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/template.resolver.test.ts
 */
import { gql } from 'graphql-tag';

export const templateAdminApiExtensions = gql`
  type Template implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    description: String
    thumbnail: String
    category: String!
    blocks: JSON!
    isSystem: Boolean!
    creatorId: String
    usageCount: Int!
  }

  extend type Query {
    templates(category: String, scope: String, creatorId: String, skip: Int, take: Int): [Template!]!
  }

  extend type Mutation {
    createTemplateFromPage(
      pageId: String!
      name: String!
      description: String
      thumbnail: String
      category: String!
      creatorId: String
      isSystem: Boolean
    ): Template!
    duplicateTemplate(templateId: String!, creatorId: String!, name: String): Template!
    deleteTemplate(templateId: String!, creatorId: String!): Boolean!
  }
`;
