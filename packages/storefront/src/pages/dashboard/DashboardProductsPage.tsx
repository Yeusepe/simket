/**
 * Purpose: Route-level creator product management page that switches between the product list and editor form.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/ProductList.test.tsx
 *   - packages/storefront/src/components/dashboard/products/ProductForm.test.tsx
 */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@heroui/react';
import {
  ProductForm,
  ProductList,
  type ProductFormData,
  type ProductSummary,
  useProducts,
} from '../../components/dashboard';
import { createCreatorProductsApi } from '../../services/catalog-api';

const PRODUCT_TAG_SUGGESTIONS = ['unity', 'shader', 'textures', 'tools', 'workflow'] as const;

function buildInitialFormData(summary: ProductSummary): Partial<ProductFormData> {
  return {
    name: summary.name,
    slug: summary.slug,
    shortDescription: `${summary.name} storefront description`,
    description: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: `${summary.name} details.` }] }],
    }),
    price: summary.price,
    currency: summary.currency,
    platformFeePercent: 5,
    termsOfService: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'All sales are final.' }] }],
    }),
    visibility: summary.visibility,
    tags: ['unity'],
  };
}

export function DashboardProductsPage() {
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const productsApi = useMemo(() => createCreatorProductsApi(), []);
  const { products, actions, isLoading, error } = useProducts({ api: productsApi });

  useEffect(() => {
    void actions.fetchProducts();
  }, [actions]);

  const editingProduct = useMemo(
    () => products.find((product) => product.id === editingProductId) ?? null,
    [editingProductId, products],
  );

  const handleArchiveProduct = async (productId: string) => {
    const targetProduct = products.find((product) => product.id === productId);
    if (!targetProduct) {
      return;
    }

    await actions.updateProduct(productId, {
      ...buildInitialFormData(targetProduct),
      name: targetProduct.name,
      slug: targetProduct.slug,
      description: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: `${targetProduct.name} details.` }] }],
      }),
      shortDescription: `${targetProduct.name} storefront description`,
      price: targetProduct.price,
      currency: targetProduct.currency,
      platformFeePercent: 5,
      tags: ['unity'],
      galleryImageIds: [],
      termsOfService: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'All sales are final.' }] }],
      }),
      visibility: 'archived',
    });
  };

  const handleSaveProduct = async (data: ProductFormData) => {
    if (editingProductId) {
      await actions.updateProduct(editingProductId, data);
      setEditingProductId(null);
      return;
    }

    await actions.createProduct(data);
    setIsCreating(false);
  };

  const showForm = isCreating || editingProduct !== null;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
          {error.message}
        </div>
      ) : null}
      {isLoading && products.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-surface-secondary p-4 text-sm text-muted-foreground">
          Loading creator products…
        </div>
      ) : null}
      {showForm ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="ghost" onPress={() => {
              setIsCreating(false);
              setEditingProductId(null);
            }}>
              Back to products
            </Button>
          </div>
          <ProductForm
            initialData={editingProduct ? buildInitialFormData(editingProduct) : undefined}
            availableTags={PRODUCT_TAG_SUGGESTIONS}
            uploaderConfig={{
              presignEndpoint: '/api/uploads/presign',
              tusEndpoint: '/files',
              maxFileSize: 10 * 1024 * 1024,
              allowedMimeTypes: ['image/png', 'image/webp'],
            }}
            onSave={handleSaveProduct}
            onCancel={() => {
              setIsCreating(false);
              setEditingProductId(null);
            }}
          />
        </div>
      ) : null}

      <ProductList
        products={products}
        onCreateProduct={() => setIsCreating(true)}
        onEditProduct={(productId) => setEditingProductId(productId)}
        onDuplicateProduct={(productId) => void actions.duplicateProduct(productId)}
        onArchiveProduct={(productId) => void handleArchiveProduct(productId)}
        onDeleteProduct={(productId) => void actions.deleteProduct(productId)}
      />
    </div>
  );
}
