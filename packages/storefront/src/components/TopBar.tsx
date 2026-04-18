import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Badge,
  SearchField,
  Dropdown,
  Avatar,
} from '@heroui/react';
import { useTheme } from '../hooks/use-theme';
import { useWishlist } from '../hooks/useWishlist';
import { useCartState } from '../state/cart-state';
import type { WishlistApi } from '../types/wishlist';
import { NotificationBell } from './notifications';

/**
 * Top navigation bar with:
 * - Search input
 * - Home, dark/light toggle, cart, notifications, library, profile
 * - Profile dropdown: inventory, account settings, creator dashboard
 */
interface TopBarProps {
  readonly wishlistApi?: WishlistApi;
}

export function TopBar({ wishlistApi }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const totalItems = useCartState((state) => state.totalItems);
  const { wishlistCount } = useWishlist({ api: wishlistApi });

  return (
    <header className="sticky top-0 z-50 border-b border-divider bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        {/* Logo / Home */}
        <Link to="/" className="flex-shrink-0 text-xl font-bold text-foreground">
          Simket
        </Link>

        {/* Search */}
        <div className="flex-1">
          <SearchField aria-label="Search products" className="max-w-md">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search products…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>

        {/* Actions */}
        <nav className="flex items-center gap-2">
          {/* Home */}
          <Button
            variant="ghost"
            size="sm"
            aria-label="Home"
            onPress={() => navigate('/')}
          >
            Home
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            onPress={toggleTheme}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </Button>

          {/* Cart */}
          <Badge.Anchor>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Cart"
              onPress={() => navigate('/cart')}
            >
              Cart
            </Button>
            <Badge color="danger" size="sm">{totalItems}</Badge>
          </Badge.Anchor>

          {/* Wishlist */}
          <Badge.Anchor>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Wishlist"
              onPress={() => navigate('/wishlist')}
            >
              Wishlist
            </Button>
            <Badge color="accent" size="sm">{wishlistCount}</Badge>
          </Badge.Anchor>

          {/* Notifications */}
          <NotificationBell />

          {/* Library */}
          <Button
            variant="ghost"
            size="sm"
            aria-label="Library"
            onPress={() => navigate('/library')}
          >
            Library
          </Button>

          {/* Profile dropdown */}
          <Dropdown>
            <Dropdown.Trigger>
              <div
                role="button"
                tabIndex={0}
                aria-label="User menu"
                data-testid="profile-avatar"
                className="cursor-pointer"
              >
                <Avatar size="sm">
                  <Avatar.Fallback>U</Avatar.Fallback>
                </Avatar>
              </div>
            </Dropdown.Trigger>
            <Dropdown.Popover>
              <Dropdown.Menu onAction={(key) => navigate(String(key))}>
                <Dropdown.Item id="/library">Inventory</Dropdown.Item>
                <Dropdown.Item id="/profile">Account Settings</Dropdown.Item>
                <Dropdown.Item id="/dashboard">Creator Dashboard</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </nav>
      </div>
    </header>
  );
}
