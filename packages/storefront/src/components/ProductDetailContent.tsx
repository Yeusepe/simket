/**
 * Purpose: Render a loaded product detail layout so default routes and
 *          Framely product blocks can share the same live product UI.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront, §12 source of truth)
 *   - docs/domain-model.md (Product entity)
 * External references:
 *   - https://heroui.com/docs/react/components/button
 *   - https://heroui.com/docs/react/components/card
 *   - https://heroui.com/docs/react/components/chip
 * Tests:
 *   - packages/storefront/src/components/ProductDetailPage.test.tsx
 */
import { Link } from 'react-router-dom';
import { Avatar, Button, Card, Chip, Separator } from '@heroui/react';
import type { ProductDetail } from '../types/product';
import type { WishlistApi } from '../types/wishlist';
import { formatPrice } from './ProductCard';
import { useCart } from '../hooks/use-cart';
import { WishlistButton } from './wishlist';

interface ProductDetailContentProps {
  readonly product: ProductDetail;
  readonly buildProductHref?: (productSlug: string) => string;
  readonly wishlistApi?: WishlistApi;
  readonly priceDisplay?: string;
  readonly descriptionText?: string;
  readonly ctaText?: string;
}

export function ProductDetailContent({
  product,
  buildProductHref = (productSlug) => `/product/${productSlug}`,
  wishlistApi,
  priceDisplay,
  descriptionText,
  ctaText = 'Add to cart',
}: ProductDetailContentProps) {
  const { addBundle, addItem } = useCart();
  const primaryVariant = product.variants[0];
  const price = priceDisplay
    ?? (primaryVariant
      ? formatPrice(primaryVariant.price, primaryVariant.currencyCode)
      : 'Free');
  const description = descriptionText ?? product.description;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <HeroMedia
            url={product.heroMediaUrl}
            type={product.heroMediaType}
            alt={product.name}
            transparentUrl={product.heroTransparentUrl}
            backgroundUrl={product.heroBackgroundUrl}
          />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <h1 className="text-3xl font-bold">{product.name}</h1>

          <CreatorCard creator={product.creator} />

          <Separator />

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{price}</span>
            {primaryVariant && primaryVariant.stockLevel === 'OUT_OF_STOCK' && (
              <Chip variant="soft">
                <Chip.Label>Out of stock</Chip.Label>
              </Chip>
            )}
          </div>

          {product.dependencyRequirements.length > 0 && (
            <div
              className="rounded-lg border border-warning bg-warning/10 p-3 text-sm text-warning"
            >
              Requires:
              {' '}
              {product.dependencyRequirements.map((requirement, index) => (
                <span key={requirement.requiredProductId}>
                  {index > 0 ? ', ' : ''}
                  <Link
                    to={buildProductHref(requirement.requiredProductSlug)}
                    className="font-semibold underline underline-offset-2"
                  >
                    {requirement.requiredProductName}
                  </Link>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              isDisabled={primaryVariant?.stockLevel === 'OUT_OF_STOCK'}
              onPress={() => {
                if (!primaryVariant) {
                  return;
                }

                addItem({
                  productId: product.id,
                  variantId: primaryVariant.id,
                  name: product.name,
                  basePrice: primaryVariant.price,
                  price: primaryVariant.price,
                  currencyCode: primaryVariant.currencyCode,
                  quantity: 1,
                  heroImageUrl: product.heroMediaType === 'image' ? product.heroMediaUrl : null,
                  slug: product.slug,
                  dependencyRequirements: product.dependencyRequirements,
                });
              }}
            >
              {ctaText}
            </Button>
            <WishlistButton api={wishlistApi} productId={product.id} />
          </div>

          {product.availableBundles.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold">Available bundles</h2>
                  <p className="text-sm text-muted-foreground">
                    Save more when you grab the full pack.
                  </p>
                </div>
                {product.availableBundles.map((bundle) => {
                  const originalSubtotal = bundle.products.reduce((sum, item) => sum + item.price, 0);
                  const discountedSubtotal = Math.round(
                    originalSubtotal * (1 - bundle.discountPercent / 100),
                  );

                  return (
                    <Card key={bundle.bundleId} variant="secondary">
                      <Card.Header>
                        <div className="flex flex-1 items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Chip variant="soft" size="sm">
                                <Chip.Label>Bundle</Chip.Label>
                              </Chip>
                              <Card.Title>{bundle.name}</Card.Title>
                            </div>
                            <Card.Description>{bundle.callout}</Card.Description>
                          </div>
                          <span className="text-sm font-semibold text-success">
                            Save {bundle.discountPercent}%
                          </span>
                        </div>
                      </Card.Header>
                      <Card.Content className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {bundle.description ?? 'Includes every prerequisite and related add-on in one discounted checkout.'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {bundle.products.map((item) => (
                            <Chip key={item.variantId} variant="soft" size="sm">
                              <Chip.Label>{item.name}</Chip.Label>
                            </Chip>
                          ))}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-semibold">
                            {formatPrice(discountedSubtotal, primaryVariant?.currencyCode ?? product.currencyCode)}
                          </span>
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(originalSubtotal, primaryVariant?.currencyCode ?? product.currencyCode)}
                          </span>
                        </div>
                      </Card.Content>
                      <Card.Footer>
                        <Button
                          variant="primary"
                          className="w-full"
                          onPress={() => {
                            addBundle({
                              bundleId: bundle.bundleId,
                              name: bundle.name,
                              discountPercent: bundle.discountPercent,
                              products: bundle.products,
                            });
                          }}
                        >
                          Add bundle to cart
                        </Button>
                      </Card.Footer>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          <Separator />

          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Chip key={tag} variant="soft" size="sm">
                  <Chip.Label>{tag}</Chip.Label>
                </Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator className="my-8" />
      <section>
        <h2 className="mb-4 text-xl font-semibold">Description</h2>
        <div className="prose max-w-none dark:prose-invert">
          <p>{description}</p>
        </div>
      </section>

      {Boolean(product.termsOfService) && (
        <>
          <Separator className="my-8" />
          <section>
            <h2 className="mb-4 text-xl font-semibold">Terms of Service</h2>
            <div className="prose max-w-none dark:prose-invert">
              <p>{String(product.termsOfService ?? '')}</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export function HeroMedia({
  url,
  type,
  alt,
  transparentUrl,
  backgroundUrl,
}: {
  readonly url: string | null;
  readonly type: string;
  readonly alt: string;
  readonly transparentUrl: string | null;
  readonly backgroundUrl: string | null;
}) {
  if (!url) {
    return (
      <div
        data-testid="hero-placeholder"
        className="flex aspect-video items-center justify-center rounded-xl bg-muted"
      >
        <span className="text-muted-foreground">No media available</span>
      </div>
    );
  }

  if (transparentUrl && backgroundUrl) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-xl">
        <img
          src={backgroundUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
        <img
          src={transparentUrl}
          alt={alt}
          className="relative z-10 h-full w-full object-contain"
        />
      </div>
    );
  }

  if (type === 'video') {
    return (
      <video
        data-testid="hero-video"
        src={url}
        className="aspect-video w-full rounded-xl object-cover"
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className="aspect-video w-full rounded-xl object-cover"
    />
  );
}

function CreatorCard({
  creator,
}: {
  readonly creator: { id: string; name: string; avatarUrl: string | null };
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        {creator.avatarUrl && <Avatar.Image src={creator.avatarUrl} alt={creator.name} />}
        <Avatar.Fallback>{creator.name.charAt(0)}</Avatar.Fallback>
      </Avatar>
      <span className="text-sm font-medium">{creator.name}</span>
    </div>
  );
}
