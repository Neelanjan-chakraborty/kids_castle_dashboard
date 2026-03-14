import { useState, useRef } from 'react'
import { Upload, Sparkles, AlertCircle, CheckCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { extractStudentFromImage, fileToBase64, type ExtractedStudentData } from '@/lib/gemini'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onExtracted: (data: ExtractedStudentData) => void
}

export default function AiScanModal({ open, onClose, onExtracted }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedStudentData | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
    setExtracted(null)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) {
      setFile(f)
      setError(null)
      setExtracted(null)
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target?.result as string)
      reader.readAsDataURL(f)
    }
  }

  const handleScan = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const { base64, mimeType } = await fileToBase64(file)
      const data = await extractStudentFromImage(base64, mimeType)
      setExtracted(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extract data from image')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (extracted) {
      onExtracted(extracted)
      onClose()
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    setExtracted(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="AI Form Scanner"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          {extracted ? (
            <button className="btn-primary" onClick={handleApply}>
              <CheckCircle className="w-4 h-4" /> Apply to Form
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleScan}
              disabled={!file || loading}
            >
              {loading ? <Spinner size="sm" className="text-white" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Scanning...' : 'Scan with AI'}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Upload a photo or scan of a student admission form. Gemini AI will extract the details and auto-fill the registration form.
        </p>

        {/* Upload area */}
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
            preview ? 'border-primary-300 bg-primary-50' : 'border-slate-200 hover:border-primary-300 hover:bg-primary-50/30'
          )}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {preview ? (
            <img
              src={preview}
              alt="Form preview"
              className="max-h-48 mx-auto rounded-lg object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Upload className="w-8 h-8" />
              <p className="text-sm">Drop image here or click to upload</p>
              <p className="text-xs">JPG, PNG, WEBP supported</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Extracted data preview */}
        {extracted && (
          <div className="bg-green-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-700 font-medium text-sm mb-3">
              <CheckCircle className="w-4 h-4" />
              Extracted successfully — review before applying
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {Object.entries(extracted).map(([key, val]) => (
                val ? (
                  <div key={key} className="flex gap-1">
                    <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="text-slate-900 font-medium truncate">{val}</span>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
