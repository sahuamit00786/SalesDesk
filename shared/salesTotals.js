/**
 * Single source of truth for quotation/invoice line-item and total math.
 *
 * BUG FIX (§12.3 of the bug audit) — this used to be hand-copied in two places
 * (`server/src/services/salesTotals.js` and `client/src/features/sales-docs/previewTotals.js`),
 * kept in sync by hand. They drifted once already (the client had an extra `total` key
 * server didn't). Both files now just re-export this one. Import it directly for new code.
 */

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100
}

// BUG FIX (§12.5 of the bug audit) — `Number(x ?? default)` still yields NaN for a
// non-numeric x (e.g. quantity: "abc"), which then flows through roundMoney (still
// NaN) into a DECIMAL column. Joi validates this upstream on the real create/patch
// routes, but this is the second line of defence for any other caller.
function safeNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeState(s) {
  return String(s || '').trim().toLowerCase()
}

/**
 * Compute line totals from raw inputs. Returns numeric fields suitable for DECIMAL storage.
 */
export function computeLineTotal(line) {
  const qty = safeNumber(line.quantity ?? 1, 1)
  const unitPrice = safeNumber(line.unitPrice ?? 0, 0)
  const lineSubtotal = qty * unitPrice

  let discount = 0
  if (line.discountAmount != null && line.discountAmount !== '') {
    discount = safeNumber(line.discountAmount, 0)
  } else if (line.discountPct != null && line.discountPct !== '') {
    discount = (lineSubtotal * safeNumber(line.discountPct, 0)) / 100
  }

  const afterDiscount = Math.max(0, lineSubtotal - discount)
  // BUG FIX (§12.4 of the bug audit) — `taxPct: taxPct || null` collapsed an
  // explicit 0% line into the same `null` used for "not specified", losing the
  // zero-rated vs unspecified distinction. Track whether it was actually provided.
  const taxPctProvided = line.taxPct != null && line.taxPct !== ''
  const taxPct = taxPctProvided ? safeNumber(line.taxPct, 0) : 0
  const taxAmount = (afterDiscount * taxPct) / 100
  const lineTotal = roundMoney(afterDiscount + taxAmount)

  return {
    quantity: qty,
    unitPrice,
    discountPct: line.discountPct != null ? safeNumber(line.discountPct, null) : null,
    discountAmount: line.discountAmount != null ? safeNumber(line.discountAmount, null) : null,
    taxPct: taxPctProvided ? taxPct : null,
    lineTotal,
    taxAmount: roundMoney(taxAmount),
    afterDiscount: roundMoney(afterDiscount),
  }
}

/**
 * GST split (§12.4 of the bug audit) — a blended `{ tax: N }` isn't a compliant Indian
 * tax invoice; it needs CGST/SGST (intra-state) or IGST (inter-state), broken out per
 * rate slab. Only kicks in when the seller is India-based AND both states are known —
 * everywhere else (or when state data is missing) this returns the original blended
 * shape unchanged, so non-Indian tenants and existing callers see no behavior change.
 */
