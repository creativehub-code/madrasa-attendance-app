import Link from 'next/link';

export const metadata = { title: '403 Unauthorized | Madrasa Tracker' };

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100 text-red-500">
        <svg viewBox="0 0 24 24" className="h-12 w-12 fill-current" aria-hidden="true">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14H9V7h2v8zm4 0h-2V7h2v8z"/>
        </svg>
      </div>
      <h1 className="mb-2 text-3xl font-extrabold text-gray-900">403</h1>
      <h2 className="mb-3 text-lg font-bold text-gray-700">Access Denied</h2>
      <p className="mb-8 max-w-xs text-sm text-gray-500">
        You do not have permission to access this page. Please log in with the correct account.
      </p>
      <Link
        href="/login"
        className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition"
      >
        Go to Login
      </Link>
    </main>
  );
}
