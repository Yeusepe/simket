/**
 * Purpose: Fetch and persist the active experiment variant for a product page, then track view/click/purchase events.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/
 *   - https://react.dev/reference/react/useEffect
 * Tests:
 *   - packages/storefront/src/hooks/useExperimentVariant.test.ts
 *   - packages/storefront/src/components/ProductDetailPage.test.tsx
 *   - packages/storefront/src/components/checkout/use-checkout.test.ts
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'simket:experiment-assignment:';

export interface ExperimentVariantAssignment {
  readonly experimentId: string;
  readonly productId: string;
  readonly variantName: string;
  readonly config: Record<string, unknown>;
}

export interface ExperimentEventPayload {
  readonly experimentId: string;
  readonly variantName: string;
  readonly productId: string;
  readonly event: 'view' | 'click' | 'purchase';
  readonly userId?: string;
}

export interface FetchExperimentVariantRequest {
  readonly productId: string;
  readonly userId?: string;
  readonly signal: AbortSignal;
}

export type ExperimentVariantFetcher = (
  request: FetchExperimentVariantRequest,
) => Promise<ExperimentVariantAssignment | null>;

export type ExperimentEventTracker = (
  payload: ExperimentEventPayload,
) => Promise<void>;

export interface UseExperimentVariantOptions {
  readonly userId?: string;
  readonly fetchVariant?: ExperimentVariantFetcher;
  readonly trackEvent?: ExperimentEventTracker;
  readonly autoTrackView?: boolean;
}

export interface UseExperimentVariantResult {
  readonly variant: ExperimentVariantAssignment | null;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly trackEvent: (
    event: ExperimentEventPayload['event'],
    overrides?: Partial<Pick<ExperimentEventPayload, 'userId'>>,
  ) => Promise<void>;
}

function storageKey(productId: string): string {
  return `${STORAGE_PREFIX}${productId}`;
}

export function storeExperimentAssignment(
  productId: string,
  assignment: ExperimentVariantAssignment,
): void {
  window.sessionStorage.setItem(storageKey(productId), JSON.stringify(assignment));
}

export function readStoredExperimentAssignment(
  productId: string,
): ExperimentVariantAssignment | null {
  const raw = window.sessionStorage.getItem(storageKey(productId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ExperimentVariantAssignment;
  } catch {
    return null;
  }
}

async function fetchActiveExperimentVariant(
  request: FetchExperimentVariantRequest,
): Promise<ExperimentVariantAssignment | null> {
  const response = await globalThis.fetch('/shop-api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: `
        query ActiveExperimentVariant($productId: String!) {
          activeExperimentVariant(productId: $productId) {
            experimentId
            productId
            variantName
            config
          }
        }
      `,
      variables: {
        productId: request.productId,
      },
    }),
    signal: request.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load experiment variant: ${response.status}.`);
  }

  const payload = (await response.json()) as {
    readonly data?: {
      readonly activeExperimentVariant?: ExperimentVariantAssignment | null;
    };
    readonly errors?: readonly { readonly message?: string }[];
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? 'Failed to load experiment variant.');
  }

  return payload.data?.activeExperimentVariant ?? null;
}

async function postExperimentEvent(payload: ExperimentEventPayload): Promise<void> {
  const response = await globalThis.fetch('/shop-api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: `
        mutation TrackExperimentEvent(
          $experimentId: String!
          $variantName: String!
          $event: String!
        ) {
          trackEvent(
            experimentId: $experimentId
            variantName: $variantName
            event: $event
          )
        }
      `,
      variables: {
        experimentId: payload.experimentId,
        variantName: payload.variantName,
        event: payload.event,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to track experiment event: ${response.status}.`);
  }
}

export function useExperimentVariant(
  productId: string | null,
  options: UseExperimentVariantOptions = {},
): UseExperimentVariantResult {
  const fetchVariant = options.fetchVariant ?? fetchActiveExperimentVariant;
  const tracker = options.trackEvent ?? postExperimentEvent;
  const autoTrackView = options.autoTrackView ?? true;
  const [variant, setVariant] = useState<ExperimentVariantAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(productId));
  const [error, setError] = useState<Error | null>(null);
  const trackedViewKey = useRef<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setVariant(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const abortController = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchVariant({
      productId,
      userId: options.userId,
      signal: abortController.signal,
    })
      .then((result) => {
        if (abortController.signal.aborted) {
          return;
        }

        setVariant(result);
        if (result) {
          storeExperimentAssignment(productId, result);
        }
      })
      .catch((fetchError) => {
        if (abortController.signal.aborted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError : new Error(String(fetchError)));
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => abortController.abort();
  }, [fetchVariant, options.userId, productId]);

  const trackEvent = useCallback(
    async (
      event: ExperimentEventPayload['event'],
      overrides?: Partial<Pick<ExperimentEventPayload, 'userId'>>,
    ) => {
      if (!productId || !variant) {
        return;
      }

      await tracker({
        experimentId: variant.experimentId,
        variantName: variant.variantName,
        productId,
        event,
        userId: overrides?.userId ?? options.userId,
      });
    },
    [options.userId, productId, tracker, variant],
  );

  useEffect(() => {
    if (!autoTrackView || !variant || !productId) {
      return;
    }

    const viewKey = `${variant.experimentId}:${variant.variantName}:${productId}`;
    if (trackedViewKey.current === viewKey) {
      return;
    }

    trackedViewKey.current = viewKey;
    void trackEvent('view');
  }, [autoTrackView, productId, trackEvent, variant]);

  return {
    variant,
    isLoading,
    error,
    trackEvent,
  };
}
