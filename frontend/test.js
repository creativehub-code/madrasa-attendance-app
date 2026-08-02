"use client";

import { useState } from "react";
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
} from "lucide-react";
import {
  fetchTeacherNeedsAttention,
  fetchTeacherStudents,
  fetchTeacherClassSummary,
  fetchTeacherProgressReports,
  flagStudentIssue,
  type AttentionStudent,
  type ClassSummary,
  type RawStudent,
  type ProgressReportResponse,
} from "@/lib/api";

type TabType = "summary" | "attention" | "report" | "progress";

// ── Loading skeleton ──────────────────────────────────────────────────────────
function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/5 rounded-full bg-gray-100" />
            <div className="h-2.5 w-2/5 rounded-full bg-gray-100" />
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
      <div className="flex rounded-3xl border border-gray-200 bg-white p-1.5 shadow-xs">
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
                  : "text-gray-600 hover:bg-gray-50"
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
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
                  className="rounded-3xl border border-gray-200 bg-gray-50 p-5 h-28"
                />
              ))}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-1 gap-3">
              {/* Attendance Card */}
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                    {summary.attendancePercent}% Present
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black text-gray-900">
                    {summary.presentCount} / {summary.totalEnrolled}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.absentCount} Student
                    {summary.absentCount !== 1 ? "s" : ""} Absent Today
                  </p>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{ width: `${summary.attendancePercent}%` }}
                  />
                </div>
              </div>

              {/* Needs Revision Card */}
              <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm ring-1 ring-amber-200/60">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                    <RotateCcw className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-200">
                    Revision Mode
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black text-amber-950">
                    {summary.needsRevisionCount} Student
                    {summary.needsRevisionCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-amber-800/80 mt-1">
                    Repeating Lessons Due to Mistakes
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Puthiya Padam Stepper Locked at 0</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
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
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
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
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
              No students flagged for attention. 🎉
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {attentionList.map((item) => (
                <div
                  key={String(item.id)}
                  className={`rounded-3xl border p-4 shadow-sm transition ${
                    item.severity === "high"
                      ? "border-red-200 bg-red-50/40 ring-1 ring-red-100"
                      : "border-amber-200 bg-amber-50/40 ring-1 ring-amber-100"
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
                        <h3 className="font-bold text-sm text-gray-900">
                          {item.studentName}
                        </h3>
                        <p className="text-[11px] text-gray-500">
                          ID: {item.rollNumber}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                        item.severity === "high"
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}
                    >
                      {item.reason}
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs text-gray-700 font-medium">
                    {item.details}
                  </p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-200/50">
                    <span className="text-[10px] text-gray-500 font-medium">
                      Duration: {item.daysCount} days active
                    </span>
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Report an Issue Form ───────────────────────────────────── */}
      {activeTab === "report" && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-madrasa-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Report an Issue Form
              </h2>
            </div>
            <span className="text-xs text-gray-400">
              Flag to Admin / Parent
            </span>
          </div>

          <form
            onSubmit={handleReportSubmit}
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4"
          >
            {/* Select Student */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Select Student <span className="text-red-500">*</span>
              </label>
              {loadingStudents ? (
                <div className="h-10 w-full rounded-2xl bg-gray-100 animate-pulse" />
              ) : (
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 outline-none transition focus:border-madrasa-500 focus:bg-white focus:ring-2 focus:ring-madrasa-100"
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
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
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
              <div className="flex gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1">
                {(["Admin", "Parent", "Both"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRecipient(r)}
                    className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition ${
                      recipient === r
                        ? "bg-white text-gray-900 shadow-xs ring-1 ring-gray-200"
                        : "text-gray-500 hover:text-gray-800"
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
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 outline-none transition focus:border-madrasa-500 focus:bg-white focus:ring-2 focus:ring-madrasa-100"
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
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Progress History
                  </h2>
                </div>
              </div>

              {loadingProgressReports ? (
                <CardSkeleton rows={4} />
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Archived Summaries */}
                  {progressReports.archivedSummaries.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 mb-3 ml-1">
                        Monthly Totals
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {progressReports.archivedSummaries.map((s) => {
                          const monthName = new Date(
                            s.year,
                            s.month - 1,
                          ).toLocaleString("default", { month: "long" });
                          return (
                            <div
                              key={s._id}
                              className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-1"
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-gray-900">
                                  {s.studentId?.name || "Student"}
                                </span>
                                <span className="text-xs font-bold text-madrasa-700 bg-madrasa-50 px-2 py-0.5 rounded-full border border-madrasa-100">
                                  {monthName} {s.year}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-xs text-gray-600">
                                <div>
                                  Puthiya:{" "}
                                  <strong className="text-gray-900">
                                    {s.totalNewLinesLearned}
                                  </strong>
                                </div>
                                <div>
                                  Juzu:{" "}
                                  <strong className="text-gray-900">
                                    {s.totalJuzuPadam}
                                  </strong>
                                </div>
                                <div>
                                  Pazhaya:{" "}
                                  <strong className="text-gray-900">
                                    {s.totalRevisions}
                                  </strong>
                                </div>
                                <div>
                                  Max Juzu:{" "}
                                  <strong className="text-gray-900">
                                    {s.maxJuzuReached}
                                  </strong>
                                </div>
                                {s.daysAbsent > 0 && (
                                  <div className="text-red-500 font-semibold">
                                    Absences: {s.daysAbsent}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recent Daily Progress */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-3 ml-1">
                      Recent Daily Logs
                    </h3>
                    {progressReports.recentProgress.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                        No recent daily progress found.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {progressReports.recentProgress.map((p) => {
                          const dateStr = new Date(p.date).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          );
                          return (
                            <div
                              key={p._id}
                              className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm flex justify-between items-center gap-2"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900">
                                  {p.studentId?.name || "Student"}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {dateStr}
                                </span>
                              </div>
                              {p.isAbsent ? (
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                                  Absent
                                </span>
                              ) : (
                                <div className="flex gap-2 text-xs">
                                  <div className="flex flex-col items-center bg-gray-50 px-2 py-1 rounded-lg">
                                    <span className="text-[9px] text-gray-500 uppercase font-bold">
                                      Pu
                                    </span>
                                    <span className="font-bold text-gray-900">
                                      {p.puthiyaPadam}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-center bg-gray-50 px-2 py-1 rounded-lg">
                                    <span className="text-[9px] text-gray-500 uppercase font-bold">
                                      Ju
                                    </span>
                                    <span className="font-bold text-gray-900">
                                      {p.juzuPadam}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-center bg-gray-50 px-2 py-1 rounded-lg">
                                    <span className="text-[9px] text-gray-500 uppercase font-bold">
                                      Pa
                                    </span>
                                    <span className="font-bold text-gray-900">
                                      {p.pazhayaPadam}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
