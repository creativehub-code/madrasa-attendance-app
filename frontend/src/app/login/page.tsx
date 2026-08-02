'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Eye, EyeOff, User, Lock, AlertCircle, Loader2 } from 'lucide-react';

// ─── Zod Schema ──────────────────────────────────────────────────────────────
const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username is too long')
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 2) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAgeSeconds};SameSite=Strict`;
}

// ─── Component ───────────────────────────────────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    if (isLoading) return;
    setIsLoading(true);
    setServerError(null);

    try {
      const response = await api<{
        success: boolean;
        token: string;
        role: string;
        data: { user: { role: string; mustChangePassword: boolean } };
      }>('/auth/login', {
        method: 'POST',
        body: { username: values.username.toLowerCase().trim(), password: values.password },
      });

      if (response.success && response.token) {
        const role = response.data.user.role;

        // 1. Store JWT token in localStorage under 'madrasa_token'
        localStorage.setItem('madrasa_token', response.token);
        localStorage.setItem('role', role);

        // 2. Mirror role + auth flag into cookies so Next.js middleware can enforce RBAC
        setCookie('madrasa_auth', 'true');
        setCookie('madrasa_role', role);

        // 3. Route to dashboard or original redirect target
        const dashboardMap: Record<string, string> = {
          Admin: '/admin',
          Teacher: '/teacher',
          Parent: '/parent',
          school_teacher: '/school-teacher',
          SchoolTeacher: '/school-teacher',
        };
        const dest = redirectTo || dashboardMap[role] || '/';
        router.push(dest);
        // Note: Leave isLoading as true so button remains disabled and spinner active during redirect
      } else {
        setServerError('Invalid credentials. Please check your username and password.');
        setIsLoading(false);
      }
    } catch (err: any) {
      // Show generic message — never reveal whether the username exists
      setServerError('Invalid credentials. Please check your username and password.');
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-950 p-4 transition-colors duration-200">
      <div className="w-full max-w-md">
        {/* Modern Form Card Layout */}
        <div className="rounded-3xl bg-white dark:bg-gray-900 p-8 sm:p-10 shadow-2xl shadow-gray-200/60 dark:shadow-none border border-gray-100 dark:border-gray-800 transition-all duration-200">
          
          {/* Top Center Logo Placement inside Card */}
          <div className="mb-8 text-center">
            <img
              src="/logo.png"
              alt="Application Logo"
              className="mx-auto h-16 w-auto object-contain"
            />
          </div>

          {/* Server Error Banner */}
          {serverError && (
            <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3.5 text-xs font-medium text-red-700 dark:text-red-300" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="leading-relaxed">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Username */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 z-10">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  placeholder=" "
                  {...register('username')}
                  className={`peer block w-full rounded-xl border bg-gray-50/50 dark:bg-gray-800/60 py-3.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white transition-all duration-200 outline-none
                    ${errors.username
                      ? 'border-red-300 dark:border-red-800 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:bg-white dark:focus:bg-gray-900 focus:border-madrasa-600 dark:focus:border-madrasa-500 focus:ring-4 focus:ring-madrasa-600/10'
                    }`}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                />
                <label
                  htmlFor="username"
                  className="absolute left-10 top-3.5 z-10 origin-[0] -translate-y-6 scale-85 transform bg-white dark:bg-gray-900 px-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 transition-all duration-200 ease-in-out pointer-events-none
                    peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-gray-400
                    peer-focus:-translate-y-6 peer-focus:scale-85 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-madrasa-700 dark:peer-focus:text-madrasa-400"
                >
                  Username
                </label>
              </div>
              {errors.username && (
                <p id="username-error" className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 z-10">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder=" "
                  {...register('password')}
                  className={`peer block w-full rounded-xl border bg-gray-50/50 dark:bg-gray-800/60 py-3.5 pl-10 pr-11 text-sm text-gray-900 dark:text-white transition-all duration-200 outline-none
                    ${errors.password
                      ? 'border-red-300 dark:border-red-800 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:bg-white dark:focus:bg-gray-900 focus:border-madrasa-600 dark:focus:border-madrasa-500 focus:ring-4 focus:ring-madrasa-600/10'
                    }`}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <label
                  htmlFor="password"
                  className="absolute left-10 top-3.5 z-10 origin-[0] -translate-y-6 scale-85 transform bg-white dark:bg-gray-900 px-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 transition-all duration-200 ease-in-out pointer-events-none
                    peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-gray-400
                    peer-focus:-translate-y-6 peer-focus:scale-85 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-madrasa-700 dark:peer-focus:text-madrasa-400"
                >
                  Password
                </label>
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition z-10"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button with "Sign In" Text */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-madrasa-700 hover:bg-madrasa-800 py-3.5 text-sm font-bold text-white shadow-md shadow-madrasa-700/20 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-madrasa-700/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          Forgot your credentials? Contact the Madrasa administrator.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-950 p-4">
        <div className="text-sm font-semibold text-madrasa-700">Loading Sign In...</div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
