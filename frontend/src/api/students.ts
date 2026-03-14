import pb from '@/lib/pb'
import type { Student } from '@/types'

export const studentsApi = {
  getAll: (filters?: { classId?: string; divisionId?: string; search?: string; isActive?: boolean }) => {
    const conditions: string[] = []
    if (filters?.classId) conditions.push(`class_id = "${filters.classId}"`)
    if (filters?.divisionId) conditions.push(`division_id = "${filters.divisionId}"`)
    if (filters?.isActive !== undefined) conditions.push(`is_active = ${filters.isActive}`)
    if (filters?.search) {
      conditions.push(
        `(first_name ~ "${filters.search}" || last_name ~ "${filters.search}" || admission_number ~ "${filters.search}" || parent_phone ~ "${filters.search}")`
      )
    }

    return pb.collection('students').getList<Student>(1, 500, {
      filter: conditions.length ? conditions.join(' && ') : '',
      expand: 'class_id,division_id',
      sort: 'class_id,roll_number',
    })
  },

  getById: (id: string) =>
    pb.collection('students').getOne<Student>(id, {
      expand: 'class_id,division_id,academic_year_id',
    }),

  create: (data: Partial<Student>) =>
    pb.collection('students').create<Student>(data),

  update: (id: string, data: Partial<Student>) =>
    pb.collection('students').update<Student>(id, data),

  uploadPhoto: async (id: string, file: File) => {
    const form = new FormData()
    form.append('photo', file)
    return pb.collection('students').update<Student>(id, form)
  },

  deactivate: (id: string) =>
    pb.collection('students').update<Student>(id, { is_active: false }),

  getClasses: () =>
    pb.collection('classes').getFullList({ sort: 'order' }),

  getDivisions: (classId?: string) =>
    pb.collection('divisions').getFullList({
      filter: classId ? `class_id = "${classId}"` : '',
      expand: 'class_id',
      sort: 'name',
    }),

  getAcademicYears: () =>
    pb.collection('academic_years').getFullList({ sort: '-start_date' }),

  getCurrentYear: async () => {
    const years = await pb.collection('academic_years').getList(1, 1, {
      filter: 'is_current = true',
    })
    return years.items[0] ?? null
  },
}
