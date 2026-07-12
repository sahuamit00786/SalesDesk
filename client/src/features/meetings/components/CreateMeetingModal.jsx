import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarClock, Presentation, Search, Users, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/utils/cn'
import { useCreateMeetingMutation, useUpdateMeetingMutation } from '../meetingsApi'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'

function getInitialForm(initialData) {
  if (!initialData) {
    return {
      title: '',
      meetingType: 'demo',
      agenda: '',
      scheduledStart: '',
      scheduledEnd: '',
      participants: [],
      leadId: '',
    }
  }

  return {
    title: initialData.title || '',
    meetingType: initialData.meetingType || 'demo',
    agenda: initialData.agenda || '',
    scheduledStart: initialData.scheduledStart ? initialData.scheduledStart.slice(0, 16) : '',
    scheduledEnd: initialData.scheduledEnd ? initialData.scheduledEnd.slice(0, 16) : '',
    participants: initialData.participants?.map((p) => ({ userId: p.userId })) || [],
    leadId: initialData.leadId || '',
  }
}

function leadLabel(lead) {
  return lead.contactName || lead.company || lead.title || lead.email || 'Untitled lead'
}

function FieldLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
      {children}
    </label>
  )
}

const compactFieldClassName = 'h-9 px-3 text-[13px] border-slate-300 hover:border-slate-400'

