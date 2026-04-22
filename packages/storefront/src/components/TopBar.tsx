/**
 * Purpose: Floating top navigation bar for Simket storefront.
 * Features: search, home, dark/light toggle, cart, notifications, library, profile dropdown.
 * Profile dropdown: inventory, account settings, creator dashboard.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://heroui.com/docs/react/components/dropdown.mdx
 *   - https://heroui.com/docs/react/components/search-field.mdx
 *   - https://heroui.com/docs/react/components/badge.mdx
 *   - https://heroui.com/docs/react/components/avatar.mdx
 * Tests:
 *   - packages/storefront/src/components/TopBar.test.tsx
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Label,
  SearchField,
} from '@heroui/react';
import { Navbar } from '@heroui-pro/react/navbar';

import { useAuth } from '../auth/AuthProvider';
import { useTheme } from '../hooks/use-theme';
import { useWishlist } from '../hooks/useWishlist';
import { useCartState } from '../state/cart-state';
import type { WishlistApi } from '../types/wishlist';
import { Icon } from './common/Icon';
import { NotificationBell } from './notifications';

interface TopBarProps {
  readonly wishlistApi?: WishlistApi;
}

export function TopBar({ wishlistApi }: TopBarProps) {
  const { session, isVendureReady, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const totalItems = useCartState((state) => state.totalItems);
  const { wishlistCount } = useWishlist({ api: wishlistApi, enabled: Boolean(session && isVendureReady) });
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = session?.user.name ?? 'Guest';
  const avatarFallback = displayName.trim().slice(0, 1).toUpperCase() || 'G';

  function handleSearch(value: string) {
    const query = value.trim();
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <header className="fixed left-0 right-0 top-4 z-50 px-4">
      <Navbar
        className="mx-auto border-border/70 bg-background/85 shadow-surface supports-[backdrop-filter]:bg-background/70 backdrop-blur-xl"
        maxWidth="2xl"
        navigate={(href) => navigate(href)}
        position="floating"
        size="md"
      >
        <Navbar.Header className="gap-3">
          <Navbar.Brand>
            <Link to="/" className="flex-shrink-0 text-xl font-bold tracking-tight text-foreground">
              Simket
            </Link>
          </Navbar.Brand>

          <div className="hidden min-w-0 flex-1 md:block">
            <SearchField
              aria-label="Search products"
              className="w-full"
              name="search"
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              value={searchQuery}
              variant="secondary"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search products..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>

          <Navbar.Spacer />

          <nav className="flex items-center gap-1">
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="Home"
              onPress={() => navigate('/')}
            >
              <Icon name="home" size={18} />
            </Button>

            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              onPress={toggleTheme}
            >
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
            </Button>

            <Badge.Anchor>
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                aria-label="Cart"
                onPress={() => navigate('/cart')}
              >
                <Icon name="cart" size={18} />
              </Button>
              {totalItems > 0 ? (
                <Badge color="danger" size="sm">{totalItems}</Badge>
              ) : null}
            </Badge.Anchor>

            {session ? (
              <>
                <Badge.Anchor>
                  <Button
                    isIconOnly
                    variant="ghost"
                    size="sm"
                    aria-label="Wishlist"
                    onPress={() => navigate('/wishlist')}
                  >
                    <Icon name="heart-outline" size={18} />
                  </Button>
                  {wishlistCount > 0 ? (
                    <Badge color="accent" size="sm">{wishlistCount}</Badge>
                  ) : null}
                </Badge.Anchor>

                <NotificationBell enabled={isVendureReady} />

                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  aria-label="Library"
                  onPress={() => navigate('/library')}
                >
                  <Icon name="library" size={18} />
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onPress={() => navigate('/sign-in')}>
                Sign in
              </Button>
            )}

            <Navbar.Separator className="hidden md:block" />

            <Dropdown>
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                aria-label="User menu"
                data-testid="profile-avatar"
              >
                <Avatar size="sm">
                  <Avatar.Fallback>{avatarFallback}</Avatar.Fallback>
                </Avatar>
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  onAction={(key) => {
                    if (key === 'sign-out') {
                      void signOut().then(() => navigate('/'));
                      return;
                    }
                    navigate(String(key));
                  }}
                >
                  {session ? (
                    <>
                      <Dropdown.Item id="/library" textValue="Inventory">
                        <Icon name="library" size={16} />
                        <Label>Inventory</Label>
                      </Dropdown.Item>
                      <Dropdown.Item id="/profile" textValue="Account Settings">
                        <Icon name="settings" size={16} />
                        <Label>Account Settings</Label>
                      </Dropdown.Item>
                      {session.user.role === 'creator' ? (
                        <Dropdown.Item id="/dashboard" textValue="Creator Dashboard">
                          <Icon name="chart" size={16} />
                          <Label>Creator Dashboard</Label>
                        </Dropdown.Item>
                      ) : null}
                      <Dropdown.Item id="sign-out" textValue="Sign out">
                        <Icon name="close" size={16} />
                        <Label>Sign out</Label>
                      </Dropdown.Item>
                    </>
                  ) : (
                    <Dropdown.Item id="/sign-in" textValue="Sign in">
                      <Icon name="profile" size={16} />
                      <Label>Sign in</Label>
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>

            <Navbar.MenuToggle className="md:hidden" srLabel="Toggle storefront navigation" />
          </nav>
        </Navbar.Header>

        <Navbar.Menu className="md:hidden">
          <div className="pb-3">
            <SearchField
              aria-label="Search products"
              className="w-full"
              name="mobile-search"
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              value={searchQuery}
              variant="secondary"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search products..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>

          <Navbar.MenuItem href="/" isCurrent={location.pathname === '/'}>
            Home
          </Navbar.MenuItem>
          <Navbar.MenuItem href="/cart" isCurrent={location.pathname === '/cart'}>
            Cart
          </Navbar.MenuItem>
          {session ? (
            <>
              <Navbar.MenuItem href="/wishlist" isCurrent={location.pathname === '/wishlist'}>
                Wishlist
              </Navbar.MenuItem>
              <Navbar.MenuItem href="/library" isCurrent={location.pathname === '/library'}>
                Library
              </Navbar.MenuItem>
              <Navbar.MenuItem href="/profile" isCurrent={location.pathname === '/profile'}>
                Account
              </Navbar.MenuItem>
              {session.user.role === 'creator' ? (
                <Navbar.MenuItem href="/dashboard" isCurrent={location.pathname.startsWith('/dashboard')}>
                  Creator dashboard
                </Navbar.MenuItem>
              ) : null}
            </>
          ) : (
            <Navbar.MenuItem href="/sign-in" isCurrent={location.pathname === '/sign-in'}>
              Sign in
            </Navbar.MenuItem>
          )}
        </Navbar.Menu>
      </Navbar>
    </header>
  );
}
