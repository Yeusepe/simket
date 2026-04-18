import { Button } from '@heroui/react';
import { useNavigate } from 'react-router-dom';

/**
 * 404 — Not Found page.
 */
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h1 className="mb-2 text-6xl font-bold">404</h1>
      <p className="mb-6 text-lg text-muted-foreground">Page not found.</p>
      <Button onPress={() => navigate('/')}>
        Go Home
      </Button>
    </div>
  );
}
