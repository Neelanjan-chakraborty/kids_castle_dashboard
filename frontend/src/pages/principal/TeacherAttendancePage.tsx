import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, RotateCcw } from 'lucide-react'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/stores/authStore'
import { PageLoader } from '@/components/ui/Spinner'
import { todayISO } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Status = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave'

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  present:  { label: 'Present',  color: 'bg-green-500 text-white border-green-500' },
  absent:   { label: 'Absent',   color: 'bg-red-400 text-white border-red-400' },
  late:     { label: 'Late',     color: 'bg-yellow-400 text-white border-yellow-400' },
  half_day: { label: 'Half Day', color: 'bg-orange-400 text-white border-orange-400' },
  on_leave: { label: 'On Leave', color: 'bg-blue-400 text-white border-blue-400' },
}

export default function TeacherAttendancePage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [date, setDate] = useState(todayISO())
  const [pending, setPending] = useState<Record<string, Status>>({})
  const [saving, setSaving] = useState(false)

  const { data: records, isLoading } = useQuery({
    queryKey: ['teacher-attendance', date],
    queryFn: () => usersApi.getTeacherAttendance(date),
  })

  // Initialize pending from fetched records
  useEffect(() => {
    if (!records) return
    const init: Record<string, Status> = {}
    records.forEach((r) => { init[r.id] = r.status as Status })
    setPending(init)
  }, [records])

  const markAll = (status: Status) => {
    const next: Record<string, Status> = {}
    records?.forEach((r) => { next[r.id] = status })
    setPending(next)
  }

  const handleSave = async () => {
    const changed = Object.entries(pending).filter(([id, status]) => {
      return records?.find((r) => r.id === id)?.status !== status
    })
    if (!changed.length) { toast('No changes to save', { icon: 'ℹ️' }); return }

    setSaving(true)
    try {
      await usersApi.bulkMarkTeacherAttendance(
        changed.map(([id, status]) => ({ id, status }))
      )
      qc.invalidateQueries({ queryKey: ['teacher-attendance'] })
      toast.success(`${changed.length} records updated`)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const presentCount = Object.values(pending).filter((s) => ['present', 'late', 'half_day'].includes(s)).length
  const absentCount = Object.values(pending).filter((s) => s === 'absent').length
  const leaveCount = Object.values(pending).filter((s) => s === 'on_leave').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teacher & Staff Attendance</h1>
          <p className="text-sm text-slate-500">Mark daily attendance for teaching staff</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setPending({})}>
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <input
          type="date"
          className="input w-44"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="ml-auto flex gap-4 text-sm font-medium">
          <span className="text-green-600">✓ {presentCount} Present</span>
          <span className="text-red-500">✗ {absentCount} Absent</span>
          <span className="text-blue-500">⊙ {leaveCount} Leave</span>
        </div>
      </div>

      {/* Bulk actions */}
      {(records?.length ?? 0) > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(['present', 'absent', 'on_leave'] as const).map((status) => (
            <button
              key={status}
              className="btn-secondary text-sm"
              onClick={() => markAll(status)}
            >
              Mark All {STATUS_CONFIG[status].label}
            </button>
          ))}
        </div>
      )}

      {/* Attendance grid */}
      {isLoading ? (
        <PageLoader />
      ) : !records?.length ? (
        <div className="card p-10 text-center">
          <p className="text-slate-400">
            No teacher attendance records for this date.
          </p>
          <p className="text-xs text-slate-300 mt-2">
            Records are auto-initialized at 6 AM by cron, or you can add teachers via User Management.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Staff Member</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Role</th>
                <th className="text-center px-4 py-3 text-slate-500 font-medium" colSpan={5}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((rec) => {
                const staff = rec.expand?.user_id
                const currentStatus = pending[rec.id] ?? rec.status
                return (
                  <tr key={rec.id} className={cn(
                    'hover:bg-slate-50',
                    currentStatus === 'absent' && 'bg-red-50/30'
                  )}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold">
                          {staff?.name?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{staff?.name ?? '—'}</p>
                          <p className="text-xs text-slate-400">{staff?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge-gray capitalize">{(staff as { role?: string })?.role ?? '—'}</span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {(Object.entries(STATUS_CONFIG) as [Status, { label: string; color: string }][]).map(
                          ([status, config]) => (
                            <button
                              key={status}
                              onClick={() => setPending((p) => ({ ...p, [rec.id]: status }))}
                              className={cn(
                                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
                                currentStatus === status
                                  ? config.color
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                              )}
                            >
                              {config.label}
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
