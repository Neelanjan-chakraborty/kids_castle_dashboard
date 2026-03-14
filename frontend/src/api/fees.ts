import pb from '@/lib/pb'
import type { FeeRecord, FeeStructure } from '@/types'

export const feesApi = {
  getStructures: (academicYearId?: string, classId?: string) => {
    const conditions: string[] = []
    if (academicYearId) conditions.push(`academic_year_id = "${academicYearId}"`)
    if (classId) conditions.push(`class_id = "${classId}"`)
    return pb.collection('fee_structures').getFullList<FeeStructure>({
      filter: conditions.join(' && '),
      expand: 'class_id,academic_year_id',
      sort: 'class_id,fee_type',
    })
  },

  createStructure: (data: Partial<FeeStructure>) =>
    pb.collection('fee_structures').create<FeeStructure>(data),

  updateStructure: (id: string, data: Partial<FeeStructure>) =>
    pb.collection('fee_structures').update<FeeStructure>(id, data),

  deleteStructure: (id: string) =>
    pb.collection('fee_structures').delete(id),

  getRecordsForStudent: (studentId: string, academicYearId?: string) => {
    const conditions = [`student_id = "${studentId}"`]
    if (academicYearId) conditions.push(`academic_year_id = "${academicYearId}"`)
    return pb.collection('fee_records').getFullList<FeeRecord>({
      filter: conditions.join(' && '),
      expand: 'fee_structure_id',
      sort: 'year,month',
    })
  },

  getOverdueRecords: (academicYearId?: string) => {
    const conditions = [`status = "overdue" || status = "pending"`]
    if (academicYearId) conditions.push(`academic_year_id = "${academicYearId}"`)
    return pb.collection('fee_records').getFullList<FeeRecord>({
      filter: conditions.join(' && '),
      expand: 'student_id,student_id.class_id',
      sort: '-year,-month',
    })
  },

  getClassFeeSummary: async (classId: string, academicYearId: string) => {
    const records = await pb.collection('fee_records').getFullList<FeeRecord>({
      filter: `student_id.class_id = "${classId}" && academic_year_id = "${academicYearId}"`,
    })
    const totalDue = records.reduce((s, r) => s + r.amount_due, 0)
    const totalPaid = records.reduce((s, r) => s + r.amount_paid, 0)
    const overdue = records.filter((r) => r.status === 'overdue').length
    return { totalDue, totalPaid, outstanding: totalDue - totalPaid, overdueCount: overdue }
  },

  recordPayment: (id: string, data: {
    amount_paid: number
    payment_mode: string
    transaction_ref?: string
    collected_by?: string
    remarks?: string
  }) =>
    pb.collection('fee_records').update<FeeRecord>(id, {
      ...data,
      payment_date: new Date().toISOString().split('T')[0],
    }),

  getAllForClass: (classId: string, academicYearId: string, month?: number) => {
    const conditions = [
      `student_id.class_id = "${classId}"`,
      `academic_year_id = "${academicYearId}"`,
    ]
    if (month) conditions.push(`month = ${month}`)
    return pb.collection('fee_records').getFullList<FeeRecord>({
      filter: conditions.join(' && '),
      expand: 'student_id,fee_structure_id',
      sort: 'student_id.roll_number',
    })
  },
}
