import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, Plus, Filter, UserX } from 'lucide-react'
import { studentsApi } from '@/api/students'
import { PageLoader } from '@/components/ui/Spinner'
import PermissionGate from '@/components/layout/PermissionGate'
import { formatDate, getInitials, classDisplayName } from '@/lib/utils'
import { useTeacherScope } from '@/hooks/useTeacherScope'
import pb from '@/lib/pb'
import type { Student } from '@/types'
import toast from 'react-hot-toast'

export default function StudentsPage() {
  const [search, setSearch] = useState('')
  const [classId, setClassId] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const qc = useQueryClient()
  const { isTeacher, scopeFilter, classIds } = useTeacherScope()

  // For teachers: pre-select their first assigned class
  useEffect(() => {
    if (isTeacher && classIds?.length && !classId) {
      setClassId(classIds[0])
    }
  }, [isTeacher, classIds])

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => studentsApi.getClasses(),
  })

  const { data: divisions } = useQuery({
    queryKey: ['divisions', classId],
    queryFn: () => studentsApi.getDivisions(classId || undefined),
    enabled: !!classId,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['students', { classId, divisionId, search, scopeFilter }],
    queryFn: async () => {
      // Teachers can only see their assigned class students
      const effectiveClassId = isTeacher && !classId && classIds?.length
        ? classIds[0]
        : classId
      return studentsApi.getAll({ classId: effectiveClassId, divisionId, search, isActive: true })
    },
    staleTime: 30000,
  })

  const students = data?.items ?? []

  const handleDeactivate = async (student: Student) => {
    if (!confirm(`Deactivate ${student.first_name} ${student.last_name}?`)) return
    try {
      await studentsApi.deactivate(student.id)
      qc.invalidateQueries({ queryKey: ['students'] })
      toast.success('Student deactivated')
    } catch {
      toast.error('Failed to deactivate student')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500">{students.length} students</p>
        </div>
        <PermissionGate permission="manage_students">
          <Link to="/students/register" className="btn-primary">
            <Plus className="w-4 h-4" /> Add Student
          </Link>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, admission no, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-40"
          value={classId}
          onChange={(e) => { setClassId(e.target.value); setDivisionId('') }}
        >
          <option value="">All Classes</option>
          {classes?.map((c) => (
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
      </div>

      {/* Table */}
      {isLoading ? (
        <PageLoader />
      ) : students.length === 0 ? (
        <div className="card p-12 text-center">
          <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No students found</p>
          <Link to="/students/register" className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" /> Register First Student
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Student</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Admission No.</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Class</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Parent</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs overflow-hidden flex-shrink-0">
                          {student.photo
                            ? <img
                                src={pb.files.getUrl(student as never, student.photo)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            : getInitials(`${student.first_name} ${student.last_name}`)
                          }
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-xs text-slate-400">Roll #{student.roll_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{student.admission_number || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="badge-blue">
                        {classDisplayName((student.expand?.class_id as { name?: string })?.name ?? '')}
                      </span>
                      {student.expand?.division_id && (
                        <span className="badge-gray ml-1">
                          Div {(student.expand.division_id as { name?: string })?.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{student.parent_name}</p>
                      <p className="text-xs text-slate-400">{student.parent_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(student.admission_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          to={`/students/${student.id}`}
                          className="btn-secondary text-xs py-1 px-3"
                        >
                          View
                        </Link>
                        <PermissionGate permission="manage_students">
                          <button
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            onClick={() => handleDeactivate(student)}
                            title="Deactivate"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
