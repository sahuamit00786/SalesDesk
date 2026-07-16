import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  usePatchMyCompanyMutation,
  useProvisionMyWorkspaceMutation,
} from '@/features/company/companyApi'
import {
  INDUSTRY_OPTIONS,
  industryLabelFromValue,
  parseToolsFromNotes,
  resolveCountryFromCompany,
  resolveIndustryFromCompany,
  serializeToolsNotes,
} from '@/features/onboarding/constants/onboardingOptions'
import { currencyFromCountryCode } from '@/constants/geo'

const LAST_STEP = 3

function draftKey(companyId) {
  return companyId ? `leadnest.onboarding.draft.${companyId}` : null
}

function readDraft(companyId) {
  const key = draftKey(companyId)
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeDraft(companyId, payload) {
  const key = draftKey(companyId)
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // ignore quota / private mode
  }
}

function clearDraft(companyId) {
  const key = draftKey(companyId)
  if (!key) return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function useOnboardingWizard(user) {
  const companyId = user?.company?.id
  const [patchMyCompany, { isLoading: patchLoading }] = usePatchMyCompanyMutation()
  const [provisionMyWorkspace, { isLoading: provisionLoading }] = useProvisionMyWorkspaceMutation()
  const [activeStep, setActiveStep] = useState(0)
  const [furthestStep, setFurthestStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [provisioning, setProvisioning] = useState(false)
  const [provisionSteps, setProvisionSteps] = useState(null)

  const [name, setName] = useState('')
  const [industryId, setIndustryId] = useState('')
  const [industryOther, setIndustryOther] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [countryOther, setCountryOther] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [websiteLater, setWebsiteLater] = useState(true)
  const [baseCurrency, setBaseCurrency] = useState('USD')

  const [employeeRange, setEmployeeRange] = useState('')
  const [monthlyLeadsBand, setMonthlyLeadsBand] = useState('')

  const [goalTags, setGoalTags] = useState([])
  const [goalOther, setGoalOther] = useState('')
  const [toolTags, setToolTags] = useState([])
  const [toolOther, setToolOther] = useState('')

  const initialized = useRef(false)
  const isLoading = patchLoading || provisionLoading || provisioning

  useEffect(() => {
    if (initialized.current || !user?.company) return
    const c = user.company
    const draft = readDraft(c.id)

    setName(draft?.name ?? c.name ?? '')
    const industry = draft?.industryId
      ? { industryId: draft.industryId, industryOther: draft.industryOther ?? '' }
      : resolveIndustryFromCompany(c.industry)
    setIndustryId(industry.industryId)
    setIndustryOther(industry.industryOther)

    const country = draft?.countryCode
      ? { countryCode: draft.countryCode, countryOther: draft.countryOther ?? '' }
      : resolveCountryFromCompany(c.country, c.city)
    setCountryCode(country.countryCode)
    setCountryOther(country.countryOther)

    if (draft?.websiteUrl) {
      setWebsiteUrl(draft.websiteUrl)
      setWebsiteLater(Boolean(draft.websiteLater))
    } else if (c.websiteUrl) {
      setWebsiteUrl(c.websiteUrl)
      setWebsiteLater(false)
    }

    setEmployeeRange(draft?.employeeRange ?? c.employeeRange ?? '')
    setMonthlyLeadsBand(draft?.monthlyLeadsBand ?? c.monthlyLeadsBand ?? '')
    setGoalTags(draft?.goalTags ?? (Array.isArray(c.leadPainTags) ? c.leadPainTags : []))
    setGoalOther(draft?.goalOther ?? c.leadPainNotes ?? '')
    const parsed = parseToolsFromNotes(c.currentToolsNotes)
    setToolTags(draft?.toolTags ?? parsed.tools)
    setToolOther(draft?.toolOther ?? parsed.other)

    if (draft?.baseCurrency) setBaseCurrency(String(draft.baseCurrency).toUpperCase())
    else if (c.baseCurrency) setBaseCurrency(String(c.baseCurrency).toUpperCase())
    else {
      const hint = currencyFromCountryCode(country.countryCode || c.country)
      if (hint) setBaseCurrency(hint)
    }

    if (typeof draft?.activeStep === 'number') setActiveStep(draft.activeStep)
    if (typeof draft?.furthestStep === 'number') setFurthestStep(draft.furthestStep)

    initialized.current = true
  }, [user?.company])

  useEffect(() => {
    if (!initialized.current || !companyId) return
    writeDraft(companyId, {
      name,
      industryId,
      industryOther,
      countryCode,
      countryOther,
      websiteUrl,
      websiteLater,
      baseCurrency,
      employeeRange,
      monthlyLeadsBand,
      goalTags,
      goalOther,
      toolTags,
      toolOther,
      activeStep,
      furthestStep,
    })
  }, [
    companyId,
    name,
    industryId,
    industryOther,
    countryCode,
    countryOther,
    websiteUrl,
    websiteLater,
    baseCurrency,
    employeeRange,
    monthlyLeadsBand,
    goalTags,
    goalOther,
    toolTags,
    toolOther,
    activeStep,
    furthestStep,
  ])

  const setCountryCodeWithHint = useCallback((code) => {
    setCountryCode(code)
    if (code && code !== 'OTHER') {
      const hint = currencyFromCountryCode(code)
      if (hint) setBaseCurrency(hint)
    }
  }, [])

  const toggleGoal = useCallback((id) => {
    setGoalTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const toggleTool = useCallback((id) => {
    setToolTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const resolveIndustryValue = useCallback(() => {
    if (industryId === 'other') return industryOther.trim()
    const opt = INDUSTRY_OPTIONS.find((o) => o.id === industryId)
    return opt?.label ?? ''
  }, [industryId, industryOther])

  const buildPayloadForStep = useCallback(
    (stepIndex) => {
      const body = {}
      if (stepIndex === 0) {
        const n = name.trim()
        const ind = resolveIndustryValue()
        if (n.length >= 2) body.name = n
        if (ind) body.industry = ind
        if (countryCode === 'OTHER') {
          body.country = null
          if (countryOther.trim()) body.city = countryOther.trim()
        } else if (countryCode) {
          body.country = countryCode
          body.city = null
        }
        if (!websiteLater) {
          const w = websiteUrl.trim()
          if (w) body.websiteUrl = w
          else body.websiteUrl = null
        }
        if (baseCurrency) body.baseCurrency = baseCurrency
      }
      if (stepIndex === 1) {
        if (employeeRange) body.employeeRange = employeeRange
        if (monthlyLeadsBand) body.monthlyLeadsBand = monthlyLeadsBand
      }
      if (stepIndex === 2) {
        if (goalTags.length) body.leadPainTags = goalTags
        const notes = goalTags.includes('other') ? goalOther.trim() : ''
        body.leadPainNotes = notes || null
        const toolsNotes = serializeToolsNotes(toolTags, toolOther)
        body.currentToolsNotes = toolsNotes
      }
      return body
    },
    [
      name,
      resolveIndustryValue,
      countryCode,
      countryOther,
      websiteLater,
      websiteUrl,
      baseCurrency,
      employeeRange,
      monthlyLeadsBand,
      goalTags,
      goalOther,
      toolTags,
      toolOther,
    ],
  )

  const validateStep = useCallback(
    (stepIndex) => {
      const next = {}
      if (stepIndex === 0) {
        if (name.trim().length < 2) next.name = 'Company name must be at least 2 characters'
        if (!industryId) next.industry = 'Select your industry'
        else if (industryId === 'other' && !industryOther.trim()) next.industry = 'Describe your industry'
        if (!countryCode) next.country = 'Select your country'
        else if (countryCode === 'OTHER' && !countryOther.trim()) next.country = 'Enter your country'
        if (!baseCurrency) next.baseCurrency = 'Select your base currency'
      }
      if (stepIndex === 1) {
        if (!employeeRange) next.employeeRange = 'Select team size'
        if (!monthlyLeadsBand) next.monthlyLeadsBand = 'Select monthly lead volume'
      }
      if (stepIndex === 2) {
        if (!goalTags.length) next.goals = 'Select at least one goal'
        if (goalTags.includes('other') && !goalOther.trim()) next.goals = 'Describe your other goal'
      }
      setErrors(next)
      return Object.keys(next).length === 0
    },
    [name, industryId, industryOther, countryCode, countryOther, baseCurrency, employeeRange, monthlyLeadsBand, goalTags, goalOther],
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
    if (!validateStep(activeStep)) return
    const ok = await persistStep(activeStep)
    if (!ok) return
    const next = Math.min(activeStep + 1, LAST_STEP)
    setFurthestStep((f) => Math.max(f, next))
    setActiveStep(next)
    setErrors({})
  }

  const goBack = () => {
    setActiveStep((s) => Math.max(0, s - 1))
    setErrors({})
  }

  const selectStep = (index) => {
    if (index <= furthestStep) {
      setActiveStep(index)
      setErrors({})
    }
  }

  const completeOnboarding = async () => {
    setProvisioning(true)
    setProvisionSteps(null)
    try {
      const provisionRes = await provisionMyWorkspace().unwrap()
      const steps = provisionRes?.data?.provision?.steps
      if (steps?.length) setProvisionSteps(steps)
      await new Promise((r) => setTimeout(r, Math.max(1200, (steps?.length ?? 4) * 400)))

      await patchMyCompany({ onboardingCompleted: true }).unwrap()
      if (companyId) clearDraft(companyId)
      toast.success('Welcome to LeadNest')
      return true
    } catch (err) {
      const message = err?.data?.error?.message ?? err?.data?.publicMessage ?? err?.error ?? 'Could not finish setup'
      toast.error(message)
      return false
    } finally {
      setProvisioning(false)
      setProvisionSteps(null)
    }
  }

  return {
    activeStep,
    furthestStep,
    lastStep: LAST_STEP,
    errors,
    isLoading,
    provisioning,
    provisionSteps,
    name,
    setName,
    industryId,
    setIndustryId,
    industryOther,
    setIndustryOther,
    countryCode,
    setCountryCode: setCountryCodeWithHint,
    countryOther,
    baseCurrency,
    setBaseCurrency,
    setCountryOther,
    websiteUrl,
    setWebsiteUrl,
    websiteLater,
    setWebsiteLater,
    employeeRange,
    setEmployeeRange,
    monthlyLeadsBand,
    setMonthlyLeadsBand,
    goalTags,
    toggleGoal,
    goalOther,
    setGoalOther,
    toolTags,
    toggleTool,
    toolOther,
    setToolOther,
    goNext,
    goBack,
    selectStep,
    completeOnboarding,
    industryLabelFromValue,
  }
}
