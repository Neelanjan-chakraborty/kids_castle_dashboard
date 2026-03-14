import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Edit, BookOpen } from 'lucide-react'
import { examsApi } from '@/api/exams'
import { studentsApi } from '@/api/students'
import Modal from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { EXAM_TYPES } from '@/lib/constants'
import type { Exam } from '@/types'
import toast from 'react-hot-toast'

export default function ExamsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    name: '', exam_type: 'unit_test', class_id: '', start_date: '', end_date: '',
  })

  const { data: currentYear } = useQuery({
    queryKey: ['current-year'],
    queryFn: () => studentsApi.getCurrentYear(),
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => studentsApi.getClasses(),
  })

  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams', currentYear?.id],
    queryFn: () => examsApi.getExams(currentYear?.id),
    enabled: !!currentYear,
  })

  const handleCreate = async () => {
    try {
      await examsApi.createExam({ ...form, academic_year_id: currentYear!.id, is_published: false })
      qc.invalidateQueries({ queryKey: ['exams'] })
      toast.success('Exam created')
      setCreateOpen(false)
      setForm({ name: '', exam_type: 'unit_test', class_id: '', start_date: '', end_date: '' })
    } catch {
      toast.error('Failed to create exam')
    }
  }

  const handleDelete = async (exam: Exam) => {
    if (!confirm(`Delete "${exam.name}"?`)) return
    try {
      await examsApi.deleteExam(exam.id)
      qc.invalidateQueries({ queryKey: ['exams'] })
      toast.success('Exam deleted')
    } catch {
      toast.error('Failed to delete exam')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exams</h1>
          <p className="text-sm text-slate-500">{currentYear?.name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/papers" className="btn-secondary">
            <BookOpen className="w-4 h-4" /> Question Papers
          </Link>
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Exam
          </button>
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="grid gap-4">
          {exams?.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-slate-400">No exams yet. Create your first exam.</p>
            </div>
          ) : (
            exams?.map((exam) => (
              <div key={exam.id} className="card p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{exam.name}</h3>
                    <span className="badge-blue capitalize">{exam.exam_type.replace('_', ' ')}</span>
                    {exam.is_published && <span className="badge-green">Published</span>}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {(exam.expand?.class_id as { display_name?: string })?.display_name ?? 'All Classes'}
                    {exam.start_date && ` · ${formatDate(exam.start_date)}`}
                    {exam.end_date && ` – ${formatDate(exam.end_date)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/exams/${exam.id}/marks`}
                    className="btn-secondary text-sm"
                  >
                    Enter Marks
                  </Link>
                  <Link
                    to={`/reports?examId=${exam.id}`}
                    className="btn-secondary text-sm"
                  >
                    Report Cards
                  </Link>
                  <button
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                    onClick={() => handleDelete(exam)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Exam"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={!form.name}>
              Create
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Exam Name *</label>
            <input
              className="input"
              placeholder="e.g. Unit Test 1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Exam Type</label>
            <select
              className="input"
              value={form.exam_type}
              onChange={(e) => setForm((f) => ({ ...f, exam_type: e.target.value }))}
            >
              {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Class (leave empty for all)</label>
            <select
              className="input"
              value={form.class_id}
              onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
            >
              <option value="">All Classes</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
