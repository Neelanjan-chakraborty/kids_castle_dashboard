import pb from '@/lib/pb'
import type { Exam, ExamMarks, QuestionPaper, Subject, ReportCard } from '@/types'

export const examsApi = {
  // Subjects
  getSubjects: (classId?: string) =>
    pb.collection('subjects').getFullList<Subject>({
      filter: classId ? `class_id = "${classId}"` : '',
      expand: 'class_id',
      sort: 'order,name',
    }),

  createSubject: (data: Partial<Subject>) =>
    pb.collection('subjects').create<Subject>(data),

  // Exams
  getExams: (academicYearId?: string, classId?: string) => {
    const conditions: string[] = []
    if (academicYearId) conditions.push(`academic_year_id = "${academicYearId}"`)
    if (classId) conditions.push(`class_id = "${classId}"`)
    return pb.collection('exams').getFullList<Exam>({
      filter: conditions.join(' && '),
      expand: 'academic_year_id,class_id',
      sort: '-start_date',
    })
  },

  getExam: (id: string) =>
    pb.collection('exams').getOne<Exam>(id, { expand: 'academic_year_id,class_id' }),

  createExam: (data: Partial<Exam>) =>
    pb.collection('exams').create<Exam>(data),

  updateExam: (id: string, data: Partial<Exam>) =>
    pb.collection('exams').update<Exam>(id, data),

  deleteExam: (id: string) =>
    pb.collection('exams').delete(id),

  // Question Papers (Archive)
  getPapers: (filters: { classId?: string; academicYearId?: string; year?: number; subjectId?: string }) => {
    const conditions: string[] = []
    if (filters.classId) conditions.push(`class_id = "${filters.classId}"`)
    if (filters.academicYearId) conditions.push(`academic_year_id = "${filters.academicYearId}"`)
    if (filters.year) conditions.push(`year = ${filters.year}`)
    if (filters.subjectId) conditions.push(`subject_id = "${filters.subjectId}"`)
    return pb.collection('question_papers').getFullList<QuestionPaper>({
      filter: conditions.join(' && '),
      expand: 'subject_id,class_id,academic_year_id',
      sort: '-year,-created',
    })
  },

  uploadPaper: (data: FormData) =>
    pb.collection('question_papers').create<QuestionPaper>(data),

  deletePaper: (id: string) =>
    pb.collection('question_papers').delete(id),

  // Marks
  getMarksForExam: (examId: string, classId?: string) => {
    const conditions = [`exam_id = "${examId}"`]
    if (classId) conditions.push(`student_id.class_id = "${classId}"`)
    return pb.collection('exam_marks').getFullList<ExamMarks>({
      filter: conditions.join(' && '),
      expand: 'student_id,subject_id',
      sort: 'student_id.roll_number,subject_id.order',
    })
  },

  getMarksForStudent: (studentId: string, examId: string) =>
    pb.collection('exam_marks').getFullList<ExamMarks>({
      filter: `student_id = "${studentId}" && exam_id = "${examId}"`,
      expand: 'subject_id',
      sort: 'subject_id.order',
    }),

  upsertMarks: async (data: {
    student_id: string
    exam_id: string
    subject_id: string
    marks_obtained: number
    remarks?: string
    entered_by?: string
  }) => {
    try {
      const existing = await pb.collection('exam_marks').getFirstListItem<ExamMarks>(
        `student_id = "${data.student_id}" && exam_id = "${data.exam_id}" && subject_id = "${data.subject_id}"`
      )
      return pb.collection('exam_marks').update<ExamMarks>(existing.id, data)
    } catch {
      return pb.collection('exam_marks').create<ExamMarks>(data)
    }
  },

  // Report Cards
  getReportCards: (examId: string, classId?: string, divisionId?: string) => {
    const conditions = [`exam_id = "${examId}"`]
    if (classId) conditions.push(`student_id.class_id = "${classId}"`)
    if (divisionId) conditions.push(`student_id.division_id = "${divisionId}"`)
    return pb.collection('report_cards').getFullList<ReportCard>({
      filter: conditions.join(' && '),
      expand: 'student_id,student_id.class_id,student_id.division_id,exam_id,academic_year_id',
      sort: 'rank',
    })
  },

  getStudentReportCards: (studentId: string) =>
    pb.collection('report_cards').getFullList<ReportCard>({
      filter: `student_id = "${studentId}"`,
      expand: 'exam_id,academic_year_id',
      sort: '-generated_at',
    }),

  updateReportCard: (id: string, data: Partial<ReportCard>) =>
    pb.collection('report_cards').update<ReportCard>(id, data),

  publishReportCards: async (examId: string) => {
    const cards = await pb.collection('report_cards').getFullList<ReportCard>({
      filter: `exam_id = "${examId}"`,
    })
    return Promise.all(
      cards.map((c) => pb.collection('report_cards').update(c.id, { is_published: true }))
    )
  },
}
