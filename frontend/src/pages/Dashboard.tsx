import { useQuery } from '@tanstack/react-query'
import {
  Users, CalendarCheck, CreditCard, GraduationCap,
  TrendingUp, AlertCircle, ShieldCheck
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import pb from '@/lib/pb'
import StatCard from '@/components/ui/StatCard'
import PermissionGate from '@/components/layout/PermissionGate'
import { PageLoader } from '@/components/ui/Spinner'
import { usePermissions } from '@/hooks/usePermissions'
import { ROLE_LABELS, type Role } from '@/lib/permissions'
import { todayISO, formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import type { Student, Exam, FeeRecord, AttendanceRecord } from '@/types'

export default function Dashboard() {
  const today = todayISO()
  const { user } = useAuthStore()
  const { can, role } = usePermissions()

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['students', 'active'],
    queryFn: () => pb.collection('students').getFullList<Student>({ filter: 'is_active = true' }),
  })

  const { data: todayAttendance } = useQuery({
    queryKey: ['attendance', today],
    queryFn: () =>
      pb.collection('attendance').getFullList<AttendanceRecord>({ filter: `date = "${today}"` }),
  })

  const { data: pendingFees } = useQuery({
    queryKey: ['fees', 'pending'],
    queryFn: () =>
      pb.collection('fee_records').getFullList<FeeRecord>({
        filter: 'status = "pending" || status = "overdue"',
      }),
  })

  const { data: upcomingExams } = useQuery({
    queryKey: ['exams', 'upcoming'],
    queryFn: () =>
      pb.collection('exams').getFullList<Exam>({
        filter: `start_date >= "${today}"`,
        expand: 'class_id',
        sort: 'start_date',
      }),
  })

  if (loadingStudents) return <PageLoader />

  const totalStudents = students?.length ?? 0
  const presentToday = todayAttendance?.filter((a) =>
    ['present', 'late', 'half_day'].includes(a.status)
  ).length ?? 0
  const absentToday = todayAttendance?.filter((a) => a.status === 'absent').length ?? 0
  const attendanceRate = todayAttendance?.length
    ? Math.round((presentToday / todayAttendance.length) * 100)
    : 0

  const overdueFees = pendingFees?.filter((f) => f.status === 'overdue') ?? []
  const totalOutstanding = pendingFees?.reduce((s, f) => s + (f.amount_due - f.amount_paid), 0) ?? 0

  // Class breakdown for chart
  const classBreakdown = ['Nursery', 'LKG', 'UKG', 'Class1', 'Class2'].map((cls) => ({
    name: cls === 'Class1' ? 'Class 1' : cls === 'Class2' ? 'Class 2' : cls,
    count: students?.filter((s) => {
      const className = (s.expand?.class_id as { name?: string })?.name
      return className === cls
    }).length ?? 0,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {ROLE_LABELS[role as Role] ?? 'User'} · {formatDate(today)}
          </p>
        </div>
        {role === 'staff' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-blue-700 text-sm">
            <ShieldCheck className="w-4 h-4" />
            Custom permissions active
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PermissionGate permission="view_students">
          <StatCard
            label="Total Students"
            value={totalStudents}
            icon={<Users className="w-6 h-6" />}
            color="blue"
            sub="Active enrollments"
          />
        </PermissionGate>
        <PermissionGate permission="view_student_attendance">
          <StatCard
            label="Present Today"
            value={`${presentToday} / ${todayAttendance?.length ?? 0}`}
            icon={<CalendarCheck className="w-6 h-6" />}
            color="green"
            sub={`${attendanceRate}% attendance rate`}
          />
        </PermissionGate>
        <PermissionGate permission="view_fees">
          <StatCard
            label="Fees Outstanding"
            value={formatCurrency(totalOutstanding)}
            icon={<CreditCard className="w-6 h-6" />}
            color={overdueFees.length > 0 ? 'red' : 'yellow'}
            sub={`${overdueFees.length} overdue records`}
          />
        </PermissionGate>
        <PermissionGate permission="manage_exams">
          <StatCard
            label="Upcoming Exams"
            value={upcomingExams?.length ?? 0}
            icon={<GraduationCap className="w-6 h-6" />}
            color="purple"
            sub="Scheduled"
          />
        </PermissionGate>
      </div>

      {/* Charts + Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Breakdown */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Students by Class</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={classBreakdown} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {classBreakdown.map((_, i) => (
                  <Cell key={i} fill={['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444'][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Today's Attendance */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Today's Attendance</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Present', count: presentToday, color: 'bg-green-500' },
              { label: 'Absent', count: absentToday, color: 'bg-red-400' },
              { label: 'Late', count: todayAttendance?.filter((a) => a.status === 'late').length ?? 0, color: 'bg-yellow-400' },
            ].map(({ label, count, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: totalStudents ? `${(count / totalStudents) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Exams + Overdue Fees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Exams */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Upcoming Exams</h2>
          {upcomingExams?.length === 0 ? (
            <p className="text-sm text-slate-400">No upcoming exams</p>
          ) : (
            <div className="space-y-2">
              {upcomingExams?.slice(0, 5).map((exam) => (
                <div key={exam.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{exam.name}</p>
                    <p className="text-xs text-slate-400">
                      {(exam.expand?.class_id as { display_name?: string })?.display_name ?? ''} · {formatDate(exam.start_date)}
                    </p>
                  </div>
                  <span className="badge-blue">{exam.exam_type.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Fees */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-slate-900">Overdue Fees</h2>
            {overdueFees.length > 0 && (
              <span className="badge-red ml-auto">{overdueFees.length}</span>
            )}
          </div>
          {overdueFees.length === 0 ? (
            <p className="text-sm text-slate-400">No overdue fees — great!</p>
          ) : (
            <div className="space-y-2">
              {overdueFees.slice(0, 5).map((fee) => (
                <div key={fee.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {(fee.expand?.student_id as { first_name?: string; last_name?: string }
                      )?.first_name ?? 'Student'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Due: {formatCurrency(fee.amount_due - fee.amount_paid)}
                    </p>
                  </div>
                  <span className="badge-red">Overdue</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