function buildTaxBreakdown(normalizedLines, roundedTaxTotal, { billingCountry, billingState, customerState } = {}) {
  if (roundedTaxTotal <= 0) return null

  const isIndianSupply = String(billingCountry || '').trim().toUpperCase() === 'IN'
  if (!isIndianSupply || !billingState || !customerState) {
    return { tax: roundedTaxTotal }
  }

  const intraState = normalizeState(billingState) === normalizeState(customerState)

  const slabMap = new Map()
  for (const line of normalizedLines) {
    const ratePct = Number(line.taxPct) || 0
    const taxAmount = Number(line.taxAmount) || 0
    if (ratePct <= 0 || taxAmount <= 0) continue
    const key = ratePct.toFixed(2)
    const existing = slabMap.get(key) || { ratePct, taxable: 0, taxAmount: 0 }
    existing.taxable += Number(line.afterDiscount) || 0
    existing.taxAmount += taxAmount
    slabMap.set(key, existing)
  }

  const slabs = Array.from(slabMap.values())
    .sort((a, b) => a.ratePct - b.ratePct)
    .map(({ ratePct, taxable, taxAmount }) => {
      const rounded = roundMoney(taxAmount)
      if (intraState) {
        const half = roundMoney(rounded / 2)
        return {
          ratePct,
          taxable: roundMoney(taxable),
          cgstRatePct: roundMoney(ratePct / 2),
          sgstRatePct: roundMoney(ratePct / 2),
          igstRatePct: 0,
          cgst: half,
          sgst: half,
          igst: 0,
        }
      }
      return {
        ratePct,
        taxable: roundMoney(taxable),
        cgstRatePct: 0,
        sgstRatePct: 0,
        igstRatePct: ratePct,
        cgst: 0,
        sgst: 0,
        igst: rounded,
      }
    })

  const cgstTotal = roundMoney(slabs.reduce((s, x) => s + x.cgst, 0))
  const sgstTotal = roundMoney(slabs.reduce((s, x) => s + x.sgst, 0))
  const igstTotal = roundMoney(slabs.reduce((s, x) => s + x.igst, 0))

  return {
    tax: roundedTaxTotal,
    type: 'gst',
    supplyType: intraState ? 'intra' : 'inter',
    slabs,
    cgstTotal,
    sgstTotal,
    igstTotal,
  }
}

export function aggregateQuotationTotals(lines, { shipping = 0, adjustment = 0, billingCountry, billingState, customerState } = {}) {
  let subtotal = 0
  let discountTotal = 0
  let taxTotal = 0

  const normalized = lines.map((raw, idx) => {
    const c = computeLineTotal(raw)
    const gross = c.quantity * c.unitPrice
    subtotal += roundMoney(gross)
    discountTotal += roundMoney(gross - c.afterDiscount)
    taxTotal += c.taxAmount
    return {
      ...raw,
      sortOrder: raw.sortOrder ?? idx,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      discountPct: c.discountPct,
      discountAmount: c.discountAmount,
      taxPct: c.taxPct,
      lineTotal: c.lineTotal,
      afterDiscount: c.afterDiscount,
      taxAmount: c.taxAmount,
    }
  })

  const ship = Number(shipping) || 0
  const adj = Number(adjustment) || 0

  const roundedSubtotal = roundMoney(subtotal)
  const roundedDiscountTotal = roundMoney(discountTotal)
  const roundedTaxTotal = roundMoney(taxTotal)
  const roundedShipping = roundMoney(ship)
  const roundedAdjustment = roundMoney(adj)

  // BUG FIX (§12.2 of the bug audit) — grandTotal used to be an independent sum of
  // per-line rounded totals (round-of-sums), while subtotal/discountTotal/taxTotal
  // each accumulate their own per-line rounded parts (sum-of-rounds). The two paths
  // can land a cent apart on odd tax percentages, so the printed breakdown didn't
  // always add up to the total next to it. Deriving grandTotal FROM the same
  // components shown in the breakdown guarantees they always reconcile exactly.
  const grandTotal = roundMoney(
    roundedSubtotal - roundedDiscountTotal + roundedTaxTotal + roundedShipping + roundedAdjustment,
  )

  const taxBreakdown = buildTaxBreakdown(normalized, roundedTaxTotal, { billingCountry, billingState, customerState })

  return {
    items: normalized,
    subtotal: roundedSubtotal,
    discountTotal: roundedDiscountTotal,
    taxBreakdown,
    shipping: roundedShipping,
    adjustment: roundedAdjustment,
    grandTotal,
  }
}

export function aggregateInvoiceTotals(lines, { roundOff = 0, shipping = 0, adjustment = 0, billingCountry, billingState, customerState } = {}) {
  const agg = aggregateQuotationTotals(lines, { shipping, adjustment, billingCountry, billingState, customerState })
  const ro = Number(roundOff) || 0
  agg.grandTotal = roundMoney(agg.grandTotal + ro)
  agg.roundOff = roundMoney(ro)
  return agg
}
