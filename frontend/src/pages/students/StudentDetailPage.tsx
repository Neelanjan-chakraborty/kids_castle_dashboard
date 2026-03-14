import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Edit, Calendar, CreditCard, FileText, GraduationCap } from 'lucide-react'
import { studentsApi } from '@/api/students'
import { attendanceApi } from '@/api/attendance'
import { feesApi } from '@/api/fees'
import { examsApi } from '@/api/exams'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate, formatCurrency, getInitials, classDisplayName, gradeColor, percentageColor } from '@/lib/utils'
import { MONTH_NAMES, FEE_STATUS_COLORS } from '@/lib/constants'
import pb from '@/lib/pb'
import type { AcademicYear } from '@/types'

const TABS = ['Overview', 'Attendance', 'Fees', 'Report Cards'] as const
type Tab = typeof TABS[number]

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('Overview')

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.getById(id!),
    enabled: !!id,
  })

  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance-stats', id],
    queryFn: async () => {
      const currentYear = await studentsApi.getCurrentYear()
      if (!currentYear || !id) return null
      return attendanceApi.getStudentAttendanceStats(id, currentYear.id)
    },
    enabled: !!id,
  })

  const { data: feeRecords } = useQuery({
    queryKey: ['fee-records', id],
    queryFn: () => feesApi.getRecordsForStudent(id!),
    enabled: !!id,
  })

  const { data: reportCards } = useQuery({
    queryKey: ['report-cards', id],
    queryFn: () => examsApi.getStudentReportCards(id!),
    enabled: !!id,
  })

  if (isLoading || !student) return <PageLoader />

  const className = (student.expand?.class_id as { name?: string; display_name?: string })?.display_name
    || classDisplayName((student.expand?.class_id as { name?: string })?.name ?? '')
  const divisionName = (student.expand?.division_id as { name?: string })?.name

  const photoUrl = student.photo
    ? pb.files.getUrl(student as never, student.photo)
    : null

  const totalFeesDue = feeRecords?.reduce((s, f) => s + f.amount_due, 0) ?? 0
  const totalFeesPaid = feeRecords?.reduce((s, f) => s + f.amount_paid, 0) ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Student Profile</h1>
        <button
          onClick={() => navigate(`/students/${id}/edit`)}
          className="btn-secondary ml-auto"
        >
          <Edit className="w-4 h-4" /> Edit
        </button>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl flex-shrink-0">
            {photoUrl
              ? <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              : getInitials(`${student.first_name} ${student.last_name}`)
            }
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900">
              {student.first_name} {student.last_name}
            </h2>
            <p className="text-sm text-slate-500">{student.admission_number}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="badge-blue">{className}</span>
              {divisionName && <span className="badge-gray">Division {divisionName}</span>}
              <span className="badge-gray">Roll #{student.roll_number}</span>
              {student.blood_group && <span className="badge-red">{student.blood_group}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Attendance</p>
            <p className={`text-2xl font-bold ${percentageColor(attendanceStats?.percentage ?? 0)}`}>
              {attendanceStats?.percentage ?? '—'}%
            </p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
          {[
            { label: 'Date of Birth', value: formatDate(student.date_of_birth) },
            { label: 'Gender', value: student.gender || '—', capitalize: true },
            { label: 'Admitted', value: formatDate(student.admission_date) },
            { label: 'Parent', value: student.parent_name },
            { label: 'Phone', value: student.parent_phone },
            { label: 'Email', value: student.parent_email || '—' },
          ].map(({ label, value, capitalize }) => (
            <div key={label}>
              <p className="text-xs text-slate-400">{label}</p>
              <p className={`text-sm font-medium text-slate-900 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
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

      {/* Tab content */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5 text-center">
            <Calendar className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{attendanceStats?.present ?? 0}</p>
            <p className="text-xs text-slate-400">Days Present</p>
          </div>
          <div className="card p-5 text-center">
            <CreditCard className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalFeesPaid)}</p>
            <p className="text-xs text-slate-400">Fees Paid</p>
          </div>
          <div className="card p-5 text-center">
            <FileText className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{reportCards?.length ?? 0}</p>
            <p className="text-xs text-slate-400">Report Cards</p>
          </div>
        </div>
      )}

      {tab === 'Attendance' && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Attendance Summary</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total Days', value: attendanceStats?.total ?? 0 },
              { label: 'Present', value: attendanceStats?.present ?? 0, color: 'text-green-600' },
              { label: 'Absent', value: attendanceStats?.absent ?? 0, color: 'text-red-600' },
              { label: 'Rate', value: `${attendanceStats?.percentage ?? 0}%`, color: percentageColor(attendanceStats?.percentage ?? 0) },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-3 bg-slate-50 rounded-lg">
                <p className={`text-xl font-bold ${color ?? 'text-slate-900'}`}>{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Fees' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Fee Records</h3>
            <div className="text-sm text-slate-500">
              Paid: <strong className="text-slate-900">{formatCurrency(totalFeesPaid)}</strong>
              {' / '}Due: <strong className="text-slate-900">{formatCurrency(totalFeesDue)}</strong>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 text-slate-500 font-medium">Fee Type</th>
                  <th className="text-left px-4 py-2 text-slate-500 font-medium">Period</th>
                  <th className="text-right px-4 py-2 text-slate-500 font-medium">Due</th>
                  <th className="text-right px-4 py-2 text-slate-500 font-medium">Paid</th>
                  <th className="text-left px-4 py-2 text-slate-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feeRecords?.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 capitalize">
                      {(fee.expand?.fee_structure_id as { fee_type?: string })?.fee_type?.replace('_', ' ') ?? 'Fee'}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {fee.month ? `${MONTH_NAMES[fee.month]} ${fee.year}` : fee.year || '—'}
                    </td>
                    <td className="px-4 py-2 text-right">{formatCurrency(fee.amount_due)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(fee.amount_paid)}</td>
                    <td className="px-4 py-2">
                      <span className={`badge badge-${FEE_STATUS_COLORS[fee.status] ?? 'gray'}`}>
                        {fee.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Report Cards' && (
        <div className="space-y-3">
          {reportCards?.length === 0 ? (
            <div className="card p-8 text-center">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No report cards yet</p>
            </div>
          ) : (
            reportCards?.map((rc) => (
              <div key={rc.id} className="card p-5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {(rc.expand?.exam_id as { name?: string })?.name ?? 'Exam'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(rc.expand?.academic_year_id as AcademicYear)?.name} · Generated {formatDate(rc.generated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className={`text-xl font-bold ${gradeColor(rc.grade)}`}>{rc.grade}</p>
                    <p className="text-xs text-slate-400">{rc.percentage}%</p>
                  </div>
                  {rc.rank && (
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-900">#{rc.rank}</p>
                      <p className="text-xs text-slate-400">Rank</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
