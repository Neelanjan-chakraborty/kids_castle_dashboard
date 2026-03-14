import pb from '@/lib/pb'
import type { Permission, Role } from '@/lib/permissions'

export interface AppUser {
  id: string
  collectionId: string
  email: string
  name: string
  role: Role
  avatar: string
  branch_id: string
  phone?: string
  is_active?: boolean
  created: string
  updated: string
}

export interface TeacherAssignment {
  id: string
  user_id: string
  class_id: string
  division_id: string
  subject_id: string
  academic_year_id: string
  is_class_teacher: boolean
  assigned_by: string
  expand?: {
    user_id?: AppUser
    class_id?: { id: string; name: string; display_name: string }
    division_id?: { id: string; name: string }
    subject_id?: { id: string; name: string }
  }
}

export interface StaffPermissionRecord {
  id: string
  user_id: string
  permissions: Permission[]
  granted_by: string
  notes: string
  expand?: { user_id?: AppUser }
}

export interface TeacherAttendanceRecord {
  id: string
  user_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday'
  marked_by: string
  in_time: string
  out_time: string
  remarks: string
  expand?: { user_id?: AppUser }
}

export interface Branch {
  id: string
  name: string
  address: string
  phone: string
  email: string
  principal: string
  is_active: boolean
  code: string
  logo: string
  collectionId: string
}

export const usersApi = {
  // ─── Users ────────────────────────────────────────────────────────────
  getAll: (role?: Role) =>
    pb.collection('users').getFullList<AppUser>({
      filter: role ? `role = "${role}"` : '',
      sort: 'name',
    }),

  getById: (id: string) =>
    pb.collection('users').getOne<AppUser>(id),

  create: (data: {
    email: string
    password: string
    passwordConfirm: string
    name: string
    role: Role
    branch_id?: string
    phone?: string
  }) => pb.collection('users').create<AppUser>(data),

  update: (id: string, data: Partial<AppUser & { password?: string; passwordConfirm?: string }>) =>
    pb.collection('users').update<AppUser>(id, data),

  deactivate: (id: string) =>
    pb.collection('users').update<AppUser>(id, { is_active: false }),

  activate: (id: string) =>
    pb.collection('users').update<AppUser>(id, { is_active: true }),

  delete: (id: string) =>
    pb.collection('users').delete(id),

  // ─── Teacher Assignments ──────────────────────────────────────────────
  getAssignments: (userId?: string, academicYearId?: string) => {
    const conditions: string[] = []
    if (userId) conditions.push(`user_id = "${userId}"`)
    if (academicYearId) conditions.push(`academic_year_id = "${academicYearId}"`)
    return pb.collection('teacher_assignments').getFullList<TeacherAssignment>({
      filter: conditions.join(' && '),
      expand: 'user_id,class_id,division_id,subject_id',
      sort: 'class_id.name',
    })
  },

  createAssignment: (data: Partial<TeacherAssignment>) =>
    pb.collection('teacher_assignments').create<TeacherAssignment>(data),

  deleteAssignment: (id: string) =>
    pb.collection('teacher_assignments').delete(id),

  // ─── Staff Permissions ────────────────────────────────────────────────
  getStaffPermissions: (userId: string) =>
    pb.collection('staff_permissions').getFirstListItem<StaffPermissionRecord>(
      `user_id = "${userId}"`
    ),

  getAllStaffPermissions: () =>
    pb.collection('staff_permissions').getFullList<StaffPermissionRecord>({
      expand: 'user_id',
    }),

  setStaffPermissions: async (userId: string, permissions: Permission[], grantedBy: string, notes = '') => {
    try {
      const existing = await pb.collection('staff_permissions').getFirstListItem(
        `user_id = "${userId}"`
      )
      return pb.collection('staff_permissions').update<StaffPermissionRecord>(existing.id, {
        permissions,
        granted_by: grantedBy,
        notes,
      })
    } catch {
      return pb.collection('staff_permissions').create<StaffPermissionRecord>({
        user_id: userId,
        permissions,
        granted_by: grantedBy,
        notes,
      })
    }
  },

  // ─── Teacher Attendance ───────────────────────────────────────────────
  getTeacherAttendance: (date: string) =>
    pb.collection('teacher_attendance').getFullList<TeacherAttendanceRecord>({
      filter: `date = "${date}"`,
      expand: 'user_id',
      sort: 'user_id.name',
    }),

  getTeacherAttendanceForUser: (userId: string, month?: string) =>
    pb.collection('teacher_attendance').getFullList<TeacherAttendanceRecord>({
      filter: month
        ? `user_id = "${userId}" && date >= "${month}-01" && date <= "${month}-31"`
        : `user_id = "${userId}"`,
      sort: '-date',
    }),

  markTeacherAttendance: (id: string, status: string, markedBy: string, inTime?: string, outTime?: string, remarks?: string) =>
    pb.collection('teacher_attendance').update<TeacherAttendanceRecord>(id, {
      status,
      marked_by: markedBy,
      in_time: inTime ?? '',
      out_time: outTime ?? '',
      remarks: remarks ?? '',
    }),

  bulkMarkTeacherAttendance: (updates: { id: string; status: string }[]) =>
    Promise.all(
      updates.map((u) =>
        pb.collection('teacher_attendance').update<TeacherAttendanceRecord>(u.id, { status: u.status })
      )
    ),

  // ─── School Branches ──────────────────────────────────────────────────
  getBranches: () =>
    pb.collection('school_branches').getFullList<Branch>({ sort: 'name' }),

  createBranch: (data: Partial<Branch>) =>
    pb.collection('school_branches').create<Branch>(data),

  updateBranch: (id: string, data: Partial<Branch>) =>
    pb.collection('school_branches').update<Branch>(id, data),

  deleteBranch: (id: string) =>
    pb.collection('school_branches').delete(id),
}
