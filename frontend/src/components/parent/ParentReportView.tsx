'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  RefreshCw,
  AlertCircle,
  Loader2,
  UserX,
  Users,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchParentChildren,
  fetchParentMonthlyProgress,
  fetchParentReports,
  markParentReportRead,
  type ParentChild,
} from '@/lib/api';

type TabType = 'progress' | 'notices';

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

interface MonthTab {
  id: string;
  year: number;
  month: number;
  title: string;
}

function getRecentMonths(count = 6): MonthTab[] {
  const tabs: MonthTab[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const title = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    tabs.push({
      id: `${year}-${String(month).padStart(2, '0')}`,
      year,
      month,
      title,
    });
  }
  return tabs;
}

function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-[32px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 animate-pulse">
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

export default function ParentReportView() {
  const queryClient = useQueryClient();
  const monthTabs = useMemo(() => getRecentMonths(6), []);
  const [activeTab, setActiveTab] = useState<TabType>('progress');
  const [activeMonthId, setActiveMonthId] = useState<string>(monthTabs[0].id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [isFullMonthView, setIsFullMonthView] = useState(false);

  const activeMonthTab = monthTabs.find((m) => m.id === activeMonthId) || monthTabs[0];

  // 1. Fetch Parent Children
  const {
    data: childrenData,
    isLoading: isChildrenLoading,
    isError: isChildrenError,
    refetch: refetchChildren,
  } = useQuery({
    queryKey: ['parentChildren'],
    queryFn: async () => {
      const res = await fetchParentChildren();
      return res.data.children;
    },
    staleTime: 5 * 60 * 1000,
  });

  const children: ParentChild[] = childrenData || [];
  const activeChild = children.find((c) => c.id === (selectedChildId || children[0]?.id)) || children[0] || null;
  const activeChildId = activeChild?.id || null;

  // 2. Fetch Monthly Progress
  const {
    data: monthlyData,
    isLoading: isMonthlyLoading,
    isFetching: isMonthlyFetching,
  } = useQuery({
    queryKey: ['parentMonthlyProgress', activeChildId, activeMonthTab.year, activeMonthTab.month],
    queryFn: async () => {
      const res = await fetchParentMonthlyProgress({
        studentId: activeChildId!,
        year: activeMonthTab.year,
        month: activeMonthTab.month,
      });
      return res.data;
    },
    enabled: !!activeChildId,
    staleTime: 5 * 60 * 1000,
  });

  // 3. Fetch Parent Issue Reports
  const {
    data: reportsData,
    isLoading: isReportsLoading,
  } = useQuery({
    queryKey: ['parentReports'],
    queryFn: async () => {
      const res = await fetchParentReports();
      return res.data.reports;
    },
    staleTime: 5 * 60 * 1000,
  });
  const issueReports = reportsData || [];

  // Filter issue reports for active child
  const filteredReports = useMemo(() => {
    if (!issueReports || !activeChildId) return [];
    return issueReports.filter((r: any) => {
      const sId = typeof r.studentId === 'string' ? r.studentId : r.studentId?._id;
      return sId === activeChildId;
    });
  }, [issueReports, activeChildId]);

  const unreadNoticeCount = useMemo(() => {
    return filteredReports.filter((r: any) => !r.isReadByParent).length;
  }, [filteredReports]);

  // Mark report read mutation
  const markReportReadMutation = useMutation({
    mutationFn: markParentReportRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parentReports'] });
      toast.success('Notice marked as read');
    },
  });

  // Date strip logic
  const daysInMonth = new Date(activeMonthTab.year, activeMonthTab.month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const progressByDate = useMemo(() => {
    const map = new Map<number, any>();
    if (!monthlyData?.progress) return map;
    monthlyData.progress.forEach((p: any) => {
      const date = new Date(p.date).getDate();
      map.set(date, p);
    });
    return map;
  }, [monthlyData?.progress]);

  const actualSelectedDate = selectedDate !== null
    ? selectedDate
    : (progressByDate.size > 0 ? Math.max(...Array.from(progressByDate.keys())) : null);

  // Initial loading state
  if (isChildrenLoading) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-32 pt-6 px-4">
        <CardSkeleton rows={4} />
      </div>
    );
  }

  // Error state
  if (isChildrenError) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Failed to load student profiles</h2>
        <button
          onClick={() => refetchChildren()}
          className="rounded-2xl bg-madrasa-700 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-madrasa-800 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Zero children edge case
  if (!activeChild || children.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center min-h-[50vh] gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
          <UserX className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">No students linked to this account</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          There are currently no active students associated with your parent login credentials.
          Please contact the Madrasa administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 pb-32 pt-4 px-3 dark:text-white">

      {/* 1. PAGE HEADER (Reports Title Top, Child Details & Action Buttons on Same Line) */}
      <header className="px-1 py-1">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Reports
        </h1>

        <div className="flex flex-row justify-between items-center w-full mt-2">
          {/* Student Details Group */}
          <div className="flex flex-row items-center gap-2">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              {activeChild.name}
            </span>
            <span className="text-gray-400 font-normal text-xs">•</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {activeChild.className || 'Madrasa Student'}
            </span>
            {children.length > 1 && (
              <select
                value={activeChildId || ''}
                onChange={(e) => {
                  setSelectedChildId(e.target.value);
                  setSelectedDate(null);
                }}
                className="rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-madrasa-500 shadow-xs ml-1"
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Action Buttons Group (Progress & Notice) */}
          <div className="flex items-center gap-2">
            {[
              { id: 'progress' as TabType, label: 'Progress', icon: RefreshCw },
              {
                id: 'notices' as TabType,
                label: 'Notice',
                icon: AlertTriangle,
                badge: unreadNoticeCount > 0 ? unreadNoticeCount : undefined,
              },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-2xl py-2 px-4 text-xs font-bold transition active:scale-95 border ${
                    isActive
                      ? 'bg-madrasa-700 text-white border-madrasa-700 shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span
                      className={`flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-extrabold ${
                        isActive
                          ? 'bg-white text-madrasa-800'
                          : 'bg-madrasa-700 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── TAB 1: Progress History ───────────────────────────────────────── */}
      {activeTab === 'progress' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Progress History
              </h2>
            </div>
          </div>

          {(isMonthlyLoading || isMonthlyFetching) ? (
            <CardSkeleton rows={4} />
          ) : (
            <div className="flex flex-col gap-5">
              {/* Controls Row: View Toggle & Month Selector */}
              <div className="flex items-center justify-between gap-3 px-1">
                {/* View Toggle */}
                <div className="relative grid grid-cols-2 rounded-2xl bg-gray-100 dark:bg-gray-800 p-1 w-52 shrink-0 border border-gray-200 dark:border-gray-700">
                  <div
                    className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white dark:bg-gray-700 rounded-xl shadow-xs transition-transform duration-300 ease-in-out ${
                      isFullMonthView ? 'translate-x-full' : 'translate-x-0'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setIsFullMonthView(false)}
                    className={`relative z-10 py-1.5 text-xs font-bold rounded-xl transition-colors duration-300 ${
                      !isFullMonthView
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Daily View
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullMonthView(true)}
                    className={`relative z-10 py-1.5 text-xs font-bold rounded-xl transition-colors duration-300 ${
                      isFullMonthView
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Full Month
                  </button>
                </div>

                {/* Month Selector */}
                <select
                  value={activeMonthId}
                  onChange={(e) => {
                    setActiveMonthId(e.target.value);
                    setSelectedDate(null);
                  }}
                  className="w-[135px] rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 px-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-madrasa-500 shadow-xs"
                >
                  {monthTabs.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {!isFullMonthView ? (
                <>
                  {/* 3. CALENDAR DATE SLIDER */}
                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide snap-x px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {daysArray.map((day) => {
                      const hasData = progressByDate.has(day);
                      const isSelected = actualSelectedDate === day;
                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDate(day)}
                          className={`flex shrink-0 snap-center items-center justify-center w-11 h-11 rounded-2xl text-xs font-black transition-all duration-200 active:scale-95 ${
                            isSelected
                              ? 'bg-madrasa-700 text-white shadow-md ring-4 ring-madrasa-100 dark:ring-madrasa-900/40 scale-105'
                              : hasData
                              ? 'bg-madrasa-50 text-madrasa-900 border border-madrasa-200 dark:bg-madrasa-900/30 dark:text-madrasa-200 dark:border-madrasa-700 hover:bg-madrasa-100 hover:scale-105'
                              : 'bg-white dark:bg-gray-800 text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {/* 4. DETAILS CONTAINER & HEAVILY ROUNDED EMPTY STATE CARD */}
                  <div className="rounded-[32px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xs min-h-[180px] flex flex-col justify-center transition-all">
                    {actualSelectedDate && progressByDate.has(actualSelectedDate) ? (
                      <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                          <div className="flex flex-col">
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                              {new Date(activeMonthTab.year, activeMonthTab.month - 1, actualSelectedDate).toLocaleDateString('en-US', { weekday: 'long' })}
                            </span>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                              {new Date(activeMonthTab.year, activeMonthTab.month - 1, actualSelectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          {progressByDate.get(actualSelectedDate).isAbsent ? (
                            <span className="text-xs font-extrabold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 px-3 py-1.5 rounded-xl border border-red-100 dark:border-red-900/50 uppercase tracking-wide">
                              Absent
                            </span>
                          ) : progressByDate.get(actualSelectedDate).needsRevision ? (
                            <span className="text-xs font-extrabold text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-900/50 uppercase tracking-wide">
                              Needs Revision
                            </span>
                          ) : null}
                        </div>

                        {!progressByDate.get(actualSelectedDate).isAbsent ? (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-600">
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-wider mb-2">
                                Puthiya
                              </span>
                              <span className="text-xl font-black text-gray-900 dark:text-white">
                                {progressByDate.get(actualSelectedDate).isPuthiyaPadamWrong
                                  ? '0 Lines ❌'
                                  : `${progressByDate.get(actualSelectedDate).puthiyaPadam ?? 0} ${(progressByDate.get(actualSelectedDate).puthiyaPadam ?? 0) === 1 ? 'Line' : 'Lines'}`}
                              </span>
                            </div>
                            <div className="flex flex-col items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-3xl border border-blue-100 dark:border-blue-800/50">
                              <span className="text-[11px] text-blue-500 dark:text-blue-400 uppercase font-black tracking-wider mb-2">
                                Current Lesson
                              </span>
                              <span className="text-xl font-black text-blue-900 dark:text-blue-300">
                                {progressByDate.get(actualSelectedDate).isCurrentLessonWrong
                                  ? '0 Pages ❌'
                                  : `${progressByDate.get(actualSelectedDate).juzuPadam ?? 0} ${(progressByDate.get(actualSelectedDate).juzuPadam ?? 0) === 1 ? 'Page' : 'Pages'}`}
                              </span>
                            </div>
                            <div className="flex flex-col items-center bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800/50">
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-black tracking-wider mb-2">
                                Pazhaya
                              </span>
                              <span className="text-xl font-black text-emerald-900 dark:text-emerald-300">
                                {progressByDate.get(actualSelectedDate).isPazhayaPadamWrong
                                  ? '0 Pages ❌'
                                  : `${progressByDate.get(actualSelectedDate).pazhayaPadam ?? 0} ${(progressByDate.get(actualSelectedDate).pazhayaPadam ?? 0) === 1 ? 'Page' : 'Pages'}`}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 py-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
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
                      /* Structural Heavily Rounded Empty State Card */
                      <div className="flex flex-col items-center justify-center text-center text-xs text-gray-400 py-8 px-4 gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center text-gray-400 mb-1">
                          <Calendar className="h-5 w-5 opacity-80" />
                        </div>
                        <p className="font-bold text-sm text-gray-900 dark:text-white">No progress recorded for this day</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">Select a highlighted date from the calendar slider above to view details.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Full Month View */
                <div className="relative flex flex-col gap-6 max-h-[500px] overflow-y-auto pr-2 pb-4 scrollbar-hide">
                  {!monthlyData?.progress || monthlyData.progress.length === 0 ? (
                    <div className="rounded-[32px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 shadow-xs flex flex-col items-center justify-center text-center text-gray-400 gap-3">
                      <Users className="h-6 w-6 text-gray-300" />
                      <p className="font-semibold text-gray-500 dark:text-gray-400">No records found for {activeMonthTab.title}</p>
                    </div>
                  ) : (
                    <>
                      {/* Vertical Line */}
                      <div className="absolute left-[17px] top-6 bottom-6 border-l-2 border-gray-200 dark:border-gray-700" />

                      {[...monthlyData.progress]
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((p: any, idx: number) => {
                          const pDate = new Date(p.date);
                          const isAbsent = p.isAbsent;
                          return (
                            <div
                              key={p._id || idx}
                              className="relative pl-12 animate-in fade-in slide-in-from-bottom-2 duration-300"
                              style={{ animationFillMode: 'both', animationDelay: `${idx * 40}ms` }}
                            >
                              {/* Timeline Node */}
                              <div
                                className={`absolute left-[11px] top-6 h-3.5 w-3.5 rounded-full ring-4 ring-gray-50 dark:ring-gray-900 shadow-xs z-10 ${
                                  isAbsent ? 'bg-red-400' : 'bg-emerald-400'
                                }`}
                              />

                              {/* Card Content */}
                              <div className="rounded-[32px] border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xs flex flex-col gap-4">
                                <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-700 pb-3">
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {pDate.toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
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
                                      <span className="text-[9px] text-blue-500 dark:text-blue-400 uppercase font-black tracking-wider">
                                        Puthiya
                                      </span>
                                      <span className="text-sm font-black text-blue-700 dark:text-blue-300 mt-1">
                                        {p.isPuthiyaPadamWrong
                                          ? '0 Lines ❌'
                                          : `${p.puthiyaPadam ?? 0} ${(p.puthiyaPadam ?? 0) === 1 ? 'Line' : 'Lines'}`}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-center bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-100 dark:border-purple-800/50">
                                      <span className="text-[9px] text-purple-500 dark:text-purple-400 uppercase font-black tracking-wider">
                                        Current Lesson
                                      </span>
                                      <span className="text-sm font-black text-purple-700 dark:text-purple-300 mt-1">
                                        {p.isCurrentLessonWrong
                                          ? '0 Pages ❌'
                                          : `${p.juzuPadam ?? 0} ${(p.juzuPadam ?? 0) === 1 ? 'Page' : 'Pages'}`}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-center bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800/50">
                                      <span className="text-[9px] text-orange-600 dark:text-orange-400 uppercase font-black tracking-wider">
                                        Pazhaya
                                      </span>
                                      <span className="text-sm font-black text-orange-700 dark:text-orange-300 mt-1">
                                        {p.isPazhayaPadamWrong
                                          ? '0 Pages ❌'
                                          : `${p.pazhayaPadam ?? 0} ${(p.pazhayaPadam ?? 0) === 1 ? 'Page' : 'Pages'}`}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {p.notes && (
                                  <div className="text-xs text-gray-700 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/20 p-3.5 rounded-xl border border-amber-100 dark:border-amber-800/50 flex gap-2.5 items-start mt-1">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                      <strong className="text-amber-800 dark:text-amber-400 font-bold block mb-1">
                                        Teacher Notes
                                      </strong>
                                      <span className="font-medium text-amber-950/80 dark:text-amber-100/80 leading-relaxed">
                                        {p.notes}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Important Notices & Flags ─────────────────────────────── */}
      {activeTab === 'notices' && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Important Notices & Flags
              </h2>
            </div>
            {!isReportsLoading && (
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {filteredReports.length} Notice{filteredReports.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {isReportsLoading ? (
            <CardSkeleton rows={3} />
          ) : filteredReports.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-400">
              No notices flagged for {activeChild.name}. 🎉
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredReports.map((report: any) => {
                const isRead = report.isReadByParent;
                const teacherName = report.teacherId?.username || 'Ustad';

                return (
                  <div
                    key={report._id}
                    className={`rounded-[32px] border p-4 shadow-xs transition ${
                      isRead
                        ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 opacity-85'
                        : 'border-red-200 bg-red-50/40 ring-1 ring-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:ring-red-900/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${
                            isRead
                              ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                          }`}
                        >
                          {activeChild.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                            {activeChild.name}
                          </h3>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            From Ustad {teacherName} • {formatRelativeTime(report.createdAt)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                          isRead
                            ? 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                            : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/60 dark:text-red-300 dark:border-red-800'
                        }`}
                      >
                        {report.issueType || 'Notice'}
                      </span>
                    </div>

                    {report.notes && (
                      <p className="mt-2.5 text-xs text-gray-700 dark:text-gray-300 font-medium italic border-l-2 border-red-300 dark:border-red-700 pl-2.5 py-0.5">
                        &ldquo;{report.notes}&rdquo;
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                        Status: {isRead ? 'Acknowledged' : 'New Notice'}
                      </span>
                      {!isRead ? (
                        <button
                          type="button"
                          onClick={() => markReportReadMutation.mutate(report._id)}
                          disabled={markReportReadMutation.isPending}
                          className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
                        >
                          {markReportReadMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Mark Read</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                          <Check className="h-3.5 w-3.5" />
                          <span>Acknowledged</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
