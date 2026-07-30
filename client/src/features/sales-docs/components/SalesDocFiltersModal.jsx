import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FilterField } from '@/components/shared/FilterField'
import { LeadBillToPicker } from '@/components/shared/LeadBillToPicker'
import { cn } from '@/utils/cn'

const fieldInput =
  'h-10 w-full rounded-xl border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-400'

export function SalesDocFiltersModal({
  open,
  onClose,
  statusMeta,
  // BUG FIX (§15.2 of the bug audit) — `leads` used to be a `limit: 400` list; a
  // lead outside the cap couldn't be filtered on at all. Now the parent resolves
  // only the currently-selected filter lead by id, and this searches on demand.
  selectedLeadFilter = null,
  users = [],
  statusFilter,
  onStatusFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  minAmount,
  onMinAmountChange,
  maxAmount,
  onMaxAmountChange,
  onLeadIdFilterChange,
  createdByFilter,
  onCreatedByFilterChange,
  onClear,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filters"
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClear}>
            Clear all
          </Button>
          <Button type="button" variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2">
        <FilterField label="Status">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className={fieldInput}
          >
            <option value="">All statuses</option>
            {Object.entries(statusMeta).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Lead">
          <LeadBillToPicker
            selectedLead={selectedLeadFilter}
            onSelect={(l) => onLeadIdFilterChange(l?.id || '')}
            placeholder="All leads"
            inputClassName={fieldInput}
          />
        </FilterField>

        <FilterField label="Issued from">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className={fieldInput}
          />
        </FilterField>

        <FilterField label="Issued to">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className={fieldInput}
          />
        </FilterField>

        <FilterField label="Min amount">
          <input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={minAmount}
            onChange={(e) => onMinAmountChange(e.target.value)}
            className={fieldInput}
          />
        </FilterField>

        <FilterField label="Max amount">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Any"
            value={maxAmount}
            onChange={(e) => onMaxAmountChange(e.target.value)}
            className={fieldInput}
          />
        </FilterField>

        <FilterField label="Created by" className={cn('sm:col-span-2')}>
          <select
            value={createdByFilter}
            onChange={(e) => onCreatedByFilterChange(e.target.value)}
            className={fieldInput}
          >
            <option value="">Anyone</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </FilterField>
      </div>
    </Modal>
  )
}
