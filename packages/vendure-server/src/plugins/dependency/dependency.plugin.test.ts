/**
 * Purpose: Tests for DependencyPlugin — validates dependency entity structure,
 * dependency validation, purchase prerequisite evaluation, discounts, graph
 * building, cycle detection, and plugin/barrel exports.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 * Tests:
 *   - (this file)
 */
import { describe, expect, it } from 'vitest';
import type { RuntimeVendureConfig } from '@vendure/core';
import {
  DependencyPlugin,
  buildDependencyGraph,
  calculateDependencyDiscount,
  checkDependenciesMet,
  dependencyConfiguration,
  detectCircularDependencies,
  validateCheckoutDependencies,
  validateDependency,
} from './dependency.plugin.js';
import { DependencyEntity } from './dependency.entity.js';
import {
  DependencyPlugin as DependencyPluginFromIndex,
  dependencyConfiguration as dependencyConfigurationFromIndex,
} from './index.js';

describe('DependencyPlugin', () => {
  describe('DependencyEntity', () => {
    it('can be instantiated with DeepPartial input', () => {
      const entity = new DependencyEntity({
        productId: 'product-b',
        requiredProductId: 'product-a',
        discountPercent: 15,
        enabled: true,
        message: 'Own Product A first',
      });

      expect(entity.productId).toBe('product-b');
      expect(entity.requiredProductId).toBe('product-a');
      expect(entity.discountPercent).toBe(15);
      expect(entity.enabled).toBe(true);
      expect(entity.message).toBe('Own Product A first');
    });

    it('preserves entity defaults when constructed empty', () => {
      const entity = new DependencyEntity();

      expect(entity).toBeDefined();
      expect(entity.discountPercent).toBe(0);
      expect(entity.enabled).toBe(true);
      expect(entity.message).toBeNull();
    });
  });

  describe('validateDependency', () => {
    it('accepts a valid dependency', () => {
      expect(
        validateDependency({
          productId: 'product-b',
          requiredProductId: 'product-a',
          discountPercent: 10,
          enabled: true,
          message: 'Required first',
        }),
      ).toEqual([]);
    });

    it('rejects self-dependency', () => {
      expect(
        validateDependency({
          productId: 'product-a',
          requiredProductId: 'product-a',
          discountPercent: 0,
          enabled: true,
          message: null,
        }),
      ).toContain('productId and requiredProductId must be different');
    });

    it('rejects invalid discount values', () => {
      expect(
        validateDependency({
          productId: 'product-b',
          requiredProductId: 'product-a',
          discountPercent: Number.NaN,
          enabled: true,
          message: null,
        }),
      ).toContain('discountPercent must be a finite number between 0 and 100');

      expect(
        validateDependency({
          productId: 'product-b',
          requiredProductId: 'product-a',
          discountPercent: -1,
          enabled: true,
          message: null,
        }),
      ).toContain('discountPercent must be a finite number between 0 and 100');

      expect(
        validateDependency({
          productId: 'product-b',
          requiredProductId: 'product-a',
          discountPercent: 101,
          enabled: true,
          message: null,
        }),
      ).toContain('discountPercent must be a finite number between 0 and 100');

      expect(
        validateDependency({
          productId: 'product-b',
          requiredProductId: 'product-a',
          discountPercent: Number.POSITIVE_INFINITY,
          enabled: true,
          message: null,
        }),
      ).toContain('discountPercent must be a finite number between 0 and 100');
    });

    it('rejects missing required fields', () => {
      expect(validateDependency({})).toEqual(
        expect.arrayContaining([
          'productId is required',
          'requiredProductId is required',
        ]),
      );
    });
  });

  describe('checkDependenciesMet', () => {
    it('returns met with the highest discount when all enabled dependencies are owned', () => {
      const result = checkDependenciesMet(
        [
          {
            productId: 'product-c',
            requiredProductId: 'product-a',
            discountPercent: 10,
            enabled: true,
            message: null,
          },
          {
            productId: 'product-c',
            requiredProductId: 'product-b',
            discountPercent: 25,
            enabled: true,
            message: null,
          },
        ],
        ['product-a', 'product-b'],
      );

      expect(result).toEqual({
        met: true,
        missing: [],
        discount: 25,
      });
    });

    it('returns missing dependencies and no discount when some enabled dependencies are not owned', () => {
      const result = checkDependenciesMet(
        [
          {
            productId: 'product-c',
            requiredProductId: 'product-a',
            discountPercent: 10,
            enabled: true,
            message: null,
          },
          {
            productId: 'product-c',
            requiredProductId: 'product-b',
            discountPercent: 25,
            enabled: true,
            message: null,
          },
        ],
        ['product-a'],
      );

      expect(result).toEqual({
        met: false,
        missing: ['product-b'],
        discount: 0,
      });
    });

    it('returns met with no missing dependencies when no dependencies exist', () => {
      expect(checkDependenciesMet([], ['product-a'])).toEqual({
        met: true,
        missing: [],
        discount: 0,
      });
    });

    it('skips disabled dependencies', () => {
      const result = checkDependenciesMet(
        [
          {
            productId: 'product-c',
            requiredProductId: 'product-a',
            discountPercent: 20,
            enabled: false,
            message: 'Ignored dependency',
          },
          {
            productId: 'product-c',
            requiredProductId: 'product-b',
            discountPercent: 5,
            enabled: true,
            message: null,
          },
        ],
        ['product-b'],
      );

      expect(result).toEqual({
        met: true,
        missing: [],
        discount: 5,
      });
    });
  });

  describe('calculateDependencyDiscount', () => {
    it('rounds discounted prices to the nearest minor unit', () => {
      expect(calculateDependencyDiscount(999, 15)).toBe(849);
    });

    it('returns the original price at 0% discount', () => {
      expect(calculateDependencyDiscount(2599, 0)).toBe(2599);
    });

    it('returns zero at 100% discount', () => {
      expect(calculateDependencyDiscount(2599, 100)).toBe(0);
    });
  });

  describe('validateCheckoutDependencies', () => {
    it('blocks checkout when prerequisites are missing from owned products and cart lines', () => {
      const result = validateCheckoutDependencies(
        [{ productId: 'product-addon', productName: 'Pro Add-on' }],
        [{
          productId: 'product-addon',
          requiredProductId: 'product-base',
          requiredProductName: 'Base Package',
          requiredProductSlug: 'base-package',
          requiredVariantId: 'variant-base',
          requiredProductPrice: 1500,
          currencyCode: 'USD',
          message: 'Requires Base Package first.',
        }],
        [],
      );

      expect(result.canCheckout).toBe(false);
      expect(result.issues[0]!.productName).toBe('Pro Add-on');
      expect(result.issues[0]!.missingRequirements[0]!.requiredProductName).toBe('Base Package');
    });

    it('allows checkout when the prerequisite is already present in the same order', () => {
      const result = validateCheckoutDependencies(
        [
          { productId: 'product-addon', productName: 'Pro Add-on' },
          { productId: 'product-base', productName: 'Base Package' },
        ],
        [{
          productId: 'product-addon',
          requiredProductId: 'product-base',
        }],
        [],
      );

      expect(result).toEqual({
        canCheckout: true,
        issues: [],
      });
    });
  });

  describe('buildDependencyGraph', () => {
    it('returns an empty graph for no dependencies', () => {
      expect(buildDependencyGraph([])).toEqual({});
    });

    it('builds a graph for a single dependency', () => {
      expect(
        buildDependencyGraph([
          {
            productId: 'product-b',
            requiredProductId: 'product-a',
            discountPercent: 0,
            enabled: true,
            message: null,
          },
        ]),
      ).toEqual({
        'product-b': ['product-a'],
      });
    });

    it('groups multiple dependencies for the same product', () => {
      expect(
        buildDependencyGraph([
          {
            productId: 'product-c',
            requiredProductId: 'product-a',
            discountPercent: 0,
            enabled: true,
            message: null,
          },
          {
            productId: 'product-c',
            requiredProductId: 'product-b',
            discountPercent: 10,
            enabled: true,
            message: null,
          },
        ]),
      ).toEqual({
        'product-c': ['product-a', 'product-b'],
      });
    });
  });

  describe('detectCircularDependencies', () => {
    it('returns no cycles when the graph is acyclic', () => {
      expect(
        detectCircularDependencies({
          'product-c': ['product-b'],
          'product-b': ['product-a'],
        }),
      ).toEqual([]);
    });

    it('detects a simple A → B → A cycle', () => {
      expect(
        detectCircularDependencies({
          'product-a': ['product-b'],
          'product-b': ['product-a'],
        }),
      ).toContainEqual(['product-a', 'product-b', 'product-a']);
    });

    it('detects a longer A → B → C → A cycle', () => {
      expect(
        detectCircularDependencies({
          'product-a': ['product-b'],
          'product-b': ['product-c'],
          'product-c': ['product-a'],
        }),
      ).toContainEqual(['product-a', 'product-b', 'product-c', 'product-a']);
    });

    it('detects self-referencing dependencies', () => {
      expect(
        detectCircularDependencies({
          'product-a': ['product-a'],
        }),
      ).toContainEqual(['product-a', 'product-a']);
    });
  });

  describe('dependencyConfiguration', () => {
    it('returns the same config reference unchanged', () => {
      const config = { customFields: {} } as RuntimeVendureConfig;

      expect(dependencyConfiguration(config)).toBe(config);
    });
  });

  describe('barrel exports', () => {
    it('re-exports the plugin class and configuration function', () => {
      expect(DependencyPluginFromIndex).toBe(DependencyPlugin);
      expect(dependencyConfigurationFromIndex).toBe(dependencyConfiguration);
    });
  });
});
