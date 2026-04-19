/**
 * Purpose: Floating top navigation bar for Simket storefront.
 * Features: search, home, dark/light toggle, cart, notifications, library, profile dropdown.
 * Profile dropdown: inventory, account settings, creator dashboard.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 * External references:
 *   - https://heroui.com/docs/react/components/dropdown.mdx
 *   - https://heroui.com/docs/react/components/search-field.mdx
 *   - https://heroui.com/docs/react/components/badge.mdx
 *   - https://heroui.com/docs/react/components/avatar.mdx
 * Tests:
 *   - packages/storefront/src/components/TopBar.test.tsx
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Badge,
  SearchField,
  Dropdown,
  Avatar,
  Label,
} from '@heroui/react';
import { useTheme } from '../hooks/use-theme';
import { useWishlist } from '../hooks/useWishlist';
import { useCartState } from '../state/cart-state';
import type { WishlistApi } from '../types/wishlist';
import { NotificationBell } from './notifications';
import { Icon } from './common/Icon';

interface TopBarProps {
  readonly wishlistApi?: WishlistApi;
}

export function TopBar({ wishlistApi }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const totalItems = useCartState((state) => state.totalItems);
  const { wishlistCount } = useWishlist({ api: wishlistApi });
  const [searchQuery, setSearchQuery] = useState('');

  function handleSearch(value: string) {
    const q = value.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <header className="fixed left-0 right-0 top-4 z-50 mx-auto max-w-7xl px-4">
      <div className="flex h-14 items-center gap-3 rounded-2xl border border-divider bg-background/70 px-4 shadow-lg backdrop-blur-xl">
        {/* Logo / Home */}
        <Link to="/" className="flex-shrink-0 text-xl font-bold text-foreground">
          Simket
        </Link>

        {/* Search */}
        <div className="flex-1">
          <SearchField
            name="search"
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
            aria-label="Search products"
            className="w-full max-w-md"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search products..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>

        {/* Actions */}
        <nav className="flex items-center gap-1">
          {/* Home */}
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            aria-label="Home"
            onPress={() => navigate('/')}
          >
            <Icon name="home" size={18} />
          </Button>

          {/* Theme toggle */}
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            onPress={toggleTheme}
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
          </Button>

          {/* Cart */}
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

          {/* Wishlist */}
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

          {/* Notifications */}
          <NotificationBell />

          {/* Library */}
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            aria-label="Library"
            onPress={() => navigate('/library')}
          >
            <Icon name="library" size={18} />
          </Button>

          {/* Profile dropdown */}
          <Dropdown>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="User menu"
              data-testid="profile-avatar"
            >
              <Avatar size="sm">
                <Avatar.Fallback>U</Avatar.Fallback>
              </Avatar>
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={(key) => navigate(String(key))}>
                <Dropdown.Item id="/library" textValue="Inventory">
                  <Icon name="library" size={16} />
                  <Label>Inventory</Label>
                </Dropdown.Item>
                <Dropdown.Item id="/profile" textValue="Account Settings">
                  <Icon name="settings" size={16} />
                  <Label>Account Settings</Label>
                </Dropdown.Item>
                <Dropdown.Item id="/dashboard" textValue="Creator Dashboard">
                  <Icon name="chart" size={16} />
                  <Label>Creator Dashboard</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </nav>
      </div>
    </header>
  );
}
