'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Shield,
  Moon,
  Sun,
  Lock,
  LogOut,
  Key,
  Check,
  Edit3,
  Save,
  Phone,
  ChevronRight,
  ShieldCheck,
  Loader2,
  X,
  Eye,
  EyeOff,
  GraduationCap,
  Calendar,
  BookOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAdminTheme } from '@/context/AdminThemeContext';
import {
  fetchMe,
  changePassword as apiChangePassword,
  logoutUser,
  type UserProfile,
  fetchExams,
  createExam,
  fetchSyllabus,
  updateSyllabus,
  type Examination,
  type Syllabus,
} from '@/lib/api';

const AVAILABLE_STANDARDS = [
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
  'Class 4A',
  'Class 5B',
];

export default function AdminProfilePage() {
  const { darkMode, toggleDarkMode } = useAdminTheme();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Profile loaded from API
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Editable fields
  const [adminName, setAdminName] = useState('Admin Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@madrasa.org');
  const [adminPhone, setAdminPhone] = useState('+91 98765 00000');
  const [role] = useState('Super Administrator');

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Examination state
  const [exams, setExams] = useState<Examination[]>([]);
  const [examLoading, setExamLoading] = useState(false);
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examStartDate, setExamStartDate] = useState('');
  const [examEndDate, setExamEndDate] = useState('');
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [passingMarks, setPassingMarks] = useState(35);
  const [totalMarks, setTotalMarks] = useState(100);

  // Syllabus state
  const [syllabusStandard, setSyllabusStandard] = useState(AVAILABLE_STANDARDS[0]);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [syllabusSubmitting, setSyllabusSubmitting] = useState(false);

  // Load profile from API on mount
  useEffect(() => {
    fetchMe()
      .then((res) => {
        const u = res.data.user;
        setProfile(u);
        setAdminName(
          u.username
            .split(/[\s_-]+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
        );
        setAdminEmail(u.email || `${u.username}@madrasa.org`);
        if (u.phone) setAdminPhone(u.phone);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  // Fetch Exams when Examination Modal opens
  useEffect(() => {
    if (showExamModal) {
      setExamLoading(true);
      fetchExams()
        .then((res) => setExams(res.data.exams || []))
        .catch(() => {})
        .finally(() => setExamLoading(false));
    }
  }, [showExamModal]);

  // Fetch Syllabus when Syllabus Modal opens or standard changes
  useEffect(() => {
    if (showSyllabusModal && syllabusStandard) {
      setSyllabusLoading(true);
      fetchSyllabus(syllabusStandard)
        .then((res) => {
          if (res.data.syllabus?.subjects) {
            setSubjectsList(res.data.syllabus.subjects);
          } else {
            setSubjectsList(['Mathematics', 'Science', 'English', 'Social Studies', 'Moral Education']);
          }
        })
        .catch(() => {
          setSubjectsList(['Mathematics', 'Science', 'English', 'Social Studies', 'Moral Education']);
        })
        .finally(() => setSyllabusLoading(false));
    }
  }, [showSyllabusModal, syllabusStandard]);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    showNotification('Profile updated successfully!');
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      await apiChangePassword({ currentPassword, newPassword });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification('Password updated successfully!');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleCreateExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim() || !examStartDate || !examEndDate || selectedStandards.length === 0) {
      showNotification('Please fill in title, dates, and select at least one class.');
      return;
    }

    setExamSubmitting(true);
    try {
      await createExam({
        title: examTitle,
        startDate: examStartDate,
        endDate: examEndDate,
        standards: selectedStandards,
        passingMarks,
        totalMarks,
      });

      showNotification('Exam scheduled successfully & teachers notified!');
      setExamTitle('');
      setExamStartDate('');
      setExamEndDate('');
      setSelectedStandards([]);
      
      // Refresh list
      const updated = await fetchExams();
      setExams(updated.data.exams || []);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to create exam');
    } finally {
      setExamSubmitting(false);
    }
  };

  const handleSaveSyllabusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllabusStandard) return;

    setSyllabusSubmitting(true);
    try {
      await updateSyllabus({
        standard: syllabusStandard,
        subjects: subjectsList,
      });
      showNotification(`Syllabus for ${syllabusStandard} saved successfully!`);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to save syllabus');
    } finally {
      setSyllabusSubmitting(false);
    }
  };

  const handleAddSubject = () => {
    if (!newSubjectInput.trim()) return;
    if (!subjectsList.includes(newSubjectInput.trim())) {
      setSubjectsList((prev) => [...prev, newSubjectInput.trim()]);
    }
    setNewSubjectInput('');
  };

  const handleRemoveSubject = (subToRemove: string) => {
    setSubjectsList((prev) => prev.filter((s) => s !== subToRemove));
  };

  const avatarLetter = adminName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 pb-36 pt-4 px-3">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 1. PERSONAL DETAILS SECTION ───────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xs text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-r from-madrasa-600 to-madrasa-800 opacity-90" />

          {/* Profile Picture / Avatar */}
          <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-white dark:bg-gray-800 p-1.5 shadow-md mt-4 ring-4 ring-madrasa-100 dark:ring-madrasa-900/40">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-madrasa-700 text-2xl font-black text-white">
              {avatarLetter}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">
              {adminName}
            </h1>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              title="Edit Profile"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>

          <span className="mt-0.5 rounded-full bg-madrasa-50 dark:bg-madrasa-900/40 px-3 py-0.5 text-xs font-bold text-madrasa-700 dark:text-madrasa-300 border border-madrasa-100 dark:border-madrasa-800">
            {role}
          </span>

          {/* Edit Profile Form Drawer */}
          {isEditing && (
            <form onSubmit={handleSaveProfile} className="mt-4 w-full pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-madrasa-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-madrasa-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-madrasa-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-700 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-madrasa-700 py-2.5 text-xs font-bold text-white shadow-md hover:bg-madrasa-800 flex items-center justify-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save</span>
                </button>
              </div>
            </form>
          )}

          {/* Details List with Overflow Fixes */}
          {!isEditing && (
            <div className="mt-5 w-full flex flex-col gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-700 text-left">
              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-3 w-full overflow-hidden">
                <ShieldCheck className="h-4 w-4 text-madrasa-600 dark:text-madrasa-400 shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">System Role</span>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{role}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-3 w-full overflow-hidden">
                <Phone className="h-4 w-4 text-madrasa-600 dark:text-madrasa-400 shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Phone Number</span>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{adminPhone}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 p-3 w-full overflow-hidden">
                <Mail className="h-4 w-4 text-madrasa-600 dark:text-madrasa-400 shrink-0" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Address</span>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate break-all">{adminEmail}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 2. ACADEMIC SECTION ───────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 px-1">
          <GraduationCap className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Academic
          </h2>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60 shadow-xs">
          {/* Examination */}
          <button
            type="button"
            onClick={() => setShowExamModal(true)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Examination</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Schedule exam dates & unlock marks entry</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Syllabus */}
          <button
            type="button"
            onClick={() => setShowSyllabusModal(true)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Syllabus</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Define subjects list per standard</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* ── 3. APP SETTINGS SECTION ───────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 px-1">
          <Sun className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            App Settings
          </h2>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Appearance Theme</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {darkMode ? 'Dark Mode Enabled' : 'Light Mode Enabled'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              toggleDarkMode();
              showNotification(!darkMode ? 'Dark mode enabled' : 'Light mode enabled');
            }}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              darkMode ? 'bg-madrasa-700' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                darkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* ── 4. SECURITY & ACCOUNT SECTION ─────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 px-1">
          <ShieldCheck className="h-4 w-4 text-madrasa-700 dark:text-madrasa-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Security & Account
          </h2>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60 shadow-xs">
          {/* Change Password */}
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Change Password</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Update admin credentials</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-red-50 dark:hover:bg-red-950/20 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-red-600 dark:text-red-400">Log Out</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sign out from admin portal</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* ── MODAL: EXAMINATION ────────────────────────────────────────────── */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm animate-in zoom-in-95 duration-200 ease-out">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <Calendar className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Schedule Examination</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExamModal(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExamSubmit} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Exam Title <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g. First Term Examination 2026"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 p-3.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-madrasa-500 focus:border-madrasa-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={examStartDate}
                    onChange={(e) => setExamStartDate(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 p-3.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-madrasa-500 focus:border-madrasa-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={examEndDate}
                    onChange={(e) => setExamEndDate(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 p-3.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-madrasa-500 focus:border-madrasa-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Target Classes / Standards <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 max-h-36 overflow-y-auto">
                  {AVAILABLE_STANDARDS.map((std) => {
                    const isSelected = selectedStandards.includes(std);
                    return (
                      <button
                        key={std}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedStandards((prev) => prev.filter((s) => s !== std));
                          } else {
                            setSelectedStandards((prev) => [...prev, std]);
                          }
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                          isSelected
                            ? 'bg-madrasa-700 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {std}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Passing Marks
                  </label>
                  <input
                    type="number"
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(Number(e.target.value))}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 p-3.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-madrasa-500 focus:border-madrasa-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 p-3.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-madrasa-500 focus:border-madrasa-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={examSubmitting}
                className="mt-2 w-full rounded-2xl bg-madrasa-700 py-3.5 text-xs font-bold text-white hover:bg-madrasa-800 disabled:opacity-60 transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {examSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule Exam & Notify Teachers'}
              </button>
            </form>

            {/* List of Scheduled Exams */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                Scheduled Examinations ({exams.length})
              </h4>
              {examLoading ? (
                <div className="py-4 text-center text-xs text-gray-400">Loading exams…</div>
              ) : exams.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No exams scheduled yet.</p>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-44 overflow-y-auto">
                  {exams.map((ex) => (
                    <div
                      key={ex._id}
                      className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                        <span>{ex.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-extrabold">
                          {ex.status}
                        </span>
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-[11px]">
                        Classes: {ex.standards.join(', ')}
                      </div>
                      <div className="text-gray-400 text-[10px]">
                        {new Date(ex.startDate).toLocaleDateString()} - {new Date(ex.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SYLLABUS ───────────────────────────────────────────────── */}
      {showSyllabusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm animate-in zoom-in-95 duration-200 ease-out">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Define Class Syllabus</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSyllabusModal(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSyllabusSubmit} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Class / Standard
                </label>
                <select
                  value={syllabusStandard}
                  onChange={(e) => setSyllabusStandard(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 p-3.5 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-madrasa-500 focus:border-madrasa-500 transition"
                >
                  {AVAILABLE_STANDARDS.map((std) => (
                    <option key={std} value={std}>
                      {std}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Subjects for {syllabusStandard} ({subjectsList.length})
                </label>

                {/* Add subject input */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newSubjectInput}
                    onChange={(e) => setNewSubjectInput(e.target.value)}
                    placeholder="Enter new subject name…"
                    className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 p-3 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-madrasa-500 focus:border-madrasa-500 transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubject}
                    className="rounded-2xl bg-madrasa-700 px-4 text-xs font-bold text-white hover:bg-madrasa-800 transition active:scale-95 flex items-center justify-center gap-1 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>

                {/* List of current subject pills */}
                {syllabusLoading ? (
                  <div className="py-4 text-center text-xs text-gray-400">Loading syllabus subjects…</div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 min-h-24">
                    {subjectsList.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No subjects added yet for this class.</p>
                    ) : (
                      subjectsList.map((sub) => (
                        <div
                          key={sub}
                          className="flex items-center gap-1.5 rounded-full bg-white dark:bg-gray-800 px-3.5 py-1.5 text-xs font-bold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                        >
                          <span>{sub}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubject(sub)}
                            className="text-gray-400 hover:text-red-500 transition p-0.5 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={syllabusSubmitting}
                className="w-full rounded-2xl bg-madrasa-700 py-3.5 text-xs font-bold text-white hover:bg-madrasa-800 disabled:opacity-60 transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {syllabusSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Syllabus Configuration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CHANGE PASSWORD ────────────────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-madrasa-700 dark:text-madrasa-400" />
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Change Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="mt-4 flex flex-col gap-3">
              {passwordError && (
                <div className="rounded-2xl bg-red-50 dark:bg-red-900/30 p-3 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 pr-10 text-sm text-gray-900 dark:text-white outline-none focus:border-madrasa-500 focus:bg-white dark:focus:bg-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 pr-10 text-sm text-gray-900 dark:text-white outline-none focus:border-madrasa-500 focus:bg-white dark:focus:bg-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-madrasa-500 focus:bg-white dark:focus:bg-gray-800"
                />
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-700 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="flex-1 rounded-2xl bg-madrasa-700 py-3 text-xs font-bold text-white shadow-md hover:bg-madrasa-800 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {passwordSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: LOGOUT ─────────────────────────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600">
              <LogOut className="h-6 w-6" />
            </div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Confirm Logout</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Are you sure you want to sign out from your admin account?
            </p>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-700 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  showNotification('Logged out successfully!');
                  setTimeout(() => logoutUser(), 300);
                }}
                className="flex-1 rounded-2xl bg-red-600 py-3 text-xs font-bold text-white shadow-md hover:bg-red-700"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
