import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { studentsApi } from '@/api/students'
import StudentForm from '@/components/students/StudentForm'
import AiScanModal from '@/components/students/AiScanModal'
import type { ExtractedStudentData } from '@/lib/gemini'
import toast from 'react-hot-toast'
import pb from '@/lib/pb'
import { useAuthStore } from '@/stores/authStore'

export default function RegisterStudentPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [aiOpen, setAiOpen] = useState(false)
  const [prefilled, setPrefilled] = useState<ExtractedStudentData | null>(null)

  const handleSubmit = async (data: Parameters<typeof StudentForm>[0]['onSubmit'] extends (d: infer D) => unknown ? D : never) => {
    try {
      const { photo, ...rest } = data as { photo?: File; [key: string]: unknown }

      // Get current academic year
      const currentYear = await studentsApi.getCurrentYear()

      const studentData = {
        ...rest,
        is_active: true,
        admission_date: rest.admission_date || new Date().toISOString().split('T')[0],
        academic_year_id: currentYear?.id,
      }

      const student = await studentsApi.create(studentData as never)

      // Upload photo separately if provided
      if (photo) {
        await studentsApi.uploadPhoto(student.id, photo)
      }

      toast.success(`${rest.first_name} ${rest.last_name} registered successfully!`)
      navigate(`/students/${student.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register student'
      toast.error(msg)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Register Student</h1>
          <p className="text-sm text-slate-500">Fill manually or use AI scan</p>
        </div>
      </div>

      {/* Form */}
      <div className="card p-6">
        <StudentForm
          onSubmit={handleSubmit}
          onAiScan={() => setAiOpen(true)}
          prefilled={prefilled}
        />
      </div>

      {/* AI Modal */}
      <AiScanModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onExtracted={(data) => {
          setPrefilled(data)
          setAiOpen(false)
          toast.success('Form pre-filled from scan! Review and submit.')
        }}
      />
    </div>
  )
}
