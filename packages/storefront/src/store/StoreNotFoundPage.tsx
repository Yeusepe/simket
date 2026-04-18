/**
 * Purpose: Render creator-store 404 states for missing creators, pages, or products.
 * Governing docs:
 *   - docs/architecture.md (§1 storefront)
 *   - docs/service-architecture.md (§1 client features)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§3 failure handling)
 * External references:
 *   - https://heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/store/StoreLayout.test.tsx
 */
import { Button } from '@heroui/react';
import { useNavigate } from 'react-router-dom';

interface StoreNotFoundPageProps {
  readonly title?: string;
  readonly message: string;
}

export function StoreNotFoundPage({
  title = 'Store not found',
  message,
}: StoreNotFoundPageProps) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">404</p>
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{message}</p>
      <Button variant="outline" onPress={() => navigate('/')}>
        Back to marketplace
      </Button>
    </div>
  );
}
