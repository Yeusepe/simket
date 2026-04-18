import { Button } from '@heroui/react';
import { useNavigate } from 'react-router-dom';

/**
 * Cart page — items, dependency checks, checkout button.
 */
export function CartPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Your Cart</h1>

      <div className="rounded-xl border border-divider p-8 text-center">
        <p className="mb-4 text-muted-foreground">Your cart is empty.</p>
        <Button variant="secondary" onPress={() => navigate('/')}>
          Continue Browsing
        </Button>
      </div>
    </div>
  );
}
