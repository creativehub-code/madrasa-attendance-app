'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  BookOpen,
  Users,
  CheckCircle2,
  UserPlus,
  UserCheck,
  Megaphone,
  BarChart3,
  ArrowRight,
  X,
  Check,
  FileText,
  RefreshCw,
  Loader2,
  Mail,
  MailOpen,
  LucideIcon,
  Plus,
} from 'lucide-react';
import { useAdminTheme } from '@/context/AdminThemeContext';
import { STANDARDS } from '@/types';
import {
  fetchAdminStats,
  fetchAdminRecentActivities,
  createAnnouncement,
  createStudent,
  createTeacher,
  fetchAdminTeachers,
  formatTeacherName,
  type AdminStats,
  type AdminTeacher,
  type AdminActivity,
  fetchAdminReports,
  markAdminReportRead,
  type IssueReport,
  fetchClasses,
  createClass,
  type ClassItem,
} from '@/lib/api';
import CreateStudentModal from '@/components/admin/CreateStudentModal';

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Tabs that the BottomNav links to (/admin/students, /admin/teachers) each
// live in their own Next.js route and fetch their own data on mount —
// that IS the lazy-load boundary. The only unnecessary eager fetch on this
// dashboard page was loading the teachers list for the Add-Student modal
// before the modal was even opened. That is fixed below.

type ModalType = 'student' | 'teacher' | 'announcement' | 'reports' | null;

interface StatCard {
  label: string;
  shortLabel: string;
  value: number | string;
  icon: LucideIcon;
  iconBg: string;
}

const QUICK_ACTIONS = [
  { id: 'student', label: 'Add Student', shortLabel: 'Add Student', icon: UserPlus },
  { id: 'teacher', label: 'Add Teacher', shortLabel: 'Add Teacher', icon: UserCheck },
  { id: 'announcement', label: 'Send Announcement', shortLabel: 'Announcement', icon: Megaphone },
  { id: 'reports', label: 'View Reports', shortLabel: 'Reports', icon: BarChart3 },
] as const;

