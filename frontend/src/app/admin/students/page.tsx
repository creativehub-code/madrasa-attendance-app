'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  Search,
  X,
  Check,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Users,
  Loader2,
  ShieldCheck,
  Plus,
  BookOpen,
} from 'lucide-react';
import { useAdminTheme } from '@/context/AdminThemeContext';
import { STANDARDS } from '@/types';
import {
  fetchAdminStudents,
  fetchAdminTeachers,
  fetchClasses,
  fetchSections,
  createClass,
  createStudent,
  formatTeacherName,
  type AdminStudent,
  type AdminTeacher,
  type CreateStudentResult,
  type ClassItem,
} from '@/lib/api';
import StudentDetailsModal from '@/components/admin/StudentDetailsModal';
import CreateStudentModal from '@/components/admin/CreateStudentModal';

// ── Debounce Hook ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentGroup {
  groupName: string;
  teacherUsername: string;
  students: AdminStudent[];
}

type FilterTab = 'all' | 'class' | 'standard';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 px-4 py-4">
          <div className="h-10 w-10 rounded-2xl bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded-full bg-gray-100" />
            <div className="h-2.5 w-3/5 rounded-full bg-gray-100" />
          </div>
          <div className="h-6 w-16 rounded-2xl bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const { darkMode } = useAdminTheme();
  const queryClient = useQueryClient();

  // ── Queries ─────────────────────────────────────────────────────────────────
  const {
    data: studentsData,
    isLoading: isLoadingStudents,
    isFetching: isFetchingStudents,
    isError: isStudentsError,
    error: studentsError,
  } = useQuery({
    queryKey: ['adminStudents'],
    queryFn: async () => {
      const res = await fetchAdminStudents({ limit: 200 });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: teachersData } = useQuery({
    queryKey: ['adminTeachers'],
    queryFn: async () => {
      const res = await fetchAdminTeachers();
      return res.data.teachers;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetchClasses();
      return res.data.classes;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: sectionsData } = useQuery({
    queryKey: ['adminSections'],
    queryFn: async () => {
      const res = await fetchSections();
      return res.data.sections;
    },
    staleTime: 5 * 60 * 1000,
  });

  const defaultSections = ['Noorani Qaida', 'Hifz', 'Daura'];
  const sectionsList = useMemo(() => {
    const fetched = sectionsData || [];
    const set = new Set([...defaultSections, ...fetched]);
    return Array.from(set);
  }, [sectionsData]);

  const teachers = teachersData || [];
  const classesList = classesData || [];
  const students = studentsData?.students || [];
  const totalCount = studentsData?.total || 0;
  const isLoading = isLoadingStudents;
  const error = isStudentsError
    ? studentsError instanceof Error
      ? studentsError.message
      : 'Failed to load data. Please try again.'
    : null;

  // ── UI state ────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StudentGroup | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ── Groupings using useMemo ──────────────────────────────────────────────────

  // Group strictly by Class Name (incorporating classesList populated students and flat students array)
  const classGroups: StudentGroup[] = useMemo(() => {
    const groupMap: Record<string, StudentGroup> = {};

    // 1. Pre-fill groups from classesList with populated students & teacher info
    classesList.forEach((cls) => {
      const clsName = cls.name.trim();
      if (clsName) {
        const assignedTeacher = teachers.find(
          (t) =>
            (t.assignedClass && typeof t.assignedClass === 'object'
              ? t.assignedClass._id === cls._id
              : t.assignedClass === cls._id) || t.assignedClassName === clsName
        );
        const tName = assignedTeacher ? assignedTeacher.name : cls.teacher?.fullName || cls.teacher?.username || '';

        const populatedStudents: AdminStudent[] = (cls.students || []).map((s) => {
          const tUser =
            typeof s.teacherId === 'object' && s.teacherId !== null
              ? (s.teacherId.fullName || s.teacherId.username || tName)
              : tName;

          return {
            _id: s._id,
            name: s.name,
            rollNumber: s.admissionNumber,
            standard: s.standard || '',
            section: s.section || '',
            className: clsName,
            status: (s.status as 'Active' | 'Discontinued') || 'Active',
            parentUsername: '—',
            teacherUsername: tUser,
            needsRevision: false,
            isActive: true,
          };
        });

        groupMap[clsName] = {
          groupName: clsName,
          teacherUsername: tName,
          students: populatedStudents,
        };
      }
    });

    // 2. Merge flat student records into groupMap
    students.forEach((s) => {
      const clsName =
        s.className?.trim() ||
        (typeof s.classId === 'object' && s.classId !== null ? s.classId.name : '') ||
        (s.class && typeof s.class === 'object' ? s.class.name : '') ||
        '';
      const cls = clsName.trim() ? clsName.trim() : 'Unassigned Class';
      if (!groupMap[cls]) {
        groupMap[cls] = {
          groupName: cls,
          teacherUsername: cls === 'Unassigned Class' ? '' : s.teacherUsername,
          students: [],
        };
      }
      if (!groupMap[cls].students.some((st) => st._id === s._id)) {
        groupMap[cls].students.push(s);
      }
    });

    return Object.values(groupMap).sort((a, b) => {
      if (a.groupName === 'Unassigned Class') return 1;
      if (b.groupName === 'Unassigned Class') return -1;
      return a.groupName.localeCompare(b.groupName);
    });
  }, [students, classesList, teachers]);

  // Group by Standard
  const standardGroups: StudentGroup[] = useMemo(() => {
    const groupMap: Record<string, StudentGroup> = {};
    students.forEach((s) => {
      const std = s.standard || '1st Standard';
      if (!groupMap[std]) {
        groupMap[std] = { groupName: std, teacherUsername: s.teacherUsername, students: [] };
      }
      groupMap[std].students.push(s);
    });
    return Object.values(groupMap).sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [students]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const loadStudents = () => {
    queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
    queryClient.invalidateQueries({ queryKey: ['adminTeachers'] });
    queryClient.invalidateQueries({ queryKey: ['adminClasses'] });
    queryClient.invalidateQueries({ queryKey: ['classes'] });
    queryClient.invalidateQueries({ queryKey: ['teacherStudents'] });
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered lists based on search
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = debouncedSearchTerm.toLowerCase();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        (s.className && s.className.toLowerCase().includes(q)) ||
        (s.standard && s.standard.toLowerCase().includes(q)) ||
        (s.parentUsername && s.parentUsername.toLowerCase().includes(q)) ||
        (s.teacherUsername && s.teacherUsername.toLowerCase().includes(q)) ||
        (s.status && s.status.toLowerCase().includes(q))
      );
    });
  }, [students, debouncedSearchTerm]);

  const filteredClassGroups = useMemo(() => {
    return classGroups.filter(
      (g) =>
        g.groupName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        g.teacherUsername.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        g.students.some(
          (s) =>
            s.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            s.rollNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
    );
  }, [classGroups, debouncedSearchTerm]);

  const filteredStandardGroups = useMemo(() => {
    return standardGroups.filter(
      (g) =>
        g.groupName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        g.teacherUsername.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        g.students.some(
          (s) =>
            s.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            s.rollNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
    );
  }, [standardGroups, debouncedSearchTerm]);

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
            Students &amp; Classes
          </h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {isLoading ? (
              <span className="inline-block h-3.5 w-48 animate-pulse rounded-full bg-gray-200" />
            ) : error ? (
              'Unable to load student count'
            ) : (
              `${totalCount} enrolled student${totalCount !== 1 ? 's' : ''} across ${classGroups.length} class${classGroups.length !== 1 ? 'es' : ''}`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadStudents}
            title="Refresh"
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              darkMode
                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading || isFetchingStudents ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-madrasa-700 text-white ring-4 ring-madrasa-100 shadow-md hover:bg-madrasa-800 transition active:scale-95"
            title="Create New Student"
          >
            <UserPlus className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Search Bar & 3 Filter Tabs ('All Students', 'By Class', 'By Standard') ── */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search students, roll #, class or parent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full rounded-2xl border py-2.5 pl-10 pr-4 text-sm outline-none transition ${
              darkMode
                ? 'border-gray-800 bg-gray-900 text-white placeholder:text-gray-600'
                : 'border-gray-200 bg-white text-gray-900 focus:border-madrasa-500'
            }`}
          />
        </div>

        {/* 3 Filter Tabs Segment */}
        <div
          className={`flex rounded-2xl border p-1 shrink-0 gap-1 ${
            darkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100/80 border-gray-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filterTab === 'all'
                ? 'bg-madrasa-700 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All Students ({filteredStudents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('class')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filterTab === 'class'
                ? 'bg-madrasa-700 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            By Class
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('standard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filterTab === 'standard'
                ? 'bg-madrasa-700 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            By Standard
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <div>
            <p className="font-semibold text-red-800">Failed to load students</p>
            <p className="mt-0.5 text-sm text-red-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={loadStudents}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-red-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Content View based on active FilterTab */}
      {!error && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {filterTab === 'all'
                ? 'All Enrolled Students'
                : filterTab === 'class'
                ? 'Students Grouped By Class'
                : 'Students Grouped By Standard'}
            </h2>
            {!isLoading && (
              <span className="text-xs font-semibold text-madrasa-700 dark:text-madrasa-400">
                {filterTab === 'all' ? 'Click a student to view details' : 'Click a group to view roster'}
              </span>
            )}
          </div>

          {isLoading ? (
            <ListSkeleton rows={4} />
          ) : filterTab === 'all' ? (
            /* 1. Flat All Students View */
            filteredStudents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  {searchTerm ? 'No students match your search.' : 'No students available.'}
                </p>
              </div>
            ) : (
              <div
                className={`rounded-3xl border shadow-sm overflow-hidden transition ${
                  darkMode ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredStudents.map((student) => (
                    <div
                      key={student._id}
                      onClick={() => setSelectedStudent(student)}
                      className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-800/60 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-bold text-sm ${
                            student.status === 'Discontinued'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                              : darkMode
                              ? 'bg-gray-800 text-madrasa-400'
                              : 'bg-madrasa-100 text-madrasa-700'
                          }`}
                        >
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {student.name}
                            </h3>
                            {student.status === 'Discontinued' && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-700">
                                Discontinued
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {student.className || student.standard || '1st Standard'} • Section: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{student.section || 'Noorani Qaida'}</span> • Roll #{student.rollNumber} • Teacher:{' '}
                            <span className="font-semibold">{formatTeacherName(student.teacherUsername)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-madrasa-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : filterTab === 'class' ? (
            /* 2. Grouped By Class View */
            filteredClassGroups.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  {searchTerm
                    ? 'No classes match your search.'
                    : 'No class groups found. Create your first student using the + button.'}
                </p>
              </div>
            ) : (
              <div
                className={`rounded-3xl border shadow-sm overflow-hidden transition ${
                  darkMode
                    ? 'border-gray-800 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredClassGroups.map((group) => (
                    <div
                      key={group.groupName}
                      onClick={() => setSelectedGroup(group)}
                      className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-800/60 transition group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-bold text-sm ${
                            darkMode ? 'bg-gray-800 text-madrasa-400' : 'bg-madrasa-100 text-madrasa-700'
                          }`}
                        >
                          {group.groupName.replace('Class ', '').slice(0, 2)}
                        </div>
                        <div>
                          <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {group.groupName}
                          </h3>
                          {group.groupName !== 'Unassigned Class' && group.teacherUsername && group.teacherUsername !== '—' ? (
                            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Teacher: <span className="font-semibold">{formatTeacherName(group.teacherUsername)}</span>
                            </p>
                          ) : (
                            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Unassigned
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-2xl border ${
                            darkMode
                              ? 'bg-gray-800 text-madrasa-400 border-gray-700'
                              : 'bg-madrasa-100 text-madrasa-700 border-madrasa-200/60'
                          }`}
                        >
                          {group.students.length} student{group.students.length !== 1 ? 's' : ''}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-madrasa-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            /* 3. Grouped By Standard View */
            filteredStandardGroups.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  {searchTerm ? 'No standards match your search.' : 'No standard groups found.'}
                </p>
              </div>
            ) : (
              <div
                className={`rounded-3xl border shadow-sm overflow-hidden transition ${
                  darkMode
                    ? 'border-gray-800 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-900'
                }`}
              >
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredStandardGroups.map((group) => (
                    <div
                      key={group.groupName}
                      onClick={() => setSelectedGroup(group)}
                      className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-800/60 transition group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-bold text-sm ${
                            darkMode ? 'bg-gray-800 text-madrasa-400' : 'bg-madrasa-100 text-madrasa-700'
                          }`}
                        >
                          {group.groupName.slice(0, 2)}
                        </div>
                        <div>
                          <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {group.groupName}
                          </h3>
                          <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            School Standard &bull; {group.students.length} student{group.students.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-2xl border ${
                            darkMode
                              ? 'bg-gray-800 text-madrasa-400 border-gray-700'
                              : 'bg-madrasa-100 text-madrasa-700 border-madrasa-200/60'
                          }`}
                        >
                          {group.students.length} student{group.students.length !== 1 ? 's' : ''}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-madrasa-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Class Roster Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 ${
              darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
            }`}
          >
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold">{selectedGroup.groupName} — Roster</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {selectedGroup.students.length} Enrolled Student{selectedGroup.students.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {selectedGroup.students.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No students in this group.</p>
              ) : (
                selectedGroup.students.map((student) => (
                  <div
                    key={student._id}
                    onClick={() => setSelectedStudent(student)}
                    className={`rounded-2xl border p-3 cursor-pointer hover:ring-2 hover:ring-madrasa-500/50 transition ${
                      darkMode ? 'border-gray-800 bg-gray-800/60' : 'border-gray-100 bg-gray-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            darkMode ? 'bg-gray-700 text-madrasa-400' : 'bg-madrasa-100 text-madrasa-700'
                          }`}
                        >
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-gray-900 dark:text-white">
                            {student.name}
                          </h4>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            Teacher:{' '}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {formatTeacherName(student.teacherUsername)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          {student.rollNumber}
                        </span>
                        {student.needsRevision && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 border border-amber-100">
                            Needs Revision
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedGroup(null)}
                className="rounded-xl bg-madrasa-700 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-madrasa-800 transition"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      <CreateStudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teachers={teachers}
        classes={classesList}
        sections={sectionsList}
      />

      {/* Student Details Modal */}
      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          teachers={teachers}
          classes={classesList}
          sections={sectionsList}
        />
      )}
    </main>
  );
}
