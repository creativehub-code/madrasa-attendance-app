'use client';

export type UserRole = 'admin' | 'teacher' | 'parent' | 'school_teacher';

export const STANDARDS = [
  '1st Standard',
  '2nd Standard',
  '3rd Standard',
  '4th Standard',
  '5th Standard',
  '6th Standard',
  '7th Standard',
  '8th Standard',
  '9th Standard',
  '10th Standard',
  'Plus One',
  'Plus Two',
  'Degree',
] as const;

export type Standard = (typeof STANDARDS)[number];

export interface TodayProgress {
  juzuNumber?: number;
  puthiyaPadam?: number;
  juzuPadam?: number;
  pazhayaPadam?: number;
  dowraCount?: number;
  category?: string;
  isAbsent?: boolean;
  needsRevision?: boolean;
  isPuthiyaPadamWrong?: boolean;
  isCurrentLessonWrong?: boolean;
  isPazhayaPadamWrong?: boolean;
  notes?: string;
}

export interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  standard?: string;
  section?: string;
  className?: string;
  parentName?: string;
  avatarUrl?: string;
  currentJuzu?: number;
  status?: 'Active' | 'Discontinued';
  todayProgress?: TodayProgress | null;
}

export type RawStudent = Student;

export interface Teacher {
  _id: string;
  name: string;
  standard?: string;
  className?: string;
  studentCount: number;
}

export interface ProgressEntry {
  studentId: string;
  juzuNumber?: number;
  puthiyaPadam: number;
  juzuPadam: number;
  pazhayaPadam: number;
  dowraCount?: number;
  category?: string;
  isAbsent: boolean;
  needsRevision?: boolean;
  isPuthiyaPadamWrong?: boolean;
  isCurrentLessonWrong?: boolean;
  isPazhayaPadamWrong?: boolean;
  notes?: string;
}

export interface BulkProgressPayload {
  date: string;
  entries: ProgressEntry[];
}

export interface DailyProgressReport {
  label: string;
  subtitle?: string;
  percent?: number;
  status: 'In Progress' | 'Completed' | 'Not Started';
  note?: string;
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  preview: string;
}

export interface SchoolProgress {
  _id: string;
  className: string;
  academicYear: string;
  date: string;
  subject: string;
  unitTaught: string;
  description?: string;
  absentStudents?: Array<{ _id: string; name: string; admissionNumber: string }> | string[];
  createdAt?: string;
  updatedAt?: string;
}

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

