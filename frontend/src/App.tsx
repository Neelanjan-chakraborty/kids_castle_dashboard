import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import RoleGuard from '@/components/layout/RoleGuard'

// Auth
import Login from '@/pages/Login'

// Core pages
import Dashboard from '@/pages/Dashboard'
import StudentsPage from '@/pages/students/StudentsPage'
import RegisterStudentPage from '@/pages/students/RegisterStudentPage'
import StudentDetailPage from '@/pages/students/StudentDetailPage'
import AttendancePage from '@/pages/attendance/AttendancePage'
import FeesPage from '@/pages/fees/FeesPage'
import ExamsPage from '@/pages/exams/ExamsPage'
import MarksEntryPage from '@/pages/exams/MarksEntryPage'
import QuestionPapersPage from '@/pages/exams/QuestionPapersPage'
import ReportCardsPage from '@/pages/reports/ReportCardsPage'
import SettingsPage from '@/pages/settings/SettingsPage'

// Admin pages (Super Admin)
import UsersPage from '@/pages/admin/UsersPage'
import BranchesPage from '@/pages/admin/BranchesPage'

// Principal pages
import TeacherAttendancePage from '@/pages/principal/TeacherAttendancePage'
import AssignClassesPage from '@/pages/principal/AssignClassesPage'
import StaffPermissionsPage from '@/pages/principal/StaffPermissionsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {/* ── Dashboard (all roles) ───────────────────────────────────── */}
          <Route path="/" element={<Dashboard />} />

          {/* ── Students ───────────────────────────────────────────────── */}
          <Route path="/students" element={
            <RoleGuard permission="view_students">
              <StudentsPage />
            </RoleGuard>
          } />
          <Route path="/students/register" element={
            <RoleGuard permission="manage_students">
              <RegisterStudentPage />
            </RoleGuard>
          } />
          <Route path="/students/:id" element={
            <RoleGuard permission="view_students">
              <StudentDetailPage />
            </RoleGuard>
          } />

          {/* ── Attendance ─────────────────────────────────────────────── */}
          <Route path="/attendance" element={
            <RoleGuard permission="mark_student_attendance">
              <AttendancePage />
            </RoleGuard>
          } />

          {/* ── Fees ───────────────────────────────────────────────────── */}
          <Route path="/fees" element={
            <RoleGuard permission="view_fees">
              <FeesPage />
            </RoleGuard>
          } />

          {/* ── Exams & Marks ──────────────────────────────────────────── */}
          <Route path="/exams" element={
            <RoleGuard permission="manage_exams">
              <ExamsPage />
            </RoleGuard>
          } />
          <Route path="/exams/:examId/marks" element={
            <RoleGuard permission="enter_marks">
              <MarksEntryPage />
            </RoleGuard>
          } />

          {/* ── Question Papers ────────────────────────────────────────── */}
          <Route path="/papers" element={
            <RoleGuard permission="upload_question_papers">
              <QuestionPapersPage />
            </RoleGuard>
          } />

          {/* ── Report Cards ───────────────────────────────────────────── */}
          <Route path="/reports" element={
            <RoleGuard permission="view_reports">
              <ReportCardsPage />
            </RoleGuard>
          } />

          {/* ── Settings (Principal + Super Admin) ─────────────────────── */}
          <Route path="/settings" element={
            <RoleGuard permission="manage_academic_settings">
              <SettingsPage />
            </RoleGuard>
          } />

          {/* ── Teacher / Staff Attendance (Principal + Super Admin) ────── */}
          <Route path="/teacher-attendance" element={
            <RoleGuard permission="mark_teacher_attendance">
              <TeacherAttendancePage />
            </RoleGuard>
          } />

          {/* ── Assign Classes (Principal + Super Admin) ────────────────── */}
          <Route path="/assign-classes" element={
            <RoleGuard permission="assign_classes">
              <AssignClassesPage />
            </RoleGuard>
          } />

          {/* ── Staff Permissions (Principal + Super Admin) ─────────────── */}
          <Route path="/staff-permissions" element={
            <RoleGuard permission="manage_staff_permissions">
              <StaffPermissionsPage />
            </RoleGuard>
          } />

          {/* ── User Management (all roles with manage_users_* perm) ──────── */}
          <Route path="/users" element={
            <RoleGuard permissions={['manage_users_all', 'manage_users_school']}>
              <UsersPage />
            </RoleGuard>
          } />

          {/* ── Branches (Super Admin only) ─────────────────────────────── */}
          <Route path="/branches" element={
            <RoleGuard permission="manage_branches">
              <BranchesPage />
            </RoleGuard>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
