import SchoolTeacherProfileView from '@/components/school-teacher/SchoolTeacherProfileView';

export const metadata = { title: 'School Teacher Profile | Madrasa Portal' };

export default function SchoolTeacherProfilePage() {
  return (
    <main className="relative min-h-screen bg-[#f4f7f5] dark:bg-gray-950">
      <SchoolTeacherProfileView />
    </main>
  );
}