export function CreateMeetingModal({ open, onClose, users = [], leadId, initialData = null }) {
  const [createMeeting, { isLoading: creating }] = useCreateMeetingMutation()
  const [updateMeeting, { isLoading: updating }] = useUpdateMeetingMutation()

  const isEdit = Boolean(initialData?.id)
  const lockedLeadId = initialData?.leadId || leadId || null
  const [form, setForm] = useState(getInitialForm(initialData))
  const [leadSearch, setLeadSearch] = useState('')
  const [leadPickerOpen, setLeadPickerOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const leadFieldRef = useRef(null)

  const { data: leadResults, isFetching: leadsLoading } = useGetLeadsQuery(
    { search: leadSearch.trim(), limit: 10, page: 1 },
    { skip: !open || Boolean(lockedLeadId) || !leadPickerOpen },
  )
  const leadOptions = useMemo(() => leadResults?.data || [], [leadResults])

  useEffect(() => {
    if (!leadPickerOpen) return
    function handleClick(e) {
      if (leadFieldRef.current && !leadFieldRef.current.contains(e.target)) {
        setLeadPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [leadPickerOpen])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset fields when opening for create/edit
    setForm(getInitialForm(initialData))
    setLeadSearch('')
    setLeadPickerOpen(false)
    setSelectedLead(initialData?.lead || null)
  }, [open, initialData])

  if (!open) return null

  function update(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  function toggleParticipant(userId) {
    const exists = form.participants.some((p) => p.userId === userId)
    if (exists) {
      update(
        'participants',
        form.participants.filter((p) => p.userId !== userId),
      )
    } else {
      update('participants', [...form.participants, { userId }])
    }
  }

  async function submit() {
    try {
      const resolvedLeadId = lockedLeadId || form.leadId
      if (!resolvedLeadId) {
        toast.error('Lead is required')
        return
      }
      if (!form.title.trim()) {
        toast.error('Title is required')
        return
      }
      if (!form.scheduledStart || !form.scheduledEnd) {
        toast.error('Start and end time are required')
        return
      }

      const payload = {
        ...form,
        leadId: resolvedLeadId,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: new Date(form.scheduledEnd).toISOString(),
      }

      if (isEdit) {
        await updateMeeting({
          id: initialData.id,
          ...payload,
        }).unwrap()
        toast.success('Meeting updated')
      } else {
        await createMeeting(payload).unwrap()
        toast.success('Meeting created')
      }

      handleClose()
    } catch (e) {
      console.error(e)
      toast.error('Could not save meeting')
    }
  }

  function handleClose() {
    onClose()
    setForm(getInitialForm(null))
    setLeadSearch('')
    setSelectedLead(null)
    setLeadPickerOpen(false)
  }

  const busy = creating || updating

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-surface-border bg-white shadow-2xl ring-1 ring-black/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header
          className="shrink-0 border-b border-surface-border px-5 py-3 text-white"
          style={{
            background:
              'linear-gradient(to right, var(--brand-primary-dark), var(--brand-primary))',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <Presentation className="h-4 w-4 text-white/95" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id="meeting-modal-title" className="text-sm font-semibold tracking-tight">
                  {isEdit ? 'Edit meeting' : 'Schedule a meeting'}
                </h2>
                <p className="mt-0.5 text-[11px] leading-snug text-white/70">
                  {isEdit
                    ? 'Update timing, agenda, or attendees. Changes sync to your calendar when saved.'
                    : 'Pick a time window, add context, and invite teammates. A Meet link is created when possible.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1.5 text-white/75 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
              onClick={handleClose}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="meeting-title">Title</FieldLabel>
              <Input
                id="meeting-title"
                className={compactFieldClassName}
                placeholder="e.g. Product walkthrough with Acme"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
              />
            </div>

            {!lockedLeadId ? (
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="meeting-lead">Lead</FieldLabel>
                {selectedLead ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-[13px]">
                    <span className="truncate font-medium text-ink">{leadLabel(selectedLead)}</span>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-brand-700 hover:underline"
                      onClick={() => {
                        setSelectedLead(null)
                        update('leadId', '')
                        setLeadSearch('')
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" aria-hidden />
                    <input
                      id="meeting-lead"
                      type="text"
                      placeholder="Search leads by name, company, or email…"
                      className={cn(
                        'h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-ink shadow-sm',
                        'outline-none transition-all duration-150 hover:border-slate-400',
                        'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15',
                      )}
                      value={leadSearch}
                      onChange={(e) => {
                        setLeadSearch(e.target.value)
                        setLeadPickerOpen(true)
                      }}
                      onFocus={() => setLeadPickerOpen(true)}
                    />
                    {leadPickerOpen ? (
                      <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                        {leadsLoading ? (
                          <li className="px-3 py-1.5 text-xs text-ink-muted">Searching…</li>
                        ) : leadOptions.length === 0 ? (
                          <li className="px-3 py-1.5 text-xs text-ink-muted">No leads found.</li>
                        ) : (
                          leadOptions.map((lead) => (
                            <li key={lead.id}>
                              <button
                                type="button"
                                className="flex w-full flex-col items-start rounded-md px-3 py-1.5 text-left text-[13px] hover:bg-slate-50"
                                onClick={() => {
                                  setSelectedLead(lead)
                                  update('leadId', lead.id)
                                  setLeadPickerOpen(false)
                                }}
                              >
                                <span className="font-medium text-ink">{leadLabel(lead)}</span>
                                {lead.company && lead.contactName ? (
                                  <span className="text-xs text-ink-muted">{lead.company}</span>
                                ) : null}
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

            <div>
              <FieldLabel htmlFor="meeting-type">Type</FieldLabel>
              <Select
                id="meeting-type"
                className={compactFieldClassName}
                value={form.meetingType}
                onChange={(e) => update('meetingType', e.target.value)}
              >
                <option value="demo">Demo</option>
                <option value="follow_up">Follow up</option>
                <option value="closing">Closing</option>
                <option value="internal">Internal</option>
              </Select>
            </div>

            <div className="hidden sm:block" aria-hidden />

            <div>
              <FieldLabel htmlFor="meeting-start">Starts</FieldLabel>
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" aria-hidden />
                <input
                  id="meeting-start"
                  type="datetime-local"
                  className={cn(
                    'h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-ink shadow-sm',
                    'outline-none transition-all duration-150 hover:border-slate-400',
                    'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15',
                  )}
                  value={form.scheduledStart}
                  onChange={(e) => update('scheduledStart', e.target.value)}
                />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="meeting-end">Ends</FieldLabel>
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" aria-hidden />
                <input
                  id="meeting-end"
                  type="datetime-local"
                  className={cn(
                    'h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-ink shadow-sm',
                    'outline-none transition-all duration-150 hover:border-slate-400',
                    'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15',
                  )}
                  value={form.scheduledEnd}
                  onChange={(e) => update('scheduledEnd', e.target.value)}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="meeting-agenda">Agenda & notes</FieldLabel>
              <Textarea
                id="meeting-agenda"
                rows={3}
                className="text-[13px]"
                placeholder="Goals, talking points, or prep links…"
                value={form.agenda}
                onChange={(e) => update('agenda', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Attendees</FieldLabel>
              <div className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-slate-50/50 p-1.5">
                {users.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-ink-muted">No users available to invite.</p>
                ) : (
                  <ul className="space-y-1">
                    {users.map((user) => {
                      const selected = form.participants.some((p) => p.userId === user.id)
                      return (
                        <li key={user.id}>
                          <button
                            type="button"
                            onClick={() => toggleParticipant(user.id)}
                            className={cn(
                              'flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-[13px] transition',
                              selected
                                ? 'bg-slate-100 text-brand-900 ring-1 ring-brand-200/80'
                                : 'text-ink hover:bg-white hover:shadow-sm',
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <Users className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate font-medium">{user.name || user.email}</span>
                                {user.name && user.email ? (
                                  <span className="truncate text-[11px] text-ink-muted">{user.email}</span>
                                ) : null}
                              </span>
                            </span>
                            <span
                              className={cn(
                                'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                selected ? 'bg-[var(--brand-primary)] text-white' : 'bg-slate-200/80 text-ink-muted',
                              )}
                            >
                              {selected ? 'Added' : 'Add'}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-surface-border bg-slate-50/80 px-5 py-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="h-9 rounded-lg border border-surface-border bg-white px-3.5 text-[13px] font-medium text-ink shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="h-9 rounded-lg bg-[var(--brand-primary)] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[var(--brand-primary-dark)] disabled:opacity-50"
            >
              {busy ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create meeting'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
