import toast from 'react-hot-toast';

const getApiBase = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const cleanUrl = url.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const API_BASE = getApiBase();

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
};

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('madrasa_token');
}

export function logoutUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('madrasa_token');
    localStorage.removeItem('role');
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    document.cookie = 'madrasa_auth=; path=/; max-age=0; SameSite=Strict';
    document.cookie = 'madrasa_role=; path=/; max-age=0; SameSite=Strict';
    document.cookie = 'madrasa_token=; path=/; max-age=0; SameSite=Strict';

    window.location.href = '/login';
  }
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    const token = getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token.replace(/^Bearer\s+/i, '')}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let data: any = {};
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || `Request failed with status ${res.status}` };
    }

    if (!res.ok) {
      if (res.status === 401 && path !== '/auth/login') {
        logoutUser();
      }
      const errMsg = typeof data?.message === 'string' ? data.message : `Request failed with status ${res.status}`;
      throw new Error(errMsg);
    }

    return data;
  } catch (error: unknown) {
    console.error('API Error:', error);

    let errorMessage = 'Something went wrong.';
    if (error instanceof Error) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        errorMessage = 'Network error. Please check your backend connection.';
      } else {
        errorMessage = error.message;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    toast.error(errorMessage);
    throw error instanceof Error ? error : new Error(errorMessage);
  }
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  role: string;
  mustChangePassword: boolean;
  className: string | null;
  phone?: string;
  email?: string;
  address?: string;
}

export async function fetchMe() {
  return api<{ success: boolean; data: { user: UserProfile } }>('/auth/me');
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  const res = await api<{ success: boolean; token?: string; message: string }>('/auth/change-password', {
    method: 'POST',
    body: payload,
  });

  if (res.success && res.token && typeof window !== 'undefined') {
    localStorage.setItem('madrasa_token', res.token);
  }

  return res;
}

// ── Teacher ────────────────────────────────────────────────────────────────

export interface TodayProgress {
  juzuNumber?: number;
  puthiyaPadam?: number;
  juzuPadam?: number;
  pazhayaPadam?: number;
  isAbsent?: boolean;
  needsRevision?: boolean;
  isPuthiyaPadamWrong?: boolean;
  isCurrentLessonWrong?: boolean;
  isPazhayaPadamWrong?: boolean;
  notes?: string;
}

export interface RawStudent {
  _id: string;
  name: string;
  rollNumber: string;
  admissionNumber?: string;
  standard?: string;
  section?: string;
  className?: string;
  needsRevision?: boolean;
  revisionReason?: string;
  currentJuzu?: number;
  status?: 'Active' | 'Discontinued';
  todayProgress?: TodayProgress | null;
}

export async function fetchTeacherStudents() {
  return api<{ success: boolean; data: { students: RawStudent[] } }>('/teacher/students');
}

export async function updateStudentJuzu(studentId: string, juzuNumber: number) {
  return api<{ success: boolean; data: { student: RawStudent } }>(`/students/${studentId}/juzu`, {
    method: 'PATCH',
    body: { juzuNumber },
  });
}

export interface TeacherSubmissionStatus {
  isSubmittedToday: boolean;
  isUnlocked?: boolean;
  submittedCount: number;
  totalStudents: number;
}

export async function fetchTeacherSubmissionStatus() {
  return api<{ success: boolean; data: TeacherSubmissionStatus }>('/teacher/submission-status');
}

export interface MonthlySummary {
  _id: string;
  studentId: { _id: string; name: string; admissionNumber: string; className?: string };
  teacherId: string;
  month: number;
  year: number;
  totalNewLinesLearned: number;
  totalJuzuPadam: number;
  totalRevisions: number;
  daysAbsent: number;
  daysNeedsRevision: number;
  maxJuzuReached: number;
}

export interface ProgressReportResponse {
  recentProgress: any[]; // Populated Progress entries
  archivedSummaries: MonthlySummary[];
}

export async function fetchTeacherProgressReports() {
  return api<{ success: boolean; data: ProgressReportResponse }>('/teacher/reports/progress');
}

export async function submitProgress(payload: unknown) {
  return api<{ success: boolean; data: { upserted: number; modified: number; total: number } }>(
    '/teacher/progress',
    { method: 'POST', body: payload }
  );
}

/** Alias kept for FlashcardProgressEntry compatibility */
export const bulkSubmitProgress = submitProgress;

export interface ClassSummary {
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
  attendancePercent: number;
  needsRevisionCount: number;
}

export async function fetchTeacherClassSummary() {
  return api<{ success: boolean; data: ClassSummary }>('/teacher/class-summary');
}

