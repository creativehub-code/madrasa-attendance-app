'use client';

import { useState } from 'react';
import { KeyRound, Lock, Check, ShieldAlert, ArrowRight } from 'lucide-react';
import { changePassword as apiChangePassword, logoutUser } from '@/lib/api';

interface Props {
  role: string;
  username: string;
  onPasswordChanged: () => void;
}

export default function FirstTimePasswordChangeModal({ role, username, onPasswordChanged }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your temporary password.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiChangePassword({ currentPassword, newPassword });
      if (res.success) {
        setLoading(false);
        setSuccess(true);
        setTimeout(() => {
          onPasswordChanged();
        }, 800);
      }
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Failed to change password. Please check your current password.';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white dark:border dark:border-gray-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="mb-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">First-Time Login Action Required</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Welcome {role}! Please change your initial password to continue.
            </p>
          </div>
        </div>

        {/* Credentials Summary */}
        <div className="mb-4 rounded-2xl border border-amber-100 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
          <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" /> Logged in as: <span className="font-bold">{username}</span>
          </p>
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
            For security reasons, accounts created by the admin must update their default password before accessing the portal.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
            ⚠️ {error}
          </div>
        )}

        {success ? (
          <div className="my-6 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white">Password Changed Successfully!</h4>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Unlocking your {role} dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Current / Initial Password
              </label>
              <input
                required
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={role === 'Parent' ? 'Enter Contact Phone Number' : 'Enter initial assigned password'}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-madrasa-500 dark:focus:border-madrasa-400 focus:bg-white dark:focus:bg-gray-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                New Password (min 8 characters)
              </label>
              <input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter strong new password"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-madrasa-500 dark:focus:border-madrasa-400 focus:bg-white dark:focus:bg-gray-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-madrasa-500 dark:focus:border-madrasa-400 focus:bg-white dark:focus:bg-gray-900 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-madrasa-700 py-3 text-sm font-semibold text-white shadow hover:bg-madrasa-800 transition active:scale-98 disabled:opacity-60"
            >
              <span>{loading ? 'Updating Password...' : 'Save New Password & Continue'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
