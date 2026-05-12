function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100
}

/**
 * Compute line totals from raw inputs. Returns numeric fields suitable for DECIMAL storage.
 */
export function computeLineTotal(line) {
  const qty = Number(line.quantity ?? 1)
  const unitPrice = Number(line.unitPrice ?? 0)
  const lineSubtotal = qty * unitPrice

  let discount = 0
  if (line.discountAmount != null && line.discountAmount !== '') {
    discount = Number(line.discountAmount)
  } else if (line.discountPct != null && line.discountPct !== '') {
    discount = (lineSubtotal * Number(line.discountPct)) / 100
  }

  const afterDiscount = Math.max(0, lineSubtotal - discount)
  const taxPct = line.taxPct != null && line.taxPct !== '' ? Number(line.taxPct) : 0
  const taxAmount = (afterDiscount * taxPct) / 100
  const lineTotal = roundMoney(afterDiscount + taxAmount)

  return {
    quantity: qty,
    unitPrice,
    discountPct: line.discountPct != null ? Number(line.discountPct) : null,
    discountAmount: line.discountAmount != null ? Number(line.discountAmount) : null,
    taxPct: taxPct || null,
    lineTotal,
    taxAmount: roundMoney(taxAmount),
    afterDiscount: roundMoney(afterDiscount),
  }
}

export function aggregateQuotationTotals(lines, { shipping = 0, adjustment = 0 } = {}) {
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
    }
  })

  const ship = Number(shipping) || 0
  const adj = Number(adjustment) || 0
  const grandTotal = roundMoney(
    normalized.reduce((s, l) => s + Number(l.lineTotal || 0), 0) + ship + adj,
  )

  const taxBreakdown = taxTotal > 0 ? { tax: roundMoney(taxTotal) } : null

  return {
    items: normalized,
    subtotal: roundMoney(subtotal),
    discountTotal: roundMoney(discountTotal),
    taxBreakdown,
    shipping: roundMoney(ship),
    adjustment: roundMoney(adj),
    grandTotal,
  }
}

export function aggregateInvoiceTotals(lines, { roundOff = 0 } = {}) {
  const agg = aggregateQuotationTotals(lines, { shipping: 0, adjustment: 0 })
  const ro = Number(roundOff) || 0
  agg.grandTotal = roundMoney(agg.grandTotal + ro)
  agg.roundOff = roundMoney(ro)
  return agg
}
