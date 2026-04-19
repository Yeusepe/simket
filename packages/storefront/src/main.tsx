import './styles/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvexClientProvider } from './providers/ConvexClientProvider';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConvexClientProvider>
        <App />
      </ConvexClientProvider>
    </QueryClientProvider>
  </StrictMode>,
);
