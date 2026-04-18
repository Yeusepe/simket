import { Outlet } from 'react-router-dom';
import { TopBar } from '../components/TopBar';

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
