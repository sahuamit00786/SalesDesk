import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, AlertCircle } from 'lucide-react'
import { baseApi } from '@/features/api/baseApi'
import { useDispatch } from 'react-redux'
import { setCredentials } from '@/features/auth/authSlice'
import { useNavigate } from 'react-router-dom'

const twoFactorCompleteApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    complete2FA: build.mutation({
      query: (body) => ({ url: '/auth/2fa/complete', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
})

const { useComplete2FAMutation } = twoFactorCompleteApi

/**
 * TwoFactorPrompt — shown after password login when server requires TOTP.
 * @param {{ tempToken: string, onBack?: () => void }} props
 */
export function TwoFactorPrompt({ tempToken, onBack }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [complete2FA, { isLoading }] = useComplete2FAMutation()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit() {
    if (code.length !== 6) return
    setError('')
    try {
      const res = await complete2FA({ tempToken, totpCode: code }).unwrap()
      const d = res?.data
      if (d?.accessToken) {
        dispatch(setCredentials({
          accessToken: d.accessToken,
          refreshToken: d.refreshToken,
          user: d.user,
        }))
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err?.data?.error?.message || 'Invalid code. Please try again.')
      setCode('')
      inputRef.current?.focus()
    }
  }

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6) {
      handleSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <div className="flex flex-col items-center gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
        <ShieldCheck className="h-8 w-8 text-brand-600" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink">Two-Factor Authentication</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={6}
        className="h-14 w-48 rounded-xl border border-surface-border bg-white text-center text-2xl font-mono font-semibold tracking-[0.5em] text-ink outline-none focus:border-brand-500"
        placeholder="------"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        disabled={isLoading}
      />

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          disabled={code.length !== 6 || isLoading}
          onClick={handleSubmit}
          className="h-11 w-full rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </button>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-ink-muted hover:text-ink"
          >
            Back to login
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default TwoFactorPrompt
