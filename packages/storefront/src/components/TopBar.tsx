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
import { Icon } from './common/Icon';

/**
 * Floating top navigation bar with:
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
    <header className="fixed left-0 right-0 top-4 z-50 mx-auto max-w-7xl px-4">
      <div className="flex h-14 items-center gap-4 rounded-2xl border border-divider bg-background/70 px-4 shadow-lg backdrop-blur-xl">
        {/* Logo / Home */}
        <Link to="/" className="flex-shrink-0 text-xl font-bold text-foreground">
          Simket
        </Link>

        {/* Search */}
        <div className="flex-1">
          <SearchField aria-label="Search products" className="max-w-md">
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
