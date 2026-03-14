import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, GraduationCap } from 'lucide-react'
import { usersApi } from '@/api/users'
import { studentsApi } from '@/api/students'
import { examsApi } from '@/api/exams'
import { useAuthStore } from '@/stores/authStore'
import Modal from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

export default function AssignClassesPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    user_id: '', class_id: '', division_id: '', subject_id: '', is_class_teacher: false,
  })

  const { data: currentYear } = useQuery({
    queryKey: ['current-year'],
    queryFn: () => studentsApi.getCurrentYear(),
  })

  const { data: teachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ['users', 'teacher'],
    queryFn: () => usersApi.getAll('teacher'),
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => studentsApi.getClasses(),
  })

  const { data: divisions } = useQuery({
    queryKey: ['divisions', form.class_id],
    queryFn: () => studentsApi.getDivisions(form.class_id),
    enabled: !!form.class_id,
  })

  const { data: subjects } = useQuery({
    queryKey: ['subjects', form.class_id],
    queryFn: () => examsApi.getSubjects(form.class_id),
    enabled: !!form.class_id,
  })

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['teacher-assignments', 'all', currentYear?.id],
    queryFn: () => usersApi.getAssignments(undefined, currentYear?.id),
    enabled: !!currentYear,
  })

  const handleCreate = async () => {
    if (!form.user_id || !form.class_id) {
      toast.error('Select a teacher and class')
      return
    }
    try {
      await usersApi.createAssignment({
        ...form,
        academic_year_id: currentYear!.id,
        assigned_by: user!.id,
      })
      qc.invalidateQueries({ queryKey: ['teacher-assignments'] })
      toast.success('Class assigned to teacher')
      setCreateOpen(false)
      setForm({ user_id: '', class_id: '', division_id: '', subject_id: '', is_class_teacher: false })
    } catch {
      toast.error('Failed to assign class')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this assignment?')) return
    try {
      await usersApi.deleteAssignment(id)
      qc.invalidateQueries({ queryKey: ['teacher-assignments'] })
      toast.success('Assignment removed')
    } catch {
      toast.error('Failed to remove assignment')
    }
  }

  // Group assignments by teacher
  const byTeacher = assignments?.reduce<Record<string, typeof assignments>>((acc, a) => {
    const tid = a.user_id
    if (!acc[tid]) acc[tid] = []
    acc[tid].push(a)
    return acc
  }, {})

  if (isLoading || loadingTeachers) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assign Classes to Teachers</h1>
          <p className="text-sm text-slate-500">{currentYear?.name}</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> Assign Class
        </button>
      </div>

      {/* Teachers with assignments */}
      {teachers?.length === 0 ? (
        <div className="card p-10 text-center">
          <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400">No teachers found. Add teachers in User Management first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teachers?.map((teacher) => {
            const teacherAssignments = byTeacher?.[teacher.id] ?? []
            return (
              <div key={teacher.id} className="card overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                    {teacher.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{teacher.name}</p>
                    <p className="text-xs text-slate-400">{teacher.email}</p>
                  </div>
                  <span className="ml-auto badge-blue">{teacherAssignments.length} assignments</span>
                </div>

                {teacherAssignments.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-slate-400">No classes assigned yet</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-100">
                      <tr>
                        <th className="text-left px-5 py-2 text-slate-500 font-medium">Class</th>
                        <th className="text-left px-5 py-2 text-slate-500 font-medium">Division</th>
                        <th className="text-left px-5 py-2 text-slate-500 font-medium">Subject</th>
                        <th className="text-left px-5 py-2 text-slate-500 font-medium">Type</th>
                        <th className="px-5 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {teacherAssignments.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-5 py-2">
                            {(a.expand?.class_id as { display_name?: string })?.display_name ?? '—'}
                          </td>
                          <td className="px-5 py-2">
                            {(a.expand?.division_id as { name?: string })?.name
                              ? `Division ${(a.expand?.division_id as { name?: string })?.name}`
                              : 'All Divisions'}
                          </td>
                          <td className="px-5 py-2">
                            {(a.expand?.subject_id as { name?: string })?.name ?? 'All Subjects'}
                          </td>
                          <td className="px-5 py-2">
                            {a.is_class_teacher
                              ? <span className="badge-blue">Class Teacher</span>
                              : <span className="badge-gray">Subject Teacher</span>
                            }
                          </td>
                          <td className="px-5 py-2">
                            <button
                              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                              onClick={() => handleDelete(a.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Assign Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Assign Class to Teacher"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate}>Assign</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Teacher *</label>
            <select className="input" value={form.user_id}
              onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}>
              <option value="">Select teacher</option>
              {teachers?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Class *</label>
              <select className="input" value={form.class_id}
                onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value, division_id: '', subject_id: '' }))}>
                <option value="">Select class</option>
                {classes?.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Division</label>
              <select className="input" value={form.division_id}
                onChange={(e) => setForm((f) => ({ ...f, division_id: e.target.value }))}
                disabled={!form.class_id}>
                <option value="">All Divisions</option>
                {divisions?.map((d) => <option key={d.id} value={d.id}>Division {d.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Subject (leave empty for class teacher)</label>
            <select className="input" value={form.subject_id}
              onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}
              disabled={!form.class_id}>
              <option value="">All Subjects / Class Teacher</option>
              {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_class_teacher"
              checked={form.is_class_teacher}
              onChange={(e) => setForm((f) => ({ ...f, is_class_teacher: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300"
            />
            <label htmlFor="is_class_teacher" className="text-sm text-slate-700">
              Designate as Class Teacher (primary responsibility for this class)
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
