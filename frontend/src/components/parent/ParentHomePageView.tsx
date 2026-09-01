'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Clock,
  Check,
  Sparkles,
  Loader2,
  GraduationCap,
  Bell,
  UserX,
  Zap,
} from 'lucide-react';
import {
  fetchParentChildren,
  fetchParentDailyProgress,
  fetchParentAnnouncements,
  fetchHolidays,
  type ParentChild,
} from '@/lib/api';
import type { Holiday } from '@/types';
import { getStudentCategory } from '@/lib/studentCategory';
import { formatFraction } from '@/components/teacher/StepperField';

export default function ParentHomePageView() {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [showChildSwitcher, setShowChildSwitcher] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Fetch Parent's Children
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

  // 2. Fetch Daily Progress for active child
  const {
    data: dailyData,
    isLoading: isDailyLoading,
    isFetching: isDailyFetching,
    isError: isDailyError,
    refetch: refetchDaily,
  } = useQuery({
    queryKey: ['parentDashboard', activeChildId],
    queryFn: async () => {
      const res = await fetchParentDailyProgress(activeChildId!);
      return res.data;
    },
    enabled: !!activeChildId,
    staleTime: 5 * 60 * 1000,
  });

  // 3. Fetch Announcements
  const { data: announcementsData } = useQuery({
    queryKey: ['parentAnnouncements'],
    queryFn: async () => {
      const res = await fetchParentAnnouncements();
      return res.data.announcements;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 4. Fetch Holidays
  const { data: holidaysData } = useQuery({
    queryKey: ['holidays', todayDateStr],
    queryFn: async () => {
      const res = await fetchHolidays();
      return res.data.holidays;
    },
    staleTime: 5 * 60 * 1000,
  });
  
  const holidays: Holiday[] = holidaysData || [];
  const today = new Date();
  const activeHoliday = holidays.find(h => {
    const start = new Date(h.startDate);
    const end = new Date(h.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return today >= start && today <= end && (h.isGlobal || h.classId === activeChild?.classId);
  });


  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Render Loading State for Children Initial Load ─────────────────────────
  if (isChildrenLoading) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm font-semibold text-gray-400">Initializing parent dashboard…</p>
      </div>
    );
  }

  // ── Render Error State for Children Load ──────────────────────────────────
  if (isChildrenError) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 py-20 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 backdrop-blur-md">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Failed to load student profiles</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Could not retrieve student details from the server. Please verify connection.
        </p>
        <button
          onClick={() => refetchChildren()}
          className="mt-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-emerald-600 transition-all duration-300"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Render Zero Children Edge Case ────────────────────────────────────────
  if (!activeChild || children.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 py-24 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900/40 text-gray-400 border border-white/10 backdrop-blur-xl">
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

  const avatarInitial = activeChild.name ? activeChild.name.charAt(0).toUpperCase() : 'S';
  const currentJuzu = dailyData?.progress?.juzuNumber ?? activeChild.currentJuzuNumber ?? 1;
  const progressRecord = dailyData?.progress;
  const needsRevision = progressRecord ? progressRecord.needsRevision : activeChild.needsRevision;
  const revisionReason = progressRecord?.notes || activeChild.revisionReason || 'Lesson repetition requested by teacher.';

  // SVG Gauge percentage calculation for Juzu Ring (Max Juzu = 30)
  const juzuPercentage = Math.min(Math.max((currentJuzu / 30) * 100, 5), 100);
  const strokeDashoffset = 251.2 - (251.2 * juzuPercentage) / 100;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-36 pt-3 px-3">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-2xl bg-gray-900/90 dark:bg-[#18181B]/95 px-4 py-3 text-xs font-bold text-white shadow-2xl backdrop-blur-xl border border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── LOGO BANNER ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <img src="/logo.png" alt="Madrasa Portal Logo" className="h-9 w-auto object-contain opacity-95" />
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 backdrop-blur-md">
          <Zap className="h-3 w-3" />
          <span>Live Sync</span>
        </span>
      </div>

      {activeHoliday && (
        <div className="mx-1 mt-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 shadow-lg shadow-orange-500/20 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">Today is a {activeHoliday.isGlobal ? 'Global Holiday' : 'Class Holiday'}</h3>
            <p className="text-xs font-medium text-orange-100">{activeHoliday.title}</p>
          </div>
          <Sparkles className="h-5 w-5 text-orange-200" />
        </div>
      )}

      {/* ── 1. ACTIVE STUDENT HEADER (One-Line Header) ──────────────────────────── */}
      <header className="flex items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-2 flex-wrap text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
          <button
            type="button"
            onClick={() => setShowChildSwitcher(!showChildSwitcher)}
            className="group flex items-center gap-1.5 transition hover:text-emerald-500 active:scale-95"
          >
            <span>{activeChild.name}</span>
            <ChevronDown className={`h-4 w-4 text-gray-400 group-hover:text-emerald-500 transition-transform duration-300 ${showChildSwitcher ? 'rotate-180' : ''}`} />
          </button>
          <span className="text-gray-400 font-normal">•</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-300">
            {activeChild.className || 'Madrasa Student'}
          </span>
          <span className="text-gray-400 font-normal">•</span>
          <span className="text-xs font-medium text-gray-400">
            Roll: {activeChild.rollNo}
          </span>
        </div>

        {children.length > 1 && (
          <button
            type="button"
            onClick={() => setShowChildSwitcher(!showChildSwitcher)}
            className="shrink-0 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200/60 dark:border-white/10 px-3 py-1.5 text-[11px] font-bold text-gray-700 dark:text-gray-300 transition-all duration-300 active:scale-95"
          >
            Switch ({children.length})
          </button>
        )}
      </header>

      {/* Child Switcher Drawer */}
      {showChildSwitcher && (
        <div className="rounded-3xl border border-gray-200/80 dark:border-white/10 bg-white/90 dark:bg-gray-900/90 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-white/10 mb-2.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Linked Wards</span>
            <span className="text-[11px] font-bold text-emerald-500">{children.length} Enrolled</span>
          </div>
          <div className="flex flex-col gap-2">
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => {
                  setSelectedChildId(child.id);
                  setShowChildSwitcher(false);
                  showNotification(`Switched view to ${child.name}`);
                }}
                className={`flex items-center justify-between rounded-2xl p-3 text-left transition-all duration-200 active:scale-95 border ${
                  activeChildId === child.id
                    ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white border-emerald-600 shadow-md shadow-emerald-900/20'
                    : 'bg-gray-50/80 dark:bg-white/5 text-gray-800 dark:text-gray-200 border-gray-200/50 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-extrabold text-xs ${
                    activeChildId === child.id ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {child.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-xs">{child.name}</p>
                    <p className={`text-[11px] ${activeChildId === child.id ? 'text-white/80' : 'text-gray-400'}`}>
                      {child.className}
                    </p>
                  </div>
                </div>
                {activeChildId === child.id && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state indicator during child switch */}
      {(isDailyLoading || isDailyFetching) ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 p-12 backdrop-blur-xl shadow-sm gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
          <p className="text-xs font-bold text-gray-400">Updating daily progress data…</p>
        </div>
      ) : isDailyError ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center backdrop-blur-xl shadow-sm">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500 mb-2" />
          <p className="text-xs font-bold text-red-400">Failed to load today&apos;s progress</p>
          <button
            onClick={() => refetchDaily()}
            className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/20"
          >
            Retry
          </button>
        </div>
      ) : (() => {
        const category = getStudentCategory(activeChild);
        const isQaida = category === 'Noorani Qaida';
        const isDowra = category === 'Dowra';
        const dowraCountNum = progressRecord?.dowraCount || activeChild?.dowraCount || 1;

        return (
          <>
            {/* ── 2. BENTO GRID SECTION: TODAY'S LESSONS ───────────────────────── */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-500" />
                  <h2 className="text-[11px] font-extrabold tracking-widest text-gray-500 dark:text-gray-400 uppercase">
                    {isQaida ? "Today's Qaida Progress" : isDowra ? "Today's Dowra Progress" : "Today's Lessons"}
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 backdrop-blur-md">
                  {category}
                </span>
              </div>

              {/* Main Bento Lesson Card with Soft Glow */}
              <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 p-5 shadow-sm dark:shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)] backdrop-blur-xl transition-all duration-300">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-madrasa-500 to-emerald-600 opacity-80" />

                <div className="flex items-center gap-5">
                  {/* High-End SVG Circular Progress Ring */}
                  <div className="relative flex flex-col items-center justify-center shrink-0">
                    <svg className="h-24 w-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        className="stroke-gray-100 dark:stroke-white/10 fill-none"
                        strokeWidth="7"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        className="stroke-emerald-500 fill-none transition-all duration-1000 ease-out"
                        strokeWidth="7"
                        strokeDasharray="251.2"
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        {isQaida ? "LESSON" : "JUZU"}
                      </span>
                      <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                        {currentJuzu}
                      </span>
                    </div>
                  </div>

                  {/* Lesson Cards Column */}
                  <div className="flex-1 flex flex-col gap-3 min-w-0">
                    {/* ── 1. NOORANI QAIDA CATEGORY VIEW ───────────────────────────────── */}
                    {isQaida ? (
                      <div className="flex flex-col gap-2 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/10 p-3.5 border border-emerald-500/20">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-emerald-700 dark:text-emerald-300">
                            Noorani Qaida Progress
                          </span>
                          <span className="rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
                            Lesson #{currentJuzu}
                          </span>
                        </div>
                        <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                          Currently studying Lesson #{currentJuzu}
                        </p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                          Learning foundational Arabic letters & recitation rules.
                        </p>
                      </div>
                    ) : (
                      /* ── 2. HIFZ (REGULAR) & DOWRA CATEGORIES VIEW ──────────────────── */
                      <>
                        {/* New Lesson (Puthiya Padam) Tile */}
                        <div className="flex flex-col gap-1.5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.04] p-3 border border-gray-100 dark:border-white/5 transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="font-bold text-xs text-gray-900 dark:text-white">
                                {isDowra ? "New Lesson (Juz #)" : "New Lesson"}
                              </span>
                            </div>
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400">New</span>
                          </div>
                          <div>
                            <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold ${
                              needsRevision || progressRecord?.isPuthiyaPadamWrong || progressRecord?.isPuthiyaPadamNotGiven
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {progressRecord?.isPuthiyaPadamWrong
                                ? '0 Lines (Wrong ❌)'
                                : progressRecord?.isPuthiyaPadamNotGiven
                                ? 'Not Given (തന്നില്ല)'
                                : needsRevision
                                ? '0 Lines (Locked)'
                                : progressRecord
                                  ? isDowra
                                    ? `Juz #${progressRecord.puthiyaPadam ?? 1}`
                                    : `${progressRecord.puthiyaPadam ?? 0} ${(progressRecord.puthiyaPadam ?? 0) === 1 ? 'Line' : 'Lines'}`
                                  : 'Not recorded yet'}
                            </span>
                          </div>
                        </div>

                        {/* Current Lesson / Current Sabqi Tile */}
                        <div className="flex flex-col gap-1.5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.04] p-3 border border-gray-100 dark:border-white/5 transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                              <span className="font-bold text-xs text-gray-900 dark:text-white">
                                {isDowra ? "Current Sabqi" : "Current Lesson"}
                              </span>
                            </div>
                            {isDowra ? (
                              <span className="rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black">
                                Dowra #{dowraCountNum}
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-400">Sabqi</span>
                            )}
                          </div>
                          <div>
                            <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold ${
                              progressRecord?.isCurrentLessonWrong || progressRecord?.isJuzuPadamNotGiven
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            }`}>
                              {progressRecord
                                  ? progressRecord.isCurrentLessonWrong
                                    ? '0 Pages (Wrong ❌)'
                                    : progressRecord.isJuzuPadamNotGiven
                                    ? 'Not Given (തന്നില്ല)'
                                    : `${progressRecord.juzuPadam ?? 0} ${(progressRecord.juzuPadam ?? 0) === 1 ? 'Page' : 'Pages'}`
                                  : 'Not recorded yet'}
                            </span>
                          </div>
                        </div>

                        {/* Old Lesson / Old Sabqi Tile */}
                        <div className="flex flex-col gap-1.5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.04] p-3 border border-gray-100 dark:border-white/5 transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <RotateCcw className="h-3.5 w-3.5 text-purple-500" />
                              <span className="font-bold text-xs text-gray-900 dark:text-white">
                                {isDowra ? "Old Sabqi" : "Old Lesson"}
                              </span>
                            </div>
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-purple-400">Revision</span>
                          </div>
                          <div>
                            <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold ${
                              progressRecord?.isPazhayaPadamWrong || progressRecord?.isPazhayaPadamNotGiven
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            }`}>
                              {progressRecord
                                  ? progressRecord.isPazhayaPadamWrong
                                    ? '0 Pages (Wrong ❌)'
                                    : progressRecord.isPazhayaPadamNotGiven
                                    ? 'Not Given (തന്നില്ല)'
                                    : `${progressRecord.pazhayaPadam ?? 0} ${(progressRecord.pazhayaPadam ?? 0) === 1 ? 'Page' : 'Pages'}`
                                  : 'Not recorded yet'}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

          {/* ── 3. BENTO GRID SECTION: SCHOOL UPDATES ───────────────────────── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                <h2 className="text-[11px] font-extrabold tracking-widest text-gray-500 dark:text-gray-400 uppercase">School Updates</h2>
              </div>
              <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 backdrop-blur-md">
                Secular Subjects
              </span>
            </div>

            {dailyData?.schoolProgress && dailyData.schoolProgress.length > 0 ? (
              <div className="flex flex-col gap-3">
                {dailyData.schoolProgress.map((sp) => (
                  <div
                    key={sp._id}
                    className="relative overflow-hidden rounded-[32px] border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 p-6 shadow-sm dark:shadow-[0_0_30px_-5px_rgba(59,130,246,0.12)] backdrop-blur-xl transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                        {sp.subject}
                      </span>
                      <span className="text-[10px] font-extrabold text-gray-400 tracking-wider">
                        {sp.className} • AY {sp.academicYear}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm text-gray-900 dark:text-white mt-1">{sp.unitTaught}</h3>
                    {sp.description && (
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{sp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[32px] border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 p-6 text-center shadow-sm backdrop-blur-xl">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">No secular school updates posted for today.</p>
              </div>
            )}
          </section>

          {/* ── 4. BENTO GRID SECTION: ATTENDANCE & ALERTS ───────────────────── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" />
                <h2 className="text-[11px] font-extrabold tracking-widest text-gray-500 dark:text-gray-400 uppercase">Attendance & Alerts</h2>
              </div>
              <span className="text-[11px] font-bold text-gray-400">{todayDateStr}</span>
            </div>

            {/* Attendance Card */}
            <div className="rounded-[32px] border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 p-6 shadow-sm backdrop-blur-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Today&apos;s Status</p>
                {progressRecord ? (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold border ${
                    !progressRecord.isAbsent
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                  }`}>
                    {!progressRecord.isAbsent ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span>{!progressRecord.isAbsent ? 'Present' : 'Absent'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-white/5 px-3 py-0.5 text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-white/10">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span>Not Recorded Yet</span>
                  </span>
                )}
                <p className="text-[11px] text-gray-400 mt-1.5 font-medium">
                  {progressRecord ? (
                    <>Logged for <span className="font-bold text-gray-800 dark:text-gray-200">{activeChild.name}</span></>
                  ) : (
                    <>Waiting for teacher entry</>
                  )}
                </p>
              </div>

              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                progressRecord && !progressRecord.isAbsent
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-200/50 dark:border-white/5'
              }`}>
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>

            {/* Revision Alert Banner */}
            {needsRevision && (
              <div className="rounded-[32px] border border-amber-500/30 bg-amber-500/10 p-6 shadow-lg shadow-amber-500/5 backdrop-blur-xl flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-xs text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span>Teacher&apos;s Revision Alert</span>
                      </h3>
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[9px] font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-widest border border-amber-500/30">
                        Action Required
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-amber-900 dark:text-amber-300 leading-relaxed">
                      {revisionReason}
                    </p>
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-end pt-2 border-t border-amber-500/20 text-[10px] font-extrabold text-amber-800 dark:text-amber-400">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Puthiya Padam Locked at 0</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── 5. BENTO GRID SECTION: MADRASA ANNOUNCEMENTS ────────────────── */}
          {announcementsData && announcementsData.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-purple-500" />
                  <h2 className="text-[11px] font-extrabold tracking-widest text-gray-500 dark:text-gray-400 uppercase">Madrasa Announcements</h2>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {announcementsData.slice(0, 5).map((ann) => (
                  <div
                    key={ann._id}
                    className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-purple-500/30"
                  >
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">{ann.message}</p>
                    <p className="mt-1.5 text-[10px] font-extrabold text-gray-400">
                      {new Date(ann.date || ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
        );
      })()}
    </div>
  );
}
