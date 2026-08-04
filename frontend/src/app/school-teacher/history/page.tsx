import SchoolTeacherUpdateView from '@/components/school-teacher/SchoolTeacherUpdateView';

export const metadata = { title: 'Post Update | Madrasa Portal' };

export default function SchoolTeacherHistoryPage() {
  return (
    <main className="relative min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <SchoolTeacherUpdateView />
    </main>
  );
}
