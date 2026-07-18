import { useState } from 'react'
import { ShieldCheck, Copy, Check, AlertCircle } from '@/components/ui/icons'
import { baseApi } from '@/features/api/baseApi'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'

const twoFactorApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    setup2FA: build.mutation({
      query: () => ({ url: '/auth/2fa/setup', method: 'POST' }),
    }),
    verify2FA: build.mutation({
      query: (body) => ({ url: '/auth/2fa/verify', method: 'POST', body }),
    }),
    disable2FA: build.mutation({
      query: (body) => ({ url: '/auth/2fa/disable', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
})

const { useSetup2FAMutation, useVerify2FAMutation } = twoFactorApi

/**
 * TwoFactorSetup — shown in Settings when user enables 2FA.
 * @param {{ onSuccess?: () => void }} props
 */
export function TwoFactorSetup({ onSuccess }) {
  const [step, setStep] = useState('init') // 'init' | 'scan' | 'verify' | 'done'
  const [qrData, setQrData] = useState(null)
  const [secretKey, setSecretKey] = useState('')
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const [setup2FA, { isLoading: setting }] = useSetup2FAMutation()
  const [verify2FA, { isLoading: verifying }] = useVerify2FAMutation()

  async function handleStart() {
    setError('')
    try {
      const res = await setup2FA().unwrap()
      setQrData(res?.data?.qrCode || res?.data?.qrCodeUrl || null)
      setSecretKey(res?.data?.secret || '')
      setStep('scan')
    } catch (err) {
      setError(err?.data?.error?.message || 'Could not start 2FA setup')
    }
  }

  async function handleVerify() {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }
    setError('')
    try {
      await verify2FA({ totpCode: code }).unwrap()
      setStep('done')
      toast.success('Two-factor authentication enabled!')
      onSuccess?.()
    } catch (err) {
      setError(err?.data?.error?.message || 'Invalid code. Please try again.')
      setCode('')
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secretKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <ShieldCheck className="h-7 w-7 text-emerald-600" />
        </div>
        <h3 className="text-base font-semibold text-ink">2FA Enabled</h3>
        <p className="text-sm text-ink-muted max-w-sm">
          Your account is now protected with two-factor authentication. You will be prompted for a code each time you sign in.
        </p>
      </div>
    )
  }

  if (step === 'init') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-surface-border bg-surface-subtle p-4">
          <ShieldCheck className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-ink">Enable Two-Factor Authentication</p>
            <p className="mt-1 text-xs text-ink-muted">
              Protect your account by requiring a code from your authenticator app (Google Authenticator, Authy, 1Password) in addition to your password.
            </p>
          </div>
        </div>
        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        ) : null}
        <button
          type="button"
          disabled={setting}
          onClick={handleStart}
          className="h-10 w-full rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {setting ? 'Setting up...' : 'Enable 2FA'}
        </button>
      </div>
    )
  }

  if (step === 'scan') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Step 1: Scan the QR code</h3>
          <p className="mt-1 text-xs text-ink-muted">Open your authenticator app and scan the QR code below.</p>
        </div>

        {qrData ? (
          <div className="flex justify-center">
            <img src={qrData} alt="2FA QR code" className="h-48 w-48 rounded-lg border border-surface-border" />
          </div>
        ) : null}

        {secretKey ? (
          <div>
            <p className="mb-1 text-xs font-medium text-ink-muted">Or enter this key manually:</p>
            <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-subtle px-3 py-2">
              <code className="flex-1 text-xs font-mono tracking-widest text-ink break-all">{secretKey}</code>
              <button
                type="button"
                onClick={copySecret}
                aria-label="Copy secret key"
                className="shrink-0 rounded p-1 text-ink-faint hover:text-ink"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setStep('verify')}
          className="h-10 w-full rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Next: Verify code
        </button>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Step 2: Enter the 6-digit code</h3>
          <p className="mt-1 text-xs text-ink-muted">Enter the code shown in your authenticator app to confirm setup.</p>
        </div>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          className="h-12 w-full rounded-xl border border-surface-border bg-white px-4 text-center text-xl font-mono font-semibold tracking-[0.4em] text-ink outline-none focus:border-brand-500"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          autoFocus
        />

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStep('scan')}
            className="h-10 flex-1 rounded-xl border border-surface-border text-sm font-medium text-ink hover:bg-surface-subtle"
          >
            Back
          </button>
          <button
            type="button"
            disabled={code.length !== 6 || verifying}
            onClick={handleVerify}
            className="h-10 flex-1 rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {verifying ? 'Verifying...' : 'Verify & Enable'}
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default TwoFactorSetup
