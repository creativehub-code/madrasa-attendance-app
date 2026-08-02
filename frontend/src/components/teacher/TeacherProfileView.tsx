'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Moon,
  Sun,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  Check,
  ShieldCheck,
  X,
  Loader2,
  Eye,
  EyeOff,
  User,
  Phone,
  Mail,
  BookOpen,
} from 'lucide-react';
import { fetchMe, changePassword as apiChangePassword, logoutUser, type UserProfile } from '@/lib/api';
import { useAdminTheme } from '@/context/AdminThemeContext';

export default function TeacherProfileView() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── Queries ─────────────────────────────────────────────────────────────────
  const {
    data: profileData,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ['teacherProfile'],
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
  const profile = profileData || null;

  // ── Settings ────────────────────────────────────────────────────────────────
  const { darkMode, toggleDarkMode } = useAdminTheme();
  const [language, setLanguage] = useState('English (US)');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [showLangModal, setShowLangModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ── Password form ───────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // ── Support form ────────────────────────────────────────────────────────────
  const [supportMessage, setSupportMessage] = useState('');

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Mutations ───────────────────────────────────────────────────────────────
  const passwordMutation = useMutation({
    mutationFn: apiChangePassword,
    onSuccess: () => {
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification('Password changed successfully!');
      queryClient.invalidateQueries({ queryKey: ['teacherProfile'] });
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

  const passwordSubmitting = passwordMutation.isPending;

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setShowSupportModal(false);
    setSupportMessage('');
    showNotification('Support request sent to Admin!');
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    showNotification('Logging out...');
    setTimeout(() => {
      logoutUser();
    }, 300);
  };

  // Display name: format username nicely (capitalise first letter of each word)
  const displayName = profile?.username
    ? profile.username
        .split(/[\s_-]+/)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Teacher';

  const avatarLetter = displayName.charAt(0).toUpperCase();
  const classLabel = profile?.className || '—';
  const phone = profile?.phone || 'Not Provided';
  const email = profile?.email || `${profile?.username || 'teacher'}@madrasa.org`;

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
            Madrasa Teacher (Ustad)
          </span>

          {/* Details List */}
          <div className="mt-5 w-full flex flex-col gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-700 text-left">
            <div className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-3">
              <BookOpen className="h-4 w-4 text-madrasa-600 dark:text-madrasa-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Assigned Class</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{classLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-3">
              <User className="h-4 w-4 text-madrasa-600 dark:text-madrasa-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Username</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{profile?.username || '—'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-3">
              <Mail className="h-4 w-4 text-madrasa-600 dark:text-madrasa-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Address</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{email}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. APP SETTINGS SECTION ───────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 px-1">
          <Sun className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            App Settings
          </h2>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60 shadow-xs">
          {/* Change Language */}
          <button
            type="button"
            onClick={() => setShowLangModal(true)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Change Language</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{language}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>

          {/* Dark Mode */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Appearance Theme</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {darkMode ? 'Dark Mode Enabled' : 'Light Mode Enabled'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                toggleDarkMode();
                showNotification(!darkMode ? 'Dark mode enabled' : 'Light mode enabled');
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                darkMode ? 'bg-madrasa-700' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ── 3. SECURITY & SUPPORT SECTION ─────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 px-1">
          <ShieldCheck className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Security & Support
          </h2>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60 shadow-xs">
          {/* Change Password */}
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

          {/* Contact Admin */}
          <button
            type="button"
            onClick={() => setShowSupportModal(true)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Contact Admin / Help</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Reach out for technical support</p>
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
                <p className="text-xs text-gray-500 dark:text-gray-400">Sign out from teacher account</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* ── MODAL 1: LANGUAGE SELECTOR ───────────────────────────────────── */}
      {showLangModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Select Language</h3>
              <button
                type="button"
                onClick={() => setShowLangModal(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {['English (US)', 'العربية (Arabic)', 'മലയാളം (Malayalam)'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setLanguage(lang);
                    setShowLangModal(false);
                    showNotification(`Language changed to ${lang}`);
                  }}
                  className={`flex items-center justify-between rounded-2xl p-3 text-sm font-bold transition ${
                    language === lang
                      ? 'bg-madrasa-700 text-white'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <span>{lang}</span>
                  {language === lang && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CHANGE PASSWORD MODAL ───────────────────────────────── */}
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
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
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
                  New Password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  disabled={passwordSubmitting}
                  className="flex-1 rounded-2xl bg-madrasa-700 py-3 text-xs font-bold text-white shadow-md hover:bg-madrasa-800 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {passwordSubmitting ? (
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

      {/* ── MODAL 3: SUPPORT MODAL ───────────────────────────────────────── */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Contact Admin / Help</h3>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSupportSubmit} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  How can Madrasa Admin help?
                </label>
                <textarea
                  rows={4}
                  required
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Describe your issue or query for Admin..."
                  className="w-full resize-none rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-madrasa-500 focus:bg-white dark:focus:bg-gray-800"
                />
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSupportModal(false)}
                  className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-700 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-madrasa-700 py-3 text-xs font-bold text-white shadow-md hover:bg-madrasa-800"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: LOGOUT MODAL ─────────────────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600">
              <LogOut className="h-6 w-6" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Confirm Logout</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Are you sure you want to sign out from your Ustaz account?
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
