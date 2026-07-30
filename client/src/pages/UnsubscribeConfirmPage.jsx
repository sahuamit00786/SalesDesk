import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_BASE_URL } from '@/config'

/**
 * Public, unauthenticated page. The email link's GET only lands here — it does not
 * unsubscribe anything by itself (mail-scanner link prefetching would otherwise
 * silently unsubscribe recipients). The actual suppression only happens once the
 * visitor explicitly clicks the confirm button, via POST /unsubscribe/confirm.
 */
export function UnsubscribeConfirmPage() {
  const [searchParams] = useSearchParams()
  const logId = searchParams.get('log_id')
  const sig = searchParams.get('sig')
  const linkInvalid = searchParams.get('error') === 'invalid' || !logId || !sig

  const [status, setStatus] = useState('idle') // idle | loading | done | failed

  async function handleConfirm() {
    setStatus('loading')
    try {
      const res = await fetch(`${API_BASE_URL}/unsubscribe/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId, sig }),
      })
      const body = await res.json().catch(() => null)
      setStatus(res.ok && body?.success ? 'done' : 'failed')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white p-8 text-center shadow-sm">
        {linkInvalid ? (
          <>
            <h1 className="text-lg font-semibold text-ink">This link is invalid or expired</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Unsubscribe links are single-use and time-limited. If you still want to stop these emails, contact
              the sender directly.
            </p>
          </>
        ) : status === 'done' ? (
          <>
            <h1 className="text-lg font-semibold text-ink">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-sm text-ink-muted">You won&apos;t receive further emails from this sender.</p>
          </>
        ) : status === 'failed' ? (
          <>
            <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
            <p className="mt-2 text-sm text-ink-muted">Please try again in a moment.</p>
            <button
              type="button"
              onClick={handleConfirm}
              className="mt-5 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-ink">Unsubscribe from these emails?</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Confirm below to stop receiving marketing and automated emails from this sender.
            </p>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={status === 'loading'}
              className="mt-5 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {status === 'loading' ? 'Unsubscribing…' : 'Confirm unsubscribe'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
