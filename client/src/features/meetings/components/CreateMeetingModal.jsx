import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarClock, Presentation, Users, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/utils/cn'
import { useCreateMeetingMutation, useUpdateMeetingMutation } from '../meetingsApi'
import { MeetingBotSetupHint } from '@/features/meetings/components/MeetingBotSetupHint'

function getInitialForm(initialData) {
  if (!initialData) {
    return {
      title: '',
      meetingType: 'demo',
      agenda: '',
      scheduledStart: '',
      scheduledEnd: '',
      participants: [],
      recordingBotConsent: false,
    }
  }

  return {
    title: initialData.title || '',
    meetingType: initialData.meetingType || 'demo',
    agenda: initialData.agenda || '',
    scheduledStart: initialData.scheduledStart ? initialData.scheduledStart.slice(0, 16) : '',
    scheduledEnd: initialData.scheduledEnd ? initialData.scheduledEnd.slice(0, 16) : '',
    participants: initialData.participants?.map((p) => ({ userId: p.userId })) || [],
    recordingBotConsent: Boolean(initialData.recordingBotConsent),
  }
}

function FieldLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
      {children}
    </label>
  )
}

export function CreateMeetingModal({ open, onClose, users = [], leadId, initialData = null }) {
  const [createMeeting, { isLoading: creating }] = useCreateMeetingMutation()
  const [updateMeeting, { isLoading: updating }] = useUpdateMeetingMutation()

  const isEdit = Boolean(initialData?.id)
  const [form, setForm] = useState(getInitialForm(initialData))

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset fields when opening for create/edit
    setForm(getInitialForm(initialData))
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
      if (!leadId && !initialData?.leadId) {
        toast.error('Lead is required')
        return
      }

      const payload = {
        ...form,
        leadId: initialData?.leadId || leadId,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: new Date(form.scheduledEnd).toISOString(),
        recordingBotConsent: Boolean(form.recordingBotConsent),
      }

      if (isEdit) {
        await updateMeeting({
          id: initialData.id,
          ...payload,
        }).unwrap()
        toast.success('Meeting updated')
      } else {
        const res = await createMeeting(payload).unwrap()
        toast.success('Meeting created')
        if (res.meta?.botConsent?.skippedReason === 'NO_GOOGLE_MEET_LINK') {
          toast.error(
            'Recording bot was not saved: Calendar did not return a Google Meet link. Fix Meet on the calendar event, then enable bot consent on this meeting.',
            { duration: 7000 },
          )
        }
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
        className="flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl ring-1 ring-black/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-surface-border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Presentation className="h-5 w-5 text-white/95" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id="meeting-modal-title" className="text-lg font-semibold tracking-tight">
                  {isEdit ? 'Edit meeting' : 'Schedule a meeting'}
                </h2>
                <p className="mt-0.5 text-xs text-white/70">
                  {isEdit
                    ? 'Update timing, agenda, or attendees. Changes sync to your calendar when saved.'
                    : 'Pick a time window, add context, and invite teammates. A Meet link is created when possible.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-2 text-white/75 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
              onClick={handleClose}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="meeting-title">Title</FieldLabel>
              <Input
                id="meeting-title"
                placeholder="e.g. Product walkthrough with Acme"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
              />
            </div>

            <div>
              <FieldLabel htmlFor="meeting-type">Type</FieldLabel>
              <Select id="meeting-type" value={form.meetingType} onChange={(e) => update('meetingType', e.target.value)}>
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
                <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
                <input
                  id="meeting-start"
                  type="datetime-local"
                  className={cn(
                    'w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-ink shadow-sm',
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
                <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
                <input
                  id="meeting-end"
                  type="datetime-local"
                  className={cn(
                    'w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-ink shadow-sm',
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
                rows={4}
                placeholder="Goals, talking points, or prep links…"
                value={form.agenda}
                onChange={(e) => update('agenda', e.target.value)}
              />
            </div>

            <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border border-surface-border bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
                checked={form.recordingBotConsent}
                onChange={(e) => update('recordingBotConsent', e.target.checked)}
              />
              <span className="min-w-0 text-sm">
                <span className="font-medium text-ink">Enable AI recording bot</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                  After you confirm, the server can join Meet to record, transcribe, and summarize. Requires server setup
                  (FFmpeg, Playwright, Groq key).
                </span>
                <div className="mt-2">
                  <MeetingBotSetupHint />
                </div>
              </span>
            </label>

            <div className="sm:col-span-2">
              <FieldLabel>Attendees</FieldLabel>
              <div className="max-h-52 overflow-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2">
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
                              'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition',
                              selected
                                ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-200/80'
                                : 'text-ink hover:bg-white hover:shadow-sm',
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <Users className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                              <span className="truncate font-medium">{user.name || user.email}</span>
                            </span>
                            <span
                              className={cn(
                                'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                selected ? 'bg-brand-600 text-white' : 'bg-slate-200/80 text-ink-muted',
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

        <footer className="shrink-0 border-t border-surface-border bg-slate-50/80 px-6 py-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create meeting'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
