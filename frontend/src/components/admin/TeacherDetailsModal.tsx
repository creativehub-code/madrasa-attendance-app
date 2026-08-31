'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Users,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Trash2,
  UserX,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Pencil,
  Plus,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useAdminTheme } from '@/context/AdminThemeContext';
import { STANDARDS } from '@/types';
import {
  fetchAdminTeacherStudents,
  terminateTeacher,
  hardDeleteTeacher,
  updateTeacher,
  fetchClasses,
  createClass,
  fetchAdminTeachers,
  formatTeacherName,
  type AdminTeacher,
  type TeacherStudent,
  type UpdateTeacherPayload,
  type ClassItem,
} from '@/lib/api';

interface TeacherDetailsModalProps {
  teacher: AdminTeacher;
  onClose: () => void;
}

export default function TeacherDetailsModal({ teacher, onClose }: TeacherDetailsModalProps) {
  const { darkMode } = useAdminTheme();
  const queryClient = useQueryClient();

  // Modal mode & state
  const [isEditing, setIsEditing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'terminate' | 'delete' | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit form state
  const [editStandards, setEditStandards] = useState<string[]>(teacher.standards || []);
  const [editClassId, setEditClassId] = useState<string>('');
  const [editClassName, setEditClassName] = useState<string>(teacher.assignedClassName || '');
  const [showNewClassInput, setShowNewClassInput] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  // Shared assignment warning overlay state
  const [sharedWarning, setSharedWarning] = useState<{
    message: string;
    payload: UpdateTeacherPayload;
  } | null>(null);

  const displayName = formatTeacherName(teacher.name);
  const isTerminated = teacher.status === 'Terminated' || teacher.isActive === false;

  // ── Fetch students for this teacher (Strictly On-Demand) ──────────────────────
  const {
    data: detailsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['teacherStudents', teacher._id],
    queryFn: async () => {
      const res = await fetchAdminTeacherStudents(teacher._id);
      return res.data;
    },
    enabled: Boolean(teacher?._id),
    staleTime: 2 * 60 * 1000,
  });

  const students: TeacherStudent[] = detailsData?.students || [];

  // ── Query classes for Madrasa Teacher class dropdown ────────────────────────
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetchClasses();
      return res.data.classes;
    },
    enabled: teacher.role === 'Teacher' && isEditing,
    staleTime: 5 * 60 * 1000,
  });
  const classes: ClassItem[] = classesData || [];

  // ── Query all teachers to check for shared assignment warnings ─────────────
  const { data: allTeachersData } = useQuery({
    queryKey: ['adminTeachers'],
    queryFn: async () => {
      const res = await fetchAdminTeachers();
      return res.data.teachers;
    },
    enabled: isEditing,
    staleTime: 2 * 60 * 1000,
  });
  const allTeachers: AdminTeacher[] = allTeachersData || [];

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createClassMutation = useMutation({
    mutationFn: createClass,
    onSuccess: (res) => {
      const created = res.data.class;
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setEditClassId(created._id);
      setEditClassName(created.name);
      setShowNewClassInput(false);
      setNewClassName('');
      showToast(`Class "${created.name}" created!`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to create class';
      showToast(msg, 'error');
    },
  });

  const updateTeacherMutation = useMutation({
    mutationFn: (payload: UpdateTeacherPayload) => updateTeacher(teacher._id, payload),
    onSuccess: (res) => {
      showToast(res.data.message || 'Teacher updated successfully');
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacherStudents', teacher._id] });
      setIsEditing(false);
      setSharedWarning(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to update teacher';
      showToast(msg, 'error');
    },
  });

  const terminateMutation = useMutation({
    mutationFn: () => terminateTeacher(teacher._id),
    onSuccess: (res) => {
      showToast(res.data.message || 'Teacher terminated successfully');
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['teacherStudents', teacher._id] });
      setConfirmAction(null);
      setTimeout(onClose, 1500);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to terminate teacher';
      showToast(msg, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => hardDeleteTeacher(teacher._id),
    onSuccess: (res) => {
      showToast(res.data.message || 'Teacher deleted permanently');
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setConfirmAction(null);
      setTimeout(onClose, 1500);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to delete teacher';
      showToast(msg, 'error');
    },
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTerminate = () => {
    terminateMutation.mutate();
  };

  const handleDelete = () => {
    if (deleteConfirmName.toLowerCase().trim() !== teacher.name.toLowerCase().trim()) return;
    deleteMutation.mutate();
  };

  // ── Save Handler with Shared Assignment Warning Logic ─────────────────────────
  const handleSaveEdit = (overrideWarning = false) => {
    const payload: UpdateTeacherPayload = {};

    if (teacher.role === 'school_teacher') {
      payload.standards = editStandards;
    } else {
      payload.assignedClass = editClassId || null;
      payload.assignedClassName = editClassName;
    }

    if (!overrideWarning) {
      let conflictTeacherName = '';
      let conflictItem = '';

      if (teacher.role === 'school_teacher') {
        for (const std of editStandards) {
          const other = allTeachers.find(
            (t) => t._id !== teacher._id && t.role === 'school_teacher' && t.standards?.includes(std)
          );
          if (other) {
            conflictTeacherName = formatTeacherName(other.name);
            conflictItem = std;
            break;
          }
        }
      } else {
        if (editClassName) {
          const other = allTeachers.find(
            (t) => t._id !== teacher._id && t.role === 'Teacher' && t.assignedClassName === editClassName
          );
          if (other) {
            conflictTeacherName = formatTeacherName(other.name);
            conflictItem = editClassName;
          }
        }
      }

      if (conflictTeacherName) {
        setSharedWarning({
          message: `Note: ${conflictItem} is already assigned to ${conflictTeacherName}. Do you want to assign it to ${displayName} as well?`,
          payload,
        });
        return;
      }
    }

    updateTeacherMutation.mutate(payload);
  };

  const isMutating =
    terminateMutation.isPending ||
    deleteMutation.isPending ||
    updateTeacherMutation.isPending ||
    createClassMutation.isPending;

  // ── Role-specific info ─────────────────────────────────────────────────────
  const roleLabel = teacher.role === 'school_teacher' ? 'School Teacher' : 'Madrasa Teacher';
  const roleAssignment = teacher.role === 'school_teacher'
    ? (teacher.standards?.length ? teacher.standards.join(', ') : 'No standards assigned')
    : (teacher.assignedClassName || 'No class assigned');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden ${
          darkMode ? 'bg-gray-900 text-white border border-gray-800' : 'bg-white text-gray-900'
        }`}
      >
        {/* Toast */}
        {toastMessage && (
          <div
            className={`absolute top-4 left-1/2 z-[60] -translate-x-1/2 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
              toastMessage.type === 'error' ? 'bg-red-700' : 'bg-gray-900'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-300" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-5 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-bold ${
                darkMode ? 'bg-gray-800 text-madrasa-400' : 'bg-madrasa-100 text-madrasa-700'
              }`}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className={`text-lg font-bold leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {displayName}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                  teacher.role === 'school_teacher'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                }`}>
                  {teacher.role === 'school_teacher' ? <GraduationCap className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                  {roleLabel}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                  isTerminated
                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                }`}>
                  {isTerminated ? 'Terminated' : 'Active'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Assignment Sub-Bar with Edit Button */}
        <div className={`px-5 py-3 border-b text-xs flex items-center justify-between gap-2 shrink-0 ${
          darkMode ? 'bg-gray-800/40 border-gray-800 text-gray-300' : 'bg-gray-50/50 border-gray-100 text-gray-600'
        }`}>
          <div className="truncate">
            <span className="font-bold">
              {teacher.role === 'school_teacher' ? 'Assigned Standards: ' : 'Assigned Class: '}
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">{roleAssignment}</span>
            <span className="mx-2">•</span>
            <span className="font-bold">{teacher.studentCount}</span> student{teacher.studentCount !== 1 ? 's' : ''}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditing(!isEditing);
              setSharedWarning(null);
            }}
            className="flex items-center gap-1 shrink-0 rounded-xl bg-madrasa-700 hover:bg-madrasa-800 text-white px-2.5 py-1.5 text-[11px] font-bold shadow-xs transition active:scale-95"
          >
            <Pencil className="h-3 w-3" />
            <span>{isEditing ? 'View Students' : 'Edit Assignment'}</span>
          </button>
        </div>

        {/* Content Body: Edit Form vs Assigned Student List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isEditing ? (
            /* ── EDIT FORM MODE ── */
            <div className="p-5 flex flex-col gap-4">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Update Teacher Assignment
              </h4>

              {teacher.role === 'school_teacher' ? (
                /* School Teacher: Multi-Select Standards */
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                      Select Assigned Standards
                    </label>
                    <span className="text-[10px] font-semibold text-madrasa-700 dark:text-madrasa-400">
                      {editStandards.length} selected
                    </span>
                  </div>
                  <div className={`p-3 rounded-2xl border max-h-56 overflow-y-auto grid grid-cols-2 gap-2 text-xs ${
                    darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50/70 border-gray-200'
                  }`}>
                    {STANDARDS.map((std) => {
                      const isSelected = editStandards.includes(std);
                      return (
                        <label
                          key={std}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition cursor-pointer select-none ${
                            isSelected
                              ? 'bg-madrasa-700 text-white border-madrasa-700 font-bold shadow-xs'
                              : darkMode
                              ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setEditStandards(editStandards.filter((s) => s !== std));
                              } else {
                                setEditStandards([...editStandards, std]);
                              }
                            }}
                            className="sr-only"
                          />
                          <div className={`h-4 w-4 rounded-md border flex items-center justify-center transition ${
                            isSelected ? 'bg-white text-madrasa-700 border-white' : 'border-gray-400'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{std}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Madrasa Teacher: Class Dropdown + Inline Class Creation */
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                      Select Assigned Class
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewClassInput(!showNewClassInput)}
                      className="flex items-center gap-1 text-[11px] font-bold text-madrasa-700 dark:text-madrasa-400 hover:underline"
                    >
                      <Plus className="h-3 w-3" />
                      {showNewClassInput ? 'Select Existing Class' : 'Create New Class'}
                    </button>
                  </div>

                  {showNewClassInput ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder="e.g. Class 1A, Grade 5"
                        className={`flex-1 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all outline-none ${
                          darkMode
                            ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500'
                            : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500'
                        }`}
                      />
                      <button
                        type="button"
                        disabled={createClassMutation.isPending || !newClassName.trim()}
                        onClick={() => createClassMutation.mutate({ name: newClassName.trim() })}
                        className="flex items-center gap-1.5 rounded-xl bg-madrasa-700 hover:bg-madrasa-800 text-white px-3.5 py-2 text-xs font-bold transition shadow-xs disabled:opacity-50"
                      >
                        {createClassMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Create
                      </button>
                    </div>
                  ) : (
                    <select
                      value={editClassId}
                      onChange={(e) => {
                        const clsId = e.target.value;
                        setEditClassId(clsId);
                        const matched = classes.find((c) => c._id === clsId);
                        setEditClassName(matched ? matched.name : '');
                      }}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all outline-none shadow-xs ${
                        darkMode
                          ? 'bg-gray-800 border-gray-700 text-white hover:border-gray-600 focus:border-emerald-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:border-emerald-500'
                      }`}
                    >
                      <option value="">-- Unassigned (No Class) --</option>
                      {classes.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── VIEW STUDENTS TABLE MODE ── */
            <>
              {isLoading && (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Loading students…</span>
                </div>
              )}

              {isError && (
                <div className="flex flex-col items-center gap-2 py-12 px-5 text-center">
                  <AlertCircle className="h-7 w-7 text-red-400" />
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {error instanceof Error ? error.message : 'Failed to load students'}
                  </p>
                </div>
              )}

              {!isLoading && !isError && students.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-12 px-5 text-center">
                  <Users className={`h-8 w-8 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No students assigned to this teacher.
                  </p>
                </div>
              )}

              {!isLoading && !isError && students.length > 0 && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  <div className={`sticky top-0 z-10 grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider ${
                    darkMode ? 'bg-gray-900 text-gray-500 border-b border-gray-800' : 'bg-white text-gray-400 border-b border-gray-100'
                  }`}>
                    <div className="col-span-4">Student</div>
                    <div className="col-span-2">Roll No</div>
                    <div className="col-span-3">Standard</div>
                    <div className="col-span-3">Status</div>
                  </div>
                  {students.map((s) => (
                    <div
                      key={s._id}
                      className={`grid grid-cols-12 gap-2 px-5 py-3 text-xs items-center transition ${
                        darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="col-span-4">
                        <p className={`font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.name}</p>
                        {s.parentUsername && s.parentUsername !== '—' && (
                          <p className="text-[10px] text-gray-400 truncate">Parent: {s.parentUsername}</p>
                        )}
                      </div>
                      <div className={`col-span-2 font-mono font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {s.rollNumber}
                      </div>
                      <div className={`col-span-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {s.standard || s.className || '—'}
                      </div>
                      <div className="col-span-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          s.status === 'Discontinued'
                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        }`}>
                          {s.status || 'Active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className={`border-t p-5 flex items-center gap-3 shrink-0 ${
          darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'
        }`}>
          {isEditing ? (
            /* Edit Mode Action Footer */
            <div className="flex items-center justify-end gap-2.5 w-full">
              <button
                type="button"
                disabled={isMutating}
                onClick={() => {
                  setIsEditing(false);
                  setSharedWarning(null);
                }}
                className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                  darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={() => handleSaveEdit(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-madrasa-700 hover:bg-madrasa-800 text-white font-bold px-5 py-2.5 text-xs shadow-md active:scale-[0.98] transition disabled:opacity-50"
              >
                {updateTeacherMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          ) : (
            /* Normal Mode Action Footer */
            <>
              {!confirmAction && (
                <>
                  {!isTerminated && (
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => setConfirmAction('terminate')}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 px-4 py-2.5 text-xs font-bold transition shadow-xs disabled:opacity-50"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Terminate
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => setConfirmAction('delete')}
                    className="flex items-center gap-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 border border-red-200/80 dark:border-red-800/60 px-4 py-2.5 text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Permanently
                  </button>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={onClose}
                    className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                      darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Close
                  </button>
                </>
              )}

              {/* Terminate Confirmation */}
              {confirmAction === 'terminate' && (
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Terminate {displayName}?
                      </p>
                      <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        This will deactivate the teacher account. Students will remain assigned but the teacher won&apos;t be able to log in.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 justify-end">
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => setConfirmAction(null)}
                      className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                        darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={handleTerminate}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 text-xs shadow-md transition active:scale-95 disabled:opacity-50"
                    >
                      {terminateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Confirm Terminate
                    </button>
                  </div>
                </div>
              )}

              {/* Delete Confirmation — requires typing teacher name */}
              {confirmAction === 'delete' && (
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-start gap-2.5">
                    <Trash2 className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Permanently delete {displayName}?
                      </p>
                      <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        This action is irreversible. All assigned students will be reassigned to Admin. Type the teacher&apos;s username to confirm.
                      </p>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={`Type "${teacher.name}" to confirm`}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all outline-none ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10'
                    }`}
                  />
                  <div className="flex items-center gap-2.5 justify-end">
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => { setConfirmAction(null); setDeleteConfirmName(''); }}
                      className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                        darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={
                        isMutating ||
                        deleteConfirmName.toLowerCase().trim() !== teacher.name.toLowerCase().trim()
                      }
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 text-xs shadow-md transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Delete Forever
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Shared Assignment Warning Modal Dialog */}
      {sharedWarning && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 ${
              darkMode ? 'bg-gray-900 text-white border border-gray-800' : 'bg-white text-gray-900'
            }`}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Shared Assignment Warning</h3>
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                  Another teacher is already assigned to this selection.
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300 bg-amber-50/80 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 mb-5">
              {sharedWarning.message}
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSharedWarning(null)}
                className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                  darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateTeacherMutation.isPending}
                onClick={() => handleSaveEdit(true)}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 text-xs shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {updateTeacherMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Yes, Assign Shared
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
