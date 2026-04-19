/**
 * Purpose: Integration test for BundlePlugin — verifies full GraphQL lifecycle via admin API.
 *
 * Governing docs:
 *   - docs/architecture.md (§4 Product model)
 *   - docs/domain-model.md (Bundle entity)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/testing/
 *   - https://docs.vendure.io/reference/typescript-api/testing/create-test-environment/
 * Tests:
 *   - This is the integration test for src/plugins/bundle/
 */
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestEnvironment, SimpleGraphQLClient, TestServer } from '@vendure/testing';
import { DefaultSearchPlugin, DefaultJobQueuePlugin } from '@vendure/core';
import { getTestConfig } from './test-config.js';
import { TEST_INITIAL_DATA } from './fixtures/test-initial-data.js';
import { BundlePlugin } from '../src/plugins/bundle/bundle.plugin.js';

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
    }
  }
`;

const CREATE_PRODUCT_VARIANT = gql`
  mutation CreateProductVariants($input: [CreateProductVariantInput!]!) {
    createProductVariants(input: $input) {
      id
      name
      price
    }
  }
`;

const CREATE_BUNDLE = gql`
  mutation CreateBundle($name: String!, $productIds: [ID!]!, $discountPercent: Int!) {
    createBundle(name: $name, productIds: $productIds, discountPercent: $discountPercent) {
      id
      name
      productIds
      discountPercent
    }
  }
`;

const GET_BUNDLE = gql`
  query GetBundle($id: ID!) {
    bundle(id: $id) {
      id
      name
      productIds
      discountPercent
    }
  }
`;

const LIST_BUNDLES = gql`
  query ListBundles {
    bundles {
      id
      name
      productIds
      discountPercent
    }
  }
`;

const UPDATE_BUNDLE = gql`
  mutation UpdateBundle($id: ID!, $name: String, $discountPercent: Int) {
    updateBundle(id: $id, name: $name, discountPercent: $discountPercent) {
      id
      name
      discountPercent
    }
  }
`;

const DELETE_BUNDLE = gql`
  mutation DeleteBundle($id: ID!) {
    deleteBundle(id: $id)
  }
`;

describe('BundlePlugin e2e', () => {
  let server: TestServer;
  let adminClient: SimpleGraphQLClient;
  let productIdA: string;
  let productIdB: string;
  let bundleId: string;

  beforeAll(async () => {
    const testConfig = getTestConfig({
      plugins: [
        BundlePlugin,
        DefaultJobQueuePlugin,
        DefaultSearchPlugin,
      ],
    });

    const { server: s, adminClient: ac } = createTestEnvironment(testConfig);
    server = s;
    adminClient = ac;

    await server.init({
      initialData: TEST_INITIAL_DATA,
      productsCsvPath: undefined,
    });

    await adminClient.asSuperAdmin();

    // Seed two products for bundle tests
    const { createProduct: productA } = await adminClient.query(CREATE_PRODUCT, {
      input: { translations: [{ languageCode: 'en', name: 'Product A', slug: 'product-a', description: 'Test product A' }] },
    });
    productIdA = productA.id;

    await adminClient.query(CREATE_PRODUCT_VARIANT, {
      input: [{ productId: productIdA, translations: [{ languageCode: 'en', name: 'Variant A' }], sku: 'SKU-A', price: 1000 }],
    });

    const { createProduct: productB } = await adminClient.query(CREATE_PRODUCT, {
      input: { translations: [{ languageCode: 'en', name: 'Product B', slug: 'product-b', description: 'Test product B' }] },
    });
    productIdB = productB.id;

    await adminClient.query(CREATE_PRODUCT_VARIANT, {
      input: [{ productId: productIdB, translations: [{ languageCode: 'en', name: 'Variant B' }], sku: 'SKU-B', price: 2000 }],
    });
  }, 120_000);

  afterAll(async () => {
    await server?.destroy();
  });

  it('creates a bundle with two products', async () => {
    const { createBundle } = await adminClient.query(CREATE_BUNDLE, {
      name: 'Starter Pack',
      productIds: [productIdA, productIdB],
      discountPercent: 10,
    });

    expect(createBundle).toBeDefined();
    expect(createBundle.name).toBe('Starter Pack');
    expect(createBundle.productIds).toHaveLength(2);
    expect(createBundle.discountPercent).toBe(10);

    bundleId = createBundle.id;
  });

  it('fetches a bundle by ID', async () => {
    const { bundle } = await adminClient.query(GET_BUNDLE, { id: bundleId });

    expect(bundle).toBeDefined();
    expect(bundle.name).toBe('Starter Pack');
    expect(bundle.productIds).toContain(productIdA);
    expect(bundle.productIds).toContain(productIdB);
  });

  it('lists all bundles', async () => {
    const { bundles } = await adminClient.query(LIST_BUNDLES);

    expect(bundles).toBeInstanceOf(Array);
    expect(bundles.length).toBeGreaterThanOrEqual(1);
    expect(bundles.some((b: { id: string }) => b.id === bundleId)).toBe(true);
  });

  it('updates bundle name and discount', async () => {
    const { updateBundle } = await adminClient.query(UPDATE_BUNDLE, {
      id: bundleId,
      name: 'Pro Pack',
      discountPercent: 25,
    });

    expect(updateBundle.name).toBe('Pro Pack');
    expect(updateBundle.discountPercent).toBe(25);
  });

  it('rejects invalid discount percent', async () => {
    const result = adminClient.query(CREATE_BUNDLE, {
      name: 'Bad Discount',
      productIds: [productIdA],
      discountPercent: 150,
    });

    await expect(result).rejects.toThrow();
  });

  it('rejects empty bundle name', async () => {
    const result = adminClient.query(CREATE_BUNDLE, {
      name: '   ',
      productIds: [productIdA],
      discountPercent: 10,
    });

    await expect(result).rejects.toThrow();
  });

  it('deletes a bundle', async () => {
    const { deleteBundle } = await adminClient.query(DELETE_BUNDLE, { id: bundleId });
    expect(deleteBundle).toBe(true);

    const { bundle } = await adminClient.query(GET_BUNDLE, { id: bundleId });
    expect(bundle).toBeNull();
  });
});
