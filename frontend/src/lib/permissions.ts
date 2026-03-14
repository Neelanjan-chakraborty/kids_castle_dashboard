/**
 * Permissions system for Kids Castle RBAC
 *
 * Roles:
 *   super_admin — Full system access, branches, global settings
 *   principal   — School-level management, teachers, staff, all academic features
 *   teacher     — Their assigned class(es) only — students, attendance, marks, fees
 *   staff       — Customisable per-user by principal
 */

export type Role = 'super_admin' | 'principal' | 'teacher' | 'staff'

export type Permission =
  // ─── Super Admin only ──────────────────────────────────────────
  | 'manage_branches'           // Create / edit school branches
  | 'manage_app_settings'       // Global application settings
  | 'manage_users_all'          // Create / edit ALL users including principals
  // ─── Principal + above ─────────────────────────────────────────
  | 'manage_users_school'       // Create / edit teachers and staff
  | 'assign_classes'            // Assign classes / divisions to teachers
  | 'manage_staff_permissions'  // Grant custom permissions to staff
  | 'mark_teacher_attendance'   // Mark teacher / staff attendance
  | 'view_teacher_attendance'   // View teacher attendance reports
  | 'manage_report_cards'       // Publish / manage report cards
  | 'manage_academic_settings'  // Academic years, classes, subjects, fee structures
  // ─── Teacher + above ───────────────────────────────────────────
  | 'manage_students'           // Add / edit students
  | 'view_students'             // View student list and profiles
  | 'mark_student_attendance'   // Mark student attendance
  | 'view_student_attendance'   // View student attendance reports
  | 'collect_fees'              // Record fee payments
  | 'view_fees'                 // View fee records
  | 'manage_fee_structures'     // Create / edit fee structures
  | 'manage_exams'              // Create exams, upload papers
  | 'enter_marks'               // Enter exam marks
  | 'view_reports'              // View academic performance reports
  | 'upload_question_papers'    // Upload question papers to archive

// All permissions list
export const ALL_PERMISSIONS: Permission[] = [
  'manage_branches',
  'manage_app_settings',
  'manage_users_all',
  'manage_users_school',
  'assign_classes',
  'manage_staff_permissions',
  'mark_teacher_attendance',
  'view_teacher_attendance',
  'manage_report_cards',
  'manage_academic_settings',
  'manage_students',
  'view_students',
  'mark_student_attendance',
  'view_student_attendance',
  'collect_fees',
  'view_fees',
  'manage_fee_structures',
  'manage_exams',
  'enter_marks',
  'view_reports',
  'upload_question_papers',
]

// Permissions staff can be granted by principal (not system-level ones)
export const GRANTABLE_PERMISSIONS: { key: Permission; label: string; description: string }[] = [
  { key: 'view_students',          label: 'View Students',           description: 'Can view student list and profiles' },
  { key: 'manage_students',        label: 'Manage Students',         description: 'Can add and edit student records' },
  { key: 'mark_student_attendance',label: 'Mark Attendance',         description: 'Can mark student attendance' },
  { key: 'view_student_attendance',label: 'View Attendance',         description: 'Can view attendance reports' },
  { key: 'collect_fees',           label: 'Collect Fees',            description: 'Can record fee payments' },
  { key: 'view_fees',              label: 'View Fees',               description: 'Can view fee records' },
  { key: 'manage_exams',           label: 'Manage Exams',            description: 'Can create and manage exams' },
  { key: 'enter_marks',            label: 'Enter Marks',             description: 'Can enter exam marks' },
  { key: 'view_reports',           label: 'View Reports',            description: 'Can view performance reports' },
  { key: 'upload_question_papers', label: 'Upload Papers',           description: 'Can upload question papers' },
  { key: 'mark_teacher_attendance',label: 'Mark Teacher Attendance', description: 'Can mark staff/teacher attendance' },
  { key: 'view_teacher_attendance',label: 'View Teacher Attendance', description: 'Can view staff attendance' },
  { key: 'manage_report_cards',    label: 'Manage Report Cards',     description: 'Can generate and publish report cards' },
]

// Static permissions per role
export const ROLE_PERMISSIONS: Record<Exclude<Role, 'staff'>, Permission[]> = {
  super_admin: ALL_PERMISSIONS,

  principal: ALL_PERMISSIONS.filter(
    (p) => !(['manage_branches', 'manage_app_settings', 'manage_users_all'] as Permission[]).includes(p)
  ),

  teacher: [
    'view_students',
    'manage_students',
    'mark_student_attendance',
    'view_student_attendance',
    'collect_fees',
    'view_fees',
    'manage_exams',
    'enter_marks',
    'view_reports',
    'upload_question_papers',
  ],
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  principal:   'Principal',
  teacher:     'Teacher',
  staff:       'Staff',
}

export const ROLE_COLORS: Record<Role, string> = {
  super_admin: 'badge-red',
  principal:   'badge-blue',
  teacher:     'badge-green',
  staff:       'badge-gray',
}
