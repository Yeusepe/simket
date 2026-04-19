import { Outlet } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { useTheme } from '../hooks/use-theme';
import { useAdaptiveColors } from '../color';

export function RootLayout() {
  const { theme } = useTheme();
  useAdaptiveColors({ mode: theme });

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--simket-background)] text-[var(--simket-neutral400,inherit)]">
      <TopBar />
      {/* pt-24 accounts for the floating top bar (top-4 + h-14 + gap) */}
      <main className="flex-1 pt-24">
        <Outlet />
      </main>
    </div>
  );
}
