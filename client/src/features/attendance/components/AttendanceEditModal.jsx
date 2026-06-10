import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useEditAttendanceLogMutation } from '@/features/attendance/attendanceApi'

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half day' },
  { value: 'absent', label: 'Absent' },
]

function toDatetimeLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function computeHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return ''
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  if (ms <= 0) return '0'
  return (Math.round((ms / 3600000) * 100) / 100).toString()
}

export function AttendanceEditModal({ open, onClose, row }) {
  const [editLog, { isLoading }] = useEditAttendanceLogMutation()

  const [form, setForm] = useState({
    status: '',
    checkInTime: '',
    checkOutTime: '',
    totalHours: '',
    note: '',
  })

  useEffect(() => {
    if (row) {
      const ci = toDatetimeLocal(row.checkInTime)
      const co = toDatetimeLocal(row.checkOutTime)
      setForm({
        status: row.status || 'present',
        checkInTime: ci,
        checkOutTime: co,
        totalHours: row.totalHours != null ? String(row.totalHours) : computeHours(ci, co),
        note: row.note || '',
      })
    }
  }, [row])

  function set(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'checkInTime' || field === 'checkOutTime') {
        next.totalHours = computeHours(next.checkInTime, next.checkOutTime)
      }
      return next
    })
  }

  async function handleSave() {
    if (!row?.logId) return
    try {
      await editLog({
        id: row.logId,
        status: form.status,
        checkInTime: form.checkInTime ? new Date(form.checkInTime).toISOString() : null,
        checkOutTime: form.checkOutTime ? new Date(form.checkOutTime).toISOString() : null,
        totalHours: form.totalHours !== '' ? Number(form.totalHours) : null,
        note: form.note || null,
      }).unwrap()
      toast.success('Attendance record updated')
      onClose()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Failed to update record')
    }
  }

  const labelCls = 'block text-xs font-medium text-gray-700 mb-1'
  const inputCls =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100'

  return (
    <Modal open={open} onClose={onClose} title="Edit attendance record" maxWidthClassName="max-w-md">
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Check-in time</label>
            <input
              type="datetime-local"
              className={inputCls}
              value={form.checkInTime}
              onChange={(e) => set('checkInTime', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Check-out time</label>
            <input
              type="datetime-local"
              className={inputCls}
              value={form.checkOutTime}
              onChange={(e) => set('checkOutTime', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Total hours</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputCls}
            value={form.totalHours}
            onChange={(e) => set('totalHours', e.target.value)}
            placeholder="Auto-computed from times"
          />
        </div>

        <div>
          <label className={labelCls}>Note (internal)</label>
          <textarea
            rows={3}
            className={inputCls}
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="Reason for correction…"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
