import TeacherProfileView from '@/components/teacher/TeacherProfileView';

export const metadata = { title: 'Teacher Profile | Madrasa Portal' };

export default function TeacherProfilePage() {
  return (
    <main className="relative min-h-screen px-4 pb-32 pt-2">
      <TeacherProfileView />
    </main>
  );
}