export default function AdminDashboardPage() {
  const { darkMode } = useAdminTheme();
  const queryClient = useQueryClient();

  // ── Queries ─────────────────────────────────────────────────────────────────
  const {
    data: statsData,
    isLoading: statsLoading,
    isFetching: statsFetching,
  } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await fetchAdminStats();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const stats = statsData || null;

  // Build stat cards from real data
  const statCards: StatCard[] = stats
    ? [
        {
          label: 'Total Students',
          shortLabel: 'Students',
          value: stats.totalStudents,
          icon: GraduationCap,
          iconBg: 'bg-blue-100 text-blue-700',
        },
        {
          label: 'Teachers',
          shortLabel: 'Teachers',
          value: stats.totalTeachers,
          icon: BookOpen,
          iconBg: 'bg-emerald-100 text-emerald-700',
        },
        {
          label: 'Parents Joined',
          shortLabel: 'Parents',
          value: stats.totalParents,
          icon: Users,
          iconBg: 'bg-purple-100 text-purple-700',
        },
        {
          label: "Today's Attendance",
          shortLabel: 'Attendance',
          value: stats.attendanceToday !== null ? `${stats.attendanceToday}%` : '—',
          icon: CheckCircle2,
          iconBg: 'bg-amber-100 text-amber-700',
        },
      ]
    : [];

  const {
    data: teachersData,
    isLoading: teachersLoading,
    refetch: fetchTeachersForModal,
  } = useQuery({
    queryKey: ['adminTeachers'],
    queryFn: async () => {
      const res = await fetchAdminTeachers();
      return res.data.teachers;
    },
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });
  const teachersList = teachersData || [];

  const {
    data: activitiesData,
    isLoading: activitiesLoading,
    isFetching: activitiesFetching,
  } = useQuery({
    queryKey: ['adminRecentActivities'],
    queryFn: async () => {
      const res = await fetchAdminRecentActivities();
      return res.data.activities;
    },
    staleTime: 30 * 1000,
  });
  const recentActivities = activitiesData || [];

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    data: reportsData,
    isLoading: reportsLoading,
    refetch: fetchReports,
  } = useQuery({
    queryKey: ['adminReports'],
    queryFn: async () => {
      const res = await fetchAdminReports();
      return res.data.reports;
    },
    enabled: activeModal === 'reports',
    staleTime: 60 * 1000,
  });
  const reportsList = reportsData || [];

  const [teacherFullName, setTeacherFullName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherRole, setTeacherRole] = useState<'Teacher' | 'school_teacher'>('Teacher');
  const [announcementSubject, setAnnouncementSubject] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementAudience, setAnnouncementAudience] = useState('All Parents & Staff');
  const [announcementPriority, setAnnouncementPriority] = useState('Normal');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // ── Notification helper ─────────────────────────────────────────────────────
  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Mutations ───────────────────────────────────────────────────────────────
  const announcementMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      setActiveModal(null);
      setAnnouncementSubject('');
      setAnnouncementMessage('');
      showNotification('Announcement broadcasted to audience!');
      queryClient.invalidateQueries({ queryKey: ['adminRecentActivities'] });
    },
    onError: (err) => {
      console.error('[Admin] createAnnouncement failed:', err);
      showNotification('Failed to send announcement. Please try again.');
    },
  });

  const teacherMutation = useMutation({
    mutationFn: createTeacher,
    onSuccess: (res) => {
      console.log('[Admin] createTeacher — success:', res.data);
      setActiveModal(null);
      setTeacherFullName('');
      setTeacherEmail('');
      setTeacherPassword('');
      setTeacherRole('Teacher');
      showNotification(res.data.message || 'Teacher profile added successfully!');
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] });
      queryClient.invalidateQueries({ queryKey: ['adminRecentActivities'] });
    },
    onError: (err) => {
      console.error('[Admin] createTeacher failed:', err);
      showNotification('Failed to create teacher. Check console for details.');
    },
  });

  const markReportReadMutation = useMutation({
    mutationFn: markAdminReportRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      showNotification('Report marked as read');
    },
  });

  // ── Form Handlers ────────────────────────────────────────────────────────────
  const handleAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    announcementMutation.mutate({
      subject: announcementSubject,
      message: announcementMessage,
      targetAudience: announcementAudience,
      priority: announcementPriority,
    });
  };



  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Admin] handleTeacherSubmit — calling API...');
    teacherMutation.mutate({
      username: teacherEmail.trim(),
      password: teacherPassword,
      fullName: teacherFullName.trim() || undefined,
      role: teacherRole,
    });
  };

  const handleRefreshStats = () => {
    queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    queryClient.invalidateQueries({ queryKey: ['adminRecentActivities'] });
  };

  return (
    <main className="relative min-h-screen px-4 pb-32 pt-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="mb-5 flex items-start justify-between">
        <div>
          <img src="/logo.png" alt="Qalivo Logo" className="h-10 w-auto mb-3 object-contain" />
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Admin Dashboard
          </h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshStats}
            title="Refresh stats"
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
              darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${statsLoading || statsFetching || activitiesFetching ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-madrasa-700 text-lg font-extrabold text-white ring-4 ring-madrasa-100 shadow-md">
            A
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col gap-6">
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 py-1">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                  <div className="h-11 w-11 rounded-full bg-gray-200" />
                  <div className="h-5 w-10 rounded-full bg-gray-200" />
                  <div className="h-3 w-12 rounded-full bg-gray-100" />
                </div>
              ))
            : statCards.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="flex flex-col items-center justify-center text-center transition hover:scale-105"
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full ${s.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p
                      className={`mt-2 text-lg font-extrabold leading-tight ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {s.value}
                    </p>
                    <p
                      className={`mt-0.5 text-[10px] font-medium leading-tight ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {s.shortLabel}
                    </p>
                  </div>
                );
              })}
        </div>

        {/* Quick actions */}
        <div
          className={`rounded-3xl border p-5 shadow-sm transition ${
            darkMode ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900'
          }`}
        >
          <h2 className="mb-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Quick Actions
          </h2>
          <div className="grid grid-cols-4 gap-2 text-center">
            {QUICK_ACTIONS.map(({ id, shortLabel, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  // Lazy-load teachers list only when the student modal opens
                  if (id === 'student') fetchTeachersForModal();
                  setActiveModal(id as ModalType);
                }}
                className="flex flex-col items-center gap-1.5 transition hover:scale-105 active:scale-95"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-xs ring-1 ${
                    darkMode
                      ? 'bg-gray-800 text-madrasa-400 ring-gray-700'
                      : 'bg-madrasa-100 text-madrasa-700 ring-madrasa-200/60'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-[10px] font-semibold leading-tight ${
                    darkMode ? 'text-gray-300' : 'text-gray-900'
                  }`}
                >
                  {shortLabel}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div
          className={`rounded-3xl border shadow-sm overflow-hidden transition ${
            darkMode ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900'
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Recent Activity
            </h2>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
              Auto-retains 15 days
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activitiesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-start gap-3 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-4/5 rounded-full bg-gray-100 dark:bg-gray-800" />
                    <div className="h-2.5 w-1/4 rounded-full bg-gray-100 dark:bg-gray-800" />
                  </div>
                </div>
              ))
            ) : recentActivities.length > 0 ? (
              recentActivities.slice(0, 10).map((a) => {
                const actorName = a.performedBy?.username
                  ? formatTeacherName(a.performedBy.username)
                  : 'System';
                const roleBadge = a.performedBy?.role
                  ? a.performedBy.role === 'Admin'
                    ? 'Admin'
                    : a.performedBy.role === 'school_teacher'
                    ? 'School Teacher'
                    : 'Teacher'
                  : null;

                return (
                  <div
                    key={a._id}
                    className="px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {actorName}
                          </span>
                          {roleBadge && (
                            <span className="rounded-full bg-gray-100 dark:bg-gray-800 text-[9px] font-bold text-gray-500 dark:text-gray-400 px-2 py-0.5 border border-gray-200 dark:border-gray-700">
                              {roleBadge}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {a.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-medium text-gray-400">
                        {formatRelativeTime(a.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-8 text-center text-xs text-gray-400">
                No activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Student Modal */}
      <CreateStudentModal
        isOpen={activeModal === 'student'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => showNotification('Student created successfully!')}
      />

      {/* Modal Dialog Backdrop */}
      {activeModal && activeModal !== 'student' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 ${
            darkMode ? 'bg-gray-900 text-white border border-gray-800' : 'bg-white text-gray-900'
          }`}>
            {/* Modal Header */}
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  darkMode ? 'bg-gray-800 text-madrasa-400' : 'bg-madrasa-100 text-madrasa-700'
                }`}>
                  {activeModal === 'teacher' && <UserCheck className="h-5 w-5" />}
                  {activeModal === 'announcement' && <Megaphone className="h-5 w-5" />}
                  {activeModal === 'reports' && <BarChart3 className="h-5 w-5" />}
                </div>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {activeModal === 'teacher' && 'Create New Teacher'}
                  {activeModal === 'announcement' && 'Send Announcement'}
                  {activeModal === 'reports' && 'Brief of Reports'}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Add Teacher */}
            {activeModal === 'teacher' && (
              <form onSubmit={handleTeacherSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    User Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={teacherRole}
                    onChange={(e) => setTeacherRole(e.target.value as 'Teacher' | 'school_teacher')}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-madrasa-500 dark:focus:border-madrasa-400 focus:bg-white dark:focus:bg-gray-900 transition"
                  >
                    <option value="Teacher">Madrasa Teacher</option>
                    <option value="school_teacher">School Teacher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Teacher Full Name</label>
                  <input
                    type="text"
                    value={teacherFullName}
                    onChange={(e) => setTeacherFullName(e.target.value)}
                    placeholder="e.g. Ustaza Zaynab"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-madrasa-500 dark:focus:border-madrasa-400 focus:bg-white dark:focus:bg-gray-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email Address{' '}
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">(Used as Username / Login ID)</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="teacher@madrasa.org"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-madrasa-500 dark:focus:border-madrasa-400 focus:bg-white dark:focus:bg-gray-900 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Initial Password for Teacher Login</label>
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    placeholder="Set initial password (min 6 chars)"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-madrasa-500 dark:focus:border-madrasa-400 focus:bg-white dark:focus:bg-gray-900 transition"
                  />
                </div>
                <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/40 p-3 text-xs text-emerald-950 dark:text-emerald-200">
                  <p className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <span>🔑</span> Teacher Login Credentials:
                  </p>
                  <div className="mt-1 space-y-0.5 font-mono text-[11px] text-emerald-800 dark:text-emerald-300">
                    <p>Username: <span className="font-bold">{teacherEmail.trim() || '(Email Address)'}</span></p>
                    <p>Password: <span className="font-bold">{teacherPassword ? '••••••••' : '(Initial Password)'}</span></p>
                  </div>
                  <p className="mt-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 italic">
                    * Teacher will be forcibly redirected to change password on first login.
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                      darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={teacherMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-madrasa-700 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-madrasa-800 transition disabled:opacity-60"
                  >
                    {teacherMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Create Teacher
                  </button>
                </div>
              </form>
            )}

            {/* Send Announcement — wired to real API */}
            {activeModal === 'announcement' && (
              <form onSubmit={handleAnnouncementSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Announcement Subject</label>
                  <input
                    required
                    type="text"
                    value={announcementSubject}
                    onChange={(e) => setAnnouncementSubject(e.target.value)}
                    placeholder="e.g. Upcoming Parent-Teacher Meeting"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-madrasa-500 dark:focus:border-madrasa-400 focus:bg-white dark:focus:bg-gray-900 transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
                    <select
                      value={announcementAudience}
                      onChange={(e) => setAnnouncementAudience(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-madrasa-500 dark:focus:border-madrasa-400 focus:bg-white dark:focus:bg-gray-900 transition"
                    >
                      <option>All Parents & Staff</option>
                      <option>Parents Only</option>
                      <option>Teachers Only</option>
                      <option>Class 4A Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                    <select
                      value={announcementPriority}
                      onChange={(e) => setAnnouncementPriority(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-madrasa-500 dark:focus:border-madrasa-400 focus:bg-white dark:focus:bg-gray-900 transition"
                    >
                      <option>Normal</option>
                      <option>Important</option>
                      <option>Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Announcement Message</label>
                  <textarea
                    required
                    rows={3}
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    placeholder="Write your announcement details here..."
                    className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-madrasa-500 dark:focus:border-madrasa-400 focus:bg-white dark:focus:bg-gray-900 transition"
                  />
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                      darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={announcementMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-madrasa-700 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-madrasa-800 transition disabled:opacity-60"
                  >
                    {announcementMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Broadcast Announcement
                  </button>
                </div>
              </form>
            )}
            {activeModal === 'reports' && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
                    <p className="text-xs font-medium text-blue-700">Attendance Rate</p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-blue-900">
                        {stats?.attendanceToday !== null && stats?.attendanceToday !== undefined
                          ? `${stats.attendanceToday}%`
                          : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                    <p className="text-xs font-medium text-emerald-700">Total Students</p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-emerald-900">
                        {stats?.totalStudents ?? '—'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-3">
                    <p className="text-xs font-medium text-purple-700">Total Teachers</p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-purple-900">
                        {stats?.totalTeachers ?? '—'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
                    <p className="text-xs font-medium text-amber-700">Parents Joined</p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-amber-900">
                        {stats?.totalParents ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Recent Issue Reports</h4>
                  {reportsLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                  ) : reportsList.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No issue reports found.</p>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                      {reportsList.map((report) => (
                        <div key={report._id} className={`rounded-2xl border p-3.5 transition-all ${report.isReadByAdmin ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-red-50/50 border-red-100 shadow-sm'}`}>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="text-xs font-semibold text-gray-900">
                                {report.studentId.name} <span className="text-gray-500 font-normal">({report.studentId.className})</span>
                              </p>
                              <p className="text-[11px] font-medium text-red-600 mt-0.5 bg-red-100/50 inline-block px-1.5 py-0.5 rounded-md">
                                {report.issueType}
                              </p>
                              {report.notes && (
                                <p className="text-xs text-gray-600 mt-1.5 italic">"{report.notes}"</p>
                              )}
                              <p className="text-[10px] text-gray-400 mt-2">
                                Reported by Teacher {report.teacherId.username} • {formatRelativeTime(report.createdAt)}
                              </p>
                            </div>
                            {!report.isReadByAdmin ? (
                              <button
                                onClick={() => markReportReadMutation.mutate(report._id)}
                                disabled={markReportReadMutation.isPending}
                                className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-white border border-red-200 text-red-500 hover:bg-red-50 transition shadow-xs"
                                title="Mark as Read"
                              >
                                {markReportReadMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <MailOpen className="h-3 w-3" />}
                              </button>
                            ) : (
                              <div className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-gray-100 text-gray-400" title="Read">
                                <Check className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      showNotification('Downloading monthly performance report PDF...');
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-madrasa-700 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-madrasa-800 transition"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
