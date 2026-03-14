import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import { Printer, Eye } from 'lucide-react'
import { examsApi } from '@/api/exams'
import { studentsApi } from '@/api/students'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate, gradeColor, percentageColor, classDisplayName } from '@/lib/utils'
import { SCHOOL_NAME } from '@/lib/constants'
import pb from '@/lib/pb'
import type { ReportCard, Student, Exam, ExamMarks, Subject } from '@/types'

export default function ReportCardsPage() {
  const [searchParams] = useSearchParams()
  const [examId, setExamId] = useState(searchParams.get('examId') ?? '')
  const [classId, setClassId] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const [previewStudent, setPreviewStudent] = useState<ReportCard | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({ content: () => printRef.current })

  const { data: currentYear } = useQuery({
    queryKey: ['current-year'],
    queryFn: () => studentsApi.getCurrentYear(),
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => studentsApi.getClasses(),
  })

  const { data: divisions } = useQuery({
    queryKey: ['divisions', classId],
    queryFn: () => studentsApi.getDivisions(classId),
    enabled: !!classId,
  })

  const { data: exams } = useQuery({
    queryKey: ['exams', currentYear?.id],
    queryFn: () => examsApi.getExams(currentYear?.id),
    enabled: !!currentYear,
  })

  const { data: reportCards, isLoading } = useQuery({
    queryKey: ['report-cards', examId, classId, divisionId],
    queryFn: () => examsApi.getReportCards(examId, classId || undefined, divisionId || undefined),
    enabled: !!examId,
  })

  const { data: previewMarks } = useQuery({
    queryKey: ['student-marks', previewStudent?.student_id, examId],
    queryFn: () => examsApi.getMarksForStudent(previewStudent!.student_id, examId),
    enabled: !!previewStudent,
  })

  const student = previewStudent?.expand?.student_id as Student | undefined
  const exam = previewStudent?.expand?.exam_id as Exam | undefined

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Report Cards</h1>
          <p className="text-sm text-slate-500">{currentYear?.name}</p>
        </div>
        {reportCards && reportCards.length > 0 && (
          <button className="btn-primary no-print" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Print All
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 no-print">
        <select className="input w-56" value={examId} onChange={(e) => setExamId(e.target.value)}>
          <option value="">Select Exam</option>
          {exams?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="input w-40" value={classId} onChange={(e) => { setClassId(e.target.value); setDivisionId('') }}>
          <option value="">All Classes</option>
          {classes?.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
        </select>
        {classId && (
          <select className="input w-40" value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
            <option value="">All Divisions</option>
            {divisions?.map((d) => <option key={d.id} value={d.id}>Division {d.name}</option>)}
          </select>
        )}
      </div>

      {/* Report card list */}
      {!examId ? (
        <div className="card p-10 text-center text-slate-400">Select an exam to view report cards</div>
      ) : isLoading ? (
        <PageLoader />
      ) : (
        <>
          {/* Printable area */}
          <div ref={printRef}>
            {previewStudent ? (
              <SingleReportCard
                reportCard={previewStudent}
                marks={previewMarks ?? []}
                schoolName={SCHOOL_NAME}
              />
            ) : (
              reportCards?.map((rc) => (
                <SingleReportCard
                  key={rc.id}
                  reportCard={rc}
                  marks={[]}
                  schoolName={SCHOOL_NAME}
                />
              ))
            )}
          </div>

          {/* Table view (no print) */}
          <div className="card overflow-hidden no-print">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Rank</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Student</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Marks</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">%</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Grade</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Attendance</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportCards?.map((rc, idx) => {
                  const s = rc.expand?.student_id as Student | undefined
                  return (
                    <tr key={rc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">#{rc.rank || idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{s?.first_name} {s?.last_name}</p>
                        <p className="text-xs text-slate-400">{s?.admission_number}</p>
                      </td>
                      <td className="px-4 py-3">{rc.obtained_marks}/{rc.total_marks}</td>
                      <td className={`px-4 py-3 font-medium ${percentageColor(rc.percentage)}`}>
                        {rc.percentage}%
                      </td>
                      <td className={`px-4 py-3 font-bold ${gradeColor(rc.grade)}`}>{rc.grade}</td>
                      <td className={`px-4 py-3 ${percentageColor(rc.attendance_percentage)}`}>
                        {rc.attendance_percentage}%
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="btn-secondary text-xs py-1 px-3"
                          onClick={() => setPreviewStudent(previewStudent?.id === rc.id ? null : rc)}
                        >
                          <Eye className="w-3 h-3" />
                          {previewStudent?.id === rc.id ? 'Hide' : 'Preview'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Single Report Card (printable) ──────────────────────────────────────────

function SingleReportCard({
  reportCard,
  marks,
  schoolName,
}: {
  reportCard: ReportCard
  marks: ExamMarks[]
  schoolName: string
}) {
  const student = reportCard.expand?.student_id as Student | undefined
  const exam = reportCard.expand?.exam_id as Exam | undefined

  return (
    <div className="bg-white p-8 max-w-2xl mx-auto mb-8 border border-slate-200 rounded-xl print-only-show">
      {/* Header */}
      <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
        <h1 className="text-2xl font-bold text-slate-900">{schoolName}</h1>
        <p className="text-sm text-slate-500">Progress Report Card</p>
        <p className="text-sm font-medium text-slate-700">{exam?.name}</p>
      </div>

      {/* Student info */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-5 text-sm">
        <div><span className="text-slate-400">Name:</span> <strong>{student?.first_name} {student?.last_name}</strong></div>
        <div><span className="text-slate-400">Adm. No:</span> {student?.admission_number}</div>
        <div><span className="text-slate-400">Class:</span> {classDisplayName((student?.expand?.class_id as { name?: string })?.name ?? '')}</div>
        <div><span className="text-slate-400">Division:</span> {(student?.expand?.division_id as { name?: string })?.name}</div>
        <div><span className="text-slate-400">Roll No:</span> {student?.roll_number}</div>
        <div><span className="text-slate-400">Attendance:</span> <span className={percentageColor(reportCard.attendance_percentage)}>{reportCard.attendance_percentage}%</span></div>
      </div>

      {/* Marks table */}
      {marks.length > 0 && (
        <table className="w-full text-sm mb-5 border border-slate-200">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-3 py-2 border-b border-slate-200">Subject</th>
              <th className="text-center px-3 py-2 border-b border-slate-200">Max Marks</th>
              <th className="text-center px-3 py-2 border-b border-slate-200">Obtained</th>
              <th className="text-center px-3 py-2 border-b border-slate-200">Grade</th>
            </tr>
          </thead>
          <tbody>
            {marks.map((m) => (
              <tr key={m.id} className="border-b border-slate-100">
                <td className="px-3 py-2">{(m.expand?.subject_id as Subject | undefined)?.name}</td>
                <td className="px-3 py-2 text-center">{(m.expand?.subject_id as Subject | undefined)?.max_marks || 100}</td>
                <td className="px-3 py-2 text-center font-medium">{m.marks_obtained}</td>
                <td className={`px-3 py-2 text-center font-bold ${gradeColor(m.grade)}`}>{m.grade}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-center">{reportCard.total_marks}</td>
              <td className="px-3 py-2 text-center">{reportCard.obtained_marks}</td>
              <td className={`px-3 py-2 text-center font-bold text-lg ${gradeColor(reportCard.grade)}`}>
                {reportCard.grade}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {/* Summary */}
      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg mb-5">
        <div className="text-center">
          <p className="text-xs text-slate-400">Total Marks</p>
          <p className="text-lg font-bold">{reportCard.obtained_marks}/{reportCard.total_marks}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">Percentage</p>
          <p className={`text-lg font-bold ${percentageColor(reportCard.percentage)}`}>{reportCard.percentage}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">Grade</p>
          <p className={`text-3xl font-bold ${gradeColor(reportCard.grade)}`}>{reportCard.grade}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">Class Rank</p>
          <p className="text-lg font-bold">#{reportCard.rank || '—'}</p>
        </div>
      </div>

      {/* Remarks */}
      {reportCard.remarks && (
        <div className="mb-5">
          <p className="text-xs text-slate-400 mb-1">Teacher's Remarks</p>
          <p className="text-sm text-slate-700 italic border-l-2 border-slate-300 pl-3">{reportCard.remarks}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="flex justify-between mt-10 pt-4 border-t border-slate-200">
        <div className="text-center">
          <div className="w-32 h-px bg-slate-400 mb-1" />
          <p className="text-xs text-slate-400">Class Teacher</p>
        </div>
        <div className="text-center">
          <div className="w-32 h-px bg-slate-400 mb-1" />
          <p className="text-xs text-slate-400">Principal</p>
        </div>
        <div className="text-center">
          <div className="w-32 h-px bg-slate-400 mb-1" />
          <p className="text-xs text-slate-400">Parent's Signature</p>
        </div>
      </div>
    </div>
  )
}
