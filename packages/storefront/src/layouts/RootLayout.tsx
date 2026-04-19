import { Outlet } from 'react-router-dom';
import { TopBar } from '../components/TopBar';

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      {/* pt-24 accounts for the floating top bar (top-4 + h-14 + gap) */}
      <main className="flex-1 pt-24">
        <Outlet />
      </main>
    </div>
  );
}
