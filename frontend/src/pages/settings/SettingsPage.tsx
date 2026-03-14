import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, CheckCircle } from 'lucide-react'
import { studentsApi } from '@/api/students'
import { feesApi } from '@/api/fees'
import { examsApi } from '@/api/exams'
import Modal from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import PermissionGate from '@/components/layout/PermissionGate'
import { formatCurrency } from '@/lib/utils'
import { DIVISION_OPTIONS, FEE_TYPES, SUBJECTS_BY_CLASS, CLASS_OPTIONS } from '@/lib/constants'
import pb from '@/lib/pb'
import toast from 'react-hot-toast'

type SettingTab = 'Academic Year' | 'Classes & Divisions' | 'Subjects' | 'Fee Structures'

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingTab>('Academic Year')
  const qc = useQueryClient()

  const TABS: SettingTab[] = ['Academic Year', 'Classes & Divisions', 'Subjects', 'Fee Structures']

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Configure academic year, classes, subjects, and fee structures</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Academic Year' && <AcademicYearSettings qc={qc} />}
      {tab === 'Classes & Divisions' && <ClassDivisionSettings qc={qc} />}
      {tab === 'Subjects' && <SubjectsSettings qc={qc} />}
      {tab === 'Fee Structures' && <FeeStructuresSettings qc={qc} />}
    </div>
  )
}

