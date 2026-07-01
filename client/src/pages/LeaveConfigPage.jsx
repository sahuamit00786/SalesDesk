import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CalendarDays, Clock, ListTree, Pencil, Scale, X } from 'lucide-react'
import { useHrRole } from '@/features/hr/useHrRole'
import { PageShell } from '@/components/layout/PageShell'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { HrEmptyState } from '@/features/hr/components/HrEmptyState'
import { PublicHolidayManager } from '@/features/leave/components/PublicHolidayManager'
import { WeeklyOffDaysManager } from '@/features/leave/components/WeeklyOffDaysManager'
import {
  useAdjustLeaveBalanceMutation,
  useCreateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
  useGetLeaveSettingsQuery,
  useGetLeaveTypesQuery,
  useUpdateLeaveSettingsMutation,
  useUpdateLeaveTypeMutation,
} from '@/features/leave/leaveApi'
import { useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'
import { cn } from '@/utils/cn'

const TABS = [
  { id: 'types', label: 'Leave types', icon: ListTree },
  { id: 'balances', label: 'Balances', icon: Scale },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
]

function FieldLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
      {children}
    </label>
  )
}

function FormField({ label, htmlFor, children, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
    </div>
  )
}

function SectionHeader({ title, icon: Icon }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-surface-border/70 pb-3">
      {Icon ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-brand-700">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
      <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
    </div>
  )
}

