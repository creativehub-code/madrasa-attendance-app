'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Sun,
  Moon,
  Lock,
  LogOut,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  fetchMe,
  fetchParentChildren,
  changePassword as apiChangePassword,
  logoutUser,
  type ParentChild,
} from '@/lib/api';
import { useAdminTheme } from '@/context/AdminThemeContext';

export default function ParentProfileView() {
  const queryClient = useQueryClient();
  const { darkMode, toggleDarkMode } = useAdminTheme();

  // Hydration state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkActive = mounted ? darkMode : false;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // 1. Fetch Parent User Profile
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['parentProfile'],
    queryFn: async () => {
      try {
        const res = await fetchMe();
        return res.data.user;
      } catch {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (raw) {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        }
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Parent Children (Wards)
  const { data: childrenData, isLoading: isChildrenLoading } = useQuery({
    queryKey: ['parentChildren'],
    queryFn: async () => {
      const res = await fetchParentChildren();
      return res.data.children;
    },
    staleTime: 5 * 60 * 1000,
  });

  const children: ParentChild[] = childrenData || [];

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Change password mutation
  const passwordMutation = useMutation({
    mutationFn: apiChangePassword,
    onSuccess: () => {
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification('Password changed successfully!');
      queryClient.invalidateQueries({ queryKey: ['parentProfile'] });
    },
    onError: (err: unknown) => {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    showNotification('Logging out...');
    setTimeout(() => {
      logoutUser();
    }, 300);
  };

  // Formatted Name & Initials
  const rawUsername = userData?.username || 'Parent User';
  const displayName = rawUsername
    .split(/[\s_-]+/)
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const phone = userData?.phone || 'Not Provided';
  const email = userData?.email || 'Not Provided';
  const address = userData?.address || 'Not Provided';

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 pb-36 pt-4 px-3">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. PERSONAL DETAILS SECTION ───────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xs text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-r from-madrasa-600 to-madrasa-800 opacity-90" />
          
          {/* Profile Picture / Avatar */}
          <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-white dark:bg-gray-800 p-1.5 shadow-md mt-4 ring-4 ring-madrasa-100 dark:ring-madrasa-900/40">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-madrasa-700 text-2xl font-black text-white">
              {avatarLetter}
            </div>
          </div>

          <h1 className="mt-3 text-lg font-extrabold text-gray-900 dark:text-white">
            {displayName}
          </h1>
          <span className="mt-0.5 rounded-full bg-madrasa-50 dark:bg-madrasa-900/40 px-3 py-0.5 text-xs font-bold text-madrasa-700 dark:text-madrasa-300 border border-madrasa-100 dark:border-madrasa-800">
            Guardian / Parent
          </span>

          {/* Details List */}
          <div className="mt-5 w-full flex flex-col gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-700 text-left">
            <div className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-3">
              <Phone className="h-4 w-4 text-madrasa-600 dark:text-madrasa-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Phone Number</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{phone}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-3">
              <Mail className="h-4 w-4 text-madrasa-600 dark:text-madrasa-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Address</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-3">
              <MapPin className="h-4 w-4 text-madrasa-600 dark:text-madrasa-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Address</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-snug">{address}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. LINKED STUDENTS (WARDS) SECTION ───────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Linked Students (Wards)
            </h2>
          </div>
          {!isChildrenLoading && (
            <span className="text-xs font-semibold text-madrasa-700 dark:text-madrasa-300">
              {children.length} Student{children.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isChildrenLoading ? (
          <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-xs animate-pulse flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
              <div className="h-2.5 w-1/3 rounded bg-gray-100 dark:bg-gray-700" />
            </div>
          </div>
        ) : children.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-xs text-gray-400">
            No linked students found for this account.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {children.map((child) => {
              const childInitial = child.name ? child.name.charAt(0).toUpperCase() : 'S';
              return (
                <div
                  key={child.id}
                  className="flex items-center justify-between rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-xs transition hover:border-madrasa-200 dark:hover:border-madrasa-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-extrabold text-base shrink-0">
                      {childInitial}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                        {child.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        <span className="rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-gray-700 dark:text-gray-300">
                          {child.className || 'Madrasa Class'}
                        </span>
                        <span>•</span>
                        <span>Adm: {child.admissionNumber || child.rollNo || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-madrasa-50 text-madrasa-700 dark:bg-madrasa-900/40 dark:text-madrasa-300">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 3. APP SETTINGS SECTION (Dark/Light Mode Only) ──────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 px-1">
          <Sun className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            App Settings
          </h2>
        </div>

        <div
          onClick={toggleDarkMode}
          className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-xs flex items-center justify-between cursor-pointer select-none transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              {isDarkActive ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Appearance Theme</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isDarkActive ? 'Dark Mode Enabled' : 'Light Mode Enabled'}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Toggle Dark Mode"
            onClick={(e) => {
              e.stopPropagation();
              toggleDarkMode();
            }}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isDarkActive ? 'bg-madrasa-700' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isDarkActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* ── 4. SECURITY & ACCOUNT SECTION ─────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 px-1">
          <ShieldCheck className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Security & Account
          </h2>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60 shadow-xs">
          {/* Change Password Button */}
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Change Password</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Update account password</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-red-50 dark:hover:bg-red-950/20 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-red-600 dark:text-red-400">Log Out</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sign out from parent portal</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* ── MODAL 1: CHANGE PASSWORD MODAL ───────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-madrasa-700 dark:text-madrasa-400" />
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Change Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="mt-4 flex flex-col gap-3">
              {passwordError && (
                <div className="rounded-2xl bg-red-50 dark:bg-red-900/30 p-3 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-madrasa-500 focus:bg-white dark:focus:bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="At least 6 characters"
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 pr-10 text-sm text-gray-900 dark:text-white outline-none focus:border-madrasa-500 focus:bg-white dark:focus:bg-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-madrasa-500 focus:bg-white dark:focus:bg-gray-800"
                />
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-700 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="flex-1 rounded-2xl bg-madrasa-700 py-3 text-xs font-bold text-white shadow-md hover:bg-madrasa-800 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {passwordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: LOGOUT MODAL ─────────────────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600">
              <LogOut className="h-6 w-6" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Confirm Logout</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Are you sure you want to sign out from your parent account?
            </p>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-700 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                className="flex-1 rounded-2xl bg-red-600 py-3 text-xs font-bold text-white shadow-md hover:bg-red-700"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
