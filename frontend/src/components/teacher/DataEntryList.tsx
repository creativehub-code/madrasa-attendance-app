'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submitProgress, fetchTeacherStudents, fetchTeacherSubmissionStatus, updateStudentJuzu, fetchExams, submitExamMarks, type Examination } from '@/lib/api';
import type { ProgressEntry, Student } from '@/types';
import StepperField from '@/components/teacher/StepperField';
import JuzuSelector from '@/components/teacher/JuzuSelector';
import { RotateCcw, AlertCircle, RefreshCw, Loader2, CheckCircle2, Lock, Award, GraduationCap, Search, X } from 'lucide-react';

import { getStudentCategory } from '@/lib/studentCategory';

type StudentDraft = ProgressEntry & {
  studentName: string;
  rollNumber: string;
  isPuthiyaPadamNotGiven: boolean;
  isJuzuPadamNotGiven: boolean;
  isPazhayaPadamNotGiven: boolean;
};

const STORAGE_KEY = 'madrasa_teacher_drafts_v1';

const draftFromStudent = (s: Student): StudentDraft => {
  const defaultJuzu = s.todayProgress?.juzuNumber ?? s.currentJuzu ?? 1;
  if (s.todayProgress) {
    return {
      studentId: s._id,
      studentName: s.name,
      rollNumber: s.rollNumber,
      juzuNumber: defaultJuzu,
      puthiyaPadam: s.todayProgress.puthiyaPadam ?? 0,
      juzuPadam: s.todayProgress.juzuPadam ?? 0,
      pazhayaPadam: s.todayProgress.pazhayaPadam ?? 0,
      isPuthiyaPadamWrong: Boolean(s.todayProgress.isPuthiyaPadamWrong),
      isCurrentLessonWrong: Boolean(s.todayProgress.isCurrentLessonWrong),
      isPazhayaPadamWrong: Boolean(s.todayProgress.isPazhayaPadamWrong),
      isAbsent: Boolean(s.todayProgress.isAbsent),
      needsRevision: Boolean(s.todayProgress.needsRevision),
      isPuthiyaPadamNotGiven: Boolean(s.todayProgress.isPuthiyaPadamNotGiven),
      isJuzuPadamNotGiven: Boolean(s.todayProgress.isJuzuPadamNotGiven),
      isPazhayaPadamNotGiven: Boolean(s.todayProgress.isPazhayaPadamNotGiven),
      notes: s.todayProgress.notes || '',
    };
  }
  return {
    studentId: s._id,
    studentName: s.name,
    rollNumber: s.rollNumber,
    juzuNumber: defaultJuzu,
    puthiyaPadam: 0,
    juzuPadam: 0,
    pazhayaPadam: 0,
    isPuthiyaPadamWrong: false,
    isCurrentLessonWrong: false,
    isPazhayaPadamWrong: false,
    isAbsent: false,
    needsRevision: false,
    isPuthiyaPadamNotGiven: false,
    isJuzuPadamNotGiven: false,
    isPazhayaPadamNotGiven: false,
    notes: '',
  };
};

