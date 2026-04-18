/**
 * Purpose: GraphQL JSON scalar for storefront template block payloads.
 * Governing docs:
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 * External references:
 *   - https://www.apollographql.com/docs/apollo-server/schema/custom-scalars
 *   - https://graphql.org/graphql-js/type/#graphqlscalartype
 * Tests:
 *   - Indirectly exercised by resolver and service tests in this plugin
 */
import { GraphQLScalarType, Kind, type ValueNode } from 'graphql';

function parseLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return ast.values.map((value) => parseLiteral(value));
    case Kind.OBJECT:
      return Object.fromEntries(ast.fields.map((field) => [field.name.value, parseLiteral(field.value)]));
    default:
      return null;
  }
}

export const templateJsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON payload used for storefront template blocks.',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral,
});
