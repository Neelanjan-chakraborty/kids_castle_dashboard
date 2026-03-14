import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, UserX, UserCheck, ShieldCheck, KeyRound } from 'lucide-react'
import { usersApi, type AppUser } from '@/api/users'
import { usePermissions } from '@/hooks/usePermissions'
import Modal from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { ROLE_LABELS, ROLE_COLORS, type Role } from '@/lib/permissions'
import toast from 'react-hot-toast'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'principal',   label: 'Principal' },
  { value: 'teacher',     label: 'Teacher' },
  { value: 'staff',       label: 'Staff' },
]

const EMPTY_FORM = {
  name: '', email: '', password: '', passwordConfirm: '',
  role: 'teacher' as Role, phone: '',
}

export default function UsersPage() {
  const qc = useQueryClient()
  const { can, isRole } = usePermissions()
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [resetPwUser, setResetPwUser] = useState<AppUser | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [newPw, setNewPw] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Super admins can manage all roles; principals can only manage teacher/staff
  const canCreateSuperAdmin = isRole('super_admin')
  const availableRoles = canCreateSuperAdmin
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((r) => ['teacher', 'staff'].includes(r.value))

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: () => usersApi.getAll(roleFilter || undefined),
  })

  const validate = (f: typeof EMPTY_FORM, isEdit = false) => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Name is required'
    if (!f.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(f.email)) e.email = 'Invalid email'
    if (!isEdit) {
      if (!f.password) e.password = 'Password is required'
      else if (f.password.length < 8) e.password = 'Min 8 characters'
      if (f.password !== f.passwordConfirm) e.passwordConfirm = 'Passwords do not match'
    }
    return e
  }

  const handleCreate = async () => {
    const e = validate(form)
    setErrors(e)
    if (Object.keys(e).length) return

    try {
      await usersApi.create({
        email: form.email,
        password: form.password,
        passwordConfirm: form.passwordConfirm,
        name: form.name,
        role: form.role,
        phone: form.phone,
      })
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(`${ROLE_LABELS[form.role]} account created for ${form.name}`)
      setCreateOpen(false)
      setForm(EMPTY_FORM)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  const handleEdit = async () => {
    if (!editUser) return
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    setErrors(e)
    if (Object.keys(e).length) return

    try {
      await usersApi.update(editUser.id, { name: form.name, role: form.role, phone: form.phone } as never)
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated')
      setEditUser(null)
    } catch {
      toast.error('Failed to update user')
    }
  }

  const handleToggleActive = async (user: AppUser) => {
    const action = (user as AppUser & { is_active?: boolean }).is_active ? 'deactivate' : 'activate'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name}?`)) return
    try {
      if ((user as AppUser & { is_active?: boolean }).is_active) {
        await usersApi.deactivate(user.id)
      } else {
        await usersApi.activate(user.id)
      }
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(`User ${action}d`)
    } catch {
      toast.error(`Failed to ${action} user`)
    }
  }

  const handleResetPassword = async () => {
    if (!resetPwUser) return
    if (newPw.length < 8) { toast.error('Min 8 characters'); return }
    try {
      await usersApi.update(resetPwUser.id, { password: newPw, passwordConfirm: newPw } as never)
      toast.success('Password reset successfully')
      setResetPwUser(null)
      setNewPw('')
    } catch {
      toast.error('Failed to reset password')
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500">{users?.length ?? 0} users</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(EMPTY_FORM); setErrors({}); setCreateOpen(true) }}>
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Role filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: '', label: 'All Roles' }, ...ROLE_OPTIONS].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setRoleFilter(value as Role | '')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              roleFilter === value
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Role</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users?.map((user) => {
                const isActive = (user as AppUser & { is_active?: boolean }).is_active !== false
                return (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                          {user.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <span className="font-medium text-slate-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={ROLE_COLORS[user.role as Role] ?? 'badge-gray'}>
                        {ROLE_LABELS[user.role as Role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={isActive ? 'badge-green' : 'badge-gray'}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(user.created)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                          title="Edit"
                          onClick={() => {
                            setEditUser(user)
                            setForm({ ...EMPTY_FORM, name: user.name, email: user.email, role: user.role as Role })
                            setErrors({})
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500"
                          title="Reset Password"
                          onClick={() => { setResetPwUser(user); setNewPw('') }}
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          className={`p-1.5 rounded-lg ${isActive ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-green-50 hover:text-green-500'} text-slate-400`}
                          title={isActive ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggleActive(user)}
                        >
                          {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add New User"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate}>Create User</button>
          </>
        }
      >
        <UserFormFields
          form={form}
          setForm={setForm}
          errors={errors}
          availableRoles={availableRoles}
          showPassword
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Edit — ${editUser?.name}`}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleEdit}>Save Changes</button>
          </>
        }
      >
        <UserFormFields
          form={form}
          setForm={setForm}
          errors={errors}
          availableRoles={availableRoles}
          showPassword={false}
        />
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={!!resetPwUser}
        onClose={() => setResetPwUser(null)}
        title={`Reset Password — ${resetPwUser?.name}`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setResetPwUser(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleResetPassword}>
              <KeyRound className="w-4 h-4" /> Reset
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
            Setting a new password for <strong>{resetPwUser?.name}</strong>. They will need to use this new password to log in.
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              minLength={8}
              placeholder="Min. 8 characters"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Reusable form fields ─────────────────────────────────────────────────────

function UserFormFields({
  form,
  setForm,
  errors,
  availableRoles,
  showPassword,
}: {
  form: typeof EMPTY_FORM
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
  errors: Record<string, string>
  availableRoles: { value: Role; label: string }[]
  showPassword: boolean
}) {
  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Full Name *</label>
        <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Priya Sharma" />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="label">Email Address *</label>
        <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="user@school.edu" />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </div>
      <div>
        <label className="label">Phone</label>
        <input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
      </div>
      <div>
        <label className="label">Role *</label>
        <select className="input" value={form.role} onChange={set('role')}>
          {availableRoles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <RoleHint role={form.role} />
      </div>
      {showPassword && (
        <>
          <div>
            <label className="label">Password *</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>
          <div>
            <label className="label">Confirm Password *</label>
            <input className="input" type="password" value={form.passwordConfirm} onChange={set('passwordConfirm')} placeholder="Repeat password" />
            {errors.passwordConfirm && <p className="text-xs text-red-500 mt-1">{errors.passwordConfirm}</p>}
          </div>
        </>
      )}
    </div>
  )
}

function RoleHint({ role }: { role: Role }) {
  const hints: Record<Role, string> = {
    super_admin: 'Full access: app settings, branches, all schools.',
    principal: 'School-level management: teachers, staff, all academic features.',
    teacher: 'Can manage their assigned classes — students, attendance, marks, fees.',
    staff: 'Custom permissions set by principal. No access by default.',
  }
  return (
    <p className="text-xs text-slate-400 mt-1 flex items-start gap-1">
      <ShieldCheck className="w-3 h-3 mt-0.5 flex-shrink-0" />
      {hints[role]}
    </p>
  )
}