export interface AttentionStudent {
  id: string;
  studentName: string;
  rollNumber: string;
  reason: 'Frequent Absence' | 'Stuck on Lesson' | 'Needs Revision Repeat';
  details: string;
  daysCount: number;
  severity: 'high' | 'medium';
}

export async function fetchTeacherNeedsAttention() {
  return api<{ success: boolean; data: { attentionList: AttentionStudent[] } }>(
    '/teacher/needs-attention'
  );
}

export async function deleteTeacherNeedsAttention(id: string) {
  return api<{ success: boolean; message: string }>(`/teacher/needs-attention/${id}`, {
    method: 'DELETE',
  });
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  message: string;
  date: string;
  targetClass?: string;
  scheduledDate?: string;
}

export async function fetchTeacherAnnouncements() {
  return api<{ success: boolean; data: { announcements: AdminAnnouncement[] } }>(
    '/teacher/announcements'
  );
}

export interface ParentFeedback {
  id: string;
  studentName: string;
  parentName: string;
  date: string;
  category: 'Absence Notice' | 'Academic Query' | 'Medical Notice';
  message: string;
  read: boolean;
}

export async function fetchTeacherFeedbacks() {
  return api<{ success: boolean; data: { feedbacks: ParentFeedback[] } }>('/teacher/feedbacks');
}

export async function markFeedbackRead(id: string) {
  return api<{ success: boolean }>(`/teacher/feedbacks/${id}/read`, { method: 'PATCH' });
}

export async function flagStudentIssue(payload: {
  studentId: string;
  issueType: string;
  recipient: string;
  notes?: string;
}) {
  return api<{ success: boolean; data: { message: string } }>('/teacher/flag', {
    method: 'POST',
    body: payload,
  });
}

// ── Parent ─────────────────────────────────────────────────────────────────

export async function fetchParentDashboard() {
  return api<{ data: { student: unknown; progress: unknown; year: number; month: number } }>(
    '/parent/progress/daily'
  );
}

export async function submitParentFeedback(payload: { topic: string; message: string }) {
  return api('/parent/feedback', { method: 'POST', body: payload });
}

// ── Admin ──────────────────────────────────────────────────────────────────

export interface IssueReport {
  _id: string;
  studentId: { _id: string; name: string; admissionNumber: string; className: string };
  teacherId: { _id: string; username: string; role?: string };
  issueType: string;
  recipient: 'Admin' | 'Parent' | 'Both';
  notes: string;
  isReadByAdmin: boolean;
  isReadByParent: boolean;
  status?: 'Pending' | 'Agreed' | 'Rejected';
  createdAt: string;
}

export async function fetchAdminReports(page = 1, limit = 10) {
  return api<{
    success: boolean;
    data: {
      reports: IssueReport[];
      pagination: { currentPage: number; totalPages: number; totalReports: number };
    };
  }>(`/admin/reports?page=${page}&limit=${limit}`);
}

export async function markAdminReportRead(id: string) {
  return api<{ success: boolean }>(`/admin/reports/${id}/read`, { method: 'PATCH' });
}

export async function updateReportAction(id: string, action: 'Agreed' | 'Rejected') {
  return api<{ success: boolean; message: string; data: { report: IssueReport } }>(`/admin/reports/${id}/action`, {
    method: 'PATCH',
    body: { action },
  });
}

export async function deleteReport(id: string) {
  return api<{ success: boolean; message: string }>(`/admin/reports/${id}`, {
    method: 'DELETE',
  });
}

export interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  attendanceToday: number | null;
}

export async function fetchAdminStats() {
  return api<{ success: boolean; data: AdminStats }>('/admin/stats');
}

export interface AdminActivity {
  _id: string;
  actionType: string;
  message: string;
  performedBy?: { _id: string; username: string; role: string } | null;
  createdAt: string;
}

export async function fetchAdminRecentActivities(params?: { role?: string }) {
  const qs = new URLSearchParams();
  if (params?.role) qs.set('role', params.role);
  return api<{ success: boolean; data: { activities: AdminActivity[] } }>(
    `/admin/recent-activities${qs.toString() ? `?${qs}` : ''}`
  );
}

export interface AdminStudent {
  _id: string;
  name: string;
  rollNumber: string;
  standard?: string;
  section?: string;
  className?: string;
  classId?: string | { _id: string; name: string } | null;
  class?: { _id: string; name: string } | null;
  teacherId?: string | null;
  parentId?: string | null;
  needsRevision: boolean;
  isActive: boolean;
  status: 'Active' | 'Discontinued';
  teacherUsername: string;
  parentUsername: string;
}


