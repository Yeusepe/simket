/**
 * Purpose: Hold the active Better Auth session, exchange Better Auth JWTs for
 *          Vendure bearer tokens, and gate authenticated storefront routes.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://better-auth.com/docs/plugins/generic-oauth
 *   - https://better-auth.com/docs/plugins/jwt
 * Tests:
 *   - packages/storefront/src/components/settings/use-settings.test.ts
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authClient, getAuthBaseUrl } from '../lib/auth-client';
import { clearVendureAuthState, fetchShopGraphqlWithResponse, getVendureAuthState, readVendureAuthToken, setVendureAuthState } from '../lib/shop-api';

const BETTER_AUTH_PROVIDER_ID = 'yucp-creators';

const AUTHENTICATE_WITH_BETTER_AUTH_MUTATION = `
  mutation AuthenticateWithBetterAuth($token: String!) {
    authenticate(input: { better_auth: { token: $token } }) {
      __typename
      ... on CurrentUser {
        id
        identifier
      }
      ... on ErrorResult {
        errorCode
        message
      }
      ... on InvalidCredentialsError {
        errorCode
        message
      }
      ... on NotVerifiedError {
        errorCode
        message
      }
      ... on NativeAuthStrategyError {
        errorCode
        message
      }
    }
  }
`;

interface SimketUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly createdAt?: string;
  readonly image?: string | null;
  readonly role?: string;
  readonly bio?: string;
  readonly website?: string;
  readonly creatorSlug?: string | null;
  readonly authSource?: string;
}

interface SimketSession {
  readonly user: SimketUser;
  readonly session: {
    readonly id: string;
    readonly expiresAt?: string;
  };
}

interface BetterAuthAccountRecord {
  readonly providerId: string;
}

interface AuthContextValue {
  readonly session: SimketSession | null;
  readonly isPending: boolean;
  readonly isVendureReady: boolean;
  readonly error: string | null;
  readonly signInBuyer: (email: string, password: string) => Promise<void>;
  readonly signUpBuyer: (name: string, email: string, password: string) => Promise<void>;
  readonly signInCreator: () => Promise<void>;
  readonly signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeSessionPayload(value: unknown): SimketSession | null {
  if (!isRecord(value) || !isRecord(value['user']) || !isRecord(value['session'])) {
    return null;
  }

  const user = value['user'];
  const session = value['session'];
  if (
    typeof user['id'] !== 'string'
    || typeof user['email'] !== 'string'
    || typeof user['name'] !== 'string'
    || typeof session['id'] !== 'string'
  ) {
    return null;
  }

  return {
    user: {
      id: user['id'],
      email: user['email'],
      name: user['name'],
      createdAt: typeof user['createdAt'] === 'string' ? user['createdAt'] : undefined,
      image: typeof user['image'] === 'string' ? user['image'] : null,
      role: typeof user['role'] === 'string' ? user['role'] : undefined,
      bio: typeof user['bio'] === 'string' ? user['bio'] : undefined,
      website: typeof user['website'] === 'string' ? user['website'] : undefined,
      creatorSlug: typeof user['creatorSlug'] === 'string' ? user['creatorSlug'] : null,
      authSource: typeof user['authSource'] === 'string' ? user['authSource'] : undefined,
    },
    session: {
      id: session['id'],
      expiresAt: typeof session['expiresAt'] === 'string' ? session['expiresAt'] : undefined,
    },
  };
}

function getAuthEndpoint(path: string): string {
  const baseUrl = getAuthBaseUrl();
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ''), normalizedBaseUrl).toString();
}

async function resolveSessionRole(session: SimketSession): Promise<SimketSession> {
  if (session.user.role === 'creator' || session.user.authSource === 'yucp') {
    return session;
  }

  const response = await fetch(getAuthEndpoint('/list-accounts'), {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return session;
  }

  const accounts = (await response.json()) as unknown;
  if (!Array.isArray(accounts)) {
    return session;
  }

  const hasYucpProvider = accounts.some((account): account is BetterAuthAccountRecord =>
    isRecord(account) && account['providerId'] === BETTER_AUTH_PROVIDER_ID,
  );

  if (!hasYucpProvider) {
    return session;
  }

  return {
    ...session,
    user: {
      ...session.user,
      role: 'creator',
      authSource: 'yucp',
    },
  };
}

async function exchangeBetterAuthJwt(session: SimketSession): Promise<void> {
  const tokenResult = await authClient.token();
  const jwtToken = tokenResult.data?.token;
  if (!jwtToken) {
    throw new Error(tokenResult.error?.message ?? 'Better Auth did not return a JWT.');
  }

  const { data, response } = await fetchShopGraphqlWithResponse<{
    authenticate: { readonly __typename: string; readonly message?: string | null };
  }>(AUTHENTICATE_WITH_BETTER_AUTH_MUTATION, { token: jwtToken }, { skipAuthentication: true });

  const vendureToken = readVendureAuthToken(response);
  if (!vendureToken) {
    throw new Error(
      data.authenticate?.message
        ?? 'Vendure did not issue an auth token for the Better Auth session.',
    );
  }

  setVendureAuthState({ userId: session.user.id, token: vendureToken });
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const sessionQuery = authClient.useSession();
  const normalizedSession = normalizeSessionPayload(sessionQuery.data);
  const [session, setSession] = useState<SimketSession | null>(null);
  const [isResolvingSession, setIsResolvingSession] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [isVendureReady, setIsVendureReady] = useState(false);

  useEffect(() => {
    if (!normalizedSession) {
      setSession(null);
      setIsResolvingSession(false);
      return;
    }

    let cancelled = false;
    setIsResolvingSession(true);
    void resolveSessionRole(normalizedSession)
      .then((nextSession) => {
        if (!cancelled) {
          setSession(nextSession);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSession(normalizedSession);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolvingSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedSession]);

  useEffect(() => {
    if (!session) {
      clearVendureAuthState();
      setBridgeError(null);
      setIsVendureReady(false);
      return;
    }

    const storedVendureState = getVendureAuthState();
    if (storedVendureState?.userId === session.user.id && storedVendureState.token.length > 0) {
      setIsVendureReady(true);
      return;
    }

    clearVendureAuthState();
    setIsVendureReady(false);
    setBridgeError(null);

    let cancelled = false;
    void exchangeBetterAuthJwt(session)
      .then(() => {
        if (!cancelled) {
          setIsVendureReady(true);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          clearVendureAuthState();
          setBridgeError(error instanceof Error ? error.message : 'Auth bridge failed.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isPending: Boolean(sessionQuery.isPending) || isResolvingSession,
      isVendureReady,
      error:
        bridgeError
        ?? (sessionQuery.error instanceof Error ? sessionQuery.error.message : null),
      async signInBuyer(email, password) {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.error) {
          throw new Error(result.error.message ?? 'Unable to sign in.');
        }
      },
      async signUpBuyer(name, email, password) {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
        });
        if (result.error) {
          throw new Error(result.error.message ?? 'Unable to create your account.');
        }
      },
      async signInCreator() {
        const result = await authClient.signIn.oauth2({
          providerId: BETTER_AUTH_PROVIDER_ID,
          callbackURL: '/dashboard',
          errorCallbackURL: '/sign-in',
        });
        if (result.error) {
          throw new Error(result.error.message ?? 'Unable to start creator sign-in.');
        }
      },
      async signOut() {
        clearVendureAuthState();
        setIsVendureReady(false);
        const result = await authClient.signOut();
        if (result.error) {
          throw new Error(result.error.message ?? 'Unable to sign out.');
        }
      },
    }),
    [bridgeError, isResolvingSession, isVendureReady, session, sessionQuery.error, sessionQuery.isPending],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}

export function RequireAuth({ children }: { readonly children: ReactNode }) {
  const { session, isPending } = useAuth();
  const location = useLocation();

  if (isPending) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-muted-foreground">Loading your session…</div>;
  }

  if (!session) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function RequireCreator({ children }: { readonly children: ReactNode }) {
  const { session, isPending, isVendureReady } = useAuth();
  const location = useLocation();

  if (isPending || (session && !isVendureReady)) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-muted-foreground">Preparing your creator workspace…</div>;
  }

  if (!session) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  if (session.user.role !== 'creator') {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
