'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  UserCheck,
  Activity as ActivityIcon,
  Clock,
  Plus,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Users,
  Loader2,
  ShieldCheck,
  Unlock,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { useAdminTheme } from '@/context/AdminThemeContext';
import {
  fetchAdminTeachers,
  fetchAdminRecentActivities,
  fetchAdminReports,
  updateReportAction,
  deleteReport,
  createTeacher,
  unlockTeacherProgress,
  formatTeacherName,
  type AdminTeacher,
  type AdminStats,
  type CreateTeacherResult,
  type IssueReport,
} from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'teachers' | 'activities' | 'reports';

// ── Skeletons ──────────────────────────────────────────────────────────────────

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div className="h-9 w-9 rounded-full bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded-full bg-gray-100" />
            <div className="h-2.5 w-3/5 rounded-full bg-gray-100" />
          </div>
          <div className="h-2.5 w-10 rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function ActivitySkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3.5 px-4 py-3.5">
          <div className="mt-0.5 h-8 w-8 rounded-full bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-3 w-4/5 rounded-full bg-gray-100" />
            <div className="h-2.5 w-1/4 rounded-full bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2.5 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-28 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="h-3 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="h-3.5 w-3/4 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="h-3 w-1/2 rounded-full bg-gray-200 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminTeachersPage() {
  const { darkMode } = useAdminTheme();
  const queryClient = useQueryClient();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [reportsPage, setReportsPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add teacher form
  const [teacherFullName, setTeacherFullName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherRole, setTeacherRole] = useState<'Teacher' | 'school_teacher'>('Teacher');
  const [formError, setFormError] = useState<string | null>(null);
  const [createdTeacher, setCreatedTeacher] = useState<CreateTeacherResult | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const {
    data: teachersData,
    isLoading: isLoadingTeachers,
    isFetching: isFetchingTeachers,
    isError: isTeachersError,
    error: teachersErrorObj,
  } = useQuery({
    queryKey: ['adminTeachers'],
    queryFn: async () => {
      const res = await fetchAdminTeachers();
      return res.data.teachers;
    },
    staleTime: 5 * 60 * 1000,
  });
  const teachers = teachersData || [];
  const teachersError = isTeachersError
    ? teachersErrorObj instanceof Error
      ? teachersErrorObj.message
      : 'Failed to load teachers'
    : null;

  const unlockMutation = useMutation({
    mutationFn: unlockTeacherProgress,
    onSuccess: (res) => {
      alert(res.message || 'Daily submission unlocked successfully!');
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] });
      queryClient.invalidateQueries({ queryKey: ['adminRecentActivities'] });
      queryClient.invalidateQueries({ queryKey: ['teacherSubmissionStatus'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to unlock submission';
      alert(msg);
    },
  });

  // Activities Query (exclusively teacher activities)
  const {
    data: activityData,
    isLoading: isLoadingActivity,
    isFetching: isFetchingActivity,
    isError: isActivityError,
    error: activityErrorObj,
  } = useQuery({
    queryKey: ['adminRecentActivities', 'teachers'],
    queryFn: async () => {
      const res = await fetchAdminRecentActivities({ role: 'teachers' });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const recentActivity = (activityData?.activities || []).filter(
    (a) => !a.performedBy?.role || a.performedBy.role === 'Teacher' || a.performedBy.role === 'school_teacher'
  );

  const activityError = isActivityError
    ? activityErrorObj instanceof Error
      ? activityErrorObj.message
      : 'Failed to load activity'
    : null;

  // Reports Query — ON-DEMAND FETCHING (Lazy Loaded)
  const {
    data: reportsResponse,
    isLoading: isLoadingReports,
    isFetching: isFetchingReports,
    isError: isReportsError,
    error: reportsErrorObj,
  } = useQuery({
    queryKey: ['adminReports', reportsPage],
    queryFn: async () => {
      const res = await fetchAdminReports(reportsPage, 5);
      return res.data;
    },
    enabled: filterType === 'reports', // ON-DEMAND FETCHING!
    staleTime: 2 * 60 * 1000,
  });

  const reports = reportsResponse?.reports || [];
  const reportsPagination = reportsResponse?.pagination || { currentPage: 1, totalPages: 1, totalReports: 0 };
  const reportsError = isReportsError
    ? reportsErrorObj instanceof Error
      ? reportsErrorObj.message
      : 'Failed to load reports'
    : null;

  // Delete Report Confirmation modal state
  const [reportToDelete, setReportToDelete] = useState<IssueReport | null>(null);

  // ── Report Action Mutations ──────────────────────────────────────────────────
  const reportActionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'Agreed' | 'Rejected' }) =>
      updateReportAction(id, action),
    onSuccess: (res, variables) => {
      showNotification(res.message || `Report marked as ${variables.action}`);
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      queryClient.invalidateQueries({ queryKey: ['adminRecentActivities'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to process report action';
      showNotification(msg, 'error');
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: () => {
      setReportToDelete(null);
      showNotification('Report deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to delete report';
      showNotification(msg, 'error');
    },
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const resetForm = () => {
    setTeacherFullName('');
    setTeacherEmail('');
    setTeacherPassword('');
    setTeacherRole('Teacher');
    setFormError(null);
    setCreatedTeacher(null);
  };

  // ── Mutation ────────────────────────────────────────────────────────────────
  const createTeacherMutation = useMutation({
    mutationFn: createTeacher,
    onSuccess: (res) => {
      console.log('[Teachers page] createTeacher response:', res.data);
      setCreatedTeacher(res.data);
      showNotification(`Account "${res.data.teacher.username}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to create teacher account';
      console.error('[Teachers page] createTeacher error:', err);
      setFormError(message);
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createTeacherMutation.mutate({
      username: teacherEmail,
      password: teacherPassword,
      fullName: teacherFullName,
      role: teacherRole,
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['adminTeachers'] });
    queryClient.invalidateQueries({ queryKey: ['adminRecentActivities'] });
    queryClient.invalidateQueries({ queryKey: ['adminReports'] });
  };

  // Helper function to format issue type badges
  const getIssueBadgeStyle = (issueType: string) => {
    switch (issueType) {
      case 'Academic Struggle':
        return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900';
      case 'Frequent Absence':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900';
      case 'Behavioral':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const getStatusBadgeStyle = (status?: string) => {
    switch (status) {
      case 'Agreed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'Rejected':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen px-4 pb-32 pt-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'error' ? 'bg-red-700' : 'bg-gray-900'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-red-300" />
          ) : (
            <Check className="h-4 w-4 text-emerald-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="mb-5 flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Teachers &amp; Activity
          </h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {isLoadingTeachers ? (
              <span className="inline-block h-3.5 w-48 animate-pulse rounded-full bg-gray-200" />
            ) : teachersError ? (
              'Unable to load teacher count'
            ) : (
              `${teachers.length} faculty member${teachers.length !== 1 ? 's' : ''} on staff`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshAll}
            title="Refresh"
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isLoadingTeachers ||
                isLoadingActivity ||
                isFetchingTeachers ||
                isFetchingActivity ||
                isFetchingReports
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-madrasa-700 text-white ring-4 ring-madrasa-100 shadow-md hover:bg-madrasa-800 transition active:scale-95"
            title="Create New Teacher"
          >
            <UserCheck className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Filter Segment (4 tabs: all, teachers, activities, reports) */}
      <div
        className={`mb-5 flex gap-1 rounded-3xl border p-1.5 shadow-sm transition ${
          darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
        }`}
      >
        {(['all', 'teachers', 'activities', 'reports'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterType(tab)}
            className={`flex-1 rounded-2xl py-2 text-xs font-semibold capitalize transition ${
              filterType === tab
                ? 'bg-madrasa-700 text-white shadow'
                : darkMode
                ? 'text-gray-400 hover:bg-gray-800'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Teachers Section ── */}
      {(filterType === 'all' || filterType === 'teachers') && (
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Faculty List
            </h2>
            {!isLoadingTeachers && !teachersError && (
              <span className="text-xs font-semibold text-madrasa-700 dark:text-madrasa-400">
                {teachers.length} Teacher{teachers.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Error */}
          {teachersError && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-5 text-center">
              <AlertCircle className="h-7 w-7 text-red-400" />
              <div>
                <p className="font-semibold text-red-800 text-sm">Failed to load teachers</p>
                <p className="mt-0.5 text-xs text-red-600">{teachersError}</p>
              </div>
              <button
                type="button"
                onClick={handleRefreshAll}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow transition hover:bg-red-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* Loading */}
          {isLoadingTeachers && !teachersError && <ListSkeleton rows={4} />}

          {/* Empty */}
          {!isLoadingTeachers && !teachersError && teachers.length === 0 && (
            <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No teachers found in the database.</p>
            </div>
          )}

          {/* Data */}
          {!isLoadingTeachers && !teachersError && teachers.length > 0 && (
            <div
              className={`rounded-3xl border shadow-sm overflow-hidden transition ${
                darkMode ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900'
              }`}
            >
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {teachers.map((teacher) => {
                  const displayName = formatTeacherName(teacher.name);
                  return (
                    <div
                      key={String(teacher._id)}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            darkMode ? 'bg-gray-800 text-madrasa-400' : 'bg-madrasa-100 text-madrasa-700'
                          }`}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {displayName}
                          </h3>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {teacher.className || 'No class assigned'} &bull;{' '}
                            {teacher.studentCount} student{teacher.studentCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {teacher.isSubmittedToday ? (
                          <>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              Submitted Today
                            </span>
                            <button
                              type="button"
                              disabled={unlockMutation.isPending}
                              onClick={() => {
                                if (confirm(`Unlock today's submission for ${displayName}? This will allow the teacher to resubmit.`)) {
                                  unlockMutation.mutate(teacher._id);
                                }
                              }}
                              className="flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-60"
                              title="Reset / Unlock teacher's submission for today"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              <span>Unlock</span>
                            </button>
                          </>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Activity Log Section (Exclusively Teacher Roles) ── */}
      {(filterType === 'all' || filterType === 'activities') && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Teacher Activity Feed
            </h2>
            <ActivityIcon className="h-4 w-4 text-madrasa-600" />
          </div>

          {/* Error */}
          {activityError && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-5 text-center">
              <AlertCircle className="h-7 w-7 text-red-400" />
              <div>
                <p className="font-semibold text-red-800 text-sm">Failed to load activity</p>
                <p className="mt-0.5 text-xs text-red-600">{activityError}</p>
              </div>
              <button
                type="button"
                onClick={handleRefreshAll}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow transition hover:bg-red-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* Loading */}
          {isLoadingActivity && !activityError && <ActivitySkeleton rows={5} />}

          {/* Empty */}
          {!isLoadingActivity && !activityError && recentActivity.length === 0 && (
            <div
              className={`rounded-3xl border p-8 text-center ${
                darkMode ? 'border-gray-800 bg-gray-900' : 'border-dashed border-gray-200 bg-white'
              }`}
            >
              <Clock className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No teacher activities recorded yet today.
              </p>
            </div>
          )}

          {/* Data */}
          {!isLoadingActivity && !activityError && recentActivity.length > 0 && (
            <div
              className={`rounded-3xl border shadow-sm overflow-hidden transition ${
                darkMode ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900'
              }`}
            >
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentActivity.map((a) => (
                  <div
                    key={String(a._id)}
                    className="flex items-start gap-3.5 px-4 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition"
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        darkMode ? 'bg-gray-800 text-madrasa-400' : 'bg-madrasa-100 text-madrasa-700'
                      }`}
                    >
                      {a.performedBy?.username ? a.performedBy.username.charAt(0).toUpperCase() : 'T'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {a.performedBy?.username || 'Teacher'}
                        </span>{' '}
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                          {a.message}
                        </span>
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(a.createdAt).toLocaleString()}</span>
                        {a.performedBy?.role && (
                          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                            {a.performedBy.role === 'school_teacher' ? 'School Teacher' : 'Teacher'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Reports Section (FilterType === 'reports', Lazy Loaded) ── */}
      {filterType === 'reports' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Teacher Reports &amp; Issue Notices
            </h2>
            {!isLoadingReports && !reportsError && (
              <span className="text-xs font-semibold text-madrasa-700 dark:text-madrasa-400">
                {reportsPagination.totalReports} Report{reportsPagination.totalReports !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Error */}
          {reportsError && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-5 text-center">
              <AlertCircle className="h-7 w-7 text-red-400" />
              <div>
                <p className="font-semibold text-red-800 text-sm">Failed to load reports</p>
                <p className="mt-0.5 text-xs text-red-600">{reportsError}</p>
              </div>
              <button
                type="button"
                onClick={handleRefreshAll}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white shadow transition hover:bg-red-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton / Spinner (Lazy On-Demand Fetch Feedback) */}
          {(isLoadingReports || isFetchingReports) && !reportsError && <ReportSkeleton rows={4} />}

          {/* Empty State */}
          {!isLoadingReports && !isFetchingReports && !reportsError && reports.length === 0 && (
            <div
              className={`rounded-3xl border p-8 text-center ${
                darkMode ? 'border-gray-800 bg-gray-900' : 'border-dashed border-gray-200 bg-white'
              }`}
            >
              <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No reports or notices submitted by teachers yet.
              </p>
            </div>
          )}

          {/* Reports List Data */}
          {!isLoadingReports && !isFetchingReports && !reportsError && reports.length > 0 && (
            <div
              className={`rounded-3xl border shadow-sm overflow-hidden transition ${
                darkMode ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900'
              }`}
            >
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {reports.map((report) => {
                  const senderName = report.teacherId?.username || 'Teacher';
                  const studentName = report.studentId?.name || 'Unknown Student';
                  const className = report.studentId?.className || '';
                  return (
                    <div
                      key={String(report._id)}
                      className="flex flex-col gap-2.5 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition"
                    >
                      {/* Top row: Sender & Timestamp */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {senderName}
                          </span>
                          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                            {report.teacherId?.role === 'school_teacher' ? 'School Teacher' : 'Teacher'}
                          </span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getIssueBadgeStyle(report.issueType)}`}>
                            {report.issueType}
                          </span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadgeStyle(report.status)}`}>
                            {report.status || 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(report.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Middle row: Student & Class info */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          Student: {studentName}
                        </span>
                        {className && <span>&bull; Class: {className}</span>}
                        <span>&bull; Sent to: <strong className="text-gray-700 dark:text-gray-300">{report.recipient}</strong></span>
                      </div>

                      {/* Content preview / Notes */}
                      {report.notes && (
                        <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'} bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-750`}>
                          {report.notes}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-2 flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                        <button
                          type="button"
                          disabled={reportActionMutation.isPending || deleteReportMutation.isPending}
                          onClick={() => reportActionMutation.mutate({ id: report._id, action: 'Agreed' })}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                            report.status === 'Agreed'
                              ? 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                          }`}
                        >
                          {reportActionMutation.isPending &&
                          reportActionMutation.variables?.id === report._id &&
                          reportActionMutation.variables?.action === 'Agreed' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          <span>{report.status === 'Agreed' ? 'Agreed' : 'Agree'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={reportActionMutation.isPending || deleteReportMutation.isPending}
                          onClick={() => reportActionMutation.mutate({ id: report._id, action: 'Rejected' })}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                            report.status === 'Rejected'
                              ? 'bg-amber-600 text-white shadow-amber-600/20 hover:bg-amber-700'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                          }`}
                        >
                          {reportActionMutation.isPending &&
                          reportActionMutation.variables?.id === report._id &&
                          reportActionMutation.variables?.action === 'Rejected' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          <span>{report.status === 'Rejected' ? 'Rejected' : 'Reject'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={reportActionMutation.isPending || deleteReportMutation.isPending}
                          onClick={() => setReportToDelete(report)}
                          className="flex items-center gap-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 border border-red-200/80 dark:border-red-800/60 px-3 py-1.5 text-xs font-bold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ultra-Minimal Pagination Controls */}
              {reportsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-5 py-3 text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Page {reportsPagination.currentPage} of {reportsPagination.totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={reportsPage <= 1 || isFetchingReports}
                      onClick={() => setReportsPage((p) => Math.max(1, p - 1))}
                      className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 font-semibold text-gray-700 dark:text-gray-300 shadow-xs transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Previous</span>
                    </button>
                    <button
                      type="button"
                      disabled={reportsPage >= reportsPagination.totalPages || isFetchingReports}
                      onClick={() => setReportsPage((p) => p + 1)}
                      className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 font-semibold text-gray-700 dark:text-gray-300 shadow-xs transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Add Teacher Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden ${
              darkMode ? 'bg-gray-900 text-white border border-gray-800' : 'bg-white text-gray-900'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    darkMode ? 'bg-gray-800 text-madrasa-400' : 'bg-madrasa-100 text-madrasa-700'
                  }`}
                >
                  <UserCheck className="h-5 w-5" />
                </div>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Create New Teacher
                </h3>
              </div>
              <button
                onClick={closeModal}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Success state */}
            {createdTeacher ? (
              <div className="p-5 flex flex-col gap-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800/60 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <p className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                      Teacher Account Created!
                    </p>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mb-3">{createdTeacher.message}</p>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-gray-900 p-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Teacher Login Credentials
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Username</span>
                      <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                        {createdTeacher.teacher.username}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Role</span>
                      <span className="font-mono text-xs font-bold text-madrasa-700 dark:text-madrasa-400">
                        {createdTeacher.teacher.role}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-emerald-700 dark:text-emerald-400 italic">
                    * Teacher will be prompted to change their password on first login.
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
                    Add Another Teacher
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl bg-madrasa-700 py-2.5 text-xs font-semibold text-white shadow hover:bg-madrasa-800 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Form state */
              <form onSubmit={handleFormSubmit} className="p-5 flex flex-col gap-4">
                {/* Error banner */}
                {formError && (
                  <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 p-3.5 flex items-start gap-2.5 shadow-xs">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed">{formError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    User Role <span className="text-emerald-500 font-bold ml-0.5">*</span>
                  </label>
                  <select
                    value={teacherRole}
                    onChange={(e) => setTeacherRole(e.target.value as 'Teacher' | 'school_teacher')}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  >
                    <option value="Teacher">Madrasa Teacher</option>
                    <option value="school_teacher">School Teacher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Teacher Full Name
                  </label>
                  <input
                    type="text"
                    value={teacherFullName}
                    onChange={(e) => setTeacherFullName(e.target.value)}
                    placeholder="e.g. Ustaza Zaynab"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 placeholder:text-gray-400 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Username / Email{' '}
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal lowercase">
                      (used to log in)
                    </span>
                    <span className="text-emerald-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="teacher@madrasa.org or ustaz.ahmed"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 placeholder:text-gray-400 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                    Initial Password <span className="text-emerald-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    required
                    type="password"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    placeholder="Set initial password (min 6 characters)"
                    minLength={6}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                      darkMode
                        ? 'bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'bg-gray-50/70 border-gray-200 text-gray-900 placeholder:text-gray-400 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                    }`}
                  />
                  <p className="mt-1.5 text-[10px] text-gray-400">Teacher will be forced to change on first login.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                      Assigned Class
                    </label>
                    <input
                      list="teacher-class-options"
                      type="text"
                      placeholder="e.g. Grade 5, Class 1A"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                        darkMode
                          ? 'bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                          : 'bg-gray-50/70 border-gray-200 text-gray-900 placeholder:text-gray-400 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                      }`}
                    />
                    <datalist id="teacher-class-options">
                      <option value="Class 1A" />
                      <option value="Class 2B" />
                      <option value="Class 3C" />
                      <option value="Class 4A" />
                      <option value="Grade 5" />
                      <option value="Grade 6" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                      Specialization
                    </label>
                    <select
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200 outline-none shadow-xs ${
                        darkMode
                          ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600 focus:bg-gray-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                          : 'bg-gray-50/70 border-gray-200 text-gray-900 hover:bg-white hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                      }`}
                    >
                      <option>Quran &amp; Tajweed</option>
                      <option>Hifz</option>
                      <option>Islamic Studies</option>
                      <option>Arabic Language</option>
                    </select>
                  </div>
                </div>

                {/* Live credentials preview */}
                {(teacherEmail || teacherPassword) && (
                  <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-950 dark:text-emerald-200 shadow-xs">
                    <p className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <span>🔑</span> Teacher Login Preview:
                    </p>
                    <div className="mt-1 space-y-0.5 font-mono text-[11px] text-emerald-800 dark:text-emerald-300">
                      <p>
                        Username: <span className="font-bold">{teacherEmail.trim() || '—'}</span>
                      </p>
                      <p>
                        Password: <span className="font-bold">{teacherPassword ? '••••••••' : '—'}</span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                      darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTeacherMutation.isPending}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 text-xs shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createTeacherMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Create Teacher
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Report Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 ${
              darkMode ? 'bg-gray-900 text-white border border-gray-800' : 'bg-white text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Delete Report?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
              Are you sure you want to permanently delete the report regarding{' '}
              <strong className="text-gray-900 dark:text-white">
                {reportToDelete.studentId?.name || 'this student'}
              </strong>?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleteReportMutation.isPending}
                onClick={() => setReportToDelete(null)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteReportMutation.isPending}
                onClick={() => deleteReportMutation.mutate(reportToDelete._id)}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 text-xs shadow-md shadow-red-600/20 transition active:scale-95 disabled:opacity-50"
              >
                {deleteReportMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete Report
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
