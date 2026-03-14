export const SCHOOL_NAME = import.meta.env.VITE_SCHOOL_NAME || 'Kids Castle'

export const CLASS_OPTIONS = [
  { value: 'Nursery', label: 'Nursery' },
  { value: 'LKG',     label: 'LKG' },
  { value: 'UKG',     label: 'UKG' },
  { value: 'Class1',  label: 'Class 1' },
  { value: 'Class2',  label: 'Class 2' },
]

export const DIVISION_OPTIONS = ['A', 'B', 'C', 'D', 'E']

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown']

export const ATTENDANCE_STATUSES = {
  present:  { label: 'Present',  color: 'green'  },
  absent:   { label: 'Absent',   color: 'red'    },
  late:     { label: 'Late',     color: 'yellow' },
  half_day: { label: 'Half Day', color: 'orange' },
  holiday:  { label: 'Holiday',  color: 'blue'   },
}

export const FEE_STATUS_COLORS: Record<string, string> = {
  paid:     'green',
  pending:  'yellow',
  partial:  'orange',
  overdue:  'red',
}

export const SUBJECTS_BY_CLASS: Record<string, string[]> = {
  Nursery: ['English', 'Mathematics', 'EVS', 'Art & Craft'],
  LKG:     ['English', 'Mathematics', 'EVS', 'Art & Craft', 'Hindi'],
  UKG:     ['English', 'Mathematics', 'EVS', 'Hindi', 'General Knowledge'],
  Class1:  ['English', 'Mathematics', 'EVS', 'Hindi', 'GK', 'Computer'],
  Class2:  ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'GK', 'Computer'],
}

export const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const EXAM_TYPES = [
  { value: 'unit_test',   label: 'Unit Test' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'annual',      label: 'Annual' },
  { value: 'internal',    label: 'Internal Assessment' },
  { value: 'other',       label: 'Other' },
]