export default function DataEntryList() {
  const queryClient = useQueryClient();

  // ── Queries ─────────────────────────────────────────────────────────────────
  const {
    data: studentsData,
    isLoading: loading,
    isError: isStudentsError,
    error: studentsErrorObj,
  } = useQuery({
    queryKey: ['teacherStudents'],
    queryFn: async () => {
      const res = await fetchTeacherStudents();
      return res.data.students;
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: statusData,
  } = useQuery({
    queryKey: ['teacherSubmissionStatus'],
    queryFn: async () => {
      const res = await fetchTeacherSubmissionStatus();
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const isSubmittedToday = statusData?.isSubmittedToday ?? false;

  const students = studentsData || [];
  const fetchError = isStudentsError
    ? studentsErrorObj instanceof Error
      ? studentsErrorObj.message
      : 'Failed to load students. Please try again.'
    : null;

  const [drafts, setDrafts] = useState<Record<string, StudentDraft>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Student Search State & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.rollNumber && String(s.rollNumber).toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Active Exams Query & State
  const { data: examsData } = useQuery({
    queryKey: ['teacherExams'],
    queryFn: async () => {
      const res = await fetchExams();
      return res.data.exams;
    },
    staleTime: 2 * 60 * 1000,
  });

  const exams = examsData || [];
  const teacherStandards = Array.from(new Set(students.map((s) => s.standard || '1st Standard')));
  const activeExams = exams.filter((e) => e.standards.some((std) => teacherStandards.includes(std) || teacherStandards.length === 0));

  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [examMarks, setExamMarks] = useState<Record<string, number>>({});
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examSuccess, setExamSuccess] = useState<string | null>(null);

  const activeExam = activeExams.find((e) => e._id === (selectedExamId || activeExams[0]?._id)) || activeExams[0] || null;

  const handleSaveMarksSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExam) return;

    setExamSubmitting(true);
    setExamSuccess(null);
    try {
      const marksPayload = students.map((s) => ({
        studentId: s._id,
        marks: examMarks[s._id] !== undefined ? Number(examMarks[s._id]) : 0,
        maxMarks: activeExam.totalMarks || 100,
      }));

      await submitExamMarks(activeExam._id, {
        standard: students[0]?.standard || '1st Standard',
        marks: marksPayload,
      });

      setExamSuccess(`Marks saved successfully for ${activeExam.title}!`);
      setTimeout(() => setExamSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit exam marks');
    } finally {
      setExamSubmitting(false);
    }
  };

  const today = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    []
  );

  // SSR-safe load from sessionStorage and draft initialization
  useEffect(() => {
    if (students.length > 0) {
      let savedDrafts: Record<string, StudentDraft> = {};
      try {
        if (typeof window !== 'undefined') {
          const raw = sessionStorage.getItem(STORAGE_KEY);
          if (raw) savedDrafts = JSON.parse(raw) || {};
        }
      } catch {
        // Safe fallback
      }

      setDrafts((prev) => {
        const next: Record<string, StudentDraft> = {};
        students.forEach((s) => {
          const defaultDraft = draftFromStudent(s);
          const savedStudentDraft = savedDrafts[s._id];
          const existingDraft = prev[s._id];

          next[s._id] = {
            ...defaultDraft,
            ...(savedStudentDraft || {}),
            ...(existingDraft || {}),
          };
        });
        return next;
      });
    }
  }, [students]);

  // Auto-save drafts to sessionStorage whenever draft state updates
  useEffect(() => {
    if (Object.keys(drafts).length > 0) {
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
        }
      } catch (err) {
        console.error('Failed to save drafts to sessionStorage:', err);
      }
    }
  }, [drafts]);

  const loadStudents = () => {
    queryClient.invalidateQueries({ queryKey: ['teacherStudents'] });
    queryClient.invalidateQueries({ queryKey: ['teacherSubmissionStatus'] });
  };

  const updateDraft = useCallback((id: string, patch: Partial<StudentDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  // ── Mutation ────────────────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: submitProgress,
    onSuccess: (result, variables: any) => {
      const total = result.data?.total ?? variables?.entries?.length ?? 0;
      setSuccess(`Submitted ${total} student records successfully.`);
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Safe fallback
      }
      queryClient.invalidateQueries({ queryKey: ['teacherStudents'] });
      queryClient.invalidateQueries({ queryKey: ['teacherClassSummary'] });
      queryClient.invalidateQueries({ queryKey: ['teacherNeedsAttention'] });
      queryClient.invalidateQueries({ queryKey: ['teacherSubmissionStatus'] });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    },
  });

  // Juzu Update Mutation (Optimistic Update)
  const updateJuzuMutation = useMutation({
    mutationFn: ({ studentId, juzuNumber }: { studentId: string; juzuNumber: number }) => 
      updateStudentJuzu(studentId, juzuNumber),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['teacherStudents'] });
      const previousStudents = queryClient.getQueryData<Student[]>(['teacherStudents']);
      
      if (previousStudents) {
        queryClient.setQueryData<Student[]>(['teacherStudents'], (old) => 
          old?.map((s) => 
            s._id === variables.studentId ? { ...s, currentJuzu: variables.juzuNumber } : s
          )
        );
      }
      
      updateDraft(variables.studentId, { juzuNumber: variables.juzuNumber });
      return { previousStudents };
    },
    onError: (err, variables, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['teacherStudents'], context.previousStudents);
      }
      const previousStudent = context?.previousStudents?.find((s) => s._id === variables.studentId);
      if (previousStudent) {
        updateDraft(variables.studentId, { juzuNumber: previousStudent.currentJuzu || 1 });
      }
      setError(err instanceof Error ? err.message : 'Failed to update Juzu');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherStudents'] });
    },
  });

  const handleJuzuChange = (studentId: string, juzuNumber: number) => {
    updateJuzuMutation.mutate({ studentId, juzuNumber });
  };

  const handleBulkSubmit = () => {
    if (isSubmittedToday) return;
    setError(null);
    setSuccess(null);
    const entries: ProgressEntry[] = Object.values(drafts).map(
      (draft) => {
        const student = students.find((st) => st._id === draft.studentId);
        const category = getStudentCategory(student);
        const isQaida = category === 'Noorani Qaida';

        return {
          studentId: draft.studentId,
          juzuNumber: draft.juzuNumber ?? 1,
          puthiyaPadam: isQaida ? 0 : (draft.puthiyaPadam ?? 0),
          juzuPadam: isQaida ? 0 : (draft.juzuPadam ?? 0),
          pazhayaPadam: isQaida ? 0 : (draft.pazhayaPadam ?? 0),
          dowraCount: category === 'Dowra' ? (draft.juzuNumber ?? 1) : 0,
          category,
          isAbsent: draft.isAbsent,
          needsRevision: draft.needsRevision,
          isPuthiyaPadamWrong: Boolean(draft.isPuthiyaPadamWrong),
          isCurrentLessonWrong: Boolean(draft.isCurrentLessonWrong),
          isPazhayaPadamWrong: Boolean(draft.isPazhayaPadamWrong),
          isPuthiyaPadamNotGiven: Boolean(draft.isPuthiyaPadamNotGiven),
          isJuzuPadamNotGiven: Boolean(draft.isJuzuPadamNotGiven),
          isPazhayaPadamNotGiven: Boolean(draft.isPazhayaPadamNotGiven),
          notes: draft.notes?.trim() || undefined,
        };
      }
    );
    submitMutation.mutate({ date: new Date().toISOString(), entries });
  };

  const submitting = submitMutation.isPending;

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-madrasa-200 border-t-madrasa-600" />
        <p className="text-sm text-gray-500">Loading students…</p>
      </div>
    );
  }

  // ── Fetch error state ────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
          <AlertCircle className="h-7 w-7 text-red-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Failed to load students</p>
          <p className="mt-1 text-sm text-gray-500">{fetchError}</p>
        </div>
        <button
          type="button"
          onClick={loadStudents}
          className="flex items-center gap-2 rounded-xl bg-madrasa-700 px-5 py-2.5 text-sm font-semibold text-white shadow transition active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
        No students assigned to you yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-36">
      {/* Active Examination / Enter Marks Card (Unlocked) */}
      {activeExams.length > 0 && activeExam && (
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/30 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shrink-0">
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
            {activeExams.length > 1 && (
              <select
                value={activeExam._id}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs font-bold text-gray-900 dark:text-white"
              >
                {activeExams.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {examSuccess && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {examSuccess}
            </div>
          )}

          <form onSubmit={handleSaveMarksSubmit} className="mt-3 flex flex-col gap-2.5">
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {students.map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-extrabold text-gray-900 dark:text-white">{s.name}</span>
                    <span className="text-[10px] text-gray-500">Admsn: {s.admissionNumber}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-gray-500">Marks:</span>
                    <input
                      type="number"
                      min="0"
                      max={activeExam.totalMarks || 100}
                      value={examMarks[s._id] !== undefined ? examMarks[s._id] : ''}
                      onChange={(e) => setExamMarks((prev) => ({ ...prev, [s._id]: Number(e.target.value) }))}
                      placeholder={`0-${activeExam.totalMarks}`}
                      className="w-20 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={examSubmitting}
              className="mt-1 rounded-xl bg-emerald-700 py-2.5 px-4 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {examSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & Submit Exam Marks'}
            </button>
          </form>
        </div>
      )}

      {/* Submitted Today Banner */}
      {isSubmittedToday && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Submitted for Today
              </p>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">
                Daily progress recorded for {statusData?.submittedCount || students.length} student(s). Inputs are locked.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-200/80 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-900 border border-emerald-300">
            <Lock className="h-3 w-3" />
            Locked
          </span>
        </div>
      )}

      {/* Minimalistic Student Search Header */}
      <div className="flex items-center justify-between gap-2 px-1 py-1">
        <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Assigned Students ({filteredStudents.length}{searchQuery ? ` of ${students.length}` : ''})
        </span>

        {/* Minimal Expandable Search Box with Lucide Search SVG Icon */}
        <div className="relative flex items-center justify-end">
          {isSearchOpen ? (
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 shadow-xs transition-all duration-200">
              <Search className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or ID…"
                autoFocus
                className="w-36 sm:w-48 bg-transparent text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (searchQuery) {
                    setSearchQuery('');
                  } else {
                    setIsSearchOpen(false);
                  }
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                title="Clear or close search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              title="Search students by Name or ID"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition active:scale-95 shadow-xs"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 p-8 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
          No students found matching &quot;{searchQuery}&quot;.
        </div>
      ) : (
        filteredStudents.map((student) => {
          const draft = drafts[student._id];
          if (!draft) return null;

          const isNeedsRevision = draft.needsRevision && !draft.isAbsent;
          const isStudentDisabled = isSubmittedToday || student.status === 'Discontinued';
          const isDisabledOverall = draft.isAbsent || isStudentDisabled;

          return (
          <article
            key={student._id}
            className={`rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
              student.status === 'Discontinued'
                ? 'border-gray-200 bg-gray-50/50 opacity-60 grayscale-[50%] dark:border-gray-800 dark:bg-gray-900/50 pointer-events-none'
                : isSubmittedToday
                ? 'border-emerald-100 bg-gray-50/70 opacity-80 pointer-events-none dark:border-emerald-900/40 dark:bg-gray-900/80'
                : draft.isAbsent
                ? 'border-gray-200 bg-gray-50/60 opacity-60 dark:border-gray-800 dark:bg-gray-900/60'
                : isNeedsRevision
                ? 'border-amber-300 bg-amber-50/30 ring-2 ring-amber-200/70 shadow-amber-100 dark:border-amber-800/60 dark:bg-amber-950/30 dark:ring-amber-800/40'
                : 'border-gray-200 bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-900'
            }`}
          >
            {/* Needs Revision Warning Banner */}
            {isNeedsRevision && (
              <div className="flex items-center gap-2 border-b border-amber-200/80 bg-amber-100/80 dark:border-amber-800/60 dark:bg-amber-950/60 px-5 py-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
                <span>Needs Revision — Repeating lesson due to mistakes (Puthiya Padam locked at 0)</span>
              </div>
            )}

            {/* Student header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
                    isNeedsRevision
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 ring-2 ring-amber-300 dark:ring-amber-700'
                      : 'bg-madrasa-100 text-madrasa-700'
                  }`}
                >
                  {student.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {student.name}
                      {student.currentJuzu && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] rounded-full border border-gray-200 dark:border-gray-700">
                          Juzz {student.currentJuzu}
                        </span>
                      )}
                      {student.status === 'Discontinued' && (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-[10px] font-bold rounded-full border border-amber-300 dark:border-amber-700">
                          Discontinued
                        </span>
                      )}
                    </h2>
                    {/* Visual UI Mode Indicator Badge */}
                    {(() => {
                      const category = getStudentCategory(student);
                      if (category === 'Noorani Qaida') {
                        return (
                          <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-[10px] font-bold rounded-full border border-purple-300 dark:border-purple-700">
                            Mode: Noorani Qaida
                          </span>
                        );
                      }
                      if (category === 'Dowra') {
                        return (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-300 dark:border-emerald-700">
                            Mode: Dowra
                          </span>
                        );
                      }
                      return (
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold rounded-full border border-blue-300 dark:border-blue-700">
                          Mode: Regular
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-sm text-gray-400">ID: {student.rollNumber}</p>
                </div>
              </div>

              {/* Toggles Group */}
              <div className="flex items-center gap-3">
                {/* Needs Revision toggle button */}
                <button
                  type="button"
                  disabled={isDisabledOverall}
                  onClick={() => {
                    const nextState = !draft.needsRevision;
                    updateDraft(student._id, {
                      needsRevision: nextState,
                      ...(nextState ? { puthiyaPadam: 0 } : {}),
                    });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 border ${
                    isNeedsRevision
                      ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-sm'
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  } ${isDisabledOverall ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isNeedsRevision ? 'Revision Mode' : 'Needs Revision'}</span>
                </button>

                {/* Absent toggle */}
                <label className={`flex flex-col items-end gap-1 ${isStudentDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                  <span className="text-xs font-medium text-gray-500">Absent</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      disabled={isStudentDisabled}
                      className="sr-only"
                      checked={draft.isAbsent}
                      onChange={(e) =>
                        updateDraft(student._id, {
                          isAbsent: e.target.checked,
                          ...(e.target.checked
                            ? {
                                puthiyaPadam: 0,
                                juzuPadam: 0,
                                pazhayaPadam: 0,
                                needsRevision: false,
                              }
                            : {}),
                        })
                      }
                    />
                    <div
                      className={`h-7 w-12 rounded-full transition-colors ${
                        draft.isAbsent ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                    <div
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        draft.isAbsent ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* Data Entry Fields */}
            {(() => {
              const category = getStudentCategory(student);
              const isQaida = category === 'Noorani Qaida';
              const isDowra = category === 'Dowra';

              let selectorLabel = 'Current Juzu';
              if (isQaida) selectorLabel = 'Current Lesson';
              if (isDowra) selectorLabel = 'Dowra Count';

              return (
                <div
                  className={`flex flex-col divide-y divide-gray-100 dark:divide-gray-800 ${
                    isDisabledOverall ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  {/* Juzu / Lesson / Dowra Selector */}
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <JuzuSelector
                      label={selectorLabel}
                      value={draft.juzuNumber ?? 1}
                      onChange={(v) => {
                        updateDraft(student._id, { juzuNumber: v });
                        handleJuzuChange(student._id, v);
                      }}
                      disabled={isDisabledOverall || updateJuzuMutation.isPending}
                    />
                  </div>

                  {/* Sub-inputs: Hidden for Noorani Qaida */}
                  {!isQaida && (
                    <>
                      {/* Puthiya Padam / New Lesson Stepper */}
                      <div
                        className={`flex items-start justify-between px-5 py-3.5 ${
                          isNeedsRevision ? 'bg-amber-50/50 dark:bg-amber-950/30' : ''
                        }`}
                      >
                        <div className="pt-1">
                          <p
                            className={`text-sm font-semibold ${
                              isNeedsRevision ? 'text-amber-900 dark:text-amber-300' : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {isDowra ? 'New Lesson (Juz #)' : 'Puthiya Padam'}
                          </p>
                          <p
                            className={`text-xs ${
                              isNeedsRevision ? 'text-amber-700 dark:text-amber-400 font-medium' : 'text-gray-400'
                            }`}
                          >
                            {isNeedsRevision
                              ? 'Locked (Needs Revision)'
                              : isDowra
                              ? 'Juz 1–30'
                              : 'New Lesson (Lines)'}
                          </p>
                        </div>
                        <div className="shrink-0 block w-full max-w-[200px] text-right">
                          <StepperField
                            label=""
                            value={draft.puthiyaPadam}
                            onChange={(v) => updateDraft(student._id, { puthiyaPadam: v })}
                            max={isDowra ? 30 : 999}
                            step={1}
                            isWrong={Boolean(draft.isPuthiyaPadamWrong)}
                            onToggleWrong={() => {
                              const nextState = !draft.isPuthiyaPadamWrong;
                              updateDraft(student._id, {
                                isPuthiyaPadamWrong: nextState,
                                ...(nextState ? { puthiyaPadam: 0 } : {}),
                              });
                            }}
                            isNotGiven={Boolean(draft.isPuthiyaPadamNotGiven)}
                            onToggleNotGiven={() => {
                              const nextState = !draft.isPuthiyaPadamNotGiven;
                              updateDraft(student._id, {
                                isPuthiyaPadamNotGiven: nextState,
                                ...(nextState ? { puthiyaPadam: 0 } : {}),
                              });
                            }}
                            quickChips={
                              isDowra
                                ? [
                                    { label: 'Juz 1', value: 1 },
                                    { label: 'Juz 5', value: 5 },
                                    { label: 'Juz 10', value: 10 },
                                    { label: 'Juz 15', value: 15 },
                                    { label: 'Juz 30', value: 30 },
                                  ]
                                : [
                                    { label: '5 Lines', value: 5 },
                                    { label: '10 Lines', value: 10 },
                                    { label: '15 Lines', value: 15 },
                                    { label: '20 Lines', value: 20 },
                                  ]
                            }
                            disabled={isDisabledOverall || draft.needsRevision}
                          />
                        </div>
                      </div>

                      {/* Juzu Padam / Current Sabqi Stepper */}
                      <div className="flex items-start justify-between px-5 py-3.5">
                        <div className="pt-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {isDowra ? 'Current Sabqi (Juz #)' : 'Current Lesson / Juzu Padam'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {isDowra ? 'Sabqi Portion' : 'Current Lesson Portion'}
                          </p>
                        </div>
                        <div className="shrink-0 block w-full max-w-[200px] text-right">
                          <StepperField
                            label=""
                            value={draft.juzuPadam}
                            onChange={(v) => updateDraft(student._id, { juzuPadam: v })}
                            max={30}
                            step={1}
                            isWrong={Boolean(draft.isCurrentLessonWrong)}
                            onToggleWrong={() => {
                              const nextState = !draft.isCurrentLessonWrong;
                              updateDraft(student._id, {
                                isCurrentLessonWrong: nextState,
                                ...(nextState ? { juzuPadam: 0 } : {}),
                              });
                            }}
                            isNotGiven={Boolean(draft.isJuzuPadamNotGiven)}
                            onToggleNotGiven={() => {
                              const nextState = !draft.isJuzuPadamNotGiven;
                              updateDraft(student._id, {
                                isJuzuPadamNotGiven: nextState,
                                ...(nextState ? { juzuPadam: 0 } : {}),
                              });
                            }}
                            quickChips={[
                              { label: '5 Pages', value: 5 },
                              { label: '10 Pages', value: 10 },
                              { label: '15 Pages', value: 15 },
                              { label: '20 Pages', value: 20 },
                            ]}
                            disabled={isDisabledOverall}
                          />
                        </div>
                      </div>

                      {/* Pazhaya Padam / Old Sabqi Stepper */}
                      <div className="flex items-start justify-between px-5 py-3.5">
                        <div className="pt-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {isDowra ? 'Old Sabqi (Juz #)' : 'Pazhaya Padam'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {isDowra ? 'Revision Portion' : 'Revision Portion'}
                          </p>
                        </div>
                        <div className="shrink-0 block w-full max-w-[200px] text-right">
                          <StepperField
                            label=""
                            value={draft.pazhayaPadam}
                            onChange={(v) => updateDraft(student._id, { pazhayaPadam: v })}
                            max={isDowra ? 30 : 999}
                            step={1}
                            isWrong={Boolean(draft.isPazhayaPadamWrong)}
                            onToggleWrong={() => {
                              const nextState = !draft.isPazhayaPadamWrong;
                              updateDraft(student._id, {
                                isPazhayaPadamWrong: nextState,
                                ...(nextState ? { pazhayaPadam: 0 } : {}),
                              });
                            }}
                            isNotGiven={Boolean(draft.isPazhayaPadamNotGiven)}
                            onToggleNotGiven={() => {
                              const nextState = !draft.isPazhayaPadamNotGiven;
                              updateDraft(student._id, {
                                isPazhayaPadamNotGiven: nextState,
                                ...(nextState ? { pazhayaPadam: 0 } : {}),
                              });
                            }}
                            quickChips={[
                              { label: '5 Pages', value: 5 },
                              { label: '10 Pages', value: 10 },
                              { label: '15 Pages', value: 15 },
                              { label: '20 Pages', value: 20 },
                            ]}
                            disabled={isDisabledOverall}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </article>
        );
      })
      )}

      {/* Alerts */}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
          ⚠️ {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-medium">
          ✓ {success}
        </p>
      )}

      {/* Fixed Submit */}
      <button
        type="button"
        onClick={handleBulkSubmit}
        disabled={submitting || isSubmittedToday}
        className={`fixed bottom-[4.5rem] left-4 right-4 mx-auto max-w-md flex items-center justify-center gap-2 rounded-2xl py-4 text-center text-base font-semibold transition active:scale-[0.98] ${
          isSubmittedToday
            ? 'bg-emerald-800 text-emerald-100 cursor-not-allowed opacity-90 shadow-none'
            : 'bg-madrasa-700 text-white shadow-lg hover:bg-madrasa-800 disabled:opacity-60'
        }`}
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Saving Progress…</span>
          </>
        ) : isSubmittedToday ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            <span>Submitted for Today</span>
          </>
        ) : (
          ' Submit Progress'
        )}
      </button>
    </div>
  );
}

