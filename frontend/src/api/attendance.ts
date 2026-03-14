import pb from '@/lib/pb'
import type { AttendanceRecord, AttendanceSession } from '@/types'

export const attendanceApi = {
  getByDate: (date: string, classId?: string, divisionId?: string) => {
    const conditions = [`date = "${date}"`]
    return pb.collection('attendance').getFullList<AttendanceRecord>({
      filter: conditions.join(' && '),
      expand: 'student_id,student_id.class_id,student_id.division_id',
      sort: 'student_id.roll_number',
    })
  },

  getForStudent: (studentId: string, month?: string) => {
    const conditions = [`student_id = "${studentId}"`]
    if (month) conditions.push(`date >= "${month}-01" && date <= "${month}-31"`)
    return pb.collection('attendance').getFullList<AttendanceRecord>({
      filter: conditions.join(' && '),
      sort: '-date',
    })
  },

  getMonthlyForClass: (classId: string, divisionId: string, yearMonth: string) => {
    return pb.collection('attendance').getFullList<AttendanceRecord>({
      filter: `student_id.class_id = "${classId}" && student_id.division_id = "${divisionId}" && date >= "${yearMonth}-01" && date <= "${yearMonth}-31"`,
      expand: 'student_id',
      sort: 'date,student_id.roll_number',
    })
  },

  markStatus: (id: string, status: string, remarks = '', markedBy?: string) =>
    pb.collection('attendance').update<AttendanceRecord>(id, {
      status,
      remarks,
      marked_by: markedBy,
    }),

  bulkMark: async (updates: { id: string; status: string }[]) => {
    return Promise.all(
      updates.map((u) =>
        pb.collection('attendance').update<AttendanceRecord>(u.id, { status: u.status })
      )
    )
  },

  getSummaryForDate: async (date: string) => {
    const records = await pb.collection('attendance').getFullList<AttendanceRecord>({
      filter: `date = "${date}"`,
    })
    const present = records.filter((r) => ['present', 'late', 'half_day'].includes(r.status)).length
    const absent = records.filter((r) => r.status === 'absent').length
    const total = records.length
    return { total, present, absent, rate: total > 0 ? Math.round((present / total) * 100) : 0 }
  },

  getStudentAttendanceStats: async (studentId: string, academicYearId: string) => {
    const records = await pb.collection('attendance').getFullList<AttendanceRecord>({
      filter: `student_id = "${studentId}" && academic_year_id = "${academicYearId}"`,
    })
    const present = records.filter((r) => ['present', 'late', 'half_day'].includes(r.status)).length
    return {
      total: records.length,
      present,
      absent: records.filter((r) => r.status === 'absent').length,
      percentage: records.length > 0 ? Math.round((present / records.length) * 100) : 0,
    }
  },

  getSessions: (date?: string) =>
    pb.collection('attendance_sessions').getFullList<AttendanceSession>({
      filter: date ? `date = "${date}"` : '',
      sort: '-date',
    }),

  createSession: (data: Partial<AttendanceSession>) =>
    pb.collection('attendance_sessions').create<AttendanceSession>(data),
}
