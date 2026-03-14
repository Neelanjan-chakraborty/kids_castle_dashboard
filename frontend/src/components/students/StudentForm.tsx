import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { studentsApi } from '@/api/students'
import { CLASS_OPTIONS, DIVISION_OPTIONS, BLOOD_GROUPS } from '@/lib/constants'
import type { ExtractedStudentData } from '@/lib/gemini'
import type { Student } from '@/types'
import Spinner from '@/components/ui/Spinner'

interface FormData {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  class_id: string
  division_id: string
  parent_name: string
  parent_phone: string
  parent_email: string
  parent_address: string
  emergency_contact: string
  blood_group: string
  admission_date: string
}

interface Props {
  defaultValues?: Partial<FormData>
  prefilled?: ExtractedStudentData | null
  onSubmit: (data: FormData & { photo?: File }) => Promise<void>
  onAiScan: () => void
  isEdit?: boolean
}

export default function StudentForm({ defaultValues, prefilled, onSubmit, onAiScan, isEdit }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues,
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const selectedClass = watch('class_id')

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => studentsApi.getClasses(),
  })

  const { data: divisions } = useQuery({
    queryKey: ['divisions', selectedClass],
    queryFn: () => {
      const cls = classes?.find((c) => c.id === selectedClass)
      return studentsApi.getDivisions(cls?.id)
    },
    enabled: !!selectedClass,
  })

  // Apply AI-extracted data
  useEffect(() => {
    if (!prefilled) return
    if (prefilled.first_name) setValue('first_name', prefilled.first_name)
    if (prefilled.last_name) setValue('last_name', prefilled.last_name)
    if (prefilled.date_of_birth) setValue('date_of_birth', prefilled.date_of_birth)
    if (prefilled.gender) setValue('gender', prefilled.gender)
    if (prefilled.parent_name) setValue('parent_name', prefilled.parent_name)
    if (prefilled.parent_phone) setValue('parent_phone', prefilled.parent_phone)
    if (prefilled.parent_email) setValue('parent_email', prefilled.parent_email)
    if (prefilled.parent_address) setValue('parent_address', prefilled.parent_address)
    if (prefilled.emergency_contact) setValue('emergency_contact', prefilled.emergency_contact)
    if (prefilled.blood_group) setValue('blood_group', prefilled.blood_group)
    if (prefilled.admission_date) setValue('admission_date', prefilled.admission_date)
    // Map class name to class_id
    if (prefilled.class && classes) {
      const matched = classes.find((c) => c.name === prefilled.class)
      if (matched) setValue('class_id', matched.id)
    }
  }, [prefilled, classes, setValue])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit({ ...data, photo: photoFile ?? undefined })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* AI Scan button */}
      {!isEdit && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
          <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900">AI Auto-Fill</p>
            <p className="text-xs text-slate-500">Upload an admission form photo to auto-fill fields</p>
          </div>
          <button type="button" className="btn-secondary text-xs" onClick={onAiScan}>
            Scan Form
          </button>
        </div>
      )}

      {/* Photo */}
      <div>
        <label className="label">Student Photo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
            {photoPreview
              ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              : <span className="text-slate-400 text-xs text-center">No photo</span>
            }
          </div>
          <input type="file" accept="image/*" onChange={handlePhotoChange} className="input max-w-xs" />
        </div>
      </div>

      {/* Student info */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Student Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name *</label>
            <input className="input" {...register('first_name', { required: 'Required' })} />
            {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="label">Last Name *</label>
            <input className="input" {...register('last_name', { required: 'Required' })} />
            {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" className="input" {...register('date_of_birth')} />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" {...register('gender')}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Blood Group</label>
            <select className="input" {...register('blood_group')}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Admission Date</label>
            <input type="date" className="input" {...register('admission_date')} />
          </div>
        </div>
      </div>

      {/* Class & Division */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Class Assignment</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Class *</label>
            <select className="input" {...register('class_id', { required: 'Required' })}>
              <option value="">Select Class</option>
              {classes?.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.display_name || cls.name}</option>
              ))}
            </select>
            {errors.class_id && <p className="text-xs text-red-500 mt-1">{errors.class_id.message}</p>}
          </div>
          <div>
            <label className="label">Division *</label>
            <select className="input" {...register('division_id', { required: 'Required' })}>
              <option value="">Select Division</option>
              {divisions?.map((div) => (
                <option key={div.id} value={div.id}>Division {div.name}</option>
              ))}
            </select>
            {errors.division_id && <p className="text-xs text-red-500 mt-1">{errors.division_id.message}</p>}
          </div>
        </div>
      </div>

      {/* Parent info */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Parent / Guardian Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Parent Name *</label>
            <input className="input" {...register('parent_name', { required: 'Required' })} />
            {errors.parent_name && <p className="text-xs text-red-500 mt-1">{errors.parent_name.message}</p>}
          </div>
          <div>
            <label className="label">Phone *</label>
            <input className="input" type="tel" {...register('parent_phone', { required: 'Required' })} />
            {errors.parent_phone && <p className="text-xs text-red-500 mt-1">{errors.parent_phone.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" {...register('parent_email')} />
          </div>
          <div>
            <label className="label">Emergency Contact</label>
            <input className="input" type="tel" {...register('emergency_contact')} />
          </div>
          <div className="col-span-2">
            <label className="label">Address</label>
            <textarea className="input resize-none" rows={2} {...register('parent_address')} />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? <Spinner size="sm" className="text-white" /> : null}
          {isEdit ? 'Save Changes' : 'Register Student'}
        </button>
      </div>
    </form>
  )
}
