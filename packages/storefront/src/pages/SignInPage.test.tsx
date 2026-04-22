/**
 * Purpose: Verify sign-in redirect behavior and clarify the local creator vs YUCP sign-in lanes.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://testing-library.com/docs/react-testing-library/intro
 * Tests:
 *   - packages/storefront/src/pages/SignInPage.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignInPage } from './SignInPage';
import type { SimketSession } from '../auth/AuthProvider';

const navigateMock = vi.hoisted(() => vi.fn());
const locationState = vi.hoisted(() => ({
  state: null as { readonly from?: string } | null,
}));
const authState = vi.hoisted(() => ({
  signInBuyer: vi.fn(),
  signUpBuyer: vi.fn(),
  signInCreator: vi.fn(),
  error: null as string | null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => locationState,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => authState,
}));

function createSession(role: 'buyer' | 'creator'): SimketSession {
  return {
    user: {
      id: `${role}-user`,
      email: `${role}@simket.test`,
      name: role === 'creator' ? 'Alex Creator' : 'Simket Buyer',
      role,
      authSource: 'local-dev',
      creatorSlug: role === 'creator' ? 'alex-creator' : null,
    },
    session: {
      id: `${role}-session`,
    },
  };
}

describe('SignInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationState.state = null;
    authState.error = null;
    authState.signInBuyer.mockResolvedValue(createSession('buyer'));
    authState.signUpBuyer.mockResolvedValue(createSession('buyer'));
    authState.signInCreator.mockResolvedValue(undefined);
  });

  it('sends seeded local creators to the dashboard by default after email sign-in', async () => {
    authState.signInBuyer.mockResolvedValue(createSession('creator'));
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText('Email'), 'alex.creator@simket.test');
    await user.type(screen.getByLabelText('Password'), 'SimketCreator123');
    await user.click(screen.getByRole('button', { name: /continue with simket/i }));

    await waitFor(() => {
      expect(authState.signInBuyer).toHaveBeenCalledWith('alex.creator@simket.test', 'SimketCreator123');
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('keeps buyers on the profile page when there is no explicit redirect target', async () => {
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText('Email'), 'buyer@simket.test');
    await user.type(screen.getByLabelText('Password'), 'SimketBuyer123');
    await user.click(screen.getByRole('button', { name: /continue with simket/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/profile', { replace: true });
    });
  });

  it('preserves an explicit redirect target for creators', async () => {
    locationState.state = { from: '/wishlist' };
    authState.signInBuyer.mockResolvedValue(createSession('creator'));
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByLabelText('Email'), 'alex.creator@simket.test');
    await user.type(screen.getByLabelText('Password'), 'SimketCreator123');
    await user.click(screen.getByRole('button', { name: /continue with simket/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/wishlist', { replace: true });
    });
  });

  it('explains that local creator seeds use the email and password form instead of YUCP OAuth', () => {
    render(<SignInPage />);

    expect(screen.getByText(/local development creator accounts use the email\/password form on the left/i)).toBeInTheDocument();
    expect(screen.getByText(/use continue with yucp only for real yucp oauth creators/i)).toBeInTheDocument();
  });
});
