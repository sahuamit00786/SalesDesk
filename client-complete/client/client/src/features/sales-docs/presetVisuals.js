import { cn } from '@/utils/cn'

/**
 * Each preset gets a different *structure* (header layout, bill-to shell, table grid),
 * not only a hue swap — so thumbnails read as different templates.
 */
export function getPresetSurface(variant, preset, accent) {
  const p = Math.min(Math.max(Number(preset) || 1, 1), 8)
  const hasAccent = Boolean(accent?.trim?.())

  if (variant === 'invoice') {
    return invoiceSurface(p, hasAccent)
  }
  return quotationSurface(p, hasAccent)
}

/** @typedef {'dual'|'strip'|'masthead'|'sidebarStripe'|'heroDark'|'minimalRule'|'serifMasthead'|'skyBanner'|'invoiceBanner'|'invoiceFormal'|'invoiceReceipt'} HeaderLayout */

function quotationSurface(p, hasAccent) {
  const shell = cn(
    'relative w-full max-w-none overflow-hidden bg-white text-neutral-900 print:shadow-none',
    !hasAccent && p === 1 && 'rounded-sm shadow-md ring-1 ring-blue-200/90',
    !hasAccent && p === 2 && 'border border-slate-300 shadow-sm',
    !hasAccent && p === 3 && 'rounded-t-2xl shadow-md ring-1 ring-brand-200/80',
    !hasAccent && p === 4 && 'border border-amber-200/80 shadow-sm',
    !hasAccent && p === 5 && 'font-serif shadow-sm ring-1 ring-neutral-300/90',
    !hasAccent && p === 6 && 'bg-neutral-950 text-white shadow-lg print:bg-white print:text-neutral-900',
    !hasAccent && p === 7 && 'border border-dashed border-neutral-300 shadow-sm',
    !hasAccent && p === 8 && 'rounded-md border-2 border-sky-600/30 shadow-sm',
  )

  let headBg = cn(
    p === 6 && !hasAccent
      ? 'bg-neutral-900 text-white print:bg-neutral-100 print:text-neutral-900'
      : 'bg-neutral-50 text-neutral-900',
    !hasAccent && p === 1 && 'bg-brand-50/95 print:bg-brand-50',
    !hasAccent && p === 2 && 'bg-slate-100 print:bg-slate-100',
    !hasAccent && p === 4 && 'bg-amber-50/90 print:bg-amber-50',
    !hasAccent && p === 8 && 'bg-sky-50/90 print:bg-sky-50',
  )

  /** @type {HeaderLayout} */
  const headerLayout =
    p === 2
      ? 'strip'
      : p === 3
        ? 'masthead'
        : p === 4
          ? 'sidebarStripe'
          : p === 5
            ? 'serifMasthead'
            : p === 6
              ? 'heroDark'
              : p === 7
                ? 'minimalRule'
                : p === 8
                  ? 'skyBanner'
                  : 'dual'

  const stripAccent = p === 2 ? 'bg-slate-600' : p === 8 ? 'bg-[#5B21B6]' : null

  const sidebarStripeClass = 'bg-amber-600'

  const billToLabel = 'Bill to'
  const billToVariant =
    p === 1 ? 'boxedBlue' : p === 3 ? 'inset' : p === 7 ? 'plainBorder' : 'default'

  const tableVariant =
    p === 1
      ? 'standard'
      : p === 2
        ? 'ledger'
        : p === 3
          ? 'striped'
          : p === 4
            ? 'industrial'
            : p === 5
              ? 'serif'
              : p === 7
                ? 'compact'
                : p === 8
                  ? 'ledger'
                  : 'standard'

  const totalsVariant = p === 6 && !hasAccent ? 'onDark' : p === 3 ? 'violetTint' : 'standard'

  return {
    shell,
    headBg,
    billToLabel,
    billToVariant,
    tableVariant,
    totalsVariant,
    headerLayout,
    stripAccent,
    sidebarStripeClass,
  }
}

