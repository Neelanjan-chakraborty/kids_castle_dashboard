export interface AcademicYear {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  created: string
  updated: string
}

export interface Class {
  id: string
  name: string
  display_name: string
  order: number
}

export interface Division {
  id: string
  class_id: string
  name: string
  expand?: { class_id?: Class }
}

export interface Student {
  id: string
  collectionId: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: 'male' | 'female' | 'other'
  photo: string
  class_id: string
  division_id: string
  roll_number: number
  admission_number: string
  admission_date: string
  parent_name: string
  parent_phone: string
  parent_email: string
  parent_address: string
  emergency_contact: string
  blood_group: string
  is_active: boolean
  ai_extracted_data: Record<string, unknown> | null
  academic_year_id: string
  created: string
  updated: string
  expand?: {
    class_id?: Class
    division_id?: Division
    academic_year_id?: AcademicYear
  }
}

export interface AttendanceRecord {
  id: string
  student_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'half_day' | 'holiday'
  marked_by: string
  remarks: string
  academic_year_id: string
  expand?: { student_id?: Student }
}

export interface AttendanceSession {
  id: string
  date: string
  class_id: string
  division_id: string
  is_locked: boolean
  total_present: number
  total_absent: number
}

export interface Subject {
  id: string
  name: string
  class_id: string
  code: string
  max_marks: number
  pass_marks: number
  subject_type: 'theory' | 'practical' | 'activity'
  order: number
  expand?: { class_id?: Class }
}

export interface Exam {
  id: string
  name: string
  exam_type: string
  academic_year_id: string
  class_id: string
  start_date: string
  end_date: string
  is_published: boolean
  expand?: {
    academic_year_id?: AcademicYear
    class_id?: Class
  }
}

export interface QuestionPaper {
  id: string
  collectionId: string
  exam_id: string
  subject_id: string
  academic_year_id: string
  class_id: string
  exam_date: string
  paper_file: string
  uploaded_by: string
  year: number
  title: string
  tags: string[]
  expand?: {
    subject_id?: Subject
    class_id?: Class
    academic_year_id?: AcademicYear
  }
}

export interface ExamMarks {
  id: string
  student_id: string
  exam_id: string
  subject_id: string
  marks_obtained: number
  grade: string
  percentage: number
  remarks: string
  entered_by: string
  expand?: {
    student_id?: Student
    subject_id?: Subject
  }
}

export interface FeeStructure {
  id: string
  academic_year_id: string
  class_id: string
  fee_type: string
  amount: number
  due_day: number
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time'
  description: string
  expand?: { class_id?: Class }
}

export interface FeeRecord {
  id: string
  student_id: string
  fee_structure_id: string
  academic_year_id: string
  month: number
  year: number
  amount_due: number
  amount_paid: number
  payment_date: string
  payment_mode: string
  transaction_ref: string
  status: 'pending' | 'partial' | 'paid' | 'overdue'
  collected_by: string
  receipt_number: string
  remarks: string
  expand?: {
    student_id?: Student
    fee_structure_id?: FeeStructure
  }
}

export interface ReportCard {
  id: string
  student_id: string
  academic_year_id: string
  exam_id: string
  total_marks: number
  obtained_marks: number
  percentage: number
  grade: string
  rank: number
  attendance_percentage: number
  remarks: string
  is_published: boolean
  generated_at: string
  expand?: {
    student_id?: Student
    exam_id?: Exam
    academic_year_id?: AcademicYear
  }
}

export interface DashboardStats {
  totalStudents: number
  presentToday: number
  absentToday: number
  attendanceRate: number
  pendingFees: number
  overdueFeesCount: number
  upcomingExams: Exam[]
  classBreakdown: { class: string; count: number }[]
}
