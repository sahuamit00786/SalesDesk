import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Check } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { usePatchMyCompanyMutation } from '@/features/company/companyApi'
import { cn } from '@/utils/cn'

const SIDEBAR_STEPS = [
  { id: 'basic', label: 'Basic information', description: 'Company profile' },
  { id: 'org', label: 'Organisation', description: 'Size & lead volume' },
  { id: 'billing', label: 'Billing', description: 'Plan selection' },
]

const BILLING_PLANS = [
  { id: 'trial', name: 'Trial', price: 'Free', desc: 'Explore core CRM features with your team.' },
  { id: 'growth', name: 'Growth', price: '£49', desc: 'Per seat / month — automation & reporting.' },
  { id: 'scale', name: 'Scale', price: 'Talk to us', desc: 'Volume, SSO, and dedicated support.' },
]

const EMPLOYEE_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: '1-10', label: '1–10' },
  { value: '11-50', label: '11–50' },
  { value: '51-200', label: '51–200' },
  { value: '201-500', label: '201–500' },
  { value: '500+', label: '500+' },
]

const LEADS_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: '0-50', label: 'Under 50 / month' },
  { value: '51-200', label: '51–200 / month' },
  { value: '201-500', label: '201–500 / month' },
  { value: '500+', label: '500+ / month' },
]

const LAST_STEP_INDEX = SIDEBAR_STEPS.length - 1

