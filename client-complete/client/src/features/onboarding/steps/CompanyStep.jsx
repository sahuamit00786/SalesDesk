import { Plus, Globe, Link2 } from '@/components/ui/icons'
import { Input } from '@/components/ui/Input'
import { ChoiceCard } from '@/features/onboarding/components/ChoiceCard'
import { CountryPicker } from '@/features/onboarding/components/CountryPicker'
import { OnboardingCurrencyPicker } from '@/features/onboarding/components/OnboardingCurrencyPicker'
import { OnboardingFieldSection } from '@/features/onboarding/components/OnboardingFieldSection'
import { OtherInput } from '@/features/onboarding/components/OtherInput'
import { INDUSTRY_OPTIONS } from '@/features/onboarding/constants/onboardingOptions'

export function CompanyStep({
  name,
  setName,
  industryId,
  setIndustryId,
  industryOther,
  setIndustryOther,
  countryCode,
  setCountryCode,
  countryOther,
  setCountryOther,
  websiteUrl,
  setWebsiteUrl,
  websiteLater,
  setWebsiteLater,
  baseCurrency,
  setBaseCurrency,
  errors,
}) {
  return (
    <div className="space-y-10">
      <OnboardingFieldSection title="Company name">
        <div className="max-w-xl">
          <Input
            id="ob-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="organization"
            placeholder="Acme Inc."
            className="h-11"
          />
          {errors.name ? <p className="mt-2 text-xs text-red-600">{errors.name}</p> : null}
        </div>
      </OnboardingFieldSection>

      <OnboardingFieldSection title="Industry" hint="Select the closest match">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {INDUSTRY_OPTIONS.map((opt) => (
            <ChoiceCard
              key={opt.id}
              dataChoice
              icon={opt.icon}
              label={opt.label}
              selected={industryId === opt.id}
              onClick={() => setIndustryId(opt.id)}
            />
          ))}
        </div>
        {industryId === 'other' ? (
          <OtherInput
            id="ob-industry-other"
            label="Your industry"
            value={industryOther}
            onChange={setIndustryOther}
            placeholder="e.g. Renewable energy, hospitality"
          />
        ) : null}
        {errors.industry ? <p className="text-xs text-red-600">{errors.industry}</p> : null}
      </OnboardingFieldSection>

      <OnboardingFieldSection title="Country" hint="Where is your company based?" icon={Globe}>
        <CountryPicker
          value={countryCode}
          onChange={setCountryCode}
          otherValue={countryOther}
          onOtherChange={setCountryOther}
          error={errors.country}
        />
      </OnboardingFieldSection>

      <OnboardingFieldSection
        title="Base currency"
        hint="Default for deals, leads, and reports in this workspace."
      >
        <OnboardingCurrencyPicker
          value={baseCurrency}
          onChange={setBaseCurrency}
          error={errors.baseCurrency}
        />
      </OnboardingFieldSection>

      <OnboardingFieldSection
        title="Website"
        hint="Optional — add your company site if you have one."
        icon={Link2}
      >
        {websiteLater ? (
          <button
            type="button"
            onClick={() => setWebsiteLater(false)}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-4 py-3 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50"
          >
            <Plus size={18} />
            Add website
          </button>
        ) : (
          <div className="max-w-xl space-y-3">
            <Input
              id="ob-site"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              autoComplete="url"
              placeholder="https://example.com"
              className="h-11"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setWebsiteLater(true)
                setWebsiteUrl('')
              }}
              className="text-sm font-medium text-ink-muted underline-offset-2 hover:text-brand-700 hover:underline"
            >
              Add later
            </button>
          </div>
        )}
      </OnboardingFieldSection>
    </div>
  )
}
