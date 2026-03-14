import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Building2, Phone, Mail, CheckCircle } from 'lucide-react'
import { usersApi, type Branch } from '@/api/users'
import Modal from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name: '', address: '', phone: '', email: '', principal: '', code: '', is_active: true }

export default function BranchesPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => usersApi.getBranches(),
  })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Branch name is required'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    return e
  }

  const handleCreate = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    try {
      await usersApi.createBranch(form)
      qc.invalidateQueries({ queryKey: ['branches'] })
      toast.success(`Branch "${form.name}" created`)
      setCreateOpen(false)
      setForm(EMPTY_FORM)
    } catch {
      toast.error('Failed to create branch')
    }
  }

  const handleEdit = async () => {
    if (!editBranch) return
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    try {
      await usersApi.updateBranch(editBranch.id, form)
      qc.invalidateQueries({ queryKey: ['branches'] })
      toast.success('Branch updated')
      setEditBranch(null)
    } catch {
      toast.error('Failed to update branch')
    }
  }

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`Delete branch "${branch.name}"? This cannot be undone.`)) return
    try {
      await usersApi.deleteBranch(branch.id)
      qc.invalidateQueries({ queryKey: ['branches'] })
      toast.success('Branch deleted')
    } catch {
      toast.error('Failed to delete branch')
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">School Branches</h1>
          <p className="text-sm text-slate-500">{branches?.length ?? 0} branches</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { setForm(EMPTY_FORM); setErrors({}); setCreateOpen(true) }}
        >
          <Plus className="w-4 h-4" /> Add Branch
        </button>
      </div>

      {branches?.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No branches yet. Add your first school branch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches?.map((branch) => (
            <div key={branch.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{branch.name}</h3>
                    {branch.code && <span className="badge-gray">{branch.code}</span>}
                  </div>
                  <span className={branch.is_active ? 'badge-green mt-1' : 'badge-gray mt-1'}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                    onClick={() => { setEditBranch(branch); setForm({ ...branch }); setErrors({}) }}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                    onClick={() => handleDelete(branch)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {branch.address && (
                <p className="text-xs text-slate-500">{branch.address}</p>
              )}

              <div className="space-y-1">
                {branch.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="w-3 h-3" /> {branch.phone}
                  </div>
                )}
                {branch.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="w-3 h-3" /> {branch.email}
                  </div>
                )}
                {branch.principal && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle className="w-3 h-3" /> Principal: {branch.principal}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={createOpen || !!editBranch}
        onClose={() => { setCreateOpen(false); setEditBranch(null) }}
        title={editBranch ? `Edit — ${editBranch.name}` : 'Add Branch'}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setCreateOpen(false); setEditBranch(null) }}>
              Cancel
            </button>
            <button className="btn-primary" onClick={editBranch ? handleEdit : handleCreate}>
              {editBranch ? 'Save Changes' : 'Create Branch'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Branch Name *</label>
              <input className="input" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Main Campus" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="label">Branch Code</label>
              <input className="input" value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. MAIN" maxLength={10} />
            </div>
            <div>
              <label className="label">Principal Name</label>
              <input className="input" value={form.principal}
                onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <textarea className="input resize-none" rows={2} value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300"
              />
              <label htmlFor="is_active" className="text-sm text-slate-700">Branch is active</label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
