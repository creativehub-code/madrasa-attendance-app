'use client';

import BottomNav from '@/components/layout/BottomNav';
import { AdminThemeProvider } from '@/context/AdminThemeContext';
import QueryProvider from '@/providers/QueryProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AdminThemeProvider>
        {children}
        <BottomNav role="admin" />
      </AdminThemeProvider>
    </QueryProvider>
  );
}

