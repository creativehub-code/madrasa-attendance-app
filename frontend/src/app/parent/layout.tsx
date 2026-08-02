import BottomNav from '@/components/layout/BottomNav';
import QueryProvider from '@/providers/QueryProvider';
import ForcePasswordChangeGuard from '@/components/auth/ForcePasswordChangeGuard';
import { AdminThemeProvider } from '@/context/AdminThemeContext';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ForcePasswordChangeGuard>
        <AdminThemeProvider>
          {children}
          <BottomNav role="parent" />
        </AdminThemeProvider>
      </ForcePasswordChangeGuard>
    </QueryProvider>
  );
}
