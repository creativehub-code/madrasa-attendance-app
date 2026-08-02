import ParentReportView from '@/components/parent/ParentReportView';

export const metadata = { title: 'Reports | Madrasa Portal' };

export default function ParentReportsPage() {
  return (
    <main className="relative min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <ParentReportView />
    </main>
  );
}
