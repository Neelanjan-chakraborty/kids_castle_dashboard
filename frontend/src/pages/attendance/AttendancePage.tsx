import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, Save, RotateCcw, ShieldCheck } from 'lucide-react'
import { studentsApi } from '@/api/students'
import { attendanceApi } from '@/api/attendance'
import { PageLoader } from '@/components/ui/Spinner'
import { todayISO, classDisplayName } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useTeacherScope } from '@/hooks/useTeacherScope'
import type { AttendanceRecord, Student } from '@/types'
import toast from 'react-hot-toast'

type Status = 'present' | 'absent' | 'late' | 'half_day'

interface AttendanceRow {
  record: AttendanceRecord
  student: Student
  pendingStatus: Status
}

export default function AttendancePage() {
  const qc = useQueryClient()
  const [date, setDate] = useState(todayISO())
  const [classId, setClassId] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const { isTeacher, classIds } = useTeacherScope()

  // Pre-select teacher's class
  useEffect(() => {
    if (isTeacher && classIds?.length && !classId) {
      setClassId(classIds[0])
    }
  }, [isTeacher, classIds])
  const [pending, setPending] = useState<Record<string, Status>>({})
  const [saving, setSaving] = useState(false)

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => studentsApi.getClasses(),
  })

  const { data: divisions } = useQuery({
    queryKey: ['divisions', classId],
    queryFn: () => studentsApi.getDivisions(classId),
    enabled: !!classId,
  })

  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['attendance', date, classId, divisionId],
    queryFn: () => attendanceApi.getByDate(date, classId, divisionId),
    enabled: !!date,
  })

  // Filter by selected class/division
  const rows = attendanceRecords?.filter((rec) => {
    const student = rec.expand?.student_id as Student | undefined
    if (classId && (student?.class_id !== classId)) return false
    if (divisionId && (student?.division_id !== divisionId)) return false
    return true
  }) ?? []

  // Initialize pending from fetched records
  useEffect(() => {
    if (!attendanceRecords) return
    const init: Record<string, Status> = {}
    attendanceRecords.forEach((r) => { init[r.id] = r.status as Status })
    setPending(init)
  }, [attendanceRecords])

  const markAll = (status: Status) => {
    const next: Record<string, Status> = { ...pending }
    rows.forEach((r) => { next[r.id] = status })
    setPending(next)
  }

  const handleSave = async () => {
    const changed = Object.entries(pending).filter(([id, status]) => {
      const orig = attendanceRecords?.find((r) => r.id === id)?.status
      return orig !== status
    })

    if (changed.length === 0) {
      toast('No changes to save', { icon: 'ℹ️' })
      return
    }

    setSaving(true)
    try {
      await attendanceApi.bulkMark(changed.map(([id, status]) => ({ id, status })))
      qc.invalidateQueries({ queryKey: ['attendance'] })
      toast.success(`Saved ${changed.length} attendance records`)
    } catch {
      toast.error('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const presentCount = Object.values(pending).filter((s) => ['present', 'late', 'half_day'].includes(s)).length
  const absentCount = Object.values(pending).filter((s) => s === 'absent').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-sm text-slate-500">Mark daily attendance</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setPending({})}>
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : `Save Changes`}
          </button>
        </div>
      </div>

      {/* Teacher scope notice */}
      {isTeacher && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          You can only mark attendance for your assigned class(es).
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <input
          type="date"
          className="input w-44"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          className="input w-40"
          value={classId}
          onChange={(e) => { setClassId(e.target.value); setDivisionId('') }}
          disabled={isTeacher && (classIds?.length ?? 0) <= 1}
        >
          {!isTeacher && <option value="">All Classes</option>}
          {(isTeacher
            ? classes?.filter((c) => classIds?.includes(c.id))
            : classes
          )?.map((c) => (
            <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
          ))}
        </select>
        {classId && (
          <select className="input w-40" value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
            <option value="">All Divisions</option>
            {divisions?.map((d) => (
              <option key={d.id} value={d.id}>Division {d.name}</option>
            ))}
          </select>
        )}

        <div className="ml-auto flex gap-3 text-sm">
          <span className="text-green-600 font-medium">✓ {presentCount} Present</span>
          <span className="text-red-500 font-medium">✗ {absentCount} Absent</span>
        </div>
      </div>

      {/* Bulk actions */}
      {rows.length > 0 && (
        <div className="flex gap-2">
          <button className="btn-secondary text-sm" onClick={() => markAll('present')}>
            <CheckCircle className="w-4 h-4 text-green-500" /> Mark All Present
          </button>
          <button className="btn-secondary text-sm" onClick={() => markAll('absent')}>
            <XCircle className="w-4 h-4 text-red-400" /> Mark All Absent
          </button>
        </div>
      )}

      {/* Attendance grid */}
      {isLoading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-400">
            {!classId
              ? 'Select a class to view attendance'
              : 'No students found or attendance not initialized for this date'}
          </p>
          <p className="text-xs text-slate-300 mt-2">
            Attendance records are auto-created at 6:00 AM by the daily cron job.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-12">Roll</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Student</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Class</th>
                <th className="text-center px-4 py-3 text-slate-500 font-medium" colSpan={4}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((rec) => {
                const student = rec.expand?.student_id as Student | undefined
                const currentStatus = pending[rec.id] ?? rec.status
                return (
                  <tr key={rec.id} className={cn(
                    'hover:bg-slate-50 transition-colors',
                    currentStatus === 'absent' && 'bg-red-50/30'
                  )}>
                    <td className="px-4 py-3 text-slate-500">{student?.roll_number ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {student ? `${student.first_name} ${student.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {classDisplayName((student?.expand?.class_id as { name?: string })?.name ?? '')}
                      {(student?.expand?.division_id as { name?: string })?.name
                        ? ` / ${(student?.expand?.division_id as { name?: string })?.name}`
                        : ''}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1 justify-center">
                        {(['present', 'absent', 'late', 'half_day'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => setPending((p) => ({ ...p, [rec.id]: status }))}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
                              currentStatus === status
                                ? status === 'present'  ? 'bg-green-500 text-white border-green-500'
                                  : status === 'absent' ? 'bg-red-400 text-white border-red-400'
                                  : status === 'late'   ? 'bg-yellow-400 text-white border-yellow-400'
                                  : 'bg-orange-400 text-white border-orange-400'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            )}
                          >
                            {status === 'half_day' ? 'Half' : status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
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
