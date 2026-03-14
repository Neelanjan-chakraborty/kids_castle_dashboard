import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, ShieldX, Save, Info } from 'lucide-react'
import { usersApi, type AppUser } from '@/api/users'
import { useAuthStore } from '@/stores/authStore'
import { GRANTABLE_PERMISSIONS, type Permission } from '@/lib/permissions'
import { PageLoader } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function StaffPermissionsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [selectedStaff, setSelectedStaff] = useState<AppUser | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: staffUsers, isLoading } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => usersApi.getAll('staff'),
  })

  const { data: currentPerms, isLoading: loadingPerms } = useQuery({
    queryKey: ['staff-permissions', selectedStaff?.id],
    queryFn: async () => {
      const data = await usersApi.getStaffPermissions(selectedStaff!.id)
      setPermissions(data.permissions ?? [])
      setNotes(data.notes ?? '')
      return data
    },
    enabled: !!selectedStaff,
  })

  const handleSelectStaff = async (staff: AppUser) => {
    setSelectedStaff(staff)
    setPermissions([])
    setNotes('')
    // permissions will load from query
  }

  const togglePermission = (perm: Permission) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const handleSave = async () => {
    if (!selectedStaff || !user) return
    setSaving(true)
    try {
      await usersApi.setStaffPermissions(selectedStaff.id, permissions, user.id, notes)
      qc.invalidateQueries({ queryKey: ['staff-permissions'] })
      toast.success(`Permissions saved for ${selectedStaff.name}`)
    } catch {
      toast.error('Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  const grantAll = () => setPermissions(GRANTABLE_PERMISSIONS.map((p) => p.key))
  const revokeAll = () => setPermissions([])

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Staff Permissions</h1>
        <p className="text-sm text-slate-500">Customise what each staff member can access</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Staff list */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Staff Members</h3>
            <p className="text-xs text-slate-400">{staffUsers?.length ?? 0} staff</p>
          </div>
          {staffUsers?.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No staff users found.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {staffUsers?.map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => handleSelectStaff(staff)}
                  className={cn(
                    'w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors',
                    selectedStaff?.id === staff.id && 'bg-primary-50'
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {staff.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{staff.name}</p>
                    <p className="text-xs text-slate-400 truncate">{staff.email}</p>
                  </div>
                  {selectedStaff?.id === staff.id && (
                    <ShieldCheck className="w-4 h-4 text-primary-600 ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Permission editor */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedStaff ? (
            <div className="card p-10 text-center">
              <ShieldX className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">Select a staff member to configure permissions</p>
            </div>
          ) : (
            <>
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{selectedStaff.name}</h3>
                    <p className="text-sm text-slate-400">{selectedStaff.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost text-sm" onClick={revokeAll}>
                      <ShieldX className="w-4 h-4" /> Revoke All
                    </button>
                    <button className="btn-ghost text-sm" onClick={grantAll}>
                      <ShieldCheck className="w-4 h-4" /> Grant All
                    </button>
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Info banner */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 mb-4">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Changes take effect on the staff member's next login or page refresh.
                    {permissions.length === 0 && <strong> No permissions = no access beyond their own profile.</strong>}
                  </span>
                </div>

                {/* Permission toggles */}
                {loadingPerms ? (
                  <div className="text-sm text-slate-400 py-4">Loading permissions...</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {GRANTABLE_PERMISSIONS.map(({ key, label, description }) => {
                      const granted = permissions.includes(key)
                      return (
                        <button
                          key={key}
                          onClick={() => togglePermission(key)}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                            granted
                              ? 'border-green-300 bg-green-50'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          )}
                        >
                          <div className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                            granted ? 'bg-green-500' : 'bg-slate-200'
                          )}>
                            {granted
                              ? <ShieldCheck className="w-3 h-3 text-white" />
                              : <ShieldX className="w-3 h-3 text-slate-400" />
                            }
                          </div>
                          <div className="min-w-0">
                            <p className={cn('text-sm font-medium', granted ? 'text-green-800' : 'text-slate-700')}>
                              {label}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Notes */}
                <div className="mt-4">
                  <label className="label">Notes (optional)</label>
                  <textarea
                    className="input resize-none"
                    rows={2}
                    placeholder="Reason for granting these permissions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Summary */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">
                    <strong>{permissions.length}</strong> of {GRANTABLE_PERMISSIONS.length} permissions granted
                  </p>
                  {permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {permissions.map((p) => (
                        <span key={p} className="badge-green text-xs">
                          {GRANTABLE_PERMISSIONS.find((g) => g.key === p)?.label ?? p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
