import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DollarSign, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { studentsApi } from '@/api/students'
import { feesApi } from '@/api/fees'
import { PageLoader } from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'
import PermissionGate from '@/components/layout/PermissionGate'
import { usePermissions } from '@/hooks/usePermissions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MONTH_NAMES } from '@/lib/constants'
import type { FeeRecord, Student } from '@/types'
import toast from 'react-hot-toast'

export default function FeesPage() {
  const qc = useQueryClient()
  const { can } = usePermissions()
  const [classId, setClassId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentModal, setPaymentModal] = useState<FeeRecord | null>(null)
  const [payData, setPayData] = useState({ amount_paid: 0, payment_mode: 'cash', transaction_ref: '' })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => studentsApi.getClasses(),
  })

  const { data: currentYear } = useQuery({
    queryKey: ['current-year'],
    queryFn: () => studentsApi.getCurrentYear(),
  })

  const { data: feeRecords, isLoading } = useQuery({
    queryKey: ['fee-records-all', classId, statusFilter, currentYear?.id],
    queryFn: async () => {
      if (!currentYear) return []
      const conditions: string[] = [`academic_year_id = "${currentYear.id}"`]
      if (classId) conditions.push(`student_id.class_id = "${classId}"`)
      if (statusFilter) conditions.push(`status = "${statusFilter}"`)
      const { default: pb } = await import('@/lib/pb')
      return pb.collection('fee_records').getFullList<FeeRecord>({
        filter: conditions.join(' && '),
        expand: 'student_id,fee_structure_id',
        sort: '-year,-month',
      })
    },
    enabled: !!currentYear,
  })

  const handlePayment = async () => {
    if (!paymentModal) return
    try {
      const totalPaid = (paymentModal.amount_paid || 0) + payData.amount_paid
      await feesApi.recordPayment(paymentModal.id, {
        amount_paid: totalPaid,
        payment_mode: payData.payment_mode,
        transaction_ref: payData.transaction_ref,
      })
      qc.invalidateQueries({ queryKey: ['fee-records-all'] })
      toast.success('Payment recorded successfully')
      setPaymentModal(null)
      setPayData({ amount_paid: 0, payment_mode: 'cash', transaction_ref: '' })
    } catch {
      toast.error('Failed to record payment')
    }
  }

  const totalDue = feeRecords?.reduce((s, f) => s + f.amount_due, 0) ?? 0
  const totalPaid = feeRecords?.reduce((s, f) => s + f.amount_paid, 0) ?? 0
  const totalOutstanding = totalDue - totalPaid

  const statuses = {
    paid: feeRecords?.filter((f) => f.status === 'paid').length ?? 0,
    pending: feeRecords?.filter((f) => f.status === 'pending').length ?? 0,
    overdue: feeRecords?.filter((f) => f.status === 'overdue').length ?? 0,
    partial: feeRecords?.filter((f) => f.status === 'partial').length ?? 0,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fees Management</h1>
        <p className="text-slate-500 text-sm">{currentYear?.name ?? ''}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-400">Total Due</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(totalDue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Collected</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Outstanding</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400">Collection Rate</p>
          <p className="text-xl font-bold text-blue-600">
            {totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-3">
        {[
          { status: '', label: 'All', count: feeRecords?.length ?? 0, cls: 'badge-gray' },
          { status: 'paid', label: 'Paid', count: statuses.paid, cls: 'badge-green' },
          { status: 'pending', label: 'Pending', count: statuses.pending, cls: 'badge-yellow' },
          { status: 'overdue', label: 'Overdue', count: statuses.overdue, cls: 'badge-red' },
          { status: 'partial', label: 'Partial', count: statuses.partial, cls: 'badge-orange' },
        ].map(({ status, label, count, cls }) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`${cls} cursor-pointer hover:opacity-80 ${statusFilter === status ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
          >
            {label}: {count}
          </button>
        ))}

        <select className="input w-40 ml-auto" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All Classes</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Student</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Fee Type</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Period</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Due</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Paid</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feeRecords?.map((fee) => {
                  const student = fee.expand?.student_id as Student | undefined
                  const feeType = (fee.expand?.fee_structure_id as { fee_type?: string })?.fee_type ?? ''
                  return (
                    <tr key={fee.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {student ? `${student.first_name} ${student.last_name}` : '—'}
                        </p>
                        <p className="text-xs text-slate-400">{student?.admission_number}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600">
                        {feeType.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {fee.month ? `${MONTH_NAMES[fee.month]} ${fee.year}` : fee.year || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(fee.amount_due)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(fee.amount_paid)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge badge-${fee.status === 'paid' ? 'green' : fee.status === 'overdue' ? 'red' : fee.status === 'partial' ? 'orange' : 'yellow'}`}>
                          {fee.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {fee.status !== 'paid' && can('collect_fees') && (
                          <button
                            className="btn-secondary text-xs py-1 px-3"
                            onClick={() => {
                              setPaymentModal(fee)
                              setPayData({
                                amount_paid: fee.amount_due - fee.amount_paid,
                                payment_mode: 'cash',
                                transaction_ref: '',
                              })
                            }}
                          >
                            Collect
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        open={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        title="Record Payment"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPaymentModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={handlePayment}>Record Payment</button>
          </>
        }
      >
        {paymentModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="font-medium">
                {(paymentModal.expand?.student_id as Student | undefined)?.first_name}{' '}
                {(paymentModal.expand?.student_id as Student | undefined)?.last_name}
              </p>
              <p className="text-slate-500">
                Outstanding: {formatCurrency(paymentModal.amount_due - paymentModal.amount_paid)}
              </p>
            </div>
            <div>
              <label className="label">Amount Collected (₹)</label>
              <input
                type="number"
                className="input"
                value={payData.amount_paid}
                min={0}
                max={paymentModal.amount_due - paymentModal.amount_paid}
                onChange={(e) => setPayData((d) => ({ ...d, amount_paid: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <select
                className="input"
                value={payData.payment_mode}
                onChange={(e) => setPayData((d) => ({ ...d, payment_mode: e.target.value }))}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="label">Transaction Reference</label>
              <input
                className="input"
                placeholder="Optional"
                value={payData.transaction_ref}
                onChange={(e) => setPayData((d) => ({ ...d, transaction_ref: e.target.value }))}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
