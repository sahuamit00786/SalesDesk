import { useEffect, useMemo, useState } from 'react'
import { Building2, Briefcase, UserCircle2 } from 'lucide-react'
import { RightDrawer } from '@/components/ui/RightDrawer'

const FALLBACK_STAGE_NAMES = ['Lead Inbound', 'New', 'Contacted', 'Qualified', 'Proposal Made', 'Negotiation', 'Won', 'Lost']
const INDUSTRIES = ['Software / SaaS', 'FinTech', 'Healthcare', 'Logistics', 'Manufacturing', 'Education', 'Other']
const COMPANY_SIZES = ['1-10 employees', '11-50 employees', '51-200 employees', '201-1000 employees', '1000+ employees']

const EMPTY_FORM = {
  fullName: '',
  email: '',
  phoneNumber: '',
  jobTitle: '',
  companyName: '',
  industry: 'Software / SaaS',
  companySize: '11-50 employees',
  website: '',
  linkedin: '',
  dealValue: '',
  ownerUserId: '',
}

export function CreateOpportunityModal({
  open,
  onClose,
  onSave,
  onSaveAndAddAnother,
  users = [],
  opportunityStages = [],
  saving = false,
}) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, currentStage: 'Lead Inbound' }))
  const [error, setError] = useState('')

  const defaultStage = useMemo(() => {
    if (opportunityStages.length) {
      const d = opportunityStages.find((s) => s.isDefault)
      return d?.name || opportunityStages[0]?.name || 'Lead Inbound'
    }
    return 'Lead Inbound'
  }, [opportunityStages])

  const stageOptions = useMemo(() => {
    if (opportunityStages.length) return opportunityStages.map((s) => s.name).filter(Boolean)
    return FALLBACK_STAGE_NAMES
  }, [opportunityStages])

  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        ...EMPTY_FORM,
        currentStage: defaultStage,
        ownerUserId: users[0]?.id || prev.ownerUserId || '',
      }))
      setError('')
    }
  }, [open, users, defaultStage])

  const ownerOptions = useMemo(
    () => users.map((u) => ({ id: u.id, label: u.name || u.email || 'User', email: u.email || '' })),
    [users],
  )

  if (!open) return null

  function patch(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function normalizedPayload() {
    return {
      ...form,
      dealValue: Number(form.dealValue || 0),
      website: form.website || null,
      linkedin: form.linkedin || null,
      email: form.email || null,
      phoneNumber: form.phoneNumber || null,
      jobTitle: form.jobTitle || null,
      ownerUserId: form.ownerUserId || null,
    }
  }

  async function submit(kind) {
    if (!form.fullName.trim()) return setError('Full name is required')
    if (!form.companyName.trim()) return setError('Company is required')
    if (!form.currentStage.trim()) return setError('Current stage is required')
    setError('')
    if (kind === 'add-another') {
      await onSaveAndAddAnother(normalizedPayload(), () =>
        setForm({
          ...EMPTY_FORM,
          currentStage: defaultStage,
          ownerUserId: users[0]?.id || '',
        }),
      )
    }
    else await onSave(normalizedPayload())
  }

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title="New Opportunity"
      description="Create a new sales record in the pipeline"
      className="sm:max-w-[min(520px,38vw)]"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="h-8 min-w-[110px] rounded-md border border-surface-border px-3 text-xs font-semibold text-ink-muted hover:bg-surface-subtle" onClick={onClose}>Cancel</button>
          <button type="button" disabled={saving} className="h-8 min-w-[130px] rounded-md bg-brand-700 px-3 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60" onClick={() => submit('save')}>Save Opportunity</button>
          <button type="button" disabled={saving} className="h-8 min-w-[130px] rounded-md bg-brand-50 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60" onClick={() => submit('add-another')}>Save & Add Another</button>
        </div>
      }
    >
      <div className="space-y-4">
          <section>
            <div className="mb-2 flex items-center gap-1.5">
              <UserCircle2 className="h-4 w-4 text-brand-700" />
              <h3 className="text-sm font-semibold text-ink">Contact Information</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Full name</p>
                <input className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={form.fullName} onChange={(e) => patch('fullName', e.target.value)} placeholder="e.g. Sarah Jenkins" />
              </label>
              <label>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Email address</p>
                <input className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={form.email} onChange={(e) => patch('email', e.target.value)} placeholder="sarah@company.com" />
              </label>
              <label>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Phone number</p>
                <input className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={form.phoneNumber} onChange={(e) => patch('phoneNumber', e.target.value)} placeholder="+1 (555) 000-0000" />
              </label>
              <label>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Job title</p>
                <input className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={form.jobTitle} onChange={(e) => patch('jobTitle', e.target.value)} placeholder="VP of Engineering" />
              </label>
              <label>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Company</p>
                <input className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={form.companyName} onChange={(e) => patch('companyName', e.target.value)} placeholder="Global Tech Inc." />
              </label>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-brand-700" />
              <h3 className="text-sm font-semibold text-ink">Company Details</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Industry</p>
                <select className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={form.industry} onChange={(e) => patch('industry', e.target.value)}>
                  {INDUSTRIES.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Company size</p>
                <select className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={form.companySize} onChange={(e) => patch('companySize', e.target.value)}>
                  {COMPANY_SIZES.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className="sm:col-span-2">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Website</p>
                <input className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={form.website} onChange={(e) => patch('website', e.target.value)} placeholder="www.company.com" />
              </label>
              <label className="sm:col-span-2">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">LinkedIn</p>
                <input className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={form.linkedin} onChange={(e) => patch('linkedin', e.target.value)} placeholder="linkedin.com/company/handle" />
              </label>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-brand-700" />
              <h3 className="text-sm font-semibold text-ink">Opportunity Info</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Deal value</p>
                <input className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={form.dealValue} onChange={(e) => patch('dealValue', e.target.value)} placeholder="$ 0.00" />
              </label>
              <label>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Current stage</p>
                <select className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={form.currentStage} onChange={(e) => patch('currentStage', e.target.value)}>
                  {stageOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Owner</p>
                <select className="h-8 w-full rounded-md border border-surface-border px-2 text-xs" value={form.ownerUserId} onChange={(e) => patch('ownerUserId', e.target.value)}>
                  <option value="">Select owner</option>
                  {ownerOptions.map((x) => <option key={x.id} value={x.id}>{x.label}{x.email ? ` (${x.email})` : ''}</option>)}
                </select>
              </label>
            </div>
          </section>
          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      </div>
    </RightDrawer>
  )
}

