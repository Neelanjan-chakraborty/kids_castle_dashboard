const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

const STUDENT_EXTRACTION_PROMPT = `You are an OCR assistant for a school admission system.
Carefully extract student registration details from this admission form image.
Return ONLY valid JSON (no markdown, no explanation) with exactly these fields:
{
  "first_name": "",
  "last_name": "",
  "date_of_birth": "YYYY-MM-DD or empty",
  "gender": "male or female or other or empty",
  "parent_name": "",
  "parent_phone": "",
  "parent_email": "",
  "parent_address": "",
  "emergency_contact": "",
  "blood_group": "A+ or A- or B+ or B- or O+ or O- or AB+ or AB- or Unknown or empty",
  "class": "Nursery or LKG or UKG or Class1 or Class2 or empty",
  "admission_date": "YYYY-MM-DD or empty"
}
If a field cannot be found or read clearly, leave it as empty string.
Do not guess values — only extract what is clearly visible.`

export interface ExtractedStudentData {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  parent_name: string
  parent_phone: string
  parent_email: string
  parent_address: string
  emergency_contact: string
  blood_group: string
  class: string
  admission_date: string
}

export async function extractStudentFromImage(
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<ExtractedStudentData> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables')
  }

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: STUDENT_EXTRACTION_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('No response from Gemini API')
  }

  try {
    return JSON.parse(text) as ExtractedStudentData
  } catch {
    throw new Error('Gemini returned invalid JSON: ' + text.substring(0, 200))
  }
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve({ base64, mimeType: file.type })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