// ─── Academic Year ────────────────────────────────────────────────────────────
function AcademicYearSettings({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' })

  const { data: years, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => studentsApi.getAcademicYears(),
  })

  const handleCreate = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      toast.error('Fill all fields')
      return
    }
    try {
      await pb.collection('academic_years').create({ ...form, is_current: false })
      qc.invalidateQueries({ queryKey: ['academic-years'] })
      toast.success('Academic year created')
      setForm({ name: '', start_date: '', end_date: '' })
    } catch {
      toast.error('Failed to create')
    }
  }

  const handleSetCurrent = async (id: string) => {
    // First unset all
    const all = await pb.collection('academic_years').getFullList()
    await Promise.all(all.map((y) => pb.collection('academic_years').update(y.id, { is_current: y.id === id })))
    qc.invalidateQueries({ queryKey: ['academic-years'] })
    qc.invalidateQueries({ queryKey: ['current-year'] })
    toast.success('Current academic year updated')
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Create Academic Year</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Name (e.g. 2024-25)</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
          </div>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Start</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">End</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {years?.map((y) => (
              <tr key={y.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{y.name}</td>
                <td className="px-4 py-3 text-slate-500">{y.start_date?.split(' ')[0]}</td>
                <td className="px-4 py-3 text-slate-500">{y.end_date?.split(' ')[0]}</td>
                <td className="px-4 py-3">
                  {(y as { is_current?: boolean }).is_current
                    ? <span className="badge-green">Current</span>
                    : <span className="badge-gray">Inactive</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {!(y as { is_current?: boolean }).is_current && (
                    <button className="btn-secondary text-xs py-1 px-3" onClick={() => handleSetCurrent(y.id)}>
                      Set Current
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Classes & Divisions ──────────────────────────────────────────────────────
function ClassDivisionSettings({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [form, setForm] = useState({ name: '', display_name: '', order: 1 })
  const [divForm, setDivForm] = useState({ class_id: '', name: '' })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => studentsApi.getClasses(),
  })

  const { data: divisions } = useQuery({
    queryKey: ['divisions-all'],
    queryFn: () => studentsApi.getDivisions(),
  })

  const handleCreateClass = async () => {
    if (!form.name) return
    try {
      await pb.collection('classes').create({ ...form })
      qc.invalidateQueries({ queryKey: ['classes'] })
      toast.success('Class created')
      setForm({ name: '', display_name: '', order: 1 })
    } catch {
      toast.error('Failed to create class')
    }
  }

  const handleCreateDivision = async () => {
    if (!divForm.class_id || !divForm.name) return
    try {
      await pb.collection('divisions').create(divForm)
      qc.invalidateQueries({ queryKey: ['divisions-all'] })
      toast.success('Division created')
      setDivForm({ class_id: '', name: '' })
    } catch {
      toast.error('Failed to create division')
    }
  }

  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Add Class</h3>
          <div>
            <label className="label">Class Name</label>
            <select className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}>
              <option value="">Select</option>
              {CLASS_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Display Name</label>
            <input className="input" value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
          </div>
          <button className="btn-primary w-full justify-center" onClick={handleCreateClass}>
            <Plus className="w-4 h-4" /> Add Class
          </button>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b"><tr>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Class</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Display</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {classes?.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.display_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Add Division</h3>
          <div>
            <label className="label">Class</label>
            <select className="input" value={divForm.class_id} onChange={(e) => setDivForm((f) => ({ ...f, class_id: e.target.value }))}>
              <option value="">Select</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Division</label>
            <select className="input" value={divForm.name} onChange={(e) => setDivForm((f) => ({ ...f, name: e.target.value }))}>
              <option value="">Select</option>
              {DIVISION_OPTIONS.map((d) => <option key={d} value={d}>Division {d}</option>)}
            </select>
          </div>
          <button className="btn-primary w-full justify-center" onClick={handleCreateDivision}>
            <Plus className="w-4 h-4" /> Add Division
          </button>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b"><tr>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Class</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Division</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {divisions?.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2">{(d.expand?.class_id as { name?: string })?.name}</td>
                  <td className="px-4 py-2">Division {d.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Subjects ─────────────────────────────────────────────────────────────────
function SubjectsSettings({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [form, setForm] = useState({ name: '', class_id: '', code: '', max_marks: 100, pass_marks: 35 })

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => studentsApi.getClasses() })
  const { data: subjects } = useQuery({ queryKey: ['subjects-all'], queryFn: () => examsApi.getSubjects() })

  const seedSubjects = async () => {
    if (!form.class_id) { toast.error('Select a class first'); return }
    const cls = classes?.find((c) => c.id === form.class_id)
    if (!cls) return
    const subs = SUBJECTS_BY_CLASS[cls.name] ?? []
    for (const name of subs) {
      try {
        await pb.collection('subjects').create({ name, class_id: form.class_id, max_marks: 100, pass_marks: 35 })
      } catch {}
    }
    qc.invalidateQueries({ queryKey: ['subjects-all'] })
    toast.success(`Seeded ${subs.length} subjects for ${cls.display_name}`)
  }

  const handleCreate = async () => {
    if (!form.name || !form.class_id) { toast.error('Fill all required fields'); return }
    try {
      await pb.collection('subjects').create(form)
      qc.invalidateQueries({ queryKey: ['subjects-all'] })
      toast.success('Subject created')
      setForm({ name: '', class_id: '', code: '', max_marks: 100, pass_marks: 35 })
    } catch { toast.error('Failed to create subject') }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">Add Subject</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Class *</label>
            <select className="input" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}>
              <option value="">Select</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Max Marks</label>
            <input type="number" className="input" value={form.max_marks} onChange={(e) => setForm((f) => ({ ...f, max_marks: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Pass Marks</label>
            <input type="number" className="input" value={form.pass_marks} onChange={(e) => setForm((f) => ({ ...f, pass_marks: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={handleCreate}>
            <Plus className="w-4 h-4" /> Add Subject
          </button>
          <button className="btn-secondary" onClick={seedSubjects}>
            Auto-Seed for Class
          </button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Subject</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Class</th>
              <th className="text-right px-4 py-2 text-slate-500 font-medium">Max Marks</th>
              <th className="text-right px-4 py-2 text-slate-500 font-medium">Pass Marks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subjects?.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-medium">{s.name}</td>
                <td className="px-4 py-2 text-slate-500">{(s.expand?.class_id as { display_name?: string })?.display_name}</td>
                <td className="px-4 py-2 text-right">{s.max_marks}</td>
                <td className="px-4 py-2 text-right">{s.pass_marks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Fee Structures ────────────────────────────────────────────────────────────
function FeeStructuresSettings({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [form, setForm] = useState({
    class_id: '', fee_type: 'tuition', amount: 0, frequency: 'monthly', due_day: 10, description: '',
  })

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => studentsApi.getClasses() })
  const { data: currentYear } = useQuery({ queryKey: ['current-year'], queryFn: () => studentsApi.getCurrentYear() })
  const { data: structures } = useQuery({
    queryKey: ['fee-structures', currentYear?.id],
    queryFn: () => feesApi.getStructures(currentYear?.id),
    enabled: !!currentYear,
  })

  const handleCreate = async () => {
    if (!form.class_id || !form.amount) { toast.error('Fill required fields'); return }
    try {
      await feesApi.createStructure({ ...form, academic_year_id: currentYear!.id })
      qc.invalidateQueries({ queryKey: ['fee-structures'] })
      toast.success('Fee structure created')
      setForm({ class_id: '', fee_type: 'tuition', amount: 0, frequency: 'monthly', due_day: 10, description: '' })
    } catch { toast.error('Failed to create') }
  }

  const handleDelete = async (id: string) => {
    try {
      await feesApi.deleteStructure(id)
      qc.invalidateQueries({ queryKey: ['fee-structures'] })
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">Add Fee Structure — {currentYear?.name}</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Class *</label>
            <select className="input" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}>
              <option value="">Select</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fee Type</label>
            <select className="input" value={form.fee_type} onChange={(e) => setForm((f) => ({ ...f, fee_type: e.target.value }))}>
              {FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount (₹) *</label>
            <input type="number" className="input" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Frequency</label>
            <select className="input" value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
              <option value="one_time">One Time</option>
            </select>
          </div>
          <div>
            <label className="label">Due Day of Month</label>
            <input type="number" min={1} max={28} className="input" value={form.due_day} onChange={(e) => setForm((f) => ({ ...f, due_day: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          <Plus className="w-4 h-4" /> Add Structure
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Class</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Type</th>
              <th className="text-right px-4 py-2 text-slate-500 font-medium">Amount</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Frequency</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {structures?.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">{(s.expand?.class_id as { display_name?: string })?.display_name}</td>
                <td className="px-4 py-2 capitalize">{s.fee_type}</td>
                <td className="px-4 py-2 text-right font-medium">{formatCurrency(s.amount)}</td>
                <td className="px-4 py-2 capitalize">{s.frequency}</td>
                <td className="px-4 py-2">
                  <button className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
