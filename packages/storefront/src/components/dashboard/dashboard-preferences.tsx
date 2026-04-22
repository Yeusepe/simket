/**
 * Purpose: Persist creator dashboard display preferences shared across the
 *          dashboard shell and the Framely builder studio.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/service-architecture.md (§7.7 Storefront plugin)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 *   - packages/storefront/src/components/dashboard/templates/TemplateBuilderStudio.test.tsx
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type DashboardShellStyle = 'floating' | 'inset' | 'sidebar';
export type DashboardDensity = 'comfortable' | 'compact';
export type DashboardPreviewMode = 'split' | 'focus';
export type DashboardPreviewDevice = 'desktop' | 'tablet' | 'mobile';

export interface DashboardPreferences {
  readonly shellStyle: DashboardShellStyle;
  readonly density: DashboardDensity;
  readonly previewMode: DashboardPreviewMode;
  readonly previewDevice: DashboardPreviewDevice;
}

interface DashboardPreferencesContextValue {
  readonly preferences: DashboardPreferences;
  readonly setShellStyle: (value: DashboardShellStyle) => void;
  readonly setDensity: (value: DashboardDensity) => void;
  readonly setPreviewMode: (value: DashboardPreviewMode) => void;
  readonly setPreviewDevice: (value: DashboardPreviewDevice) => void;
}

const DASHBOARD_PREFERENCES_STORAGE_KEY = 'simket.creator-dashboard.preferences';

const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  shellStyle: 'floating',
  density: 'comfortable',
  previewMode: 'split',
  previewDevice: 'desktop',
};

const DashboardPreferencesContext = createContext<DashboardPreferencesContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStoredPreferences(value: string | null): DashboardPreferences {
  if (!value) {
    return DEFAULT_DASHBOARD_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed)) {
      return DEFAULT_DASHBOARD_PREFERENCES;
    }

    return {
      shellStyle:
        parsed.shellStyle === 'inset' || parsed.shellStyle === 'sidebar'
          ? parsed.shellStyle
          : 'floating',
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      previewMode: parsed.previewMode === 'focus' ? 'focus' : 'split',
      previewDevice:
        parsed.previewDevice === 'tablet' || parsed.previewDevice === 'mobile'
          ? parsed.previewDevice
          : 'desktop',
    };
  } catch {
    return DEFAULT_DASHBOARD_PREFERENCES;
  }
}

export function DashboardPreferencesProvider({ children }: { readonly children: ReactNode }) {
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_DASHBOARD_PREFERENCES);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setPreferences(parseStoredPreferences(window.localStorage.getItem(DASHBOARD_PREFERENCES_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(DASHBOARD_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const value = useMemo<DashboardPreferencesContextValue>(
    () => ({
      preferences,
      setShellStyle: (shellStyle) => setPreferences((current) => ({ ...current, shellStyle })),
      setDensity: (density) => setPreferences((current) => ({ ...current, density })),
      setPreviewMode: (previewMode) => setPreferences((current) => ({ ...current, previewMode })),
      setPreviewDevice: (previewDevice) =>
        setPreferences((current) => ({ ...current, previewDevice })),
    }),
    [preferences],
  );

  return (
    <DashboardPreferencesContext.Provider value={value}>
      {children}
    </DashboardPreferencesContext.Provider>
  );
}

export function useDashboardPreferences() {
  const context = useContext(DashboardPreferencesContext);

  if (!context) {
    throw new Error('useDashboardPreferences must be used within DashboardPreferencesProvider');
  }

  return context;
}

export { DEFAULT_DASHBOARD_PREFERENCES };
