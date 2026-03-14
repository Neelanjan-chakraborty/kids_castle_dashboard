import { clsx, type ClassValue } from 'clsx'
import pb from './pb'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function getFileUrl(collectionId: string, recordId: string, filename: string) {
  return pb.files.getUrl({ id: recordId, collectionId } as never, filename)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export function gradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'A+': 'text-green-600',
    'A':  'text-green-500',
    'B+': 'text-blue-600',
    'B':  'text-blue-500',
    'C':  'text-yellow-600',
    'D':  'text-orange-600',
    'F':  'text-red-600',
  }
  return colors[grade] || 'text-slate-600'
}

export function classDisplayName(cls: string): string {
  const map: Record<string, string> = {
    Nursery: 'Nursery',
    LKG:     'LKG',
    UKG:     'UKG',
    Class1:  'Class 1',
    Class2:  'Class 2',
  }
  return map[cls] || cls
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function percentageColor(pct: number): string {
  if (pct >= 75) return 'text-green-600'
  if (pct >= 50) return 'text-yellow-600'
  return 'text-red-600'
}
