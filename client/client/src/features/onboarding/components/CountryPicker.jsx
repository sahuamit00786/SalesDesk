import { useMemo } from 'react'
import { countryFlagEmoji, getAllCountries } from '@/constants/geo'
import { FlagSelect } from '@/features/onboarding/components/FlagSelect'
import { OtherInput } from '@/features/onboarding/components/OtherInput'

export function CountryPicker({ value, onChange, otherValue, onOtherChange, error }) {
  const options = useMemo(
    () =>
      getAllCountries().map((c) => ({
        value: c.code,
        label: c.name,
        flag: countryFlagEmoji(c.code),
        meta: c.code !== 'OTHER' ? c.code : undefined,
      })),
    [],
  )

  return (
    <div className="space-y-3">
      <FlagSelect
        id="ob-country"
        value={value}
        onChange={onChange}
        options={options}
        placeholder="Select country…"
        searchPlaceholder="Search countries…"
        emptyLabel="No countries match your search."
        aria-label="Country"
      />

      {value === 'OTHER' ? (
        <OtherInput
          id="ob-country-other"
          label="Country name"
          value={otherValue}
          onChange={onOtherChange}
          placeholder="Your country"
        />
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
