/**
 * Purpose: Bundle-aware and dependency-aware cart hook for product pages,
 * checkout review, and bundle/prerequisite flows.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/domain-model.md (§4.2 Bundle, §4.3 ProductDependency)
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#orderline
 * Tests:
 *   - packages/storefront/src/hooks/use-cart.test.ts
 */
import { useCallback, useMemo } from 'react';
import { useCartState } from '../state/cart-state';
import type {
  Cart,
  CartBundleGroup,
  CartBundleInput,
  CartDependencyRequirement,
  CartItem,
  CartPricedItem,
} from '../types/cart';

export interface AddItemOptions {
  readonly dependencyRequirements?: readonly CartDependencyRequirement[];
}

export interface UseCartOptions {
  readonly ownedProductIds?: readonly string[];
}

export interface UseCartReturn {
  readonly cart: Cart;
  readonly addItem: (item: CartItem, options?: AddItemOptions) => void;
  readonly addBundle: (bundle: CartBundleInput) => void;
  readonly addPrerequisite: (requirement: CartDependencyRequirement) => void;
  readonly removeItem: (lineId: string) => void;
  readonly updateQuantity: (lineId: string, quantity: number) => void;
  readonly clearCart: () => void;
}

function createId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeItem(item: CartItem): CartItem & { lineId: string; basePrice: number } {
  return {
    ...item,
    lineId: item.lineId ?? item.variantId,
    basePrice: item.basePrice ?? item.price,
  };
}

function allocateBundleItems(bundle: CartBundleInput): CartItem[] {
  const totalBase = bundle.products.reduce((sum, item) => sum + item.price, 0);
  const discountedTotal = Math.round(totalBase * (1 - bundle.discountPercent / 100));
  const instanceId = createId(`bundle-${bundle.bundleId}`);
  let runningTotal = 0;

  return bundle.products.map((product, index) => {
    const linePrice = index === bundle.products.length - 1
      ? discountedTotal - runningTotal
      : Math.round(product.price * (1 - bundle.discountPercent / 100));
    runningTotal += linePrice;

    return {
      lineId: createId(`line-${product.variantId}`),
      productId: product.productId,
      variantId: product.variantId,
      name: product.name,
      basePrice: product.price,
      price: linePrice,
      currencyCode: product.currencyCode,
      quantity: 1,
      heroImageUrl: product.heroImageUrl,
      slug: product.slug,
      bundle: {
        bundleId: bundle.bundleId,
        instanceId,
        name: bundle.name,
        discountPercent: bundle.discountPercent,
      },
      dependencyRequirements: product.dependencyRequirements,
    };
  });
}

function priceItem(
  item: CartItem & { lineId: string; basePrice: number },
  availableProductIds: ReadonlySet<string>,
): CartPricedItem {
  const dependencyRequirements = item.dependencyRequirements ?? [];
  const hasAllDependencies = dependencyRequirements.every((requirement) =>
    availableProductIds.has(requirement.requiredProductId),
  );
  const appliedDependencyDiscountPercent = hasAllDependencies
    ? dependencyRequirements.reduce(
        (highestDiscount, requirement) => Math.max(highestDiscount, requirement.discountPercent ?? 0),
        0,
      )
    : 0;
  const effectivePrice = appliedDependencyDiscountPercent > 0
    ? Math.round(item.price * (1 - appliedDependencyDiscountPercent / 100))
    : item.price;

  return {
    ...item,
    effectivePrice,
    appliedDependencyDiscountPercent,
    baseLineSubtotal: item.basePrice * item.quantity,
    lineSubtotal: effectivePrice * item.quantity,
  };
}

function buildBundleGroups(items: readonly CartPricedItem[]): readonly CartBundleGroup[] {
  const grouped = new Map<string, CartPricedItem[]>();

  for (const item of items) {
    if (!item.bundle) {
      continue;
    }

    const bundleItems = grouped.get(item.bundle.instanceId) ?? [];
    bundleItems.push(item);
    grouped.set(item.bundle.instanceId, bundleItems);
  }

  return [...grouped.values()].map((bundleItems) => {
    const bundle = bundleItems[0]!.bundle!;
    const originalSubtotal = bundleItems.reduce((sum, item) => sum + item.baseLineSubtotal, 0);
    const bundleSubtotal = bundleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const subtotal = bundleItems.reduce((sum, item) => sum + item.lineSubtotal, 0);

    return {
      bundleId: bundle.bundleId,
      instanceId: bundle.instanceId,
      name: bundle.name,
      discountPercent: bundle.discountPercent,
      items: bundleItems,
      originalSubtotal,
      bundleSubtotal,
      subtotal,
      bundleDiscountTotal: originalSubtotal - bundleSubtotal,
      dependencyDiscountTotal: bundleSubtotal - subtotal,
    };
  });
}

