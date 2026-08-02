'use client';

import ReportAndUpdates from '@/components/teacher/ReportAndUpdates';

export default function TeacherProgressPage() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <main className="relative min-h-screen px-4 pb-32 pt-6">
      {/* Header */}
      <header className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report & Updates</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <span className="rounded-full bg-madrasa-100 px-2.5 py-0.5 text-xs font-semibold text-madrasa-700">
              Class 4A
            </span>
            <span>•</span>
            <span>{today}</span>
          </div>
        </div>
        <div className="h-10 w-10 overflow-hidden rounded-full bg-madrasa-100 ring-2 ring-madrasa-200">
          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-madrasa-700">T</div>
        </div>
      </header>

      <ReportAndUpdates />
    </main>
  );
}
