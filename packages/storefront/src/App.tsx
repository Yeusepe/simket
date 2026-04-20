import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, RequireAuth, RequireCreator } from './auth/AuthProvider';
import { RootLayout } from './layouts/RootLayout';
import { HomePage } from './pages/HomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { LibraryPage } from './pages/LibraryPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { CreatorDashboardPage } from './pages/CreatorDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { WishlistPage } from './pages/WishlistPage';
import { SignInPage } from './pages/SignInPage';
import { StoreLayout, StorePageRoute, StoreProductRoute, StoreNotFoundPage, resolveStoreRoute } from './store';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

interface AppRoutesProps {
  readonly hostname?: string;
}

export function AppRoutes({ hostname }: AppRoutesProps) {
  const location = useLocation();
  const storeRootRoute = resolveStoreRoute({
    hostname: hostname ?? window.location.hostname,
    pathname: location.pathname,
  });
  const shouldRenderSubdomainStore = storeRootRoute.strategy === 'subdomain';

  if (shouldRenderSubdomainStore) {
    return (
      <Routes>
        <Route element={<StoreLayout hostname={hostname} />}>
          <Route index element={<StorePageRoute />} />
          <Route path="product/:productSlug" element={<StoreProductRoute />} />
          <Route path=":pageSlug" element={<StorePageRoute />} />
          <Route path="*" element={<StoreNotFoundPage message="This creator store route does not exist." />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="store/:creatorSlug" element={<StoreLayout hostname={hostname} />}>
        <Route index element={<StorePageRoute />} />
        <Route path="product/:productSlug" element={<StoreProductRoute />} />
        <Route path=":pageSlug" element={<StorePageRoute />} />
        <Route path="*" element={<StoreNotFoundPage message="This creator store route does not exist." />} />
      </Route>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="sign-in" element={<SignInPage />} />
        <Route path="product/:slug" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="wishlist" element={<RequireAuth><WishlistPage /></RequireAuth>} />
        <Route path="library" element={<RequireAuth><LibraryPage /></RequireAuth>} />
        <Route path="notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="dashboard/*" element={<RequireCreator><CreatorDashboardPage /></RequireCreator>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
