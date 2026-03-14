import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { examsApi } from '@/api/exams'
import { studentsApi } from '@/api/students'
import { PageLoader } from '@/components/ui/Spinner'
import { classDisplayName, gradeColor } from '@/lib/utils'
import type { Student, Subject } from '@/types'
import toast from 'react-hot-toast'

export default function MarksEntryPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [classId, setClassId] = useState('')
  const [saving, setSaving] = useState(false)
  const [marks, setMarks] = useState<Record<string, Record<string, string>>>({}) // studentId -> subjectId -> marks

  const { data: exam, isLoading: loadingExam } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.getExam(examId!),
    enabled: !!examId,
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => studentsApi.getClasses(),
  })

  const { data: students } = useQuery({
    queryKey: ['students', { classId }],
    queryFn: () => studentsApi.getAll({ classId, isActive: true }),
    enabled: !!classId,
  })

  const { data: subjects } = useQuery({
    queryKey: ['subjects', classId],
    queryFn: () => examsApi.getSubjects(classId),
    enabled: !!classId,
  })

  const { data: existingMarks } = useQuery({
    queryKey: ['exam-marks', examId, classId],
    queryFn: async () => {
      const allMarks = await examsApi.getMarksForExam(examId!, classId)
      // Build lookup
      const lookup: Record<string, Record<string, string>> = {}
      allMarks.forEach((m) => {
        if (!lookup[m.student_id]) lookup[m.student_id] = {}
        lookup[m.student_id][m.subject_id] = String(m.marks_obtained)
      })
      setMarks(lookup)
      return allMarks
    },
    enabled: !!examId && !!classId,
  })

  const handleSave = async () => {
    if (!examId || !students?.items || !subjects) return
    setSaving(true)
    try {
      const ops: Promise<unknown>[] = []
      students.items.forEach((student) => {
        subjects.forEach((subject) => {
          const val = marks[student.id]?.[subject.id]
          if (val !== undefined && val !== '') {
            ops.push(
              examsApi.upsertMarks({
                student_id: student.id,
                exam_id: examId,
                subject_id: subject.id,
                marks_obtained: Number(val),
              })
            )
          }
        })
      })
      await Promise.all(ops)
      qc.invalidateQueries({ queryKey: ['exam-marks'] })
      toast.success('Marks saved successfully')
    } catch {
      toast.error('Failed to save marks')
    } finally {
      setSaving(false)
    }
  }

  const setMark = (studentId: string, subjectId: string, value: string) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [subjectId]: value },
    }))
  }

  if (loadingExam) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{exam?.name} — Marks Entry</h1>
          <p className="text-sm text-slate-500 capitalize">{exam?.exam_type?.replace('_', ' ')}</p>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving || !classId}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Marks'}
        </button>
      </div>

      {/* Class selector */}
      <div className="card p-4 flex gap-3 items-center">
        <select
          className="input w-48"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">Select Class</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
          ))}
        </select>
        {subjects && (
          <p className="text-sm text-slate-500">{subjects.length} subjects · {students?.items?.length ?? 0} students</p>
        )}
      </div>

      {!classId ? (
        <div className="card p-10 text-center text-slate-400">Select a class to enter marks</div>
      ) : !subjects?.length ? (
        <div className="card p-10 text-center text-slate-400">
          No subjects configured for this class. Add subjects in Settings.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium sticky left-0 bg-slate-50">Student</th>
                  {subjects.map((sub) => (
                    <th key={sub.id} className="px-3 py-3 text-slate-500 font-medium text-center whitespace-nowrap">
                      <div>{sub.name}</div>
                      <div className="text-xs font-normal text-slate-400">/{sub.max_marks || 100}</div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-slate-500 font-medium text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students?.items?.map((student) => {
                  const studentMarks = marks[student.id] ?? {}
                  const total = subjects.reduce((sum, sub) => {
                    const v = studentMarks[sub.id]
                    return sum + (v !== undefined && v !== '' ? Number(v) : 0)
                  }, 0)
                  const maxTotal = subjects.reduce((sum, sub) => sum + (sub.max_marks || 100), 0)
                  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0

                  let grade = 'F'
                  if (pct >= 90) grade = 'A+'
                  else if (pct >= 80) grade = 'A'
                  else if (pct >= 70) grade = 'B+'
                  else if (pct >= 60) grade = 'B'
                  else if (pct >= 50) grade = 'C'
                  else if (pct >= 40) grade = 'D'

                  return (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 sticky left-0 bg-white">
                        <p className="font-medium text-slate-900">{student.first_name} {student.last_name}</p>
                        <p className="text-xs text-slate-400">Roll #{student.roll_number}</p>
                      </td>
                      {subjects.map((sub) => (
                        <td key={sub.id} className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            max={sub.max_marks || 100}
                            className="w-16 text-center input py-1 px-2 text-sm"
                            value={studentMarks[sub.id] ?? ''}
                            placeholder="—"
                            onChange={(e) => setMark(student.id, sub.id, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-center">
                        <p className="font-medium">{total}</p>
                        <p className={`text-xs font-semibold ${gradeColor(grade)}`}>{grade}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
