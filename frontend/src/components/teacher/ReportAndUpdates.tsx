"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Check,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  BarChart2,
  RefreshCw,
  AlertCircle,
  Search,
  Trash2,
  Megaphone,
  Bell,
  Calendar,
} from "lucide-react";
import {
  fetchTeacherNeedsAttention,
  deleteTeacherNeedsAttention,
  fetchTeacherAnnouncements,
  fetchTeacherStudents,
  fetchTeacherClassSummary,
  fetchTeacherProgressReports,
  flagStudentIssue,
  type AttentionStudent,
  type AdminAnnouncement,
  type ClassSummary,
  type RawStudent,
  type ProgressReportResponse,
} from "@/lib/api";

type TabType = "summary" | "attention" | "report" | "progress";

// ── Loading skeleton ──────────────────────────────────────────────────────────
function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-700 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/5 rounded-full bg-gray-100 dark:bg-gray-700" />
            <div className="h-2.5 w-2/5 rounded-full bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportAndUpdates() {
  const queryClient = useQueryClient();

  // ── Queries ─────────────────────────────────────────────────────────────────
  // 1. Needs Attention list
  const { data: attentionData, isLoading: loadingAttention } = useQuery({
    queryKey: ["teacherNeedsAttention"],
    queryFn: async () => {
      const res = await fetchTeacherNeedsAttention();
      return res.data.attentionList;
    },
    staleTime: 5 * 60 * 1000,
  });
  const attentionList = attentionData || [];

  const deleteAttentionMutation = useMutation({
    mutationFn: (id: string) => deleteTeacherNeedsAttention(id),
    onSuccess: (data, id) => {
      queryClient.setQueryData(["teacherNeedsAttention"], (oldData: AttentionStudent[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((item) => String(item.id) !== String(id));
      });
      queryClient.invalidateQueries({ queryKey: ["teacherNeedsAttention"] });
      showNotification("Report permanently deleted");
    },
    onError: (err: any) => {
      showNotification(err.message || "Failed to delete report");
    },
  });

  // 1.5 Admin Announcements Query
  const { data: announcementsData, isLoading: loadingAnnouncements } = useQuery({
    queryKey: ["teacherAnnouncements"],
    queryFn: async () => {
      try {
        const res = await fetchTeacherAnnouncements();
        return res.data.announcements;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
  const announcements = announcementsData || [];

  // 2. Class Summary
  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ["teacherClassSummary"],
    queryFn: async () => {
      const res = await fetchTeacherClassSummary();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const summary = summaryData || null;

  // 3. Assigned Students
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ["teacherStudents"],
    queryFn: async () => {
      const res = await fetchTeacherStudents();
      return res.data.students;
    },
    staleTime: 5 * 60 * 1000,
  });
  const students = studentsData || [];

  // 4. Progress Reports (Recent & Archived)
  const { data: progressReportsData, isLoading: loadingProgressReports } =
    useQuery({
      queryKey: ["teacherProgressReports"],
      queryFn: async () => {
        const res = await fetchTeacherProgressReports();
        return res.data;
      },
      staleTime: 5 * 60 * 1000,
    });
  const progressReports = progressReportsData || {
    recentProgress: [],
    archivedSummaries: [],
  };

  // ── UI state ────────────────────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("summary");

  // Report form fields
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [issueType, setIssueType] = useState<
    "Academic Struggle" | "Frequent Absence" | "Behavioral" | "Other"
  >("Academic Struggle");
  const [recipient, setRecipient] = useState<"Admin" | "Parent" | "Both">(
    "Both",
  );
  const [notes, setNotes] = useState("");

  // Progress Tab UI states
  const [progressSelectedStudentId, setProgressSelectedStudentId] = useState<string>("");
  const [progressSelectedMonth, setProgressSelectedMonth] = useState<string>("");
  const [progressSelectedDate, setProgressSelectedDate] = useState<number | null>(null);
  const [isFullMonthView, setIsFullMonthView] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Derived states for Progress Tab
  const defaultStudentId = students.length > 0 ? students[0]._id : "";
  const actualSelectedStudentId = progressSelectedStudentId || defaultStudentId;

  const availableMonths = useMemo(() => {
    if (!progressReports?.recentProgress) return [];
    const months = new Set<string>();
    progressReports.recentProgress.forEach((p: any) => {
      const date = new Date(p.date);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.add(monthStr);
    });
    return Array.from(months).sort().reverse();
  }, [progressReports?.recentProgress]);

  const defaultMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const actualSelectedMonth = progressSelectedMonth || (availableMonths.length > 0 ? availableMonths[0] : defaultMonth);

  const [yearStr, monthStr] = actualSelectedMonth.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const studentProgressForMonth = useMemo(() => {
    if (!progressReports?.recentProgress) return [];
    return progressReports.recentProgress.filter((p: any) => {
      const pDate = new Date(p.date);
      const pMonthStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, "0")}`;
      const sId = typeof p.studentId === "string" ? p.studentId : p.studentId?._id;
      return sId === actualSelectedStudentId && pMonthStr === actualSelectedMonth;
    });
  }, [progressReports?.recentProgress, actualSelectedStudentId, actualSelectedMonth]);

  const progressByDate = useMemo(() => {
    const map = new Map<number, any>();
    studentProgressForMonth.forEach((p: any) => {
      const date = new Date(p.date).getDate();
      map.set(date, p);
    });
    return map;
  }, [studentProgressForMonth]);

  const actualSelectedDate = progressSelectedDate !== null 
    ? progressSelectedDate 
    : (progressByDate.size > 0 ? Math.max(...Array.from(progressByDate.keys())) : null);

  // ── Notification helper ─────────────────────────────────────────────────────
  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: ["teacherNeedsAttention"] });
    queryClient.invalidateQueries({ queryKey: ["teacherClassSummary"] });
    queryClient.invalidateQueries({ queryKey: ["teacherStudents"] });
    queryClient.invalidateQueries({ queryKey: ["teacherProgressReports"] });
  };

  // ── Mutations ───────────────────────────────────────────────────────────────
  const reportMutation = useMutation({
    mutationFn: flagStudentIssue,
    onSuccess: (_, variables) => {
      setSelectedStudentId("");
      setNotes("");
      showNotification(`Report sent successfully to ${variables.recipient}!`);
      queryClient.invalidateQueries({ queryKey: ["teacherNeedsAttention"] });
      queryClient.invalidateQueries({ queryKey: ["teacherClassSummary"] });
    },
    onError: () => {
      showNotification("Failed to submit report. Please try again.");
    },
  });

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showNotification("Please select a student to report");
      return;
    }

    reportMutation.mutate({
      studentId: selectedStudentId,
      issueType,
      recipient,
      notes,
    });
  };

  const submitting = reportMutation.isPending;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-32">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Segmented Tab Switcher */}
      <div className="flex rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1.5 shadow-xs">
        {[
          { id: "summary" as TabType, label: "Summary", icon: BarChart2 },
          {
            id: "attention" as TabType,
            label: "Attention",
            icon: AlertTriangle,
            badge: attentionList.length,
          },
          { id: "progress" as TabType, label: "Progress", icon: RefreshCw },
          { id: "report" as TabType, label: "Report", icon: ShieldAlert },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2 px-2 text-xs font-bold transition active:scale-95 ${
                isActive
                  ? "bg-madrasa-700 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              {item.badge ? (
                <span
                  className={`flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-extrabold ${
                    isActive
                      ? "bg-white text-madrasa-800"
                      : "bg-madrasa-700 text-white"
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: Class Summary ──────────────────────────────────────────── */}
      {activeTab === "summary" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Today&apos;s Class Summary
            </h2>
            {summary && (
              <span className="text-xs font-semibold text-madrasa-700">
                {summary.totalEnrolled} Enrolled
              </span>
            )}
          </div>

          {loadingSummary ? (
            <div className="grid grid-cols-1 gap-3 animate-pulse">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5 h-28"
                />
              ))}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-1 gap-3">
              {/* Attendance Card */}
              <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                    {summary.attendancePercent}% Present
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black text-gray-900 dark:text-white">
                    {summary.presentCount} / {summary.totalEnrolled}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.absentCount} Student
                    {summary.absentCount !== 1 ? "s" : ""} Absent Today
                  </p>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{ width: `${summary.attendancePercent}%` }}
                  />
                </div>
              </div>

              {/* Needs Revision Card */}
              <div className="rounded-3xl border border-amber-200 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/40 p-5 shadow-sm ring-1 ring-amber-200/60 dark:ring-amber-800/40">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                    <RotateCcw className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-amber-100 dark:bg-amber-900/60 px-3 py-1 text-xs font-bold text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                    Revision Mode
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black text-amber-950 dark:text-amber-200">
                    {summary.needsRevisionCount} Student
                    {summary.needsRevisionCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1">
                    Repeating Lessons Due to Mistakes
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Puthiya Padam Stepper Locked at 0</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-400">
              No summary data available yet for today.
            </div>
          )}
        </div>
      )}



      {/* ── TAB 3: Needs Attention ────────────────────────────────────────── */}
      {activeTab === "attention" && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-500">
                Needs Attention
              </h2>
            </div>
            {!loadingAttention && (
              <span className="text-xs font-semibold text-amber-700">
                {attentionList.length} Flagged
              </span>
            )}
          </div>

          {loadingAttention ? (
            <CardSkeleton rows={3} />
          ) : attentionList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-400">
              No students flagged for attention. 🎉
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {attentionList.map((item) => (
                <div
                  key={String(item.id)}
                  className={`rounded-3xl border p-4 shadow-sm transition ${
                    item.severity === "high"
                      ? "border-red-200 bg-red-50/40 ring-1 ring-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:ring-red-900/30"
                      : "border-amber-200 bg-amber-50/40 ring-1 ring-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:ring-amber-900/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${
                          item.severity === "high"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {item.studentName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                          {item.studentName}
                        </h3>
                        <p className="text-[11px] text-gray-500">
                          ID: {item.rollNumber}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                          item.severity === "high"
                            ? "bg-red-100 text-red-800 border-red-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                      >
                        {item.reason}
                      </span>
                      <button
                        type="button"
                        disabled={deleteAttentionMutation.isPending}
                        onClick={() => {
                          if (window.confirm("Are you sure you want to permanently delete this report?")) {
                            deleteAttentionMutation.mutate(String(item.id));
                          }
                        }}
                        title="Delete Report"
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {item.details}
                  </p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                    <span className="text-[10px] text-gray-500 font-medium">
                      Duration: {item.daysCount} days active
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={deleteAttentionMutation.isPending}
                        onClick={() => {
                          if (window.confirm("Are you sure you want to permanently delete this report?")) {
                            deleteAttentionMutation.mutate(String(item.id));
                          }
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete Report"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStudentId(String(item.id));
                          setActiveTab("report");
                          showNotification(
                            `Selected ${item.studentName} for Report Form`,
                          );
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-madrasa-700 hover:underline"
                      >
                        <span>Report Issue</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Admin Announcements & Upcoming Exams Section ────────────────── */}
          <div className="mt-6 flex flex-col gap-3 border-t border-gray-200/60 dark:border-gray-800 pt-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-400">
                  Admin Announcements & Upcoming Exams
                </h2>
              </div>
              {announcements.length > 0 && (
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {announcements.length} Alert{announcements.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {loadingAnnouncements ? (
              <CardSkeleton rows={2} />
            ) : announcements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-6 text-center text-sm text-gray-400">
                No active admin announcements. 🎉
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {announcements.map((announcement) => (
                  <div
                    key={String(announcement.id)}
                    className="rounded-3xl border border-blue-200/80 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20 p-4 shadow-xs ring-1 ring-blue-100 dark:ring-blue-900/30 transition hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                          <Bell className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                            {announcement.title}
                          </h3>
                          <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                            {announcement.targetClass || 'All Classes'}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-[10px] font-bold">
                        {new Date(announcement.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                      {announcement.message}
                    </p>

                    {announcement.scheduledDate && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-800 dark:text-blue-300 font-bold bg-blue-100/60 dark:bg-blue-900/40 px-3 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-800/40 w-fit">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Exam Date: {announcement.scheduledDate}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: Report an Issue Form ───────────────────────────────────── */}
      {activeTab === "report" && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-madrasa-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Report an Issue Form
              </h2>
            </div>
            <span className="text-xs text-gray-400">
              Flag to Admin / Parent
            </span>
          </div>

          <form
            onSubmit={handleReportSubmit}
            className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm flex flex-col gap-4"
          >
            {/* Select Student */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Select Student <span className="text-red-500">*</span>
              </label>
              {loadingStudents ? (
                <div className="h-10 w-full rounded-2xl bg-gray-100 animate-pulse" />
              ) : (
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-madrasa-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-madrasa-100"
                >
                  <option value="">-- Choose a student --</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.rollNumber})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Select Issue Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Issue Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    "Academic Struggle",
                    "Frequent Absence",
                    "Behavioral",
                    "Other",
                  ] as const
                ).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setIssueType(type)}
                    className={`rounded-2xl py-2 px-3 text-xs font-bold transition active:scale-95 border ${
                      issueType === type
                        ? "bg-madrasa-700 text-white border-madrasa-700 shadow-xs"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience / Recipient */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Send Warning / Flag To
              </label>
              <div className="flex gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1">
                {(["Admin", "Parent", "Both"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRecipient(r)}
                    className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition ${
                      recipient === r
                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-xs ring-1 ring-gray-200 dark:ring-gray-500"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes Textarea */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Detailed Notes / Recommendations
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the issue, lesson obstacle, or parent warning notes..."
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-madrasa-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-madrasa-100"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || loadingStudents}
              className="flex items-center justify-center gap-2 rounded-2xl bg-madrasa-700 py-3.5 text-sm font-bold text-white shadow-md hover:bg-madrasa-800 transition active:scale-[0.98] disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              <span>
                {submitting ? "Sending Report..." : "Submit Issue Report"}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* ── TAB 5: Progress History ───────────────────────────────────────── */}
      {activeTab === "progress" && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-madrasa-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Progress History
              </h2>
            </div>
          </div>

          {loadingProgressReports || loadingStudents ? (
            <CardSkeleton rows={4} />
          ) : (
            <div className="flex flex-col gap-5">
              {/* Filters & View Toggle */}
              <div className="flex flex-col gap-4">
                {/* Search Bar */}
                <div className="relative px-1">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Search students..."
                    className="w-full rounded-full bg-gray-50 dark:bg-gray-700 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-madrasa-100 border border-gray-100 dark:border-gray-600 focus:border-madrasa-200"
                  />
                </div>

                {/* Student Avatar Selector */}
                <div className="flex gap-4 overflow-x-auto pb-2 pt-2 scrollbar-hide snap-x px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {students.filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())).map((s) => {
                    const isSelected = actualSelectedStudentId === s._id;
                    const initials = s.name.charAt(0).toUpperCase();
                    const firstName = s.name.split(" ")[0];

                    return (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => {
                          setProgressSelectedStudentId(s._id);
                          setProgressSelectedDate(null);
                        }}
                        className={`flex shrink-0 snap-center flex-col items-center gap-2 transition-all duration-300 outline-none ${
                          isSelected ? "scale-105" : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 ${
                            isSelected
                              ? "bg-madrasa-700 text-white ring-4 ring-madrasa-100 shadow-md"
                              : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                          }`}
                        >
                          <span className="text-lg font-bold">{initials}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span
                            className={`text-xs font-semibold ${
                              isSelected ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {firstName}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {students.filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())).length === 0 && (
                    <div className="text-sm text-gray-400 py-4 px-2">No students found</div>
                  )}
                </div>

                {/* Controls Row: View Toggle & Month Selector */}
                <div className="flex items-center justify-between gap-3 px-1">
                  {/* View Toggle */}
                  <div className="relative grid grid-cols-2 rounded-full bg-gray-100 dark:bg-gray-700 p-1 w-56 shrink-0">
                    {/* Sliding pill */}
                    <div 
                      className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white dark:bg-gray-600 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${isFullMonthView ? 'translate-x-full' : 'translate-x-0'}`} 
                    />
                    <button 
                      type="button"
                      onClick={() => setIsFullMonthView(false)}
                      className={`relative z-10 py-1.5 text-xs font-bold rounded-full transition-colors duration-300 ${!isFullMonthView ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                      Daily View
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsFullMonthView(true)}
                      className={`relative z-10 py-1.5 text-xs font-bold rounded-full transition-colors duration-300 ${isFullMonthView ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                      Full Month
                    </button>
                  </div>

                  {/* Month Selector */}
                  <select
                    value={actualSelectedMonth}
                    onChange={(e) => {
                      setProgressSelectedMonth(e.target.value);
                      setProgressSelectedDate(null);
                    }}
                    className="w-[140px] rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 px-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-madrasa-500 focus:ring-2 focus:ring-madrasa-100 shadow-sm"
                  >
                    {availableMonths.map((m) => {
                      const [y, mo] = m.split("-");
                      const date = new Date(parseInt(y), parseInt(mo) - 1);
                      return (
                        <option key={m} value={m}>
                          {date.toLocaleString("default", { month: "short", year: "numeric" })}
                        </option>
                      );
                    })}
                    {availableMonths.length === 0 && (
                      <option value={defaultMonth}>
                        {new Date().toLocaleString("default", { month: "short", year: "numeric" })}
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {!isFullMonthView ? (
                <>
                  {/* Date Strip */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {daysArray.map((day) => {
                      const hasData = progressByDate.has(day);
                      const isSelected = actualSelectedDate === day;
                      return (
                        <button
                          key={day}
                          onClick={() => setProgressSelectedDate(day)}
                          className={`flex shrink-0 snap-center items-center justify-center w-12 h-12 rounded-full text-sm font-black transition-all ${
                            isSelected
                              ? "bg-madrasa-700 text-white shadow-md ring-4 ring-madrasa-100 scale-105"
                              : hasData
                              ? "bg-madrasa-50 text-madrasa-900 border-2 border-madrasa-200 hover:bg-madrasa-100 hover:scale-105"
                              : "bg-white dark:bg-gray-700 text-gray-400 border border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Details Section */}
                  <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm min-h-[180px] flex flex-col justify-center transition-all">
                    {actualSelectedDate ? (
                      progressByDate.has(actualSelectedDate) ? (
                        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                            <div className="flex flex-col">
                              <span className="text-base font-black text-gray-900 dark:text-white">
                                {new Date(year, month - 1, actualSelectedDate).toLocaleDateString("en-US", { weekday: 'long' })}
                              </span>
                              <span className="text-xs font-semibold text-gray-500">
                                {new Date(year, month - 1, actualSelectedDate).toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            {progressByDate.get(actualSelectedDate).isAbsent && (
                              <span className="text-xs font-extrabold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 uppercase tracking-wide">
                                Absent
                              </span>
                            )}
                          </div>
                          
                          {!progressByDate.get(actualSelectedDate).isAbsent ? (
                            <div className="grid grid-cols-3 gap-4">
                              <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-600">
                                <span className="text-[11px] text-gray-500 uppercase font-black tracking-wider mb-2">
                                  Puthiya
                                </span>
                                <span className="text-2xl font-black text-gray-900 dark:text-white">
                                  {progressByDate.get(actualSelectedDate).puthiyaPadam}
                                </span>
                              </div>
                              <div className="flex flex-col items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-3xl border border-blue-100 dark:border-blue-800/50">
                                <span className="text-[11px] text-blue-500 uppercase font-black tracking-wider mb-2">
                                  Juzu
                                </span>
                                <span className="text-2xl font-black text-blue-900 dark:text-blue-300">
                                  {progressByDate.get(actualSelectedDate).juzuPadam}
                                </span>
                              </div>
                              <div className="flex flex-col items-center bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800/50">
                                <span className="text-[11px] text-emerald-600 uppercase font-black tracking-wider mb-2">
                                  Pazhaya
                                </span>
                                <span className="text-2xl font-black text-emerald-900 dark:text-emerald-300">
                                  {progressByDate.get(actualSelectedDate).pazhayaPadam}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 py-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                              <AlertCircle className="h-5 w-5 text-gray-400" />
                              Student was marked absent on this day.
                            </div>
                          )}
                          
                          {progressByDate.get(actualSelectedDate).notes && (
                            <div className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/50 flex gap-2 items-start">
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-amber-900 dark:text-amber-400 block mb-1">Teacher Notes</strong>
                                {progressByDate.get(actualSelectedDate).notes}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center text-sm text-gray-400 py-10 gap-3">
                          <div className="h-12 w-12 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center mb-2">
                            <RefreshCw className="h-5 w-5 text-gray-300" />
                          </div>
                          <p className="font-semibold text-gray-500">No progress recorded for this day</p>
                          <p className="text-xs">Try selecting a different date from the strip above.</p>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center text-sm text-gray-400 py-10 gap-3">
                        <div className="h-12 w-12 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center mb-2">
                          <Users className="h-5 w-5 text-gray-300" />
                        </div>
                        <p className="font-semibold text-gray-500">No dates with progress found</p>
                        <p className="text-xs">There are no records for this student in the selected month.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="relative flex flex-col gap-6 max-h-[500px] overflow-y-auto pr-2 pb-4 scrollbar-hide">
                  {studentProgressForMonth.length === 0 ? (
                    <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 shadow-sm flex flex-col items-center justify-center text-center text-gray-400 gap-3">
                       <Users className="h-6 w-6 text-gray-300" />
                       <p className="font-semibold text-gray-500">No records found for this month</p>
                    </div>
                  ) : (
                    <>
                      {/* Vertical Line */}
                      <div className="absolute left-[17px] top-6 bottom-6 border-l-2 border-gray-200 dark:border-gray-800" />
                      
                      {[...studentProgressForMonth].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((p, idx) => {
                        const pDate = new Date(p.date);
                        const isAbsent = p.isAbsent;
                        return (
                          <div key={p._id} className="relative pl-12 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationFillMode: 'both', animationDelay: `${idx * 40}ms` }}>
                            {/* Timeline Node */}
                            <div className={`absolute left-[11px] top-6 h-3.5 w-3.5 rounded-full ring-4 ring-gray-50 dark:ring-gray-900 shadow-sm z-10 ${isAbsent ? 'bg-red-400' : 'bg-emerald-400'}`} />
                            
                            {/* Card Content */}
                            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm flex flex-col gap-4">
                              <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-800 pb-3">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  {pDate.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' })}
                                </span>
                                {isAbsent ? (
                                  <span className="text-[10px] font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-lg border border-red-100 dark:border-red-900/50 uppercase tracking-wide">
                                    Absent
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/50 uppercase tracking-wide">
                                    Present
                                  </span>
                                )}
                              </div>
                              
                              {!isAbsent && (
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="flex flex-col items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50">
                                     <span className="text-[9px] text-blue-500 dark:text-blue-400 uppercase font-black tracking-wider">Puthiya</span>
                                     <span className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">
                                       {p.puthiyaPadam} <span className="text-xs font-semibold text-blue-500">{p.unit || 'lines'}</span>
                                     </span>
                                  </div>
                                  <div className="flex flex-col items-center bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-100 dark:border-purple-800/50">
                                     <span className="text-[9px] text-purple-500 dark:text-purple-400 uppercase font-black tracking-wider">Juzu</span>
                                     <span className="text-xl font-black text-purple-700 dark:text-purple-300 mt-1">{p.juzuPadam}</span>
                                  </div>
                                  <div className="flex flex-col items-center bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800/50">
                                     <span className="text-[9px] text-orange-600 dark:text-orange-400 uppercase font-black tracking-wider">Pazhaya</span>
                                     <span className="text-xl font-black text-orange-700 dark:text-orange-300 mt-1">{p.pazhayaPadam}</span>
                                  </div>
                                </div>
                              )}
                        
                              {p.notes && (
                                <div className="text-xs text-gray-700 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/20 p-3.5 rounded-xl border border-amber-100 dark:border-amber-800/50 flex gap-2.5 items-start mt-1">
                                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-amber-800 dark:text-amber-400 font-bold block mb-1">Teacher Notes</strong>
                                    <span className="font-medium text-amber-950/80 dark:text-amber-100/80 leading-relaxed">{p.notes}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