export function OnboardingPage() {
  const token = useAppSelector((s) => s.auth.accessToken)
  const user = useAppSelector((s) => s.auth.user)
  const navigate = useNavigate()
  const location = useLocation()
  const [patchMyCompany, { isLoading }] = usePatchMyCompanyMutation()

  const [activeStep, setActiveStep] = useState(0)
  const [furthestStep, setFurthestStep] = useState(0)

  const [name, setName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [industry, setIndustry] = useState('')
  const [employeeRange, setEmployeeRange] = useState('')
  const [monthlyLeadsBand, setMonthlyLeadsBand] = useState('')
  const [billingPlan, setBillingPlan] = useState('trial')

  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || !user?.company) return
    const c = user.company
    setName(c.name ?? '')
    setWebsiteUrl(c.websiteUrl ?? '')
    setIndustry(c.industry ?? '')
    setEmployeeRange(c.employeeRange ?? '')
    setMonthlyLeadsBand(c.monthlyLeadsBand ?? '')
    initialized.current = true
  }, [user?.company])

  const buildPayloadForStep = useCallback(
    (stepIndex) => {
      const body = {}
      if (stepIndex === 0) {
        const n = name.trim()
        const w = websiteUrl.trim()
        const ind = industry.trim()
        if (n.length >= 2) body.name = n
        if (w.length > 0) body.websiteUrl = w
        if (ind.length > 0) body.industry = ind
      }
      if (stepIndex === 1) {
        if (employeeRange) body.employeeRange = employeeRange
        if (monthlyLeadsBand) body.monthlyLeadsBand = monthlyLeadsBand
      }
      if (stepIndex === 2) {
        body.currentToolsNotes = `Selected plan: ${billingPlan}`
      }
      return body
    },
    [name, websiteUrl, industry, employeeRange, monthlyLeadsBand, billingPlan],
  )

  const persistStep = async (stepIndex) => {
    const body = buildPayloadForStep(stepIndex)
    if (Object.keys(body).length === 0) return true
    try {
      await patchMyCompany(body).unwrap()
      return true
    } catch (err) {
      const message = err?.data?.error?.message ?? err?.data?.publicMessage ?? err?.error ?? 'Could not save'
      toast.error(message)
      return false
    }
  }

  const goNext = async () => {
    const ok = await persistStep(activeStep)
    if (!ok) return
    const next = Math.min(activeStep + 1, LAST_STEP_INDEX)
    setFurthestStep((f) => Math.max(f, next))
    setActiveStep(next)
  }

  const goBack = () => setActiveStep((s) => Math.max(0, s - 1))

  const selectStep = (index) => {
    if (index <= furthestStep) setActiveStep(index)
  }

  const completeOnboarding = async () => {
    try {
      await patchMyCompany({ onboardingCompleted: true }).unwrap()
      toast.success('Welcome to SalesDesk')
      const dest = location.state?.from?.pathname
      navigate(dest && dest !== '/onboarding' ? dest : '/', { replace: true })
    } catch (err) {
      const message = err?.data?.error?.message ?? err?.data?.publicMessage ?? err?.error ?? 'Could not finish setup'
      toast.error(message)
    }
  }

  const onCompleteSetup = async () => {
    const ok = await persistStep(LAST_STEP_INDEX)
    if (!ok) return
    await completeOnboarding()
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!user?.needsOnboarding) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-screen bg-[#eceef3] font-sans text-ink">
      <aside className="flex w-[min(100%,280px)] shrink-0 flex-col border-r border-surface-border bg-white px-5 py-8 lg:w-72 lg:px-8">
        <div className="mb-10 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-lg font-bold text-white shadow-sm">
            S
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-ink">SalesDesk</p>
            <p className="text-[11px] text-ink-muted">by Connexify</p>
          </div>
        </div>

        <nav className="relative flex flex-col gap-0" aria-label="Onboarding progress">
          <span className="absolute bottom-6 left-[15px] top-6 w-px bg-surface-border" aria-hidden />
          {SIDEBAR_STEPS.map((s, i) => {
            const locked = i > furthestStep
            const current = i === activeStep
            const completedLook = i < activeStep || (i > activeStep && i < furthestStep)
            const reachable = !locked
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectStep(i)}
                disabled={!reachable}
                className={cn(
                  'relative z-[1] flex gap-3 rounded-xl py-3 pl-1 pr-2 text-left transition-colors',
                  reachable && 'hover:bg-surface-muted/80',
                  !reachable && 'cursor-not-allowed opacity-50',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                    completedLook && 'border-emerald-500 bg-emerald-500 text-white',
                    current && !completedLook && 'border-brand-600 bg-white text-brand-700 ring-4 ring-brand-500/15',
                    !completedLook && !current && 'border-surface-border bg-white text-ink-muted',
                  )}
                >
                  {completedLook ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span
                    className={cn(
                      'block text-sm font-semibold',
                      current ? 'text-ink' : completedLook ? 'text-ink-muted' : 'text-ink-faint',
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-faint">{s.description}</span>
                </span>
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 lg:px-8 lg:py-10">
          {activeStep === 0 ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-[1.65rem]">Basic information</h1>
              <p className="mt-2 max-w-xl text-sm text-ink-muted">
                Tell us about your company so we can tailor defaults, labels, and lead workflows.
              </p>
              <div className="mt-8 space-y-5 rounded-2xl border border-surface-border bg-white p-6 shadow-sm">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink" htmlFor="ob-name">
                    Company name
                  </label>
                  <Input
                    id="ob-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="organization"
                    placeholder="Acme Inc."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink" htmlFor="ob-site">
                    Website
                  </label>
                  <Input
                    id="ob-site"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    autoComplete="url"
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink" htmlFor="ob-industry">
                    Industry / vertical
                  </label>
                  <Input
                    id="ob-industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. B2B SaaS, manufacturing, agency"
                  />
                </div>
              </div>
            </>
          ) : null}

          {activeStep === 1 ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-[1.65rem]">Organisation</h1>
              <p className="mt-2 max-w-xl text-sm text-ink-muted">
                Rough team size and lead volume help us suggest routing, SLAs, and capacity planning.
              </p>
              <div className="mt-8 space-y-5 rounded-2xl border border-surface-border bg-white p-6 shadow-sm">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink" htmlFor="ob-emp">
                    Company size
                  </label>
                  <Select id="ob-emp" value={employeeRange} onChange={(e) => setEmployeeRange(e.target.value)}>
                    {EMPLOYEE_OPTIONS.map((o) => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink" htmlFor="ob-leads">
                    Inbound leads (monthly, approx.)
                  </label>
                  <Select id="ob-leads" value={monthlyLeadsBand} onChange={(e) => setMonthlyLeadsBand(e.target.value)}>
                    {LEADS_OPTIONS.map((o) => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </>
          ) : null}

          {activeStep === 2 ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-[1.65rem]">Billing</h1>
              <p className="mt-2 max-w-xl text-sm text-ink-muted">
                Choose where to start. You can change plans anytime from workspace settings.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {BILLING_PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setBillingPlan(p.id)}
                    className={cn(
                      'rounded-2xl border p-5 text-left transition-all',
                      billingPlan === p.id
                        ? 'border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-500/20'
                        : 'border-surface-border bg-white hover:border-brand-200 hover:shadow-sm',
                    )}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{p.name}</p>
                    <p className="mt-2 text-xl font-bold text-ink">{p.price}</p>
                    <p className="mt-2 text-sm leading-snug text-ink-muted">{p.desc}</p>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {activeStep > 0 ? (
                <Button type="button" variant="secondary" onClick={goBack} disabled={isLoading}>
                  Back
                </Button>
              ) : null}
            </div>
            <div className="flex justify-end gap-3">
              {activeStep < LAST_STEP_INDEX ? (
                <Button type="button" variant="primary" className="min-w-[140px]" disabled={isLoading} onClick={goNext}>
                  {isLoading ? 'Saving…' : 'Continue'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  className="min-w-[160px] bg-brand-700 hover:bg-brand-800"
                  disabled={isLoading}
                  onClick={onCompleteSetup}
                >
                  {isLoading ? 'Finishing…' : 'Complete setup'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
