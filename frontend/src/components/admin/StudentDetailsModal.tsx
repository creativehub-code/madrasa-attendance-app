import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Trash2, Loader2, AlertCircle, Check, Ban, BookOpen, Layers, RotateCcw } from 'lucide-react';
import { useAdminTheme } from '@/context/AdminThemeContext';
import {
  type AdminStudent,
  type AdminTeacher,
  type ClassItem,
  fetchAdminStudentProgress,
  fetchClasses,
  fetchSections,
  updateAdminStudent,
  deleteAdminStudent,
} from '@/lib/api';
import { STANDARDS } from '@/types';

interface StudentDetailsModalProps {
  student: AdminStudent;
  onClose: () => void;
  teachers: AdminTeacher[];
  classes?: ClassItem[];
  sections?: string[];
  onSuccess?: () => void;
}

export default function StudentDetailsModal({ student, onClose, teachers, classes: passedClasses, sections: passedSections, onSuccess }: StudentDetailsModalProps) {
  const { darkMode } = useAdminTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'details' | 'progress' | 'danger'>('details');

  // Queries
  const { data: fetchedClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetchClasses();
      return res.data.classes;
    },
    enabled: !passedClasses || passedClasses.length === 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: fetchedSections } = useQuery({
    queryKey: ['adminSections'],
    queryFn: async () => {
      const res = await fetchSections();
      return res.data.sections;
    },
    enabled: !passedSections || passedSections.length === 0,
    staleTime: 5 * 60 * 1000,
  });

  const availableClasses = passedClasses && passedClasses.length > 0 ? passedClasses : (fetchedClasses || []);

  const defaultSections = ['Noorani Qaida', 'Hifz', 'Daura'];
  const availableSections = React.useMemo(() => {
    const list = passedSections && passedSections.length > 0 ? passedSections : (fetchedSections || []);
    return Array.from(new Set([...defaultSections, ...list]));
  }, [passedSections, fetchedSections]);

  const initialStudentSection = student.section || 'Noorani Qaida';
  const isCustomSection = !defaultSections.includes(initialStudentSection) && !availableSections.includes(initialStudentSection);

  const [section, setSection] = useState<string>(isCustomSection ? 'Other' : initialStudentSection);
  const [customSection, setCustomSection] = useState<string>(isCustomSection ? initialStudentSection : '');

  // Form State
  const [name, setName] = useState(student.name);
  const [standard, setStandard] = useState(student.standard || '1st Standard');
  const [status, setStatus] = useState<string>(student.status || 'Active');

  const getInitialTeacherId = () => {
    if (typeof student.teacherId === 'object' && student.teacherId !== null) return (student.teacherId as any)._id;
    if (student.teacherId) return String(student.teacherId);
    if (student.teacherUsername && teachers.length > 0) {
      const match = teachers.find(
        (t) =>
          t._id === (student as any).teacherId ||
          t.username === student.teacherUsername ||
          t.name === student.teacherUsername
      );
      if (match) return match._id;
    }
    return '';
  };

  const [teacherId, setTeacherId] = useState<string>(getInitialTeacherId);

  const getInitialClassId = () => {
    if (typeof student.classId === 'object' && student.classId !== null) return student.classId._id;
    if (student.classId) return String(student.classId);
    if (student.className && availableClasses.length > 0) {
      const match = availableClasses.find((c) => c.name === student.className);
      if (match) return match._id;
    }
    return '';
  };

  const [classId, setClassId] = useState<string>(getInitialClassId);

  useEffect(() => {
    if (!classId && student.className && availableClasses.length > 0) {
      const match = availableClasses.find((c) => c.name === student.className);
      if (match) setClassId(match._id);
    }
  }, [availableClasses, student.className, classId]);

  useEffect(() => {
    if (!teacherId && teachers.length > 0) {
      const init = getInitialTeacherId();
      if (init) setTeacherId(init);
    }
  }, [teachers, student]);

  // Danger state
  const [confirmName, setConfirmName] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Queries
  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['adminStudentProgress', student._id],
    queryFn: async () => {
      const res = await fetchAdminStudentProgress(student._id);
      return res.data;
    },
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async () => {
      const finalSection =
        section === 'Other'
          ? customSection.trim().slice(0, 50).replace(/[<>]/g, '')
          : section;

      return await updateAdminStudent(student._id, {
        name,
        standard,
        section: finalSection || 'Noorani Qaida',
        teacherId,
        status,
        classId: classId || null,
      });
    },
    onSuccess: () => {
      showToast('Student updated successfully');
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] });
      queryClient.invalidateQueries({ queryKey: ['adminClasses'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['teacherStudents'] });
      queryClient.invalidateQueries({ queryKey: ['teacherClassSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminSections'] });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (err: any) => showToast(err.message || 'Failed to update', 'error'),
  });

  const toggleDiscontinueMutation = useMutation({
    mutationFn: async (nextStatus: 'Discontinued' | 'Active') => {
      return await updateAdminStudent(student._id, { status: nextStatus });
    },
    onSuccess: (_, nextStatus) => {
      setStatus(nextStatus);
      showToast(`Student status changed to ${nextStatus}`);
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminParents'] });
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacherStudents'] });
      queryClient.invalidateQueries({ queryKey: ['teacherClassSummary'] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to update status', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => await deleteAdminStudent(student._id),
    onSuccess: () => {
      showToast('Student deleted');
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminParents'] });
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacherStudents'] });
      queryClient.invalidateQueries({ queryKey: ['teacherClassSummary'] });
      queryClient.invalidateQueries({ queryKey: ['adminSections'] });
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(onClose, 1000);
    },
    onError: (err: any) => showToast(err.message || 'Failed to delete', 'error'),
  });

  const currentStatus = status || student.status || 'Active';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in overflow-hidden">
      <div className={`w-[92%] max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden ${
        darkMode ? 'bg-gray-900 border border-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold truncate max-w-[180px] sm:max-w-xs">{student.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-gray-500">{student.rollNumber}</span>
              {currentStatus === 'Discontinued' && (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-[10px] font-bold rounded-full border border-amber-300 dark:border-amber-700">
                  Discontinued
                </span>
              )}
              {currentStatus === 'Active' && (
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-300 dark:border-emerald-700">
                  Active
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-4 sm:px-5 shrink-0 overflow-x-auto">
          {['details', 'progress', 'danger'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3.5 sm:px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition ${
                activeTab === tab
                  ? 'border-madrasa-600 text-madrasa-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto min-h-0">
          {/* Toast Notification */}
          {toastMessage && (
            <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${
              toastMessage.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
            }`}>
              {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              {toastMessage.text}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Quick Status Toggle Bar */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                currentStatus === 'Discontinued' 
                  ? 'border-amber-200 bg-amber-50/70 dark:border-amber-800/60 dark:bg-amber-950/40'
                  : 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/60 dark:bg-emerald-950/40'
              }`}>
                <div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Account Status</p>
                  <p className="text-xs font-extrabold mt-0.5 capitalize">
                    {currentStatus}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={toggleDiscontinueMutation.isPending}
                  onClick={() => {
                    const next = currentStatus === 'Discontinued' ? 'Active' : 'Discontinued';
                    toggleDiscontinueMutation.mutate(next);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 border ${
                    currentStatus === 'Discontinued'
                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                  }`}
                >
                  {toggleDiscontinueMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {currentStatus === 'Discontinued' ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Set to Active
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" /> Discontinue Student
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                  Student Name <span className="text-emerald-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                    darkMode
                      ? 'bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                      : 'bg-gray-50/70 border-gray-200 text-gray-900 placeholder:text-gray-400 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Class
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => {
                      const newClassId = e.target.value;
                      setClassId(newClassId);
                      if (newClassId) {
                        const selectedClass = availableClasses.find(c => c._id === newClassId);
                        if (selectedClass && selectedClass.teacher) {
                          setTeacherId(selectedClass.teacher._id);
                        } else {
                          setTeacherId('');
                        }
                      } else {
                        setTeacherId('');
                      }
                    }}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  >
                    <option value="">Unassigned Class</option>
                    {availableClasses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Standard <span className="text-emerald-500 font-bold ml-0.5">*</span>
                  </label>
                  <select
                    value={standard}
                    onChange={(e) => setStandard(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  >
                    {STANDARDS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Section <span className="text-emerald-500 font-bold ml-0.5">*</span>
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  >
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                    <option value="Other">Other (Custom Section)</option>
                  </select>
                </div>
                {section === 'Other' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                      Custom Section <span className="text-emerald-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={50}
                      value={customSection}
                      onChange={(e) => setCustomSection(e.target.value.slice(0, 50).replace(/[<>]/g, ''))}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Assigned Teacher
                  </label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>{t.name || t.username}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Status <span className="text-emerald-500 font-bold ml-0.5">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  >
                    <option value="Active">Active</option>
                    <option value="Discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Student Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="space-y-4">
              {progressLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : progressData ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {/* New Lesson Progress */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50/60 border-blue-100'}`}>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>New Lesson</span>
                      </div>
                      <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">
                        {progressData.recentPuthiyaPadamLines ?? progressData.totalPuthiyaPadam ?? 0}{' '}
                        <span className="text-xs font-normal text-gray-500">lines</span>
                      </p>
                      {Boolean(progressData.historicalPuthiyaPadamPages && progressData.historicalPuthiyaPadamPages > 0) && (
                        <p className="text-[11px] font-semibold text-gray-400 mt-1">
                          + {progressData.historicalPuthiyaPadamPages} pages <span className="font-normal text-[10px]">(Historical)</span>
                        </p>
                      )}
                    </div>

                    {/* Old Lesson Progress */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-emerald-50/60 border-emerald-100'}`}>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Old Lesson</span>
                      </div>
                      <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">
                        {progressData.totalPazhayaPadam || 0} <span className="text-xs font-normal text-gray-500">portion</span>
                      </p>
                    </div>

                    {/* Juzu Lesson Progress */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-purple-50/60 border-purple-100'}`}>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Juzu Lesson</span>
                      </div>
                      <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">
                        {progressData.totalJuzuPadam || 0} <span className="text-xs font-normal text-gray-500">portion</span>
                      </p>
                    </div>

                    {/* Total Juzu Completed */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-amber-50/60 border-amber-100'}`}>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>Current Juzu</span>
                      </div>
                      <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">
                        Juzu {progressData.currentJuzu || 1}
                      </p>
                    </div>
                  </div>

                  {progressData.recentActivity && progressData.recentActivity.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Recent Activity</h4>
                      <div className="space-y-2">
                        {progressData.recentActivity.map((act: any, i: number) => (
                          <div key={i} className={`p-3 rounded-xl text-xs flex justify-between items-center ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {new Date(act.date).toLocaleDateString()}
                            </span>
                            <span className="text-gray-500">
                              Current {act.juzuNumber} • New {act.puthiyaPadam} {act.unit || 'lines'} • Old {act.pazhayaPadam}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-sm text-gray-500 py-6">No progress data available.</p>
              )}
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-4">
              {/* Discontinue Toggle */}
              <div className={`p-4 rounded-2xl border ${darkMode ? 'border-amber-900/50 bg-amber-950/20' : 'border-amber-100 bg-amber-50'}`}>
                <h4 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Ban className="w-4 h-4" /> Discontinue Student
                </h4>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1 mb-3">
                  Discontinuing locks all data entry for this student across teacher screens. You can revert them to Active anytime.
                </p>
                <button
                  onClick={() => {
                    const next = currentStatus === 'Discontinued' ? 'Active' : 'Discontinued';
                    toggleDiscontinueMutation.mutate(next);
                  }}
                  disabled={toggleDiscontinueMutation.isPending}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2 text-white ${
                    currentStatus === 'Discontinued' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {toggleDiscontinueMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {currentStatus === 'Discontinued' ? 'Reactivate Student (Set Active)' : 'Mark as Discontinued'}
                </button>
              </div>

              {/* Delete */}
              <div className={`p-4 rounded-2xl border ${darkMode ? 'border-red-900/50 bg-red-900/20' : 'border-red-100 bg-red-50'}`}>
                <h4 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete Student
                </h4>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1 mb-3">
                  This action removes the student from all views. Type <strong>{student.name}</strong> to confirm.
                </p>
                <input
                  type="text"
                  placeholder="Type student name to confirm"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className={`w-full rounded-xl border p-2 mb-3 text-sm outline-none ${
                    darkMode ? 'bg-gray-800 border-red-900/50' : 'bg-white border-red-200 focus:border-red-500'
                  }`}
                />
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending || confirmName !== student.name}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Delete Permanently
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
