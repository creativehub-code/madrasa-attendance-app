import SchoolTeacherUpdateView from '@/components/school-teacher/SchoolTeacherUpdateView';

export const metadata = { title: 'Post Update | Madrasa Portal' };

export default function SchoolTeacherHistoryPage() {
  return (
    <main className="relative min-h-screen bg-[#f4f7f5]">
      <SchoolTeacherUpdateView />
    </main>
  );
}
