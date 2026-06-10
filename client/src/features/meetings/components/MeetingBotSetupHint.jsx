import { useMemo, useState } from 'react'
import { useGetMeetingBotRequirementsQuery } from '@/features/meetings/meetingsApi'
import { guessClientOs } from '@/features/meetings/utils/meetingBotClientOs'

export function MeetingBotSetupHint() {
  const [open, setOpen] = useState(false)
  const os = useMemo(() => guessClientOs(), [])
  const { data, isFetching } = useGetMeetingBotRequirementsQuery(
    { os },
    { skip: !open },
  )

  const osKey = os.toLowerCase().includes('win')
    ? 'windows'
    : os.toLowerCase().includes('mac')
      ? 'darwin'
      : 'linux'
  const steps = data?.data?.stepsByOs?.[osKey] || []

  return (
    <div className="rounded-xl border border-surface-border bg-slate-50/80 p-3 text-xs text-ink">
      <button
        type="button"
        className="font-medium text-brand-700 underline-offset-2 hover:underline"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide' : 'Show'} what IT needs on the API server (FFmpeg, Playwright…)
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {isFetching && <p className="text-ink-muted">Loading…</p>}
          {data?.data?.note && (
            <p className="text-ink-muted">{data.data.note}</p>
          )}
          {data?.data?.masterEnvEnable && (
            <p className="text-ink-muted">{data.data.masterEnvEnable}</p>
          )}
          {data?.data?.openaiEnv && (
            <p className="text-ink-muted">{data.data.openaiEnv}</p>
          )}
          <ul className="list-inside list-disc space-y-1 text-ink-muted">
            {steps.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {!steps.length && !isFetching && (
            <p className="text-ink-muted">Could not load steps.</p>
          )}
        </div>
      )}
    </div>
  )
}
