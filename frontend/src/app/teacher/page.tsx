'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataEntryList from '@/components/teacher/DataEntryList';
import { fetchHolidays, createHoliday, deleteHoliday } from '@/lib/api';
import { CalendarDays, Sparkles, X, Loader2, Check, Trash2 } from 'lucide-react';
import type { Holiday } from '@/types';

export default function TeacherHomePage() {
  const queryClient = useQueryClient();
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayTitle, setHolidayTitle] = useState('Class Holiday');
  const [holidayStartDate, setHolidayStartDate] = useState('');
  const [holidayEndDate, setHolidayEndDate] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const todayDateStr = new Date().toLocaleDateString('en-US');

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const { data: holidaysData } = useQuery({
    queryKey: ['holidays', todayDateStr],
    queryFn: async () => {
      const res: any = await fetchHolidays();
      return res.data.holidays;
    },
    staleTime: 5 * 60 * 1000,
  });

  const holidays: Holiday[] = holidaysData || [];
  const todayDate = new Date();
  
  // Note: For teacher, they just see Global or their own Class holiday if backend returns it
  const activeHoliday = holidays.find(h => {
    const start = new Date(h.startDate);
    const end = new Date(h.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return todayDate >= start && todayDate <= end;
  });

  const holidayMutation = useMutation({
    mutationFn: createHoliday,
    onSuccess: () => {
      setIsHolidayModalOpen(false);
      setHolidayTitle('Class Holiday');
      setHolidayStartDate('');
      setHolidayEndDate('');
      showNotification('Class holiday created successfully!');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: (err) => {
      console.error('Failed to create holiday:', err);
      showNotification('Failed to create holiday. Please try again.');
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      showNotification('Class holiday cancelled successfully!');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: (err) => {
      console.error('Failed to cancel holiday:', err);
      showNotification('Failed to cancel holiday. Please try again.');
    },
  });

  const handleMarkTodayClassHoliday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setHolidayTitle('Class Holiday');
    setHolidayStartDate(todayStr);
    setHolidayEndDate(todayStr);
  };

  const handleHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    holidayMutation.mutate({
      title: holidayTitle,
      startDate: holidayStartDate,
      endDate: holidayEndDate,
      isGlobal: false,
    });
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Entry</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <span className="rounded-full bg-madrasa-100 px-2.5 py-0.5 text-xs font-semibold text-madrasa-700">
              Class 4A
            </span>
            <span>•</span>
            <span>{today}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsHolidayModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-orange-100 text-orange-700 px-3 py-1.5 text-xs font-bold hover:bg-orange-200 transition"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Class Holiday
          </button>
          <div className="h-10 w-10 overflow-hidden rounded-full bg-madrasa-100 ring-2 ring-madrasa-200">
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-madrasa-700">T</div>
          </div>
        </div>
      </header>

      {activeHoliday && (
        <div className="mb-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 shadow-lg shadow-orange-500/20 text-white flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm">Today is a {activeHoliday.isGlobal ? 'Global Holiday' : 'Class Holiday'}</h3>
            <p className="text-xs font-medium text-orange-100">{activeHoliday.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {!activeHoliday.isGlobal && (
              <button
                type="button"
                onClick={() => deleteHolidayMutation.mutate(activeHoliday._id)}
                disabled={deleteHolidayMutation.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 py-1.5 text-xs font-extrabold text-white transition active:scale-95 border border-white/30 disabled:opacity-50"
              >
                {deleteHolidayMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Cancel Holiday</span>
              </button>
            )}
            <Sparkles className="h-5 w-5 text-orange-200 shrink-0" />
          </div>
        </div>
      )}

      <DataEntryList />

      {/* Manage Class Holiday Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Mark Class Holiday</h3>
              </div>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleHolidaySubmit} className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-xs font-semibold text-gray-600">Quick Option:</span>
                <button
                  type="button"
                  onClick={handleMarkTodayClassHoliday}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-100 text-orange-800 px-3 py-1.5 text-xs font-bold hover:bg-orange-200 transition border border-orange-200"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Mark Today as Class Holiday
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Holiday Title</label>
                <input
                  required
                  type="text"
                  value={holidayTitle}
                  onChange={(e) => setHolidayTitle(e.target.value)}
                  placeholder="e.g. Teacher Absent"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-madrasa-500 focus:bg-white transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                  <input
                    required
                    type="date"
                    value={holidayStartDate}
                    onChange={(e) => setHolidayStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none focus:border-madrasa-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                  <input
                    required
                    type="date"
                    value={holidayEndDate}
                    onChange={(e) => setHolidayEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none focus:border-madrasa-500 focus:bg-white transition"
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={holidayMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-orange-700 transition disabled:opacity-60"
                >
                  {holidayMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Holiday
                </button>
              </div>
            </form>

            {holidays.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-3 flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-700">Existing Holidays ({holidays.length})</span>
                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {holidays.map((h) => (
                    <div key={h._id} className="flex items-center justify-between rounded-xl bg-gray-50 p-2.5 border border-gray-100">
                      <div>
                        <span className="text-xs font-bold text-gray-800">{h.title}</span>
                        <span className="ml-1.5 text-[10px] text-gray-500">
                          ({h.isGlobal ? 'Global' : 'Class'})
                        </span>
                      </div>
                      {!h.isGlobal && (
                        <button
                          type="button"
                          onClick={() => deleteHolidayMutation.mutate(h._id)}
                          disabled={deleteHolidayMutation.isPending}
                          className="flex items-center gap-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 text-[11px] font-bold border border-red-200 transition active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