function buildCart(
  rawItems: readonly CartItem[],
  ownedProductIds: readonly string[],
): Cart {
  const normalizedItems = rawItems.map(normalizeItem);
  const availableProductIds = new Set([
    ...ownedProductIds,
    ...normalizedItems.map((item) => item.productId),
  ]);
  const items = normalizedItems.map((item) => priceItem(item, availableProductIds));
  const bundleGroups = buildBundleGroups(items);
  const standaloneItems = items.filter((item) => !item.bundle);
  const issues = items.flatMap((item) => {
    const requirements = item.dependencyRequirements ?? [];
    const missingRequirements = requirements.filter((requirement) =>
      !availableProductIds.has(requirement.requiredProductId),
    );

    if (missingRequirements.length === 0) {
      return [];
    }

    return [{
      lineId: item.lineId,
      productId: item.productId,
      productName: item.name,
      message:
        missingRequirements[0]?.message
        ?? `${item.name} requires a prerequisite purchase before checkout.`,
      missingRequirements,
    }];
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.lineSubtotal, 0);
  const baseSubtotal = items.reduce((sum, item) => sum + item.baseLineSubtotal, 0);
  const bundleDiscountTotal = bundleGroups.reduce((sum, bundle) => sum + bundle.bundleDiscountTotal, 0);
  const dependencyDiscountTotal = items.reduce(
    (sum, item) => sum + ((item.price - item.effectivePrice) * item.quantity),
    0,
  );
  const firstItem = items[0];

  return {
    items,
    standaloneItems,
    bundleGroups,
    totalItems,
    subtotal,
    baseSubtotal,
    discountTotal: baseSubtotal - subtotal,
    bundleDiscountTotal,
    dependencyDiscountTotal,
    currencyCode: firstItem?.currencyCode ?? 'USD',
    dependencyValidation: {
      canCheckout: issues.length === 0,
      issues,
    },
  };
}

export function useCart(options: UseCartOptions = {}): UseCartReturn {
  const ownedProductIds = options.ownedProductIds ?? [];
  const items = useCartState((state) => state.items);
  const replaceItems = useCartState((state) => state.replaceItems);
  const clearStoredCart = useCartState((state) => state.clearCart);

  const addItem = useCallback((item: CartItem, options?: AddItemOptions) => {
    const currentItems = useCartState.getState().items;
    const nextItem = {
      ...item,
      lineId: item.lineId ?? item.variantId,
      basePrice: item.basePrice ?? item.price,
      dependencyRequirements: options?.dependencyRequirements ?? item.dependencyRequirements,
    };

    const existingLine = currentItems.find(
      (entry) => (entry.lineId ?? entry.variantId) === nextItem.lineId,
    );

    replaceItems(existingLine
      ? currentItems.map((entry) =>
          (entry.lineId ?? entry.variantId) === nextItem.lineId
            ? { ...entry, quantity: entry.quantity + nextItem.quantity }
            : entry,
        )
      : [...currentItems, nextItem]);
  }, [replaceItems]);

  const addBundle = useCallback((bundle: CartBundleInput) => {
    replaceItems([...useCartState.getState().items, ...allocateBundleItems(bundle)]);
  }, [replaceItems]);

  const addPrerequisite = useCallback((requirement: CartDependencyRequirement) => {
    const currentItems = useCartState.getState().items;
    const prerequisiteLine = currentItems.find(
      (item) => item.productId === requirement.requiredProductId && !item.bundle,
    );

    if (prerequisiteLine) {
      replaceItems(currentItems.map((item) =>
        (item.lineId ?? item.variantId) === (prerequisiteLine.lineId ?? prerequisiteLine.variantId)
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      ));
      return;
    }

    replaceItems([
      ...currentItems,
      {
        lineId: requirement.requiredVariantId,
        productId: requirement.requiredProductId,
        variantId: requirement.requiredVariantId,
        name: requirement.requiredProductName,
        basePrice: requirement.requiredProductPrice,
        price: requirement.requiredProductPrice,
        currencyCode: requirement.currencyCode,
        quantity: 1,
        heroImageUrl: requirement.requiredProductHeroImageUrl,
        slug: requirement.requiredProductSlug,
      },
    ]);
  }, [replaceItems]);

  const removeItem = useCallback((lineId: string) => {
    replaceItems(useCartState.getState().items.filter((item) => {
      const itemLineId = item.lineId ?? item.variantId;

      if (itemLineId === lineId) {
        return false;
      }

      return item.bundle?.instanceId !== lineId;
    }));
  }, [replaceItems]);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    replaceItems(useCartState.getState().items.flatMap((item) => {
      const itemLineId = item.lineId ?? item.variantId;

      if (itemLineId !== lineId) {
        return [item];
      }

      return quantity <= 0
        ? []
        : [{ ...item, quantity }];
    }));
  }, [replaceItems]);

  const clearCart = useCallback(() => {
    clearStoredCart();
  }, [clearStoredCart]);

  const cart = useMemo(
    () => buildCart(items, ownedProductIds),
    [items, ownedProductIds],
  );

  return { cart, addItem, addBundle, addPrerequisite, removeItem, updateQuantity, clearCart };
}
