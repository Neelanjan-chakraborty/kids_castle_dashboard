import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, Download, Trash2, FileText, BookOpen } from 'lucide-react'
import { examsApi } from '@/api/exams'
import { studentsApi } from '@/api/students'
import Modal from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import pb from '@/lib/pb'
import type { QuestionPaper } from '@/types'
import toast from 'react-hot-toast'

export default function QuestionPapersPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [filterClass, setFilterClass] = useState('')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterSubject, setFilterSubject] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    class_id: '', subject_id: '', year: new Date().getFullYear(),
    title: '', exam_date: '', file: null as File | null,
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => studentsApi.getClasses(),
  })

  const { data: currentYear } = useQuery({
    queryKey: ['current-year'],
    queryFn: () => studentsApi.getCurrentYear(),
  })

  const { data: subjects } = useQuery({
    queryKey: ['subjects', filterClass],
    queryFn: () => examsApi.getSubjects(filterClass || undefined),
  })

  const { data: uploadSubjects } = useQuery({
    queryKey: ['subjects', uploadForm.class_id],
    queryFn: () => examsApi.getSubjects(uploadForm.class_id),
    enabled: !!uploadForm.class_id,
  })

  const { data: papers, isLoading } = useQuery({
    queryKey: ['papers', filterClass, filterYear, filterSubject],
    queryFn: () =>
      examsApi.getPapers({
        classId: filterClass || undefined,
        year: filterYear,
        subjectId: filterSubject || undefined,
      }),
  })

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.class_id || !uploadForm.subject_id) {
      toast.error('Please fill all required fields and select a file')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('class_id', uploadForm.class_id)
      form.append('subject_id', uploadForm.subject_id)
      form.append('year', String(uploadForm.year))
      form.append('title', uploadForm.title)
      if (uploadForm.exam_date) form.append('exam_date', uploadForm.exam_date)
      if (currentYear?.id) form.append('academic_year_id', currentYear.id)
      form.append('paper_file', uploadForm.file)

      await examsApi.uploadPaper(form)
      qc.invalidateQueries({ queryKey: ['papers'] })
      toast.success('Question paper uploaded')
      setUploadOpen(false)
      setUploadForm({
        class_id: '', subject_id: '', year: new Date().getFullYear(),
        title: '', exam_date: '', file: null,
      })
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (paper: QuestionPaper) => {
    if (!confirm('Delete this question paper?')) return
    try {
      await examsApi.deletePaper(paper.id)
      qc.invalidateQueries({ queryKey: ['papers'] })
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Question Paper Archive</h1>
          <p className="text-sm text-slate-500">Browse and upload exam papers by year, class and subject</p>
        </div>
        <button className="btn-primary" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4" /> Upload Paper
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select className="input w-36" value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input w-40" value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterSubject('') }}>
          <option value="">All Classes</option>
          {classes?.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
        </select>
        {filterClass && (
          <select className="input w-44" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <span className="ml-auto text-sm text-slate-400 self-center">{papers?.length ?? 0} papers</span>
      </div>

      {/* Papers grid */}
      {isLoading ? (
        <PageLoader />
      ) : papers?.length === 0 ? (
        <div className="card p-10 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">No papers found for the selected filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers?.map((paper) => {
            const subjectName = (paper.expand?.subject_id as { name?: string })?.name ?? 'Subject'
            const className = (paper.expand?.class_id as { display_name?: string })?.display_name ?? 'Class'
            const fileUrl = pb.files.getUrl(paper as never, paper.paper_file)

            return (
              <div key={paper.id} className="card p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{paper.title || subjectName}</p>
                  <p className="text-xs text-slate-500">{className} · {paper.year}</p>
                  {paper.exam_date && (
                    <p className="text-xs text-slate-400">{formatDate(paper.exam_date)}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    onClick={() => handleDelete(paper)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Question Paper"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setUploadOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Class *</label>
              <select
                className="input"
                value={uploadForm.class_id}
                onChange={(e) => setUploadForm((f) => ({ ...f, class_id: e.target.value, subject_id: '' }))}
              >
                <option value="">Select</option>
                {classes?.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year *</label>
              <select
                className="input"
                value={uploadForm.year}
                onChange={(e) => setUploadForm((f) => ({ ...f, year: Number(e.target.value) }))}
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Subject *</label>
            <select
              className="input"
              value={uploadForm.subject_id}
              onChange={(e) => setUploadForm((f) => ({ ...f, subject_id: e.target.value }))}
              disabled={!uploadForm.class_id}
            >
              <option value="">Select subject</option>
              {uploadSubjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Title (optional)</label>
            <input
              className="input"
              placeholder="e.g. Annual Exam 2024 - English"
              value={uploadForm.title}
              onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Exam Date</label>
            <input
              type="date"
              className="input"
              value={uploadForm.exam_date}
              onChange={(e) => setUploadForm((f) => ({ ...f, exam_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Paper File * (PDF or Image)</label>
            <input
              ref={fileRef}
              type="file"
              className="input"
              accept=".pdf,image/*"
              onChange={(e) => setUploadForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
