import { Button } from '@heroui/react';

/**
 * Dashboard products list — CRUD for creator products.
 */
export function DashboardProductsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button>Create Product</Button>
      </div>
      <p className="text-muted-foreground">No products yet. Create your first product above.</p>
    </div>
  );
}