function invoiceSurface(p, hasAccent) {
  const shell = cn(
    'relative w-full max-w-none overflow-hidden bg-white text-neutral-900 print:shadow-none',
    !hasAccent && p === 1 && 'rounded-sm border-2 border-emerald-700/40 shadow-lg ring-1 ring-emerald-900/10',
    !hasAccent && p === 2 && 'border border-neutral-300 shadow-sm',
    !hasAccent && p === 3 && 'border-l-[8px] border-indigo-900 shadow-md',
    !hasAccent && p === 4 && 'rounded-lg border-l-4 border-brand-600 shadow-md ring-1 ring-brand-200/60',
    !hasAccent && p === 5 && 'border-t-[6px] border-brand-600 shadow-md',
    !hasAccent && p === 6 && 'border border-neutral-800/15 shadow-md ring-2 ring-neutral-400/40',
    !hasAccent && p === 7 && 'border-y-[8px] border-double border-brand-700 shadow-sm',
    !hasAccent && p === 8 && 'rounded-md border-2 border-dashed border-neutral-400 bg-neutral-50/50 shadow-sm print:bg-white',
  )

  let headBg = cn(
    'text-neutral-900',
    !hasAccent && p === 1 && 'bg-emerald-50/95 print:bg-emerald-50',
    !hasAccent && p === 2 && 'border-b-4 border-neutral-900 bg-white',
    !hasAccent && p === 3 && 'bg-brand-50 print:bg-brand-50',
    !hasAccent && p === 4 && 'bg-slate-50 print:bg-brand-50',
    !hasAccent && p === 5 && 'bg-brand-50/90 print:bg-brand-50',
    !hasAccent && p === 6 && 'bg-neutral-100 print:bg-neutral-100',
    !hasAccent && p === 7 && 'border-b-4 border-double border-brand-700 bg-brand-50/90 print:bg-brand-50',
    !hasAccent && p === 8 && 'border-b border-dashed border-neutral-400 bg-white',
    (hasAccent || ![1, 2, 3, 4, 5, 6, 7, 8].includes(p)) && 'bg-neutral-50',
  )

  /** @type {HeaderLayout} */
  const headerLayout =
    p === 1
      ? 'invoiceBanner'
      : p === 2
        ? 'minimalRule'
        : p === 3
          ? 'sidebarStripe'
          : p === 4
            ? 'masthead'
            : p === 5
              ? 'strip'
              : p === 6
        ? 'invoiceReceipt'
        : p === 7
          ? 'invoiceFormal'
          : p === 8
            ? 'minimalRule'
            : 'dual'

  const stripAccent = p === 5 ? 'bg-[#5B21B6]' : null
  const sidebarStripeClass = 'bg-indigo-900'

  const billToLabel = 'Invoice to'
  const billToVariant =
    p === 1 ? 'boxedEmerald' : p === 4 ? 'inset' : p === 8 ? 'plainBorder' : 'default'

  const tableVariant =
    p === 1 ? 'ledger' : p === 3 ? 'eu' : p === 4 ? 'stripedViolet' : p === 6 ? 'mono' : p === 7 ? 'eu' : 'standard'

  const totalsVariant =
    p === 1 ? 'emphasisLine' : p === 4 ? 'violet' : p === 7 ? 'blueFormal' : 'standard'

  return {
    shell,
    headBg,
    billToLabel,
    billToVariant,
    tableVariant,
    totalsVariant,
    headerLayout,
    stripAccent,
    sidebarStripeClass,
  }
}

export function billToSectionClass(variant) {
  switch (variant) {
    case 'boxedBlue':
      return 'mx-8 mt-5 rounded-xl border border-brand-200/90 bg-brand-50/50 px-4 py-4 shadow-inner print:bg-brand-50/80'
    case 'boxedEmerald':
      return 'mx-8 mt-5 rounded-lg border border-emerald-200 bg-emerald-50/40 px-4 py-4 print:bg-emerald-50/70'
    case 'inset':
      return 'mx-8 mt-5 rounded-lg bg-neutral-50 px-4 py-3 ring-1 ring-neutral-200/80 print:bg-neutral-50'
    case 'plainBorder':
      return 'mx-8 mt-5 border-l-4 border-neutral-400 py-2 pl-4'
    default:
      return 'border-t border-neutral-200 px-8 py-6'
  }
}

export function tableClasses(tableVariant) {
  switch (tableVariant) {
    case 'ledger':
      return {
        wrap: 'rounded-md border border-neutral-300',
        thead: 'border-b-2 border-neutral-400 bg-neutral-50 text-neutral-700',
        row: 'border-b border-neutral-200',
      }
    case 'mono':
      return {
        wrap: '',
        thead: 'border-b-2 border-neutral-800 bg-neutral-100 font-mono text-[11px] uppercase tracking-wide text-neutral-800',
        row: 'border-b border-neutral-200 font-mono text-[13px]',
      }
    case 'eu':
      return {
        wrap: '',
        thead: 'border-b-2 border-neutral-900 bg-white text-xs font-semibold uppercase text-neutral-900',
        row: 'border-b border-neutral-200',
      }
    case 'serif':
      return {
        wrap: '',
        thead: 'border-b border-neutral-400 font-serif text-neutral-800',
        row: 'border-b border-neutral-100 font-serif',
      }
    case 'compact':
      return {
        wrap: '',
        thead: 'border-b border-neutral-200 text-[11px] text-neutral-500',
        row: 'border-b border-neutral-50',
      }
    case 'striped':
      return {
        wrap: 'overflow-hidden rounded-lg border border-brand-200',
        thead: 'bg-[#5B21B6] text-[11px] font-semibold uppercase tracking-wide text-white',
        row: 'border-b border-violet-100 odd:bg-brand-50/60',
      }
    case 'stripedViolet':
      return {
        wrap: 'overflow-hidden rounded-md border border-brand-300',
        thead: 'bg-slate-100 text-xs font-semibold uppercase text-brand-900',
        row: 'border-b border-violet-100 odd:bg-brand-50/40',
      }
    case 'industrial':
      return {
        wrap: 'overflow-hidden rounded border-2 border-amber-800/35 bg-amber-50/20',
        thead: 'border-b-2 border-amber-800/50 bg-amber-100/90 text-xs font-bold uppercase text-amber-950',
        row: 'border-b border-amber-200/80',
      }
    default:
      return {
        wrap: '',
        thead: 'border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500',
        row: 'border-b border-neutral-100',
      }
  }
}

export function totalsSectionClass(totalsVariant) {
  if (totalsVariant === 'onDark') {
    return 'border-t border-neutral-700 px-8 py-6'
  }
  if (totalsVariant === 'emphasisLine') {
    return 'border-t-2 border-emerald-700 bg-emerald-50/40 px-8 py-6 print:bg-emerald-50/60'
  }
  if (totalsVariant === 'violet') {
    return 'border-t border-brand-200 bg-slate-50 px-8 py-6 print:bg-brand-50/40'
  }
  if (totalsVariant === 'violetTint') {
    return 'border-t border-brand-200 bg-slate-50 px-8 py-6 print:bg-brand-50/40'
  }
  if (totalsVariant === 'blueFormal') {
    return 'border-t-4 border-double border-brand-700 bg-brand-50/40 px-8 py-6 print:bg-brand-50/50'
  }
  return 'border-t border-neutral-100 px-8 py-6'
}
