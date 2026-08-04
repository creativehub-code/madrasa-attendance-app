'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  UserX,
  Loader2,
  Check,
  ArrowLeft,
  FileText,
  Plus,
  X,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchSchoolTeacherClasses,
  submitSchoolProgress,
  fetchSchoolProgress,
  fetchSyllabus,
  SchoolTeacherClass,
} from '@/lib/api';

const DEFAULT_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'Social Studies',
  'Moral Education',
  'General Knowledge',
];

function UpdateFormContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const classParam = searchParams.get('class') || searchParams.get('className') || '';

  const [selectedClass, setSelectedClass] = useState<string>(classParam);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [chapterTitles, setChapterTitles] = useState<Record<string, string>>({});
  const [description, setDescription] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('2025-2026');
  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedAbsentStudentIds, setSelectedAbsentStudentIds] = useState<string[]>([]);

  // Modal State for FAB
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmittingMulti, setIsSubmittingMulti] = useState<boolean>(false);

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

  const classes: SchoolTeacherClass[] = classesData || [];

  // 1b. Fetch Syllabus for Selected Class dynamically
  const { data: syllabusData } = useQuery({
    queryKey: ['syllabus', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return null;
      const res = await fetchSyllabus(selectedClass);
      return res.data.syllabus;
    },
    enabled: !!selectedClass,
    staleTime: 5 * 60 * 1000,
  });

  const availableSubjects =
    syllabusData?.subjects && syllabusData.subjects.length > 0
      ? syllabusData.subjects
      : DEFAULT_SUBJECTS;

  // Update selected class if classParam is present
  useEffect(() => {
    if (classParam) {
      setSelectedClass(classParam);
      setIsModalOpen(true);
    } else if (!selectedClass && classes.length > 0) {
      setSelectedClass(classes[0].className);
    }
  }, [classParam, classes]);

  const activeClassObj = classes.find((c) => c.className === selectedClass) || classes[0];

  // 2. Fetch Recent Progress History using React Query
  const { data: progressHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['schoolProgressHistory', selectedClass],
    queryFn: async () => {
      if (typeof window === 'undefined') return [];
      const res = await fetchSchoolProgress({ className: selectedClass || undefined });
      return res.data.progress;
    },
    staleTime: 2 * 60 * 1000,
  });

  const toggleSubjectSelection = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      setSelectedSubjects((prev) => prev.filter((s) => s !== sub));
    } else {
      setSelectedSubjects((prev) => [...prev, sub]);
    }
  };

  const toggleAbsentStudent = (studentId: string) => {
    setSelectedAbsentStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleMultiSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClass) {
      toast.error('Please select a Class.');
      return;
    }

    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one Subject.');
      return;
    }

    // Validate that every selected subject has a chapter title filled
    for (const sub of selectedSubjects) {
      if (!chapterTitles[sub] || !chapterTitles[sub].trim()) {
        toast.error(`Please enter the Chapter Title for ${sub}.`);
        return;
      }
    }

    // Construct array of entries: [{ subject: 'Math', chapter: 'Algebra' }, { subject: 'Science', chapter: 'Physics' }]
    const payloadEntries = selectedSubjects.map((sub) => ({
      subject: sub,
      chapter: chapterTitles[sub].trim(),
    }));

    setIsSubmittingMulti(true);
    try {
      // Submit each subject-chapter entry to backend so each subject has its own distinct record
      await Promise.all(
        payloadEntries.map((item) =>
          submitSchoolProgress({
            className: selectedClass,
            subject: item.subject,
            unitTaught: item.chapter,
            description: description.trim(),
            date: dateStr,
            academicYear: academicYear.trim(),
            absentStudents: selectedAbsentStudentIds,
          })
        )
      );

      toast.success(
        `Successfully posted update for ${payloadEntries.length} subject(s)!`
      );

      // Reset Form and close Modal
      setSelectedSubjects([]);
      setChapterTitles({});
      setDescription('');
      setSelectedAbsentStudentIds([]);
      setIsModalOpen(false);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['schoolProgressHistory'] });
      queryClient.invalidateQueries({ queryKey: ['parentDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['parentMonthlyProgress'] });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit school progress updates.'
      );
    } finally {
      setIsSubmittingMulti(false);
    }
  };

  if (isClassesLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-madrasa-700 dark:text-madrasa-400" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading update page…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-36 pt-6 px-4 text-gray-900 dark:text-gray-100">
      {/* CLEAN HEADER WITH PERFECTLY VERTICALLY ALIGNED TITLE AND BACK BUTTON */}
      <header className="flex items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push('/school-teacher')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition active:scale-95 shadow-xs"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
            Class Updates History
          </h1>
        </div>

        {/* Filter dropdown by Class */}
        {classes.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-xs font-medium text-gray-400">
              Filter:
            </span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-madrasa-500 shadow-xs"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.className} value={cls.className}>
                  {cls.className}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* SUBMISSION HISTORY FEED */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Recent Class Submissions
            </h2>
          </div>
          {selectedClass && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {selectedClass}
            </span>
          )}
        </div>

        {isHistoryLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 gap-3 shadow-xs">
            <Loader2 className="h-6 w-6 animate-spin text-madrasa-700 dark:text-madrasa-400" />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Loading update history…
            </p>
          </div>
        ) : progressHistory && progressHistory.length > 0 ? (
          <div className="flex flex-col gap-3">
            {progressHistory.map((item) => (
              <div
                key={item._id}
                className="flex flex-col gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xs transition hover:border-gray-300 dark:hover:border-gray-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700/60 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                      {item.subject}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      Class: {item.className}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-normal">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(item.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
                    <Layers className="h-3.5 w-3.5 text-madrasa-600 dark:text-madrasa-400" />
                    <span>Chapter Title Covered</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.unitTaught}
                  </h3>
                  {item.description && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 font-normal leading-relaxed bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                      {item.description}
                    </p>
                  )}
                </div>

                {item.absentStudents && item.absentStudents.length > 0 && (
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl p-2.5 border border-amber-200/60 dark:border-amber-900/60">
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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
            <BookOpen className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              No class updates recorded yet
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              Click the floating button at the bottom right to post multi-subject updates for your class.
            </p>
          </div>
        )}
      </section>

      {/* FLOATING ACTION BUTTON (FAB) FIXED STRICTLY ABOVE MOBILE BOTTOM NAV */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-4 sm:right-6 z-50 flex items-center gap-2.5 rounded-full bg-madrasa-700 dark:bg-madrasa-600 px-5 py-3 text-white font-semibold text-xs sm:text-sm shadow-xl hover:bg-madrasa-800 dark:hover:bg-madrasa-500 transition-all duration-200 active:scale-95 group"
        title="Post New Class Update"
      >
        <Plus className="h-5 w-5 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
        <span>Post Class Update</span>
      </button>

      {/* MULTI-SUBJECT UPDATE FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 px-6 py-4 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-bold">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Post Class Progress Update
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    Select subjects and enter individual chapter titles
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* MODAL SCROLLABLE BODY */}
            <form onSubmit={handleMultiSubjectSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              {/* Class Selection & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Target Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setSelectedAbsentStudentIds([]);
                    }}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2.5 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-madrasa-500"
                  >
                    {classes.map((cls) => (
                      <option key={cls.className} value={cls.className}>
                        {cls.className} ({cls.studentCount || cls.students.length} Students)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Session Date
                  </label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2.5 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-madrasa-500"
                  />
                </div>
              </div>

              {/* Multi-Subject Selector Chips */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Select Subjects <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    {selectedSubjects.length} Selected
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Click chips to toggle multiple subjects for this session update.
                </p>

                <div className="flex flex-wrap gap-2">
                  {availableSubjects.map((sub) => {
                    const isSelected = selectedSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubjectSelection(sub)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 border ${
                          isSelected
                            ? 'bg-madrasa-700 dark:bg-madrasa-600 text-white border-madrasa-800 shadow-xs'
                            : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                        <span>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Chapter Title Inputs per Selected Subject */}
              {selectedSubjects.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 p-4">
                  <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/50 pb-2">
                    <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                      Subject Chapter Titles
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      Separate title per subject
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                    {selectedSubjects.map((sub) => (
                      <div
                        key={sub}
                        className="flex flex-col gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-blue-100 dark:bg-blue-900/50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:text-blue-300">
                            {sub}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleSubjectSelection(sub)}
                            className="text-[11px] font-semibold text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                            Chapter / Unit Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={chapterTitles[sub] || ''}
                            onChange={(e) =>
                              setChapterTitles((prev) => ({ ...prev, [sub]: e.target.value }))
                            }
                            placeholder={`e.g. Chapter 3: ${sub} Fundamentals`}
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-madrasa-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shared Description / Homework Notes */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Shared Details & Homework (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g. Completed classroom exercises. Homework Q1-4 assigned for tomorrow."
                  className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-madrasa-500"
                />
              </div>

              {/* Absent Students List */}
              <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-300">
                    <UserX className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                    <span>Mark Absent Students</span>
                  </span>
                  <span className="rounded-md bg-amber-200/80 dark:bg-amber-900/60 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:text-amber-200">
                    {selectedAbsentStudentIds.length} Absent
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 pr-1">
                  {(activeClassObj?.students || []).map((student) => {
                    const isSelected = selectedAbsentStudentIds.includes(student._id);
                    return (
                      <button
                        key={student._id}
                        type="button"
                        onClick={() => toggleAbsentStudent(student._id)}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition active:scale-95 border ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span>
                          {student.name} <span className="opacity-75">({student.admissionNumber})</span>
                        </span>
                        {isSelected ? <Check className="h-4 w-4" /> : <div className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SUBMIT BUTTON IN MODAL */}
              <button
                type="submit"
                disabled={isSubmittingMulti || selectedSubjects.length === 0}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-madrasa-700 dark:bg-madrasa-600 py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-madrasa-800 dark:hover:bg-madrasa-500 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingMulti ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving {selectedSubjects.length} Subject Updates…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Submit Updates ({selectedSubjects.length} Subjects)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SchoolTeacherUpdateView() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-madrasa-700 dark:text-madrasa-400" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading update page…</p>
        </div>
      }
    >
      <UpdateFormContent />
    </Suspense>
  );
}
