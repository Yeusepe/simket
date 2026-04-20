/**
 * Purpose: Centralize storefront GraphQL requests to Vendure and persist the
 *          exchanged Vendure bearer token that bridges Better Auth sessions.
 * Governing docs:
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/
 * Tests:
 *   - packages/storefront/src/hooks/useWishlist.test.tsx
 */
const VENDURE_AUTH_HEADER = 'vendure-auth-token';
const VENDURE_AUTH_STORAGE_KEY = 'simket.vendure-auth';

interface GraphqlError {
  readonly message: string;
}

interface GraphqlResponse<TData> {
  readonly data?: TData;
  readonly errors?: readonly GraphqlError[];
}

export interface VendureAuthState {
  readonly userId: string;
  readonly token: string;
}

export interface ShopGraphqlOptions {
  readonly skipAuthentication?: boolean;
}

export function getShopApiUrl(): string {
  const configuredUrl = (import.meta as ImportMeta & {
    readonly env?: Record<string, string | undefined>;
  }).env?.VITE_SIMKET_SHOP_API_URL;
  if (typeof configuredUrl === 'string' && configuredUrl.length > 0) {
    return configuredUrl;
  }

  return new URL('/shop-api', window.location.origin).toString();
}

export function getVendureAuthState(): VendureAuthState | null {
  const rawValue = window.localStorage.getItem(VENDURE_AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<VendureAuthState>;
    if (typeof parsed.userId === 'string' && typeof parsed.token === 'string') {
      return { userId: parsed.userId, token: parsed.token };
    }
  } catch {
    window.localStorage.removeItem(VENDURE_AUTH_STORAGE_KEY);
  }

  return null;
}

export function setVendureAuthState(state: VendureAuthState): void {
  window.localStorage.setItem(VENDURE_AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function clearVendureAuthState(): void {
  window.localStorage.removeItem(VENDURE_AUTH_STORAGE_KEY);
}

function buildHeaders(options: ShopGraphqlOptions): Headers {
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });

  if (!options.skipAuthentication) {
    const vendureAuthState = getVendureAuthState();
    if (vendureAuthState?.token) {
      headers.set('Authorization', `Bearer ${vendureAuthState.token}`);
    }
  }

  return headers;
}

export async function fetchShopGraphqlWithResponse<TData>(
  query: string,
  variables: Record<string, unknown>,
  options: ShopGraphqlOptions = {},
): Promise<{ readonly data: TData; readonly response: Response }> {
  const response = await globalThis.fetch(getShopApiUrl(), {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders(options),
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shop API request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GraphqlResponse<TData>;
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0]?.message ?? 'Shop API request failed.');
  }
  if (!payload.data) {
    throw new Error('Shop API response did not include data.');
  }

  return { data: payload.data, response };
}

export async function fetchShopGraphql<TData>(
  query: string,
  variables: Record<string, unknown>,
  options: ShopGraphqlOptions = {},
): Promise<TData> {
  const { data } = await fetchShopGraphqlWithResponse<TData>(query, variables, options);
  return data;
}

export function readVendureAuthToken(response: Response): string | null {
  return response.headers.get(VENDURE_AUTH_HEADER);
}
