import { useParams } from 'react-router-dom';
import { Button } from '@heroui/react';

/**
 * Product detail page — generic template.
 * Hero image/video, description (TipTap rendered), price, TOS, add-to-cart.
 */
export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Hero media */}
      <div className="mb-8 aspect-video overflow-hidden rounded-2xl bg-muted">
        <p className="flex h-full items-center justify-center text-muted-foreground">
          Hero image / video for "{slug}"
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Description */}
        <div className="lg:col-span-2">
          <h1 className="mb-4 text-3xl font-bold">Product: {slug}</h1>
          <div className="prose dark:prose-invert">
            <p>TipTap-rendered description will appear here.</p>
          </div>
        </div>

        {/* Sidebar: price, actions */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-divider p-6">
            <p className="mb-2 text-3xl font-bold">$0.00</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Platform take rate: 5%
            </p>
            <Button className="w-full" size="lg">
              Add to Cart
            </Button>
          </div>
          <div className="rounded-xl border border-divider p-4">
            <h3 className="mb-2 font-semibold">Terms of Service</h3>
            <p className="text-sm text-muted-foreground">
              Terms of service rendered from TipTap content.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
