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
  FileText,
  Award,
} from 'lucide-react';
import {
  fetchSchoolTeacherClasses,
  fetchSchoolProgress,
  fetchExams,
  submitExamMarks,
  SchoolTeacherClass,
  type Examination,
} from '@/lib/api';

export default function SchoolTeacherDashboardView() {
  const router = useRouter();
  const [selectedClass] = useState<string>('');
  const [academicYear] = useState<string>('2025-2026');
  const [dateStr] = useState<string>(new Date().toISOString().split('T')[0]);

  // 1. Fetch Classes and Students
  const {
    data: classesData,
    isLoading: isClassesLoading,
  } = useQuery({
    queryKey: ['schoolTeacherClasses'],
    queryFn: async () => {
      if (typeof window === 'undefined') return [];
      const res = await fetchSchoolTeacherClasses();
      return res.data.classes;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Recent Submissions
  const {
    data: progressHistory,
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ['schoolProgressHistory', selectedClass, dateStr],
    queryFn: async () => {
      if (typeof window === 'undefined') return [];
      const res = await fetchSchoolProgress({ className: selectedClass || undefined, date: dateStr || undefined });
      return res.data.progress;
    },
    staleTime: 2 * 60 * 1000,
  });

  const classes: SchoolTeacherClass[] = classesData || [];

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
  const activeExams = exams.filter((e) => e.standards.some((std) => teacherClassNames.includes(std) || teacherClassNames.length === 0));

  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [examMarks, setExamMarks] = useState<Record<string, number>>({});
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examSuccess, setExamSuccess] = useState<string | null>(null);

  const activeExam = activeExams.find((e) => e._id === (selectedExamId || activeExams[0]?._id)) || activeExams[0] || null;

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
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 pb-36 pt-4 px-1">
      {/* HEADER */}
      <header className="flex items-center justify-between px-1">
        <div>
          <img src="/logo.png" alt="Madrasa Portal Logo" className="h-10 w-auto mb-3 object-contain" />
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-madrasa-100 dark:bg-madrasa-900/50 px-2.5 py-0.5 text-xs font-bold text-madrasa-800 dark:text-madrasa-300">
              School Teacher
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">• Academic Year {academicYear}</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900 dark:text-white">School Dashboard</h1>
        </div>
      </header>

      {/* ACTIVE EXAM / ENTER MARKS SECTION (UNLOCKED) */}
      {activeExams.length > 0 && activeExam && (
        <section className="flex flex-col gap-3 rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white font-bold shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Enter Exam Marks (Unlocked)
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  {activeExam.title} • Total: {activeExam.totalMarks} (Pass: {activeExam.passingMarks})
                </p>
              </div>
            </div>
          </div>

          {examSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {examSuccess}
            </div>
          )}

          <form onSubmit={handleSaveSchoolExamMarks} className="flex flex-col gap-3">
            {classes.length > 0 && (
              <div className="flex flex-col gap-2">
                {classes.map((cls) => (
                  <div key={cls.className} className="flex flex-col gap-2">
                    <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300">
                      Class: {cls.className} ({cls.students.length} Students)
                    </span>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {cls.students.map((st) => (
                        <div
                          key={st._id}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs"
                        >
                          <span className="font-bold text-gray-900 dark:text-white">{st.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-gray-500">Marks:</span>
                            <input
                              type="number"
                              min="0"
                              max={activeExam.totalMarks || 100}
                              value={examMarks[st._id] !== undefined ? examMarks[st._id] : ''}
                              onChange={(e) => setExamMarks((prev) => ({ ...prev, [st._id]: Number(e.target.value) }))}
                              placeholder={`0-${activeExam.totalMarks}`}
                              className="w-20 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
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
              className="w-full rounded-2xl bg-emerald-700 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {examSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & Submit Exam Marks'}
            </button>
          </form>
        </section>
      )}

      {/* SECTION 1: CLASSES OVERVIEW */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white">Your Classes</h2>
          </div>
          <span className="text-xs font-bold text-madrasa-800 dark:text-madrasa-400">{classes.length} Active Classes</span>
        </div>

        {isClassesLoading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 gap-2 shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-madrasa-700 dark:text-madrasa-400" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Loading active classes…</p>
          </div>
        ) : classes.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {classes.map((cls) => (
              <div
                key={cls.className}
                className="flex items-center justify-between rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-madrasa-50 dark:bg-madrasa-900/40 text-madrasa-700 dark:text-madrasa-300 font-bold text-lg border border-madrasa-100 dark:border-madrasa-800/60">
                    {cls.className.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white">{cls.className}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {cls.studentCount || cls.students.length} Students Enrolled
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateProgressForClass(cls.className)}
                  className="flex items-center gap-1 rounded-2xl bg-madrasa-50 dark:bg-madrasa-900/40 px-3 py-2 text-xs font-extrabold text-madrasa-700 dark:text-madrasa-300 border border-madrasa-100 dark:border-madrasa-800/60 transition hover:bg-madrasa-100 dark:hover:bg-madrasa-900/60 active:scale-95"
                >
                  <span>Update Progress</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
            No active classes found.
          </div>
        )}
      </section>

      {/* SECTION 2: RECENT CLASS PROGRESS SUBMISSIONS */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white">Submitted Today / Recent</h2>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">{dateStr}</span>
        </div>

        {isHistoryLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-madrasa-700 dark:text-madrasa-400" />
          </div>
        ) : progressHistory && progressHistory.length > 0 ? (
          <div className="flex flex-col gap-3">
            {progressHistory.map((item) => (
              <div
                key={item._id}
                className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-madrasa-100 dark:bg-madrasa-900/50 px-2.5 py-0.5 text-xs font-bold text-madrasa-800 dark:text-madrasa-300">
                      {item.className}
                    </span>
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/50">
                      {item.subject}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                    AY: {item.academicYear}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{item.unitTaught}</h4>
                  {item.description && (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{item.description}</p>
                  )}
                </div>

                {item.absentStudents && item.absentStudents.length > 0 && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-xl p-2 border border-amber-100 dark:border-amber-900/60">
                    <UserX className="h-3.5 w-3.5" />
                    <span>
                      {item.absentStudents.length} Absent:{' '}
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
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
            <BookOpen className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">No class progress submitted for today yet.</p>
            <Link
              href="/school-teacher/history"
              className="mt-2 text-xs font-bold text-madrasa-700 dark:text-madrasa-400 hover:underline"
            >
              Post an update for your class
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