export async function fetchAdminStudents(params?: { page?: number; limit?: number; search?: string; standard?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.search) qs.set('search', params.search);
  if (params?.standard) qs.set('standard', params.standard);
  return api<{ success: boolean; data: { students: AdminStudent[]; total: number } }>(
    `/admin/students${qs.toString() ? `?${qs}` : ''}`
  );
}

export interface AdminTeacher {
  _id: string;
  name: string;
  username?: string;
  role?: string;
  standards?: string[];
  assignedClassName?: string;
  status?: string;
  isActive?: boolean;
  studentCount: number;
  isSubmittedToday?: boolean;
}

export async function fetchAdminTeachers() {
  return api<{ success: boolean; data: { teachers: AdminTeacher[] } }>('/admin/teachers');
}

export async function unlockTeacherProgress(teacherId: string) {
  return api<{ success: boolean; message: string }>(`/admin/teacher-progress/${teacherId}/unlock`, {
    method: 'PATCH',
  });
}

/**
 * Helper to convert email addresses or raw usernames into human-readable teacher display names.
 * Example: "ustaza.zaynab@madrasa.org" -> "Ustaza Zaynab"
 *          "teacher@madrasa.org"       -> "Teacher"
 */
export function formatTeacherName(nameOrEmail?: string | null): string {
  if (!nameOrEmail || nameOrEmail === '—') return '—';
  let str = nameOrEmail.trim();
  if (str.includes('@')) {
    str = str.split('@')[0];
  }
  str = str.replace(/[._-]/g, ' ');
  return str
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export interface ClassItem {
  _id: string;
  name: string;
  description?: string;
}

export async function fetchClasses() {
  return api<{ success: boolean; data: { classes: ClassItem[] } }>('/classes');
}

export async function createClass(payload: { name: string; description?: string }) {
  return api<{ success: boolean; data: { class: ClassItem } }>('/classes', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchSections() {
  return api<{ success: boolean; data: { sections: string[] } }>('/admin/sections');
}

export interface AdminParent {
  id: string;
  username: string;
  name?: string;
}

export async function fetchAdminParents() {
  return api<{ success: boolean; data: { parents: AdminParent[] } }>('/admin/parents');
}

export interface CreateStudentPayload {
  studentName: string;
  standard?: string;
  section?: string;
  className?: string;
  classId?: string;
  teacherId: string;
  existingParentId?: string;
  parentUsername?: string;
  parentPassword?: string;
}

export interface CreateStudentResult {
  student: AdminStudent;
  credentials: { admissionNumber: string; parentUsername: string };
  parent?: { _id: string; username: string };
  message: string;
}

export async function createStudent(payload: CreateStudentPayload) {
  return api<{ success: boolean; data: CreateStudentResult }>('/admin/students/create', {
    method: 'POST',
    body: payload,
  });
}

export interface UpdateAdminStudentPayload {
  name?: string;
  standard?: string;
  section?: string;
  className?: string;
  classId?: string | null;
  teacherId?: string;
  status?: string;
}

export async function updateAdminStudent(id: string, payload: UpdateAdminStudentPayload) {
  return api<{ success: boolean; data: { message: string; student: any } }>(`/admin/students/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteAdminStudent(id: string) {
  return api<{ success: boolean; data: { message: string } }>(`/admin/students/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchAdminStudentProgress(id: string) {
  return api<{
    success: boolean;
    data: {
      totalLessonsAssigned: number;
      currentJuzu: number;
      recentPuthiyaPadamLines?: number;
      historicalPuthiyaPadamPages?: number;
      totalPuthiyaPadam?: number;
      totalPazhayaPadam?: number;
      totalJuzuPadam?: number;
      latestProgressDate: string | null;
      recentActivity: any[];
    };
  }>(`/admin/students/${id}/progress`);
}

export interface CreateTeacherPayload {
  username: string;  // email or any unique username
  password: string;
  fullName?: string;
  role?: string;
  standards?: string[];
  assignedClass?: string;
  assignedClassName?: string;
}

export interface CreateTeacherResult {
  teacher: {
    _id: string;
    username: string;
    role: string;
    mustChangePassword: boolean;
    standards?: string[];
    assignedClassName?: string;
  };
  message: string;
}

export async function createTeacher(payload: CreateTeacherPayload) {
  return api<{ success: boolean; data: CreateTeacherResult }>('/admin/teachers/create', {
    method: 'POST',
    body: payload,
  });
}

// ── Teacher Management (Admin) ─────────────────────────────────────────────

export interface TeacherStudent {
  _id: string;
  name: string;
  rollNumber: string;
  standard?: string;
  section?: string;
  className?: string;
  status?: string;
  parentUsername?: string;
}

export interface TeacherDetailsResponse {
  teacher: {
    _id: string;
    name: string;
    role: string;
    standards: string[];
    assignedClassName: string;
    status: string;
    isActive: boolean;
  };
  students: TeacherStudent[];
}

export async function fetchAdminTeacherStudents(teacherId: string) {
  return api<{ success: boolean; data: TeacherDetailsResponse }>(`/admin/teachers/${teacherId}/students`);
}

export async function terminateTeacher(teacherId: string) {
  return api<{ success: boolean; data: { message: string } }>(`/admin/teachers/${teacherId}/terminate`, {
    method: 'PATCH',
  });
}

export interface UpdateTeacherPayload {
  standards?: string[];
  assignedClass?: string | null;
  assignedClassName?: string;
  status?: string;
}

export async function updateTeacher(teacherId: string, payload: UpdateTeacherPayload) {
  return api<{ success: boolean; data: { message: string; teacher: AdminTeacher } }>(`/admin/teachers/${teacherId}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function hardDeleteTeacher(teacherId: string) {
  return api<{ success: boolean; data: { message: string } }>(`/admin/teachers/${teacherId}`, {
    method: 'DELETE',
  });
}

export async function createAnnouncement(payload: {
  subject: string;
  message: string;
  targetAudience: string;
  priority: string;
}) {
  return api('/admin/announcements', { method: 'POST', body: payload });
}

// ─── PARENT API ENDPOINTS ───────────────────────────────────────────────────

export interface ParentChild {
  id: string;
  name: string;
  admissionNumber: string;
  rollNo: string;
  section?: string;
  className: string;
  currentJuzuNumber: number;
  dowraCount?: number;
  category?: string;
  needsRevision: boolean;
  revisionReason?: string;
}

export async function fetchParentChildren() {
  return api<{ success: boolean; data: { children: ParentChild[] } }>('/parent/children');
}

export interface SchoolProgressItem {
  _id: string;
  className: string;
  academicYear: string;
  date: string;
  subject: string;
  unitTaught: string;
  description?: string;
  absentStudents?: string[] | Array<{ _id: string; name: string; admissionNumber: string }>;
}

export interface ParentDailyProgressResponse {
  student: { id: string; name: string; admissionNumber: string; className?: string; section?: string; academicYear?: string };
  progress: {
    _id: string;
    studentId: string;
    date: string;
    juzuNumber: number;
    puthiyaPadam: number;
    juzuPadam: number;
    pazhayaPadam: number;
    dowraCount?: number;
    category?: string;
    isAbsent: boolean;
    needsRevision: boolean;
    isPuthiyaPadamWrong?: boolean;
    isCurrentLessonWrong?: boolean;
    isPazhayaPadamWrong?: boolean;
    notes?: string;
  } | null;
  schoolProgress?: SchoolProgressItem[];
}

export async function fetchParentDailyProgress(studentId?: string) {
  const qs = studentId ? `?studentId=${studentId}` : '';
  return api<{ success: boolean; data: ParentDailyProgressResponse }>(`/parent/progress/daily${qs}`);
}

export interface ParentMonthlyProgressResponse {
  student: { id: string; name: string; admissionNumber: string; className?: string; academicYear?: string };
  year: number;
  month: number;
  progress: Array<{
    _id: string;
    studentId: string;
    date: string;
    juzuNumber: number;
    puthiyaPadam: number;
    juzuPadam: number;
    pazhayaPadam: number;
    isAbsent: boolean;
    needsRevision: boolean;
    isPuthiyaPadamWrong?: boolean;
    isCurrentLessonWrong?: boolean;
    isPazhayaPadamWrong?: boolean;
    notes?: string;
  }>;
  schoolProgress?: SchoolProgressItem[];
}

export async function fetchParentMonthlyProgress(params?: { studentId?: string; year?: number; month?: number }) {
  const qs = new URLSearchParams();
  if (params?.studentId) qs.set('studentId', params.studentId);
  if (params?.year) qs.set('year', String(params.year));
  if (params?.month) qs.set('month', String(params.month));
  const query = qs.toString() ? `?${qs}` : '';
  return api<{ success: boolean; data: ParentMonthlyProgressResponse }>(`/parent/progress/monthly${query}`);
}

export interface ParentAnnouncement {
  _id: string;
  message: string;
  date: string;
  createdAt: string;
}

export async function fetchParentAnnouncements() {
  return api<{ success: boolean; data: { announcements: ParentAnnouncement[] } }>('/parent/announcements');
}

export async function sendParentFeedback(payload: { studentId?: string; message: string; date?: string }) {
  return api<{ success: boolean; data: { feedback: any } }>('/parent/feedback', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchParentReports(page = 1, limit = 10) {
  return api<{
    success: boolean;
    data: {
      reports: IssueReport[];
      pagination: { currentPage: number; totalPages: number; totalReports: number };
    };
  }>(`/parent/reports?page=${page}&limit=${limit}`);
}

export async function markParentReportRead(id: string) {
  return api<{ success: boolean }>(`/parent/reports/${id}/read`, { method: 'PATCH' });
}

// ── School Teacher ──────────────────────────────────────────────────────────

export interface SchoolTeacherStudent {
  _id: string;
  name: string;
  admissionNumber: string;
  className: string;
  academicYear?: string;
}

export interface SchoolTeacherClass {
  className: string;
  studentCount: number;
  students: SchoolTeacherStudent[];
}

export async function fetchSchoolTeacherClasses() {
  return api<{ success: boolean; data: { classes: SchoolTeacherClass[] } }>('/school-teacher/classes');
}

export interface SubmitSchoolProgressPayload {
  className: string;
  subject: string;
  unitTaught: string;
  description?: string;
  date?: string;
  academicYear?: string;
  absentStudents?: string[];
}

export async function submitSchoolProgress(payload: SubmitSchoolProgressPayload) {
  return api<{ success: boolean; message: string; data: { progress: SchoolProgressItem } }>(
    '/school-teacher/progress',
    { method: 'POST', body: payload }
  );
}

export async function fetchSchoolProgress(params?: { className?: string; date?: string; academicYear?: string }) {
  const qs = new URLSearchParams();
  if (params?.className) qs.set('className', params.className);
  if (params?.date) qs.set('date', params.date);
  if (params?.academicYear) qs.set('academicYear', params.academicYear);
  const query = qs.toString() ? `?${qs}` : '';
  return api<{ success: boolean; data: { progress: SchoolProgressItem[] } }>(`/school-teacher/progress${query}`);
}

// ── Academic Features (Exams & Syllabus) ────────────────────────────────────

export interface Examination {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  standards: string[];
  passingMarks: number;
  totalMarks: number;
  status: 'Scheduled' | 'Ongoing' | 'Completed';
  createdAt?: string;
}

export interface ExamMark {
  _id?: string;
  examId: string;
  studentId: { _id: string; name: string; admissionNumber: string; standard?: string } | string;
  teacherId?: string;
  standard: string;
  marks: number;
  maxMarks: number;
  subject?: string;
  remarks?: string;
}

export interface Syllabus {
  _id?: string;
  standard: string;
  subjects: string[];
}

export async function fetchExams(standard?: string) {
  const query = standard ? `?standard=${encodeURIComponent(standard)}` : '';
  return api<{ success: boolean; data: { exams: Examination[] } }>(`/academic/exams${query}`);
}

export async function createExam(payload: {
  title: string;
  startDate: string;
  endDate: string;
  standards: string[];
  passingMarks?: number;
  totalMarks?: number;
}) {
  return api<{ success: boolean; message: string; data: { exam: Examination } }>('/academic/exams', {
    method: 'POST',
    body: payload,
  });
}

export async function submitExamMarks(
  examId: string,
  payload: {
    standard?: string;
    marks: Array<{ studentId: string; marks: number; maxMarks?: number; subject?: string; remarks?: string }>;
  }
) {
  return api<{ success: boolean; message: string }>(`/academic/exams/${examId}/marks`, {
    method: 'POST',
    body: payload,
  });
}

export async function fetchExamMarks(examId: string, standard?: string) {
  const query = standard ? `?standard=${encodeURIComponent(standard)}` : '';
  return api<{ success: boolean; data: { marks: ExamMark[] } }>(`/academic/exams/${examId}/marks${query}`);
}

export async function fetchSyllabus(standard?: string) {
  const query = standard ? `?standard=${encodeURIComponent(standard)}` : '';
  return api<{ success: boolean; data: { syllabus: Syllabus | null; syllabusList?: Syllabus[] } }>(`/academic/syllabus${query}`);
}

export async function updateSyllabus(payload: { standard: string; subjects: string[] }) {
  return api<{ success: boolean; message: string; data: { syllabus: Syllabus } }>('/academic/syllabus', {
    method: 'POST',
    body: payload,
  });
}

