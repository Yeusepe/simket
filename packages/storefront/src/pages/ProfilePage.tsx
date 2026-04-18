/**
 * Purpose: Route-level account settings page for buyer profile, security, notifications, linked providers, and account lifecycle controls.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.better-auth.com/docs
 * Tests:
 *   - packages/storefront/src/components/settings/SettingsPage.test.tsx
 */
import { SettingsPage } from '../components/settings';

export function ProfilePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SettingsPage />
    </div>
  );
}
