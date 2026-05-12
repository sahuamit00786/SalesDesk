import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAppSelector } from '@/app/hooks'
import {
  useGetMeetingsQuery,
  usePatchMeetingBotConsentMutation,
} from '@/features/meetings/meetingsApi'
import { Button } from '@/components/ui/Button'

function dismissedKey(meetingId) {
  return `meetingBotDismissed:${meetingId}`
}

/**
 * Prompts the meeting organizer (owner) to approve the recording bot before / during the window.
 */
export function MeetingBotConsentBanner() {
  const userId = useAppSelector((s) => s.auth.user?.id)
  const { data } = useGetMeetingsQuery({ limit: 50 })
  const [patchConsent, { isLoading }] = usePatchMeetingBotConsentMutation()
  const [busyId, setBusyId] = useState(null)

  const candidate = useMemo(() => {
    if (!userId || !data?.data?.length) return null
    const now = Date.now()
    const rows = data.data.filter(
      (m) =>
        String(m.ownerUserId) === String(userId) &&
        m.googleMeetLink &&
        m.recordingBotConsent === false &&
        m.botStatus === 'scheduled' &&
        new Date(m.scheduledEnd).getTime() > now,
    )
    const scored = rows
      .map((m) => {
        const start = new Date(m.scheduledStart).getTime()
        const end = new Date(m.scheduledEnd).getTime()
        const inWindow = now >= start && now < end
        const soon = start > now && start - now <= 45 * 60 * 1000
        if (!inWindow && !soon) return null
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(dismissedKey(m.id))) {
          return null
        }
        return { m, start, inWindow, soon: start > now }
      })
      .filter(Boolean)
    scored.sort((a, b) => a.start - b.start)
    return scored[0]?.m ?? null
  }, [data, userId])

  if (!candidate) return null

  const onYes = async () => {
    setBusyId(candidate.id)
    try {
      const res = await patchConsent({
        id: candidate.id,
        consent: true,
      }).unwrap()
      toast.success('Recording bot approved for this meeting.')
      if (res?.meta?.hint) toast(res.meta.hint, { duration: 6000 })
    } catch {
      toast.error('Could not save bot consent.')
    } finally {
      setBusyId(null)
    }
  }

  const onLater = () => {
    try {
      sessionStorage.setItem(dismissedKey(candidate.id), '1')
    } catch {
      /* ignore */
    }
    toast('You can enable the bot when scheduling or from meeting settings.')
  }

  const startsAt = new Date(candidate.scheduledStart)
  const label = startsAt > new Date() ? 'starts soon' : 'is live now'

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-medium">Recording bot:</span> your meeting &quot;{candidate.title}&quot;{' '}
          {label}. Approve the bot to record, transcribe, and summarize (runs on your API server).
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            className="h-8 px-3 text-xs bg-amber-800 text-white hover:bg-amber-900"
            disabled={isLoading && busyId === candidate.id}
            onClick={onYes}
          >
            {isLoading && busyId === candidate.id ? 'Saving…' : 'Yes, add bot'}
          </Button>
          <Button type="button" variant="secondary" className="h-8 px-3 text-xs" onClick={onLater}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  )
}
