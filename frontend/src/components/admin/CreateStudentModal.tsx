'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  X,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { useAdminTheme } from '@/context/AdminThemeContext';
import { STANDARDS } from '@/types';
import {
  fetchAdminTeachers,
  fetchClasses,
  fetchSections,
  fetchAdminParents,
  createClass,
  createStudent,
  formatTeacherName,
  type AdminTeacher,
  type AdminParent,
  type CreateStudentResult,
  type ClassItem,
} from '@/lib/api';

export interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  teachers?: AdminTeacher[];
  classes?: ClassItem[];
  sections?: string[];
}

const DEFAULT_SECTIONS = ['Noorani Qaida', 'Hifz', 'Daura'];

export default function CreateStudentModal({
  isOpen,
  onClose,
  onSuccess,
  teachers: teachersProp,
  classes: classesProp,
  sections: sectionsProp,
}: CreateStudentModalProps) {
  const { darkMode } = useAdminTheme();
  const queryClient = useQueryClient();

  // ── Queries (fetched if props are not provided) ──────────────────────────────
  const { data: fetchedTeachers } = useQuery({
    queryKey: ['adminTeachers'],
    queryFn: async () => {
      const res = await fetchAdminTeachers();
      return res.data.teachers;
    },
    enabled: isOpen && !teachersProp,
    staleTime: 5 * 60 * 1000,
  });

  const { data: fetchedClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetchClasses();
      return res.data.classes;
    },
    enabled: isOpen && !classesProp,
    staleTime: 5 * 60 * 1000,
  });

  const { data: fetchedSections } = useQuery({
    queryKey: ['adminSections'],
    queryFn: async () => {
      const res = await fetchSections();
      return res.data.sections;
    },
    enabled: isOpen && !sectionsProp,
    staleTime: 5 * 60 * 1000,
  });

  const { data: fetchedParents } = useQuery({
    queryKey: ['adminParents'],
    queryFn: async () => {
      const res = await fetchAdminParents();
      return res.data.parents;
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const teachersList = useMemo(() => teachersProp || fetchedTeachers || [], [teachersProp, fetchedTeachers]);
  const classesList = useMemo(() => classesProp || fetchedClasses || [], [classesProp, fetchedClasses]);
  const parentsList: AdminParent[] = useMemo(() => fetchedParents || [], [fetchedParents]);

  const sectionsList = useMemo(() => {
    const rawSections = sectionsProp || fetchedSections || [];
    const set = new Set([...DEFAULT_SECTIONS, ...rawSections]);
    return Array.from(set);
  }, [sectionsProp, fetchedSections]);

  // ── Form State ─────────────────────────────────────────────────────────────
  const [formStudentName, setFormStudentName] = useState('');
  const [formStandard, setFormStandard] = useState<string>('1st Standard');
  const [formSection, setFormSection] = useState<string>('Noorani Qaida');
  const [formCustomSection, setFormCustomSection] = useState<string>('');
  const [formClassId, setFormClassId] = useState<string>('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [parentMode, setParentMode] = useState<'new' | 'existing'>('new');
  const [existingParentId, setExistingParentId] = useState('');
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [formParentUsername, setFormParentUsername] = useState('');
  const [formParentPassword, setFormParentPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<CreateStudentResult | null>(null);

  const filteredParents = useMemo(() => {
    if (!parentSearchTerm.trim()) return parentsList;
    const term = parentSearchTerm.toLowerCase().trim();
    return parentsList.filter(
      (p) =>
        p.username.toLowerCase().includes(term) ||
        (p.name && p.name.toLowerCase().includes(term))
    );
  }, [parentsList, parentSearchTerm]);

  // Inline "Create New Class" form state
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [newClassNameInput, setNewClassNameInput] = useState('');
  const [classFormError, setClassFormError] = useState<string | null>(null);

  // Default teacher selection when teachersList updates
  useEffect(() => {
    if (!formTeacherId && teachersList.length > 0) {
      setFormTeacherId(String(teachersList[0]._id));
    }
  }, [teachersList, formTeacherId]);

  const resetForm = () => {
    setFormStudentName('');
    setFormStandard('1st Standard');
    setFormSection('Noorani Qaida');
    setFormCustomSection('');
    setFormClassId('');
    setParentMode('new');
    setExistingParentId('');
    setParentSearchTerm('');
    setFormParentUsername('');
    setFormParentPassword('');
    setFormError(null);
    setCreatedCredentials(null);
    setIsCreatingClass(false);
    setNewClassNameInput('');
    setClassFormError(null);
    if (teachersList.length > 0) {
      setFormTeacherId(String(teachersList[0]._id));
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createClassMutation = useMutation({
    mutationFn: createClass,
    onSuccess: (res) => {
      const createdClass = res.data.class;
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setFormClassId(createdClass._id);
      setIsCreatingClass(false);
      setNewClassNameInput('');
      setClassFormError(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to create class';
      setClassFormError(message);
    },
  });

  const handleCreateNewClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createClassMutation.isPending) return;
    if (!newClassNameInput.trim()) {
      setClassFormError('Please enter a class name.');
      return;
    }
    setClassFormError(null);
    createClassMutation.mutate({ name: newClassNameInput.trim() });
  };

  const createStudentMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: (res) => {
      setCreatedCredentials(res.data);
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminSections'] });
      queryClient.invalidateQueries({ queryKey: ['adminParents'] });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to create student';
      setFormError(message);
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createStudentMutation.isPending) return; // Prevent double submission

    setFormError(null);

    const selectedTeacherId = formTeacherId || (teachersList.length > 0 ? String(teachersList[0]._id) : '');
    if (!selectedTeacherId) {
      setFormError('Please select an assigned teacher.');
      return;
    }

    const finalSection =
      formSection === 'Other'
        ? formCustomSection.trim().slice(0, 50).replace(/[<>]/g, '')
        : formSection;

    if (formSection === 'Other' && !finalSection) {
      setFormError('Please enter a custom section name.');
      return;
    }

    const selectedClassObj = classesList.find((c) => c._id === formClassId);

    if (parentMode === 'existing') {
      if (!existingParentId) {
        setFormError('Please select an existing parent account.');
        return;
      }
      createStudentMutation.mutate({
        studentName: formStudentName,
        standard: formStandard || '1st Standard',
        section: finalSection || 'Noorani Qaida',
        classId: formClassId || undefined,
        className: selectedClassObj ? selectedClassObj.name : undefined,
        teacherId: selectedTeacherId,
        existingParentId,
      });
    } else {
      if (!formParentUsername.trim() || !formParentPassword) {
        setFormError('Please enter parent username and password.');
        return;
      }
      createStudentMutation.mutate({
        studentName: formStudentName,
        standard: formStandard || '1st Standard',
        section: finalSection || 'Noorani Qaida',
        classId: formClassId || undefined,
        className: selectedClassObj ? selectedClassObj.name : undefined,
        teacherId: selectedTeacherId,
        parentUsername: formParentUsername,
        parentPassword: formParentPassword,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-hidden">
      <div
        className={`w-[92%] max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] ${
          darkMode ? 'bg-gray-900 text-white border border-gray-800' : 'bg-white text-gray-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                darkMode ? 'bg-gray-800 text-madrasa-400' : 'bg-madrasa-100 text-madrasa-700'
              }`}
            >
              <UserPlus className="h-5 w-5" />
            </div>
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Create New Student
            </h3>
          </div>
          <button
            onClick={handleClose}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success state — show credentials */}
        {createdCredentials ? (
          <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <p className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                  Student Created Successfully!
                </p>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mb-3">{createdCredentials.message}</p>
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-gray-900 p-3 space-y-1.5">
                <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Parent Login Credentials
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Username</span>
                  <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                    {createdCredentials.credentials?.parentUsername || createdCredentials.parent?.username || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Admission Number</span>
                  <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                    {createdCredentials.credentials?.admissionNumber || createdCredentials.student?.rollNumber || '—'}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-emerald-700 dark:text-emerald-400 italic">
                * Parent will be prompted to change their password on first login.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition ${
                  darkMode
                    ? 'border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Add Another Student
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl bg-madrasa-700 py-2.5 text-xs font-semibold text-white shadow hover:bg-madrasa-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">
            {/* API error banner */}
            {formError && (
              <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 p-3.5 flex items-start gap-2.5 shadow-xs">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed">{formError}</p>
              </div>
            )}

            {/* Student name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                Student Full Name <span className="text-emerald-500 font-bold ml-0.5">*</span>
              </label>
              <input
                required
                type="text"
                value={formStudentName}
                onChange={(e) => setFormStudentName(e.target.value)}
                placeholder="e.g. Ibrahim Ali"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                  darkMode
                    ? 'bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                    : 'bg-gray-50/70 border-gray-200 text-gray-900 placeholder:text-gray-400 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                }`}
              />
            </div>

            {/* Class Selection Field with Inline "Create New Class" option */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Assigned Class
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingClass(!isCreatingClass);
                    setClassFormError(null);
                  }}
                  className="text-[11px] font-bold text-madrasa-700 dark:text-madrasa-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>{isCreatingClass ? 'Select Existing Class' : 'Create New Class'}</span>
                </button>
              </div>

              {isCreatingClass ? (
                /* Inline New Class Form */
                <div className="rounded-xl border border-madrasa-200 dark:border-gray-700 bg-madrasa-50/50 dark:bg-gray-800/60 p-3 space-y-2">
                  <p className="text-[11px] font-semibold text-madrasa-900 dark:text-madrasa-200">
                    Enter New Class Name:
                  </p>
                  {classFormError && (
                    <div className="text-[11px] text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/40 p-2 rounded-lg border border-red-200 dark:border-red-900">
                      {classFormError}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newClassNameInput}
                      onChange={(e) => setNewClassNameInput(e.target.value)}
                      placeholder="e.g. Grade 5A or Class 3B"
                      className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium outline-none ${
                        darkMode
                          ? 'bg-gray-900 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    <button
                      type="button"
                      disabled={createClassMutation.isPending}
                      onClick={handleCreateNewClassSubmit}
                      className="flex items-center gap-1 rounded-xl bg-madrasa-700 hover:bg-madrasa-800 text-white font-bold px-3 py-2 text-xs shadow-xs transition active:scale-95 disabled:opacity-50"
                    >
                      {createClassMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Class Dropdown */
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                    darkMode
                      ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                      : 'bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                  }`}
                >
                  <option value="">-- Select Class (Optional) --</option>
                  {classesList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Standard + Teacher row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                  School Standard <span className="text-emerald-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  required
                  value={formStandard}
                  onChange={(e) => setFormStandard(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                    darkMode
                      ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                      : 'bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                  }`}
                >
                  {STANDARDS.map((std) => (
                    <option key={std} value={std}>
                      {std}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                  Assigned Teacher <span className="text-emerald-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  required
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                    darkMode
                      ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                      : 'bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                  }`}
                >
                  {teachersList.length === 0 && <option value="">No teachers found</option>}
                  {teachersList.map((t) => (
                    <option key={String(t._id)} value={String(t._id)}>
                      {formatTeacherName(t.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                  Section <span className="text-emerald-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  required
                  value={formSection}
                  onChange={(e) => setFormSection(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                    darkMode
                      ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                      : 'bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                  }`}
                >
                  {sectionsList.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                  <option value="Other">Other (Custom Section)</option>
                </select>
              </div>
              {formSection === 'Other' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Custom Section <span className="text-emerald-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    maxLength={50}
                    value={formCustomSection}
                    onChange={(e) => setFormCustomSection(e.target.value.slice(0, 50).replace(/[<>]/g, ''))}
                    placeholder="e.g. Tajweed, Hifz Advanced..."
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 placeholder:text-gray-400 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 border-t border-gray-200 dark:border-gray-800" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Parent / Guardian Assignment
              </span>
              <div className="flex-1 border-t border-gray-200 dark:border-gray-800" />
            </div>

            {/* Parent Mode Radio Pills Toggle */}
            <div className="flex items-center justify-between gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setParentMode('new')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  parentMode === 'new'
                    ? 'bg-madrasa-700 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Create New Parent
              </button>
              <button
                type="button"
                onClick={() => setParentMode('existing')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  parentMode === 'existing'
                    ? 'bg-madrasa-700 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Select Existing Parent
              </button>
            </div>

            {parentMode === 'existing' ? (
              /* Existing Parent Dropdown & Search */
              <div className="flex flex-col gap-2.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Select Parent Account <span className="text-emerald-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={parentSearchTerm}
                    onChange={(e) => setParentSearchTerm(e.target.value)}
                    placeholder="Search parent by username or name…"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs font-medium outline-none mb-2 ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 placeholder:text-gray-400 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500'
                    }`}
                  />
                  <select
                    required
                    value={existingParentId}
                    onChange={(e) => setExistingParentId(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  >
                    <option value="">-- Choose Existing Parent Account --</option>
                    {filteredParents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name && p.name !== p.username ? `${p.name} (@${p.username})` : `@${p.username}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* Create New Parent Mode */
              <>
                {/* Parent username */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Parent Username{' '}
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal lowercase">
                      (login handle)
                    </span>
                    <span className="text-emerald-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={formParentUsername}
                    onChange={(e) => setFormParentUsername(e.target.value)}
                    placeholder="e.g. yusuf.ali or +9198765"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 placeholder:text-gray-400 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  />
                </div>

                {/* Parent password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Parent Initial Password{' '}
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal lowercase">
                      (e.g. phone number)
                    </span>
                    <span className="text-emerald-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={formParentPassword}
                    onChange={(e) => setFormParentPassword(e.target.value)}
                    placeholder="+91 98765 43210"
                    minLength={6}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 placeholder:text-gray-400 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  />
                  <p className="mt-1.5 text-[10px] text-gray-400">
                    Min. 6 characters. Parent will be prompted to change on first login.
                  </p>
                </div>

                {/* Live credentials preview */}
                {(formParentUsername || formParentPassword) && (
                  <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-950 dark:text-emerald-200 shadow-xs">
                    <p className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <span>🔑</span> Parent Login Preview:
                    </p>
                    <div className="mt-1 space-y-0.5 font-mono text-[11px] text-emerald-800 dark:text-emerald-300">
                      <p>
                        User: <span className="font-bold">{formParentUsername || '—'}</span>
                      </p>
                      <p>
                        Pass: <span className="font-bold">{formParentPassword || '—'}</span>
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="mt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                  darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createStudentMutation.isPending || teachersList.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 text-xs shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createStudentMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create Student
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
