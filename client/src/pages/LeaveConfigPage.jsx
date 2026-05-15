import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ListTree, Scale } from 'lucide-react'
import { useHrRole } from '@/features/hr/useHrRole'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { HrCard } from '@/features/hr/components/HrCard'
import { PublicHolidayManager } from '@/features/leave/components/PublicHolidayManager'
import { WeeklyOffDaysManager } from '@/features/leave/components/WeeklyOffDaysManager'
import {
  useAdjustLeaveBalanceMutation,
  useCreateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
  useGetLeaveTypesQuery,
} from '@/features/leave/leaveApi'
import { useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'

export function LeaveConfigPage() {
  const hrRole = useHrRole()
  const year = new Date().getFullYear()
  const { data: typesData, refetch } = useGetLeaveTypesQuery()
  const { data: formMeta } = useGetLeadFormMetaQuery()
  const [createType] = useCreateLeaveTypeMutation()
  const [deleteType] = useDeleteLeaveTypeMutation()
  const [adjustBalance] = useAdjustLeaveBalanceMutation()

  const [form, setForm] = useState({
    name: '',
    code: '',
    daysPerYear: 12,
    isPaid: true,
    carryForward: false,
    maxCarryForwardDays: 0,
  })
  const [adjust, setAdjust] = useState({ userId: '', leaveTypeId: '', allocated: 12 })

  if (hrRole !== 'admin') return <Navigate to="/leave" replace />

  const types = typesData?.data || []
  const members = formMeta?.data?.users || []

  async function addType(e) {
    e.preventDefault()
    try {
      await createType({
        name: form.name.trim(),
        code: form.code.trim(),
        daysPerYear: Number(form.daysPerYear),
        isPaid: form.isPaid,
        carryForward: form.carryForward,
        maxCarryForwardDays: Number(form.maxCarryForwardDays),
      }).unwrap()
      toast.success('Leave type created')
      setForm({ name: '', code: '', daysPerYear: 12, isPaid: true, carryForward: false, maxCarryForwardDays: 0 })
      refetch()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not create type')
    }
  }

  async function removeType(id) {
    if (!window.confirm('Delete this leave type?')) return
    try {
      await deleteType(id).unwrap()
      toast.success('Deleted')
      refetch()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not delete')
    }
  }

  async function saveAdjust(e) {
    e.preventDefault()
    if (!adjust.userId || !adjust.leaveTypeId) {
      toast.error('Select employee and leave type')
      return
    }
    try {
      await adjustBalance({
        userId: adjust.userId,
        leaveTypeId: adjust.leaveTypeId,
        year,
        allocated: Number(adjust.allocated),
      }).unwrap()
      toast.success('Balance updated')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not adjust balance')
    }
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <HrCard
          title="Leave types"
          description="Define paid, unpaid, and carry-forward policies for your organization"
          icon={ListTree}
        >
          <form onSubmit={addType} className="mb-6 space-y-4 rounded-xl border border-surface-border/80 bg-surface-subtle/40 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Name (e.g. Casual Leave)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input placeholder="Code (e.g. CL)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
              <Input
                type="number"
                placeholder="Days per year"
                value={form.daysPerYear}
                onChange={(e) => setForm((f) => ({ ...f, daysPerYear: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <label className="flex cursor-pointer items-center gap-2 font-medium text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600"
                  checked={form.isPaid}
                  onChange={(e) => setForm((f) => ({ ...f, isPaid: e.target.checked }))}
                />
                Paid leave
              </label>
              <label className="flex cursor-pointer items-center gap-2 font-medium text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600"
                  checked={form.carryForward}
                  onChange={(e) => setForm((f) => ({ ...f, carryForward: e.target.checked }))}
                />
                Allow carry forward
              </label>
              {form.carryForward ? (
                <Input
                  type="number"
                  className="h-10 w-36"
                  placeholder="Max carry days"
                  value={form.maxCarryForwardDays}
                  onChange={(e) => setForm((f) => ({ ...f, maxCarryForwardDays: e.target.value }))}
                />
              ) : null}
            </div>
            <div className="flex justify-end border-t border-surface-border/60 pt-3">
              <Button type="submit">Add leave type</Button>
            </div>
          </form>

          <ul className="divide-y divide-surface-border/80 overflow-hidden rounded-xl border border-surface-border/80">
            {types.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3.5 hover:bg-brand-50/20"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {t.name}{' '}
                    <span className="ml-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-bold text-brand-700">{t.code}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {t.daysPerYear} days/year · {t.isPaid ? 'Paid' : 'Unpaid'}
                    {t.carryForward ? ` · Carry up to ${t.maxCarryForwardDays} days` : ''}
                  </p>
                </div>
                <Button type="button" variant="danger" className="!h-8 !px-3 !text-xs shrink-0" onClick={() => removeType(t.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </HrCard>

        <HrCard
          title={`Adjust balance (${year})`}
          description="Override allocated days for a specific employee and leave type"
          icon={Scale}
        >
          <form onSubmit={saveAdjust} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={adjust.userId} onChange={(e) => setAdjust((a) => ({ ...a, userId: e.target.value }))}>
              <option value="">Select employee</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
            <Select value={adjust.leaveTypeId} onChange={(e) => setAdjust((a) => ({ ...a, leaveTypeId: e.target.value }))}>
              <option value="">Leave type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              placeholder="Allocated days"
              value={adjust.allocated}
              onChange={(e) => setAdjust((a) => ({ ...a, allocated: e.target.value }))}
            />
            <Button type="submit" className="sm:col-span-2 lg:col-span-1">
              Save balance
            </Button>
          </form>
        </HrCard>

        <WeeklyOffDaysManager />
        <PublicHolidayManager year={year} />
      </div>
    </PageShell>
  )
}
