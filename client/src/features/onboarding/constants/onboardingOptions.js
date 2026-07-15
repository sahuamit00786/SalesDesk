import {
  Briefcase,
  Building,
  BarChart2,
  Cpu,
  Database,
  DollarSign,
  Flag,
  Globe,
  Heart,
  Home,
  Link2,
  MoreHorizontal,
  Users,
  Settings,
  ShoppingCart,
  GraduationCap,
  Truck,
} from '@/components/ui/icons'
import { findCountryByCode, getAllCountries } from '@/constants/geo'

export const ONBOARDING_STEPS = [
  { id: 'company', label: 'Company', description: 'Profile & industry', icon: Building },
  { id: 'scale', label: 'Organisation', description: 'Team & lead volume', icon: Users },
  { id: 'goals', label: 'Goals', description: 'Priorities & tools', icon: Flag },
  { id: 'activate', label: 'Activate', description: 'Invite & connect', icon: Link2 },
]

export const INDUSTRY_OPTIONS = [
  { id: 'b2b_saas', label: 'B2B SaaS', icon: Cpu },
  { id: 'agency', label: 'Agency', icon: Briefcase },
  { id: 'manufacturing', label: 'Manufacturing', icon: Building },
  { id: 'real_estate', label: 'Real estate', icon: Home },
  { id: 'healthcare', label: 'Healthcare', icon: Heart },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'ecommerce', label: 'E-commerce', icon: ShoppingCart },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'professional_services', label: 'Professional services', icon: Briefcase },
  { id: 'logistics', label: 'Logistics', icon: Truck },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
]
/** @deprecated Use getAllCountries() from @/constants/geo */
export const COUNTRY_OPTIONS = getAllCountries().map((c) => ({ code: c.code, label: c.name }))

export const EMPLOYEE_OPTIONS = [
  { value: '1-10', label: '1–10', sub: 'Small team' },
  { value: '11-50', label: '11–50', sub: 'Growing team' },
  { value: '51-200', label: '51–200', sub: 'Mid-size' },
  { value: '201-500', label: '201–500', sub: 'Large org' },
  { value: '500+', label: '500+', sub: 'Enterprise' },
]

export const LEADS_OPTIONS = [
  { value: '0-50', label: 'Under 50', sub: 'per month' },
  { value: '51-200', label: '51–200', sub: 'per month' },
  { value: '201-500', label: '201–500', sub: 'per month' },
  { value: '500+', label: '500+', sub: 'per month' },
]

export const GOAL_OPTIONS = [
  { id: 'pipeline_visibility', label: 'Pipeline visibility', icon: BarChart2 },
  { id: 'lead_routing', label: 'Lead routing', icon: Users },
  { id: 'email_automation', label: 'Email automation', icon: Link2 },
  { id: 'meeting_notes', label: 'Meeting notes', icon: Briefcase },
  { id: 'reporting', label: 'Reporting', icon: Database },
  { id: 'team_collaboration', label: 'Team collaboration', icon: Users },
  { id: 'hr_attendance', label: 'HR / Attendance', icon: Heart },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
]

export const TOOL_OPTIONS = [
  { id: 'spreadsheets', label: 'Spreadsheets' },
  { id: 'hubspot', label: 'HubSpot' },
  { id: 'salesforce', label: 'Salesforce' },
  { id: 'pipedrive', label: 'Pipedrive' },
  { id: 'zoho', label: 'Zoho' },
  { id: 'monday', label: 'Monday' },
  { id: 'notion', label: 'Notion' },
  { id: 'none', label: 'None yet' },
  { id: 'other', label: 'Other' },
]

export const STEP_ICONS = {
  company: Building,
  scale: BarChart2,
  goals: Settings,
  activate: Link2,
}

export function industryLabelFromValue(value) {
  const match = INDUSTRY_OPTIONS.find((o) => o.id === value || o.label === value)
  return match?.label ?? value
}

export function parseToolsFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return { tools: [], other: '' }
  const parts = notes.split('; Other:')
  const main = parts[0] || ''
  const other = parts[1]?.trim() || ''
  const tools = main
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label) => {
      const opt = TOOL_OPTIONS.find((o) => o.label === label)
      return opt?.id ?? label
    })
  return { tools, other }
}

export function serializeToolsNotes(toolIds, otherText) {
  const labels = toolIds
    .filter((id) => id !== 'other')
    .map((id) => TOOL_OPTIONS.find((o) => o.id === id)?.label || id)
  let result = labels.join(', ')
  if (toolIds.includes('other') && otherText.trim()) {
    result = result ? `${result}; Other: ${otherText.trim()}` : `Other: ${otherText.trim()}`
  }
  return result || null
}

export function resolveIndustryFromCompany(industry) {
  if (!industry) return { industryId: '', industryOther: '' }
  const byId = INDUSTRY_OPTIONS.find((o) => o.id === industry)
  if (byId) return { industryId: byId.id, industryOther: '' }
  const byLabel = INDUSTRY_OPTIONS.find((o) => o.label === industry)
  if (byLabel) return { industryId: byLabel.id, industryOther: '' }
  return { industryId: 'other', industryOther: industry }
}

export function resolveCountryFromCompany(country, city) {
  if (!country && city) return { countryCode: 'OTHER', countryOther: city }
  if (!country) return { countryCode: '', countryOther: '' }
  const upper = String(country).trim().toUpperCase()
  const byCode = findCountryByCode(upper)
  if (byCode && byCode.code !== 'OTHER') return { countryCode: byCode.code, countryOther: '' }
  const byName = getAllCountries().find(
    (c) => c.name.toLowerCase() === String(country).trim().toLowerCase(),
  )
  if (byName) return { countryCode: byName.code, countryOther: '' }
  return { countryCode: 'OTHER', countryOther: country }
}
