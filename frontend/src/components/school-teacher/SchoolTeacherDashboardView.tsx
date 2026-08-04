'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronRight,
  Users,
  UserX,
  Loader2,
  Award,
  Plus,
  CheckCircle2,
  Layers,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import {
  fetchSchoolTeacherClasses,
  fetchSchoolProgress,
  fetchExams,
  submitExamMarks,
  SchoolTeacherClass,
} from '@/lib/api';

export default function SchoolTeacherDashboardView() {
  const router = useRouter();
  const [selectedClass] = useState<string>('');
  const [dateStr] = useState<string>(new Date().toISOString().split('T')[0]);

  // 1. Fetch Classes and Students
  const { data: classesData, isLoading: isClassesLoading } = useQuery({
    queryKey: ['schoolTeacherClasses'],
    queryFn: async () => {
      if (typeof window === 'undefined') return [];
      const res = await fetchSchoolTeacherClasses();
      return res.data.classes;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Today's Submissions Progress History
  const { data: progressHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['schoolProgressHistory', selectedClass, dateStr],
    queryFn: async () => {
      if (typeof window === 'undefined') return [];
      const res = await fetchSchoolProgress({
        className: selectedClass || undefined,
        date: dateStr || undefined,
      });
      return res.data.progress;
    },
    staleTime: 2 * 60 * 1000,
  });

  const classes: SchoolTeacherClass[] = classesData || [];

  // Calculate metrics
  const totalStudents = classes.reduce(
    (acc, cls) => acc + (cls.studentCount || cls.students.length || 0),
    0
  );
  const totalClasses = classes.length;
  const todaySubmissionsCount = progressHistory ? progressHistory.length : 0;

  // 3. Fetch Active Exams
  const { data: examsData } = useQuery({
    queryKey: ['schoolTeacherExams'],
    queryFn: async () => {
      if (typeof window === 'undefined') return [];
      const res = await fetchExams();
      return res.data.exams;
    },
    staleTime: 2 * 60 * 1000,
  });

  const exams = examsData || [];
  const teacherClassNames = classes.map((c) => c.className);
  const activeExams = exams.filter((e) =>
    e.standards.some((std) => teacherClassNames.includes(std) || teacherClassNames.length === 0)
  );

  const [selectedExamId] = useState<string>('');
  const [examMarks, setExamMarks] = useState<Record<string, number>>({});
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examSuccess, setExamSuccess] = useState<string | null>(null);

  const activeExam =
    activeExams.find((e) => e._id === (selectedExamId || activeExams[0]?._id)) ||
    activeExams[0] ||
    null;

  const handleSaveSchoolExamMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExam) return;

    setExamSubmitting(true);
    setExamSuccess(null);
    try {
      const activeClass = classes.find((c) => c.className === selectedClass) || classes[0];
      const studentsList = activeClass?.students || [];

      const marksPayload = studentsList.map((s) => ({
        studentId: s._id,
        marks: examMarks[s._id] !== undefined ? Number(examMarks[s._id]) : 0,
        maxMarks: activeExam.totalMarks || 100,
      }));

      await submitExamMarks(activeExam._id, {
        standard: activeClass?.className || '1st Standard',
        marks: marksPayload,
      });

      setExamSuccess(`Exam marks submitted for ${activeExam.title}!`);
      setTimeout(() => setExamSuccess(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit exam marks');
    } finally {
      setExamSubmitting(false);
    }
  };

  const handleUpdateProgressForClass = (clsName: string) => {
    router.push(`/school-teacher/history?class=${encodeURIComponent(clsName)}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-36 pt-6 px-4 text-gray-900 dark:text-gray-100">
      {/* 1. CLEAN HEADER SECTION (NO BADGES, NO ACADEMIC YEAR, NO POST BUTTON) */}
      <header className="pb-4 border-b border-gray-200 dark:border-gray-800">
        <p className="text-sm font-medium text-gray-400 dark:text-gray-400">School Teacher</p>
        <h1 className="mt-0.5 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          School Dashboard
        </h1>
      </header>

      {/* 2. STAT CARDS LAYOUT (STACK NEATLY ON MOBILE WITH GRID-COLS-1 GAP-4) */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* STAT CARD 1: TOTAL STUDENTS */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800 p-5 sm:p-6 shadow-xs">
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Students
            </span>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {isClassesLoading ? '…' : totalStudents}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-normal">
              Enrolled across {totalClasses} assigned class(es)
            </p>
          </div>
        </div>

        {/* STAT CARD 2: TOTAL STANDARDS */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800 p-5 sm:p-6 shadow-xs">
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Standards
            </span>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {isClassesLoading ? '…' : totalClasses}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-normal">
              Active standards assigned for teaching
            </p>
          </div>
        </div>

        {/* STAT CARD 3: TODAY'S SUBMISSIONS */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800 p-5 sm:p-6 shadow-xs sm:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Today&apos;s Submissions
            </span>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {isHistoryLoading ? '…' : todaySubmissionsCount}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-normal">
              Subjects recorded for today ({dateStr})
            </p>
          </div>
        </div>
      </section>

      {/* 3. TODAY'S SUBMISSIONS FEED */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Today&apos;s Submissions
            </h2>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {dateStr}
          </span>
        </div>

        {isHistoryLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 gap-2 shadow-xs">
            <Loader2 className="h-6 w-6 animate-spin text-madrasa-700 dark:text-madrasa-400" />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Loading today&apos;s submissions…
            </p>
          </div>
        ) : progressHistory && progressHistory.length > 0 ? (
          <div className="flex flex-col gap-3">
            {progressHistory.map((item) => (
              <div
                key={item._id}
                className="flex flex-col gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5 shadow-xs transition hover:border-gray-300 dark:hover:border-gray-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700/60 pb-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                      {item.subject}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      Class: {item.className}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
                    <Layers className="h-3.5 w-3.5 text-gray-400" />
                    <span>Chapter Title Covered</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white break-words">
                    {item.unitTaught}
                  </h3>
                  {item.description && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 font-normal leading-relaxed bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 break-words">
                      {item.description}
                    </p>
                  )}
                </div>

                {item.absentStudents && item.absentStudents.length > 0 && (
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl p-2.5 border border-amber-200/60 dark:border-amber-900/60 break-words">
                    <UserX className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                    <span>
                      Absent ({item.absentStudents.length}):{' '}
                      {item.absentStudents
                        .map((s) => (typeof s === 'object' ? s.name : s))
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center shadow-xs">
            <BookOpen className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              No class updates submitted for today yet
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              Keep parents informed by posting updates for your assigned subjects and classes.
            </p>
            <Link
              href="/school-teacher/history"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-madrasa-700 dark:bg-madrasa-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-madrasa-800 dark:hover:bg-madrasa-500 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Post Today&apos;s Update</span>
            </Link>
          </div>
        )}
      </section>

      {/* 4. ASSIGNED CLASSES OVERVIEW GRID (NON-OVERFLOWING FLEX LAYOUT) */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Your Assigned Classes
            </h2>
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {classes.length} Active Classes
          </span>
        </div>

        {isClassesLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 gap-2 shadow-xs">
            <Loader2 className="h-6 w-6 animate-spin text-madrasa-700 dark:text-madrasa-400" />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Loading active classes…
            </p>
          </div>
        ) : classes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classes.map((cls) => (
              <div
                key={cls.className}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5 shadow-xs transition hover:border-gray-300 dark:hover:border-gray-600"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 font-bold text-base border border-gray-200 dark:border-gray-600">
                    {cls.className.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {cls.className}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-normal truncate">
                      {cls.studentCount || cls.students.length} Enrolled Students
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleUpdateProgressForClass(cls.className)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-gray-700 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition active:scale-95"
                >
                  <span>Update</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            No active classes assigned to your profile.
          </div>
        )}
      </section>

      {/* ACTIVE EXAMINATIONS CARD */}
      {activeExams.length > 0 && activeExam && (
        <section className="flex flex-col gap-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-200/80 dark:border-emerald-800/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold">
                <Award className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                  Enter Exam Marks (Unlocked)
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium truncate">
                  {activeExam.title} • Total: {activeExam.totalMarks} (Pass: {activeExam.passingMarks})
                </p>
              </div>
            </div>
          </div>

          {examSuccess && (
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              {examSuccess}
            </div>
          )}

          <form onSubmit={handleSaveSchoolExamMarks} className="flex flex-col gap-3">
            {classes.length > 0 && (
              <div className="flex flex-col gap-3">
                {classes.map((cls) => (
                  <div key={cls.className} className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Class: {cls.className} ({cls.students.length} Students)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {cls.students.map((st) => (
                        <div
                          key={st._id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs gap-2"
                        >
                          <span className="font-semibold text-gray-900 dark:text-white truncate">{st.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] text-gray-500">Marks:</span>
                            <input
                              type="number"
                              min="0"
                              max={activeExam.totalMarks || 100}
                              value={examMarks[st._id] !== undefined ? examMarks[st._id] : ''}
                              onChange={(e) =>
                                setExamMarks((prev) => ({ ...prev, [st._id]: Number(e.target.value) }))
                              }
                              placeholder={`0-${activeExam.totalMarks}`}
                              className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={examSubmitting}
              className="w-full rounded-xl bg-emerald-700 dark:bg-emerald-600 py-3 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 dark:hover:bg-emerald-500 transition active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {examSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save & Submit Exam Marks'
              )}
            </button>
          </form>
        </section>
      )}

      {/* FLOATING ACTION BUTTON (FAB) FIXED ABOVE MOBILE BOTTOM NAV */}
      <button
        type="button"
        onClick={() => router.push('/school-teacher/history')}
        className="fixed bottom-24 right-4 sm:right-6 z-50 flex items-center gap-2 rounded-full bg-madrasa-700 dark:bg-madrasa-600 px-4.5 py-3 text-white font-semibold text-xs sm:text-sm shadow-xl hover:bg-madrasa-800 dark:hover:bg-madrasa-500 transition-all duration-200 active:scale-95 group"
        title="Post New Class Update"
      >
        <Plus className="h-5 w-5 stroke-[2.5]" />
        <span>Post Class Update</span>
      </button>
    </div>
  );
}
