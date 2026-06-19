import { useMemo } from 'react'
import { getAllCurrencies } from '@/constants/geo'
import { FlagSelect } from '@/features/onboarding/components/FlagSelect'

export function OnboardingCurrencyPicker({ value, onChange, error }) {
  const options = useMemo(
    () =>
      getAllCurrencies().map((c) => ({
        value: c.code,
        label: c.name,
        flag: c.flag,
        meta: c.code,
      })),
    [],
  )

  return (
    <div className="space-y-2">
      <FlagSelect
        id="ob-currency"
        value={value}
        onChange={onChange}
        options={options}
        placeholder="Select currency…"
        searchPlaceholder="Search currencies…"
        emptyLabel="No currencies match your search."
        aria-label="Base currency"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
