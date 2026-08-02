'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * QueryProvider — scoped to the Admin panel via admin/layout.tsx.
 *
 * Why useState instead of a module-level singleton:
 *   Next.js App Router can render multiple times per request. A module-level
 *   QueryClient would be shared across users in a Node server context.
 *   Calling useState guarantees each browser session gets its own client.
 *
 * Defaults (can be overridden per-query):
 *   staleTime  — 5 min  : data is considered fresh; no background refetch
 *   gcTime     — 10 min : unmounted query data stays in memory before GC
 *   retry      — 1      : one silent retry on transient errors
 *   refetchOnWindowFocus — false : prevents surprise refetches on tab switch
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,   // 5 minutes
        gcTime:    10 * 60 * 1000,  // 10 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Stable reference: created once per component mount, not on every render.
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools are tree-shaken from production builds automatically */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
