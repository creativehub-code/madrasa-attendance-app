'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkSubmitProgress, fetchTeacherStudents, updateStudentJuzu } from '@/lib/api';
import type { ProgressEntry, Student, RawStudent } from '@/types';
import StepperField from './StepperField';
import JuzuSelector from './JuzuSelector';
import { RotateCcw, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

import { getStudentCategory } from '@/lib/studentCategory';

type StudentDraft = ProgressEntry & {
  studentName: string;
  rollNumber: string;
};

const STORAGE_KEY = 'madrasa_teacher_drafts_v1';

const emptyDraft = (student: Student): StudentDraft => {
  const defaultJuzu = student.todayProgress?.juzuNumber ?? student.currentJuzu ?? 1;
  if (student.todayProgress) {
    return {
      studentId: student._id,
      studentName: student.name,
      rollNumber: student.rollNumber,
      juzuNumber: defaultJuzu,
      puthiyaPadam: student.todayProgress.puthiyaPadam ?? 0,
      juzuPadam: student.todayProgress.juzuPadam ?? 0,
      pazhayaPadam: student.todayProgress.pazhayaPadam ?? 0,
      isPuthiyaPadamWrong: Boolean(student.todayProgress.isPuthiyaPadamWrong),
      isCurrentLessonWrong: Boolean(student.todayProgress.isCurrentLessonWrong),
      isPazhayaPadamWrong: Boolean(student.todayProgress.isPazhayaPadamWrong),
      isAbsent: Boolean(student.todayProgress.isAbsent),
      needsRevision: Boolean(student.todayProgress.needsRevision),
      notes: student.todayProgress.notes || '',
    };
  }
  return {
    studentId: student._id,
    studentName: student.name,
    rollNumber: student.rollNumber,
    juzuNumber: defaultJuzu,
    puthiyaPadam: 0,
    juzuPadam: 0,
    pazhayaPadam: 0,
    isPuthiyaPadamWrong: false,
    isCurrentLessonWrong: false,
    isPazhayaPadamWrong: false,
    isAbsent: false,
    needsRevision: false,
    notes: '',
  };
};

export default function FlashcardProgressEntry() {
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

  const students = studentsData || [];
  const fetchError = isStudentsError
    ? studentsErrorObj instanceof Error
      ? studentsErrorObj.message
      : 'Failed to load students'
    : null;

  const [drafts, setDrafts] = useState<Record<string, StudentDraft>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

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
          const defaultDraft = emptyDraft(s);
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
  };

  const currentStudent = students[currentIndex];
  const currentDraft = currentStudent ? drafts[currentStudent._id] : null;

  const updateDraft = useCallback(
    (studentId: string, patch: Partial<StudentDraft>) => {
      setDrafts((prev) => ({
        ...prev,
        [studentId]: { ...prev[studentId], ...patch },
      }));
    },
    []
  );

  const goNext = () => {
    if (currentIndex < students.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  // ── Mutation ────────────────────────────────────────────────────────────────
  const bulkSubmitMutation = useMutation({
    mutationFn: bulkSubmitProgress,
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
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Submit failed');
    },
  });

  // Juzu Update Mutation (Optimistic Update)
  const updateJuzuMutation = useMutation({
    mutationFn: ({ studentId, juzuNumber }: { studentId: string; juzuNumber: number }) => 
      updateStudentJuzu(studentId, juzuNumber),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['teacherStudents'] });
      const previousStudents = queryClient.getQueryData<RawStudent[]>(['teacherStudents']);
      
      if (previousStudents) {
        queryClient.setQueryData<RawStudent[]>(['teacherStudents'], (old) => 
          old?.map((s) => 
            s._id === variables.studentId ? { ...s, currentJuzu: variables.juzuNumber } : s
          )
        );
      }
      
      // Also update the draft
      updateDraft(variables.studentId, { juzuNumber: variables.juzuNumber });
      
      return { previousStudents };
    },
    onError: (err, variables, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['teacherStudents'], context.previousStudents);
      }
      // Revert draft
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
    setError(null);
    setSuccess(null);

    const entries: ProgressEntry[] = Object.values(drafts).map(
      (draft) => {
        const student = students.find((s) => s._id === draft.studentId);
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
          notes: draft.notes?.trim() || undefined,
        };
      }
    );

    bulkSubmitMutation.mutate({ date: new Date().toISOString(), entries });
  };

  const submitting = bulkSubmitMutation.isPending;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-madrasa-200 border-t-madrasa-600" />
        <p className="text-sm text-gray-500">Loading students…</p>
      </div>
    );
  }

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

  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
        No students assigned to you yet.
      </div>
    );
  }

  if (!currentDraft) return null;

  const completedCount = Object.values(drafts).filter(
    (d) => d.isAbsent || d.needsRevision || d.puthiyaPadam > 0 || d.juzuPadam > 0 || d.pazhayaPadam > 0
  ).length;

  const isNeedsRevision = currentDraft.needsRevision && !currentDraft.isAbsent;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-28">
      {/* Progress header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm text-gray-500">Daily Entry</p>
          <p className="text-lg font-semibold text-gray-900">{today}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {currentIndex + 1} / {students.length}
          </p>
          <p className="text-xs text-madrasa-600">{completedCount} touched</p>
        </div>
      </div>

      {/* Flashcard */}
      <article className={`rounded-2xl border transition-all duration-200 p-5 shadow-lg overflow-hidden ${
        currentDraft.isAbsent
          ? 'border-gray-200 bg-gray-50/60 opacity-60 shadow-gray-100 dark:border-gray-800 dark:bg-gray-900/60'
          : isNeedsRevision
          ? 'border-amber-300 bg-amber-50/30 ring-2 ring-amber-200 shadow-amber-100/60 dark:border-amber-800/60 dark:bg-amber-950/30 dark:ring-amber-800/40'
          : 'border-gray-200 bg-white shadow-gray-100 dark:border-gray-800 dark:bg-gray-900'
      }`}>
        {/* Warning Banner */}
        {isNeedsRevision && (
          <div className="-mx-5 -mt-5 mb-4 flex items-center gap-2 border-b border-amber-200 bg-amber-100/80 dark:border-amber-800/60 dark:bg-amber-950/60 px-5 py-2.5 text-xs font-bold text-amber-900 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <span>Needs Revision — Repeating lesson due to mistakes</span>
          </div>
        )}

        <header className="mb-5 border-b border-gray-100 dark:border-gray-800 pb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentDraft.studentName}</h2>
              {currentStudent.status === 'Discontinued' && (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-[10px] font-bold rounded-full border border-amber-300 dark:border-amber-700">
                  Discontinued
                </span>
              )}
              {/* Visual UI Mode Indicator Badge */}
              {(() => {
                const category = getStudentCategory(currentStudent);
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
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Roll #{currentDraft.rollNumber}
            </p>
          </div>
          {isNeedsRevision && (
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/60 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
              Repeating Lesson
            </span>
          )}
        </header>

        {/* Action Toggles Bar */}
        <div className="mb-5 flex items-center justify-between gap-2">
          {/* Needs Revision Chip Button */}
          <button
            type="button"
            disabled={currentDraft.isAbsent}
            onClick={() => {
              const nextState = !currentDraft.needsRevision;
              updateDraft(currentStudent._id, {
                needsRevision: nextState,
                ...(nextState ? { puthiyaPadam: 0 } : {}),
              });
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              currentDraft.needsRevision
                ? 'bg-amber-500 text-white shadow ring-2 ring-amber-300 dark:ring-amber-600'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Needs Revision</span>
          </button>

          {/* Absent toggle */}
          <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-red-100 bg-red-50/60 dark:bg-red-950/30 dark:border-red-900/50 px-3.5 py-2 ${currentStudent.status === 'Discontinued' ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className="text-xs font-bold text-red-900 dark:text-red-300">Absent</span>
            <input
              type="checkbox"
              disabled={currentStudent.status === 'Discontinued'}
              checked={currentDraft.isAbsent}
              onChange={(e) =>
                updateDraft(currentStudent._id, {
                  isAbsent: e.target.checked,
                  ...(e.target.checked
                    ? { puthiyaPadam: 0, juzuPadam: 0, pazhayaPadam: 0, needsRevision: false }
                    : {}),
                })
              }
              className="h-4 w-4 rounded border-red-300 dark:border-red-700 text-red-600 focus:ring-red-500"
            />
          </label>
        </div>

        {/* Steppers */}
        {(() => {
          const category = getStudentCategory(currentStudent);
          const isQaida = category === 'Noorani Qaida';
          const isDowra = category === 'Dowra';

          let selectorLabel = 'Current Juzu';
          if (isQaida) selectorLabel = 'Current Lesson';
          if (isDowra) selectorLabel = 'Dowra Count';

          return (
            <div className={`grid gap-4 ${currentDraft.isAbsent || currentStudent.status === 'Discontinued' ? 'pointer-events-none opacity-40' : ''}`}>
              <JuzuSelector
                label={selectorLabel}
                value={currentDraft.juzuNumber ?? 1}
                onChange={(v) => {
                  updateDraft(currentStudent._id, { juzuNumber: v });
                  handleJuzuChange(currentStudent._id, v);
                }}
                disabled={currentDraft.isAbsent || currentStudent.status === 'Discontinued' || updateJuzuMutation.isPending}
              />

              {!isQaida && (
                <>
                  <StepperField
                    label={
                      isNeedsRevision
                        ? "New Lesson (Locked - Needs Revision)"
                        : isDowra
                        ? "New Lesson (Juz #)"
                        : "New Lesson (Lines)"
                    }
                    value={currentDraft.puthiyaPadam}
                    onChange={(v) => updateDraft(currentStudent._id, { puthiyaPadam: v })}
                    max={isDowra ? 30 : 999}
                    step={1}
                    disabled={currentDraft.isAbsent || currentDraft.needsRevision}
                    isWrong={Boolean(currentDraft.isPuthiyaPadamWrong)}
                    onToggleWrong={() => {
                      const nextState = !currentDraft.isPuthiyaPadamWrong;
                      updateDraft(currentStudent._id, {
                        isPuthiyaPadamWrong: nextState,
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
                  />
                  <StepperField
                    label={isDowra ? "Current Sabqi" : "Current Lesson / Juzu Padam"}
                    value={currentDraft.juzuPadam}
                    onChange={(v) => updateDraft(currentStudent._id, { juzuPadam: v })}
                    max={30}
                    step={1}
                    disabled={currentDraft.isAbsent}
                    isWrong={Boolean(currentDraft.isCurrentLessonWrong)}
                    onToggleWrong={() => {
                      const nextState = !currentDraft.isCurrentLessonWrong;
                      updateDraft(currentStudent._id, {
                        isCurrentLessonWrong: nextState,
                        ...(nextState ? { juzuPadam: 0 } : {}),
                      });
                    }}
                    quickChips={[
                      { label: '5 Pages', value: 5 },
                      { label: '10 Pages', value: 10 },
                      { label: '15 Pages', value: 15 },
                      { label: '20 Pages', value: 20 },
                    ]}
                  />
                  <StepperField
                    label={isDowra ? "Old Sabqi" : "Pazhaya Padam"}
                    value={currentDraft.pazhayaPadam}
                    onChange={(v) => updateDraft(currentStudent._id, { pazhayaPadam: v })}
                    max={isDowra ? 30 : 999}
                    step={1}
                    disabled={currentDraft.isAbsent}
                    isWrong={Boolean(currentDraft.isPazhayaPadamWrong)}
                    onToggleWrong={() => {
                      const nextState = !currentDraft.isPazhayaPadamWrong;
                      updateDraft(currentStudent._id, {
                        isPazhayaPadamWrong: nextState,
                        ...(nextState ? { pazhayaPadam: 0 } : {}),
                      });
                    }}
                    quickChips={[
                      { label: '5 Pages', value: 5 },
                      { label: '10 Pages', value: 10 },
                      { label: '15 Pages', value: 15 },
                      { label: '20 Pages', value: 20 },
                    ]}
                  />
                </>
              )}
            </div>
          );
        })()}

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Notes (optional)
          </label>
          <textarea
            value={currentDraft.notes || ''}
            onChange={(e) => updateDraft(currentStudent._id, { notes: e.target.value })}
            rows={2}
            maxLength={500}
            placeholder="Short note for today…"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </article>

      {/* Card navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-3 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={currentIndex === students.length - 1}
          className="flex-1 rounded-xl bg-madrasa-600 py-3 font-medium text-white disabled:opacity-40"
        >
          Next Student
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex flex-wrap justify-center gap-1.5 px-2">
        {students.map((s, idx) => {
          const d = drafts[s._id];
          const touched =
            d?.isAbsent || (d?.puthiyaPadam ?? 0) > 0 || (d?.juzuPadam ?? 0) > 0 || (d?.pazhayaPadam ?? 0) > 0;
          return (
            <button
              key={s._id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to ${s.name}`}
              className={`h-2.5 rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-6 bg-madrasa-600'
                  : touched
                    ? 'w-2.5 bg-madrasa-400'
                    : 'w-2.5 bg-gray-300'
              }`}
            />
          );
        })}
      </div>

      {/* Bulk submit */}
      <button
        type="button"
        onClick={handleBulkSubmit}
        disabled={submitting}
        className="fixed bottom-20 left-4 right-4 mx-auto max-w-md flex items-center justify-center gap-2 rounded-2xl bg-madrasa-700 py-4 text-center text-lg font-semibold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Saving Progress…</span>
          </>
        ) : (
          `Submit All (${students.length})`
        )}
      </button>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </p>
      )}
    </div>
  );
}
