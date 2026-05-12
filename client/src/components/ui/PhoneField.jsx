import { useMemo } from 'react'
import PhoneInput from 'react-phone-number-input'
import {
  defaultCountryFromCallingCode,
  inferE164FromStored,
  mergePartsToE164,
  splitFromE164,
} from '@/utils/phoneNumbers'
import { cn } from '@/utils/cn'

/**
 * @typedef {'e164' | 'split'} PhoneFieldMode
 *
 * mode "e164": `value` / `onChange` use full international string (+…).
 * mode "split": `countryCallingCode`, `nationalNumber`, `onSplitChange({ countryCallingCode, nationalNumber })`
 *   — matches Lead API (`phone_country_code` + national `phone`).
 */
export function PhoneField({
  label,
  mode = 'e164',
  defaultCountry = 'IN',
  value,
  onChange,
  countryCallingCode,
  nationalNumber,
  onSplitChange,
  disabled,
  className,
  compact,
}) {
  const derivedDefaultCountry = useMemo(() => {
    if (mode === 'split') return defaultCountryFromCallingCode(countryCallingCode) || defaultCountry
    return defaultCountry
  }, [mode, countryCallingCode, defaultCountry])

  const e164Value = useMemo(() => {
    if (mode === 'e164') return inferE164FromStored(value, derivedDefaultCountry)
    return mergePartsToE164(countryCallingCode, nationalNumber)
  }, [mode, value, countryCallingCode, nationalNumber, derivedDefaultCountry])

  function handleChange(next) {
    if (mode === 'e164') {
      onChange?.(next || '')
      return
    }
    const fb = String(countryCallingCode || '+91').trim() || '+91'
    onSplitChange?.(splitFromE164(next, fb))
  }

  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <p
          className={cn(
            'mb-1.5 font-semibold uppercase tracking-wide text-ink-muted',
            compact ? 'text-[10px]' : 'text-[11px]',
          )}
        >
          {label}
        </p>
      ) : null}
      <PhoneInput
        international
        defaultCountry={derivedDefaultCountry}
        value={e164Value}
        onChange={handleChange}
        disabled={disabled}
        className={cn('PhoneInput PhoneInput--connexify', compact && 'PhoneInput--compact')}
      />
    </div>
  )
}
