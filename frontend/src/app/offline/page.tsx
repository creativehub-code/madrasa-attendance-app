'use client';

import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-center text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-950/80 border border-emerald-800/60 shadow-xl mb-6">
        <WifiOff className="h-10 w-10 text-emerald-400" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-white">
        You are currently offline
      </h1>

      <p className="mt-3 max-w-sm text-sm text-slate-400 leading-relaxed">
        Madrasa Tracker could not connect to the network. Please check your internet connection and try reloading the page.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-8 flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-95"
      >
        <RefreshCw className="h-4 w-4" />
        <span>Try Reloading</span>
      </button>
    </main>
  );
}
