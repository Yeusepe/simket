/**
 * Purpose: Verify the storefront auth provider refreshes client session state
 *          after local Better Auth mutations complete.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://www.better-auth.com/docs/concepts/client
 * Tests:
 *   - packages/storefront/src/auth/AuthProvider.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, RequireAuth, useAuth } from './AuthProvider';

const {
  clearVendureAuthStateMock,
  fetchShopGraphqlWithResponseMock,
  getSessionMock,
  getVendureAuthStateMock,
  readVendureAuthTokenMock,
  setVendureAuthStateMock,
  signInEmailMock,
  signUpEmailMock,
  signOutMock,
  signInOauthMock,
  tokenMock,
  refetchMock,
} = vi.hoisted(() => ({
  clearVendureAuthStateMock: vi.fn(),
  fetchShopGraphqlWithResponseMock: vi.fn(),
  getSessionMock: vi.fn(),
  getVendureAuthStateMock: vi.fn(),
  readVendureAuthTokenMock: vi.fn(),
  setVendureAuthStateMock: vi.fn(),
  signInEmailMock: vi.fn(),
  signUpEmailMock: vi.fn(),
  signOutMock: vi.fn(),
  signInOauthMock: vi.fn(),
  tokenMock: vi.fn(),
  refetchMock: vi.fn(),
}));

vi.mock('../lib/auth-client', () => ({
  getAuthBaseUrl: () => 'http://localhost:3000',
  authClient: {
    useSession: () => ({
      data: null,
      isPending: false,
      isRefetching: false,
      error: null,
      refetch: refetchMock,
    }),
    getSession: getSessionMock,
    signIn: {
      email: signInEmailMock,
      oauth2: signInOauthMock,
    },
    signUp: {
      email: signUpEmailMock,
    },
    signOut: signOutMock,
    token: tokenMock,
  },
}));

vi.mock('../lib/shop-api', () => ({
  clearVendureAuthState: clearVendureAuthStateMock,
  fetchShopGraphqlWithResponse: fetchShopGraphqlWithResponseMock,
  getVendureAuthState: getVendureAuthStateMock,
  readVendureAuthToken: readVendureAuthTokenMock,
  setVendureAuthState: setVendureAuthStateMock,
}));

function AuthHarness() {
  const auth = useAuth();

  return (
    <>
      <output>{auth.session?.user.email ?? 'signed-out'}</output>
      <button type="button" onClick={() => void auth.signInBuyer('buyer@simket.test', 'SimketBuyer123')}>
        Sign in buyer
      </button>
    </>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    getSessionMock.mockResolvedValue({ data: null, error: null });
    signInEmailMock.mockResolvedValue({ error: null });
    signUpEmailMock.mockResolvedValue({ error: null });
    signOutMock.mockResolvedValue({ error: null });
    signInOauthMock.mockResolvedValue({ error: null });
    tokenMock.mockResolvedValue({ data: { token: 'better-auth-jwt' }, error: null });
    refetchMock.mockResolvedValue(undefined);
    getVendureAuthStateMock.mockReturnValue(null);
    readVendureAuthTokenMock.mockReturnValue('vendure-token');
    fetchShopGraphqlWithResponseMock.mockResolvedValue({
      data: {
        authenticate: {
          __typename: 'CurrentUser',
        },
      },
      response: new Response(null),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refetches the Better Auth session after buyer sign-in succeeds', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Sign in buyer' }));

    await waitFor(() => {
      expect(signInEmailMock).toHaveBeenCalledWith({
        email: 'buyer@simket.test',
        password: 'SimketBuyer123',
      });
      expect(refetchMock).toHaveBeenCalledTimes(1);
      expect(getSessionMock).toHaveBeenCalled();
    });
  });

  it('hydrates the active session from the Better Auth client on mount', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          id: 'session-1',
        },
        user: {
          id: 'user-1',
          email: 'buyer@simket.test',
          name: 'Simket Buyer',
        },
      },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('buyer@simket.test')).toBeInTheDocument();
    });
  });

  it('requests linked accounts from the Better Auth route prefix', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          id: 'session-1',
        },
        user: {
          id: 'user-1',
          email: 'buyer@simket.test',
          name: 'Simket Buyer',
        },
      },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/list-accounts',
        expect.objectContaining({
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        }),
      );
    });
  });

  it('waits for the Vendure bridge before rendering protected buyer routes when requested', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          id: 'session-1',
        },
        user: {
          id: 'user-1',
          email: 'buyer@simket.test',
          name: 'Simket Buyer',
        },
      },
      error: null,
    });
    readVendureAuthTokenMock.mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={['/wishlist']}>
        <AuthProvider>
          <RequireAuth requireVendureReady pendingMessage="Preparing your account…">
            <div>Buyer area</div>
          </RequireAuth>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Preparing your account…')).toBeInTheDocument();
    });
    expect(screen.queryByText('Buyer area')).not.toBeInTheDocument();
  });

  it('uses an authenticate mutation that matches Vendure shop AuthenticationResult unions', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          id: 'session-1',
        },
        user: {
          id: 'user-1',
          email: 'buyer@simket.test',
          name: 'Simket Buyer',
        },
      },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(fetchShopGraphqlWithResponseMock).toHaveBeenCalled();
    });

    const [query] = fetchShopGraphqlWithResponseMock.mock.calls[0] ?? [];
    expect(typeof query).toBe('string');
    expect(query).not.toContain('NativeAuthStrategyError');
    expect(query).toContain('InvalidCredentialsError');
  });
});
