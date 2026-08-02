'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, User, GraduationCap, BookOpen, LucideIcon } from 'lucide-react';
import { useAdminTheme } from '@/context/AdminThemeContext';

type Role = 'teacher' | 'parent' | 'admin' | 'school_teacher';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_MAP: Record<Role, NavItem[]> = {
  teacher: [
    { href: '/teacher', label: 'Home', icon: Home },
    { href: '/teacher/progress', label: 'Reports', icon: ClipboardList },
    { href: '/teacher/profile', label: 'Profile', icon: User },
  ],
  parent: [
    { href: '/parent', label: 'Home', icon: Home },
    { href: '/parent/reports', label: 'Reports', icon: ClipboardList },
    { href: '/parent/profile', label: 'Profile', icon: User },
  ],
  admin: [
    { href: '/admin', label: 'Home', icon: Home },
    { href: '/admin/students', label: 'Students', icon: GraduationCap },
    { href: '/admin/teachers', label: 'Teachers', icon: BookOpen },
    { href: '/admin/profile', label: 'Profile', icon: User },
  ],
  school_teacher: [
    { href: '/school-teacher', label: 'Dashboard', icon: Home },
    { href: '/school-teacher/history', label: 'Updates', icon: ClipboardList },
    { href: '/school-teacher/profile', label: 'Profile', icon: User },
  ],
};

interface BottomNavProps {
  role?: Role;
}

export default function BottomNav({ role = 'teacher' }: BottomNavProps) {
  const pathname = usePathname();
  const { darkMode } = useAdminTheme();
  const items = NAV_MAP[role];

  const isDark = darkMode;

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur transition-colors duration-300 ${
      isDark
        ? 'border-gray-800 bg-gray-900/95 text-gray-300 supports-[backdrop-filter]:bg-gray-900/90'
        : 'border-gray-200/80 bg-white/95 text-gray-600 supports-[backdrop-filter]:bg-white/90 shadow-lg'
    }`}>
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-3 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ href, label, icon: Icon }) => {
          const rootPath = `/${role.replace('_', '-')}`;
          const isDashboardRoot = href === `/${role}` || href === rootPath;
          const active = pathname === href || (!isDashboardRoot && pathname.startsWith(href + '/'));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 transition active:scale-95"
            >
              {/* WhatsApp Active Pill Container */}
              <div className={`flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200 ${
                active
                  ? isDark
                    ? 'bg-gray-800 text-madrasa-400 shadow-xs'
                    : 'bg-madrasa-100 text-madrasa-800 shadow-xs ring-1 ring-madrasa-200/50'
                  : isDark
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}>
                <Icon className={`h-5 w-5 transition-transform ${active ? 'scale-105' : ''}`} aria-hidden="true" />
              </div>
              {/* Label */}
              <span className={`text-[11px] transition-colors ${
                active
                  ? isDark ? 'font-bold text-white' : 'font-bold text-gray-900'
                  : isDark ? 'font-medium text-gray-400' : 'font-medium text-gray-500'
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
