'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  UserX,
  Loader2,
  Check,
  ArrowLeft,
  ChevronDown,
  FileText,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchSchoolTeacherClasses,
  submitSchoolProgress,
  fetchSchoolProgress,
  fetchSyllabus,
  SchoolTeacherClass,
} from '@/lib/api';

const DEFAULT_SUBJECTS = ['Mathematics', 'Science', 'English', 'Social Studies', 'Moral Education', 'General Knowledge'];

function UpdateFormContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const classParam = searchParams.get('class') || searchParams.get('className') || '';

  const [selectedClass, setSelectedClass] = useState<string>(classParam);
  const [subject, setSubject] = useState<string>('');
  const [unitTaught, setUnitTaught] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('2025-2026');
  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedAbsentStudentIds, setSelectedAbsentStudentIds] = useState<string[]>([]);
  
  // Form starts collapsed (accordion style) by default
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

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

  const availableSubjects = syllabusData?.subjects && syllabusData.subjects.length > 0
    ? syllabusData.subjects
    : DEFAULT_SUBJECTS;

  // Update selected class if classParam is present
  useEffect(() => {
    if (classParam) {
      setSelectedClass(classParam);
      setIsFormOpen(true); // Automatically expand if user navigated from a specific class card
    } else if (!selectedClass && classes.length > 0) {
      setSelectedClass(classes[0].className);
    }
  }, [classParam, classes]);

  const activeClassObj = classes.find((c) => c.className === selectedClass) || classes[0];

  // 2. Fetch Recent Progress History using React Query
  const {
    data: progressHistory,
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ['schoolProgressHistory', selectedClass],
    queryFn: async () => {
      if (typeof window === 'undefined') return [];
      const res = await fetchSchoolProgress({ className: selectedClass || undefined });
      return res.data.progress;
    },
    staleTime: 2 * 60 * 1000,
  });

  // 3. Submit Progress Mutation
  const submitMutation = useMutation({
    mutationFn: submitSchoolProgress,
    onSuccess: (data) => {
      toast.success(data.message || 'School progress submitted successfully!');
      setSubject('');
      setUnitTaught('');
      setDescription('');
      setSelectedAbsentStudentIds([]);
      setIsFormOpen(false); // Collapse form after successful submission
      queryClient.invalidateQueries({ queryKey: ['schoolProgressHistory'] });
      queryClient.invalidateQueries({ queryKey: ['parentDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['parentMonthlyProgress'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to submit school progress.');
    },
  });

  const toggleAbsentStudent = (studentId: string) => {
    setSelectedAbsentStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) {
      toast.error('Please select a Class.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter or select a Subject.');
      return;
    }
    if (!unitTaught.trim()) {
      toast.error('Please enter the Unit / Topic Taught.');
      return;
    }

    submitMutation.mutate({
      className: selectedClass,
      subject: subject.trim(),
      unitTaught: unitTaught.trim(),
      description: description.trim(),
      date: dateStr,
      academicYear: academicYear.trim(),
      absentStudents: selectedAbsentStudentIds,
    });
  };

  if (isClassesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-madrasa-700 dark:text-madrasa-400" />
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Loading update page…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 pb-36 pt-4 px-1">
      {/* HEADER WITH BACK BUTTON */}
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/school-teacher')}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition active:scale-95"
          title="Back to Dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <span className="rounded-full bg-madrasa-100 dark:bg-madrasa-900/50 px-2.5 py-0.5 text-xs font-bold text-madrasa-800 dark:text-madrasa-300">
            School Teacher
          </span>
          <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white mt-0.5">Class Updates & History</h1>
        </div>
      </header>

      {/* COLLAPSIBLE FORM ACCORDION */}
      <div className="rounded-3xl border border-madrasa-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-all duration-200">
        {/* Accordion Trigger Header */}
        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex w-full items-center justify-between p-4 text-left hover:bg-madrasa-50/40 dark:hover:bg-gray-800/50 transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-madrasa-100 dark:bg-madrasa-900/50 text-madrasa-700 dark:text-madrasa-300">
              <Plus className={`h-5 w-5 transition-transform duration-200 ${isFormOpen ? 'rotate-45' : ''}`} />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-gray-900 dark:text-white">Post Whole-Class Update</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {isFormOpen ? 'Click to collapse form' : 'Click to expand & post new session update'}
              </p>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isFormOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Collapsible Form Body */}
        {isFormOpen && (
          <form onSubmit={handleSubmit} className="border-t border-gray-100 dark:border-gray-800 p-5 flex flex-col gap-4 bg-gray-50/30 dark:bg-gray-900/50">
            {/* Class Selector */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Select Class <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedAbsentStudentIds([]);
                }}
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-madrasa-500 dark:focus:border-madrasa-500 focus:outline-none transition"
              >
                {classes.map((cls) => (
                  <option key={cls.className} value={cls.className}>
                    {cls.className} ({cls.studentCount || cls.students.length} Students)
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year & Date Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2025-2026"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-madrasa-500 dark:focus:border-madrasa-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Date
                </label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm font-semibold text-gray-900 dark:text-white focus:border-madrasa-500 dark:focus:border-madrasa-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Subject Field & Pills */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics, Science"
                className="mb-2 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-madrasa-500 dark:focus:border-madrasa-500 focus:outline-none transition"
              />
              <div className="flex flex-wrap gap-1.5">
                {availableSubjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubject(sub)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      subject === sub
                        ? 'bg-madrasa-700 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Unit Taught */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Unit / Chapter Taught <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={unitTaught}
                onChange={(e) => setUnitTaught(e.target.value)}
                placeholder="e.g., Chapter 4: Photosynthesis & Plant Cells"
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-madrasa-500 dark:focus:border-madrasa-500 focus:outline-none transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Details & Homework (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="e.g., Solved exercises 4.1 to 4.3 in class. Homework: Q1-5 on page 54."
                className="w-full resize-none rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-madrasa-500 dark:focus:border-madrasa-500 focus:outline-none transition"
              />
            </div>

            {/* ABSENT STUDENTS MULTI-SELECT CHECKLIST */}
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/40 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <UserX className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  <span>Mark Absent Students for this Session</span>
                </span>
                <span className="rounded-full bg-amber-200/80 dark:bg-amber-900/60 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-200">
                  {selectedAbsentStudentIds.length} Selected
                </span>
              </div>
              <p className="mb-2 text-[11px] text-amber-800 dark:text-amber-400 leading-tight">
                Selected students will NOT have this progress entry shown on their Parent Dashboard.
              </p>

              <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {(activeClassObj?.students || []).map((student) => {
                  const isSelected = selectedAbsentStudentIds.includes(student._id);
                  return (
                    <button
                      key={student._id}
                      type="button"
                      onClick={() => toggleAbsentStudent(student._id)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition active:scale-95 border ${
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-amber-200/60 dark:border-amber-900/50 hover:bg-amber-100/50 dark:hover:bg-gray-700/50'
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

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-madrasa-700 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-madrasa-800 active:scale-[0.98] disabled:opacity-70"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting Class Progress…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Class Progress (Upsert)</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* SUBMISSION HISTORY SECTION */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white">Submission History</h2>
          </div>
          {selectedClass && (
            <span className="rounded-full bg-madrasa-100 dark:bg-madrasa-900/50 px-2.5 py-0.5 text-xs font-bold text-madrasa-800 dark:text-madrasa-300">
              Filter: {selectedClass}
            </span>
          )}
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
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">No submission history found.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function SchoolTeacherUpdateView() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-madrasa-700 dark:text-madrasa-400" />
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Loading update page…</p>
      </div>
    }>
      <UpdateFormContent />
    </Suspense>
  );
}