export function LeaveConfigPage() {
  const hrRole = useHrRole()
  const year = new Date().getFullYear()
  const [activeTab, setActiveTab] = useState('types')
  const { data: typesData, isLoading: typesLoading, refetch } = useGetLeaveTypesQuery()
  const { data: formMeta } = useGetLeadFormMetaQuery()
  const { data: settingsData } = useGetLeaveSettingsQuery()
  const [createType, { isLoading: creatingType }] = useCreateLeaveTypeMutation()
  const [updateType, { isLoading: updatingType }] = useUpdateLeaveTypeMutation()
  const [deleteType, { isLoading: deletingType }] = useDeleteLeaveTypeMutation()
  const [adjustBalance, { isLoading: savingBalance }] = useAdjustLeaveBalanceMutation()
  const [updateSettings, { isLoading: savingSettings }] = useUpdateLeaveSettingsMutation()

  const [form, setForm] = useState({
    name: '',
    code: '',
    daysPerYear: 12,
    isPaid: true,
    carryForward: false,
    maxCarryForwardDays: 0,
  })
  const [editTypeId, setEditTypeId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [lateHour, setLateHour] = useState(10)
  const [lateMinute, setLateMinute] = useState(0)
  const [adjust, setAdjust] = useState({ userId: '', leaveTypeId: '', allocated: 12, reason: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    if (settingsData?.data) {
      setLateHour(settingsData.data.lateThresholdHour ?? 10)
      setLateMinute(settingsData.data.lateThresholdMinute ?? 0)
    }
  }, [settingsData])

  function startEditType(t) {
    setEditTypeId(t.id)
    setEditForm({
      name: t.name,
      code: t.code,
      daysPerYear: t.daysPerYear,
      isPaid: t.isPaid,
      carryForward: t.carryForward,
      maxCarryForwardDays: t.maxCarryForwardDays,
    })
  }

  async function saveEditType() {
    if (!editTypeId) return
    try {
      await updateType({
        id: editTypeId,
        name: editForm.name,
        code: editForm.code,
        daysPerYear: Number(editForm.daysPerYear),
        isPaid: editForm.isPaid,
        carryForward: editForm.carryForward,
        maxCarryForwardDays: Number(editForm.maxCarryForwardDays),
      }).unwrap()
      toast.success('Leave type updated')
      setEditTypeId(null)
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Update failed')
    }
  }

  async function saveLateThreshold() {
    try {
      await updateSettings({ lateThresholdHour: lateHour, lateThresholdMinute: lateMinute }).unwrap()
      toast.success('Late threshold saved')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Save failed')
    }
  }

  if (hrRole !== 'admin') return <Navigate to="/leave" replace />

  const types = typesData?.data || []
  const members = formMeta?.data?.users || []

  async function addType(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required')
      return
    }
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

  async function confirmDeleteType() {
    if (!deleteTarget?.id) return
    try {
      await deleteType(deleteTarget.id).unwrap()
      toast.success('Leave type deleted')
      if (adjust.leaveTypeId === deleteTarget.id) {
        setAdjust((a) => ({ ...a, leaveTypeId: '' }))
      }
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not delete leave type')
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
        reason: adjust.reason.trim() || undefined,
      }).unwrap()
      toast.success('Balance updated')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not adjust balance')
    }
  }

  return (
    <PageShell fullWidth mainClassName="!py-0">
      <div className="w-full px-4 pb-6 pt-3 sm:px-6 sm:pt-4">
        <div className="mb-2 flex flex-wrap items-center gap-1 px-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors',
                  selected
                    ? 'border-brand-600 bg-white text-brand-800 shadow-sm'
                    : 'border-transparent bg-transparent text-ink-muted hover:border-surface-border hover:bg-white hover:text-ink',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm ring-1 ring-black/[0.04]">
          <div className="p-4 sm:p-5">
            {activeTab === 'types' ? (
              <section>
                <SectionHeader title="Leave types" icon={ListTree} />
                <form
                  onSubmit={addType}
                  className="mb-6 space-y-4 rounded-xl border border-surface-border bg-surface-subtle/50 p-4 sm:p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Add leave type</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <FormField label="Name" htmlFor="leave-type-name">
                      <Input
                        id="leave-type-name"
                        placeholder="e.g. Casual Leave"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </FormField>
                    <FormField label="Code" htmlFor="leave-type-code">
                      <Input
                        id="leave-type-code"
                        placeholder="e.g. CL"
                        value={form.code}
                        onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                      />
                    </FormField>
                    <FormField label="Days per year" htmlFor="leave-type-days">
                      <Input
                        id="leave-type-days"
                        type="number"
                        min={0}
                        value={form.daysPerYear}
                        onChange={(e) => setForm((f) => ({ ...f, daysPerYear: e.target.value }))}
                      />
                    </FormField>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-surface-border/70 pt-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                        checked={form.isPaid}
                        onChange={(e) => setForm((f) => ({ ...f, isPaid: e.target.checked }))}
                      />
                      Paid leave
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                        checked={form.carryForward}
                        onChange={(e) => setForm((f) => ({ ...f, carryForward: e.target.checked }))}
                      />
                      Allow carry forward
                    </label>
                    {form.carryForward ? (
                      <FormField label="Max carry days" htmlFor="leave-type-carry" className="w-full sm:w-40">
                        <Input
                          id="leave-type-carry"
                          type="number"
                          min={0}
                          value={form.maxCarryForwardDays}
                          onChange={(e) => setForm((f) => ({ ...f, maxCarryForwardDays: e.target.value }))}
                        />
                      </FormField>
                    ) : null}
                  </div>
                  <div className="flex justify-end border-t border-surface-border/70 pt-4">
                    <Button type="submit" disabled={creatingType}>
                      {creatingType ? 'Adding…' : 'Add leave type'}
                    </Button>
                  </div>
                </form>

                {typesLoading ? (
                  <p className="text-sm text-ink-muted">Loading leave types…</p>
                ) : types.length === 0 ? (
                  <HrEmptyState
                    icon={ListTree}
                    title="No leave types yet"
                    description="Add your first leave type above — for example Casual Leave (CL) or Sick Leave (SL)."
                  />
                ) : (
                  <ul className="divide-y divide-surface-border overflow-hidden rounded-xl border border-surface-border">
                    {types.map((t) => (
                      <li key={t.id} className="bg-white transition-colors hover:bg-slate-50/10">
                        {editTypeId === t.id ? (
                          <div className="space-y-3 px-4 py-4 sm:px-5">
                            <div className="grid gap-3 sm:grid-cols-3">
                              <FormField label="Name">
                                <Input
                                  value={editForm.name}
                                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                />
                              </FormField>
                              <FormField label="Code">
                                <Input
                                  value={editForm.code}
                                  onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                                />
                              </FormField>
                              <FormField label="Days / year">
                                <Input
                                  type="number"
                                  min={0}
                                  value={editForm.daysPerYear}
                                  onChange={(e) => setEditForm((f) => ({ ...f, daysPerYear: e.target.value }))}
                                />
                              </FormField>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                                  checked={editForm.isPaid}
                                  onChange={(e) => setEditForm((f) => ({ ...f, isPaid: e.target.checked }))}
                                />
                                Paid
                              </label>
                              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                                  checked={editForm.carryForward}
                                  onChange={(e) => setEditForm((f) => ({ ...f, carryForward: e.target.checked }))}
                                />
                                Carry forward
                              </label>
                              {editForm.carryForward && (
                                <FormField label="Max carry days" className="w-32">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={editForm.maxCarryForwardDays}
                                    onChange={(e) => setEditForm((f) => ({ ...f, maxCarryForwardDays: e.target.value }))}
                                  />
                                </FormField>
                              )}
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="ghost" className="!h-8 !text-xs" onClick={() => setEditTypeId(null)}>
                                <X className="h-3.5 w-3.5" /> Cancel
                              </Button>
                              <Button type="button" className="!h-8 !text-xs" disabled={updatingType} onClick={saveEditType}>
                                {updatingType ? 'Saving…' : 'Save'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                            <div className="min-w-0">
                              <p className="font-semibold text-ink">
                                {t.name}{' '}
                                <span className="ml-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-brand-700">
                                  {t.code}
                                </span>
                              </p>
                              <p className="mt-0.5 text-xs text-ink-muted">
                                {t.daysPerYear} days/year · {t.isPaid ? 'Paid' : 'Unpaid'}
                                {t.carryForward ? ` · Carry up to ${t.maxCarryForwardDays} days` : ''}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                className="!h-8 !px-3 !text-xs"
                                onClick={() => startEditType(t)}
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                className="!h-8 !px-3 !text-xs"
                                disabled={deletingType}
                                onClick={() => setDeleteTarget({ id: t.id, name: t.name, code: t.code })}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {activeTab === 'balances' ? (
              <section>
                <SectionHeader title={`Adjust balance (${year})`} icon={Scale} />
                <form onSubmit={saveAdjust} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <FormField label="Employee" htmlFor="balance-employee">
                      <Select
                        id="balance-employee"
                        value={adjust.userId}
                        onChange={(e) => setAdjust((a) => ({ ...a, userId: e.target.value }))}
                      >
                        <option value="">Select employee</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Leave type" htmlFor="balance-type">
                      <Select
                        id="balance-type"
                        value={adjust.leaveTypeId}
                        onChange={(e) => setAdjust((a) => ({ ...a, leaveTypeId: e.target.value }))}
                      >
                        <option value="">Select leave type</option>
                        {types.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Allocated days" htmlFor="balance-days">
                      <Input
                        id="balance-days"
                        type="number"
                        min={0}
                        value={adjust.allocated}
                        onChange={(e) => setAdjust((a) => ({ ...a, allocated: e.target.value }))}
                      />
                    </FormField>
                  </div>
                  <FormField label="Reason (optional)" htmlFor="balance-reason">
                    <Input
                      id="balance-reason"
                      placeholder="e.g. Annual policy update, correction"
                      value={adjust.reason}
                      onChange={(e) => setAdjust((a) => ({ ...a, reason: e.target.value }))}
                    />
                  </FormField>
                  <div className="flex justify-end border-t border-surface-border/70 pt-4">
                    <Button type="submit" disabled={savingBalance}>
                      {savingBalance ? 'Saving…' : 'Save balance'}
                    </Button>
                  </div>
                </form>
              </section>
            ) : null}

            {activeTab === 'calendar' ? (
              <div className="space-y-6">
                <WeeklyOffDaysManager />
                <div className="rounded-xl border border-surface-border bg-white p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-2 border-b border-surface-border/70 pb-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-brand-700">
                      <Clock className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-semibold tracking-tight text-ink">Attendance rules</h2>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <FormField label="Late after hour (0–23)">
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        className="w-24"
                        value={lateHour}
                        onChange={(e) => setLateHour(Number(e.target.value))}
                      />
                    </FormField>
                    <FormField label="Minute (0–59)">
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        className="w-24"
                        value={lateMinute}
                        onChange={(e) => setLateMinute(Number(e.target.value))}
                      />
                    </FormField>
                    <Button type="button" disabled={savingSettings} onClick={saveLateThreshold}>
                      {savingSettings ? 'Saving…' : 'Save threshold'}
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-ink-muted">
                    Current: check-in after {String(lateHour).padStart(2, '0')}:{String(lateMinute).padStart(2, '0')} = Late
                  </p>
                </div>
                <PublicHolidayManager year={year} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deletingType && setDeleteTarget(null)}
        title="Delete leave type"
        footer={
          <>
            <button
              type="button"
              disabled={deletingType}
              onClick={() => setDeleteTarget(null)}
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deletingType}
              onClick={confirmDeleteType}
              className="h-10 rounded-xl bg-danger px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {deletingType ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Delete{' '}
          <span className="font-semibold text-ink">
            {deleteTarget?.name}
            {deleteTarget?.code ? ` (${deleteTarget.code})` : ''}
          </span>
          ? This removes the leave type, all employee balances for it, and any leave requests tied to it. This cannot be
          undone.
        </p>
      </Modal>
    </PageShell>
  )
}
