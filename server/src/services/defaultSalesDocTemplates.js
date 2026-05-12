import { QuotationTemplate, InvoiceTemplate } from '../models/index.js'

/** Stable library codes — migration + workspace bootstrap must stay in sync. */
export const LIB_QUOTATION_CODES = [
  'LIB_Q_01',
  'LIB_Q_02',
  'LIB_Q_03',
  'LIB_Q_04',
  'LIB_Q_05',
  'LIB_Q_06',
  'LIB_Q_07',
  'LIB_Q_08',
]

export const LIB_INVOICE_CODES = [
  'LIB_INV_01',
  'LIB_INV_02',
  'LIB_INV_03',
  'LIB_INV_04',
  'LIB_INV_05',
  'LIB_INV_06',
  'LIB_INV_07',
  'LIB_INV_08',
]

const EXECUTIVE_TERMS = `Payment: Net 30 days from acceptance unless otherwise agreed. All amounts are in the quoted currency and exclude applicable taxes, duties, and levies unless explicitly itemized.

Acceptance: A signed purchase order or written acceptance before the validity date constitutes a binding order subject to these terms.

Validity: Pricing and availability are valid only for the period stated on this quotation. Expired quotations may be reissued upon request.

Scope: Deliverables are limited to the line items and specifications described herein. Changes to scope, schedule, or assumptions may require a revised quotation.`

const STANDARD_TERMS = `Payment is due within 30 days of acceptance unless otherwise agreed. Prices exclude applicable taxes unless stated. This quotation is valid for the period shown on the face of the document.`

const CREATIVE_TERMS = `50% deposit due on approval; balance due prior to final file delivery unless otherwise agreed. Usage rights are as specified per line item. Rush timelines may incur additional fees.`

const INDUSTRIAL_TERMS = `Payment terms: Net 45 from invoice/acceptance as agreed. Lead times are estimates and may vary with material availability. Freight, duties, and installation are quoted separately unless included.`

const CONSULTING_TERMS = `Fees are based on the scope in this proposal. Out-of-pocket expenses billed at cost with approval. A change-control process applies to material scope or timeline shifts.`

const MINIMAL_TERMS = `Payment due as agreed. Taxes extra where applicable.`

const INTERNATIONAL_TERMS = `Prices exclude import duties, withholding taxes, and local levies. The customer is responsible for compliance with local regulations. If reverse charge or self-assessment applies, it will be indicated on tax documentation.`

const GST_TERMS = `Taxes: CGST/SGST/IGST as applicable under Indian law. Supply details and HSN/SAC are shown on the tax invoice. Input tax credit, if any, is subject to statutory conditions.`

const MINIMAL_INV_TERMS = `Please remit the amount shown by the due date. Thank you for your business.`

const ENTERPRISE_INV_TERMS = `Payment per agreed master terms. Late payments may incur statutory or contractually defined charges. Remittance details appear in the payment section.`

const SAAS_INV_TERMS = `Subscription fees are non-refundable except as required by law. Service level and support terms follow your order form or master agreement.`

const AGENCY_INV_TERMS = `Retainers are billed in advance; variable work is billed on completion or per milestone. Expenses are passed through with receipts unless a flat disbursement is agreed.`

const RETAIL_INV_TERMS = `All sales are final unless a separate return policy applies. Warranty terms follow the manufacturer where applicable.`

const VAT_INV_TERMS = `VAT is shown where applicable. Reverse charge or intra-community supply notes appear when relevant.`

const PROFORMA_TERMS = `This is a proforma document for approval or customs purposes and is not a tax invoice unless stated. A final tax invoice will be issued upon supply or as agreed.`

/**
 * @returns {Array<Record<string, unknown>>}
 */
export function quotationLibraryDefaults() {
  return [
    {
      code: 'LIB_Q_01',
      name: 'Executive Pro — Sapphire',
      category: 'Professional',
      layoutPreset: 1,
      themeColor: '#1e40af',
      fontFamily: '"DM Sans", system-ui, sans-serif',
      defaultValidityDays: 30,
      defaultTaxType: 'none',
      defaultPaymentTerms: EXECUTIVE_TERMS,
      defaultNotes:
        'We appreciate the opportunity to work with you. Please contact us with any questions before accepting this quotation.',
      showHsn: false,
      showSku: false,
      watermark: 'none',
    },
    {
      code: 'LIB_Q_02',
      name: 'Corporate Standard — Slate',
      category: 'Enterprise',
      layoutPreset: 2,
      themeColor: '#334155',
      fontFamily: '"Inter", system-ui, sans-serif',
      defaultValidityDays: 30,
      defaultTaxType: 'none',
      defaultPaymentTerms: STANDARD_TERMS,
      defaultNotes: null,
      showHsn: false,
      showSku: true,
      watermark: 'none',
    },
    {
      code: 'LIB_Q_03',
      name: 'Creative Studio — Violet',
      category: 'Agency',
      layoutPreset: 3,
      themeColor: '#6d28d9',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      defaultValidityDays: 21,
      defaultTaxType: 'none',
      defaultPaymentTerms: CREATIVE_TERMS,
      defaultNotes: 'Milestones and deliverable formats can be adjusted during kickoff.',
      showHsn: false,
      showSku: false,
      watermark: 'none',
    },
    {
      code: 'LIB_Q_04',
      name: 'Industrial Works — Copper',
      category: 'Manufacturing',
      layoutPreset: 4,
      themeColor: '#c2410c',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      defaultValidityDays: 45,
      defaultTaxType: 'none',
      defaultPaymentTerms: INDUSTRIAL_TERMS,
      defaultNotes: null,
      showHsn: true,
      showSku: true,
      watermark: 'none',
    },
    {
      code: 'LIB_Q_05',
      name: 'Consulting Engagement — Serif',
      category: 'Professional services',
      layoutPreset: 5,
      themeColor: '#0f766e',
      fontFamily: 'Georgia, "Times New Roman", serif',
      defaultValidityDays: 45,
      defaultTaxType: 'none',
      defaultPaymentTerms: CONSULTING_TERMS,
      defaultNotes: 'Assumptions and exclusions are summarized in the engagement appendix if provided.',
      showHsn: false,
      showSku: false,
      watermark: 'none',
    },
    {
      code: 'LIB_Q_06',
      name: 'Noir Premium — Onyx',
      category: 'Premium',
      layoutPreset: 6,
      themeColor: '#fafafa',
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
      defaultValidityDays: 30,
      defaultTaxType: 'none',
      defaultPaymentTerms: STANDARD_TERMS,
      defaultNotes: null,
      showHsn: false,
      showSku: false,
      watermark: 'none',
    },
    {
      code: 'LIB_Q_07',
      name: 'Essential Minimal',
      category: 'Minimal',
      layoutPreset: 7,
      themeColor: '#404040',
      fontFamily: 'system-ui, sans-serif',
      defaultValidityDays: 14,
      defaultTaxType: 'none',
      defaultPaymentTerms: MINIMAL_TERMS,
      defaultNotes: null,
      showHsn: false,
      showSku: false,
      watermark: 'none',
    },
    {
      code: 'LIB_Q_08',
      name: 'International Trade — Azure',
      category: 'Cross-border',
      layoutPreset: 8,
      themeColor: '#0369a1',
      fontFamily: '"Inter", system-ui, sans-serif',
      defaultValidityDays: 30,
      defaultTaxType: 'vat',
      defaultPaymentTerms: INTERNATIONAL_TERMS,
      defaultNotes: 'Incoterms and port of discharge should be confirmed before order placement.',
      showHsn: false,
      showSku: true,
      watermark: 'none',
    },
  ]
}

/**
 * @returns {Array<Record<string, unknown>>}
 */
export function invoiceLibraryDefaults() {
  return [
    {
      code: 'LIB_INV_01',
      name: 'GST Compliance (India)',
      templateType: 'gst',
      layoutPreset: 1,
      numberPrefix: 'INV',
      themeStyle: 'gst-compliant',
      defaultCurrency: 'INR',
      defaultPaymentTerms: GST_TERMS,
      taxProfile: { regime: 'GST', placeOfSupply: 'IN' },
    },
    {
      code: 'LIB_INV_02',
      name: 'Clean Minimal',
      templateType: 'general',
      layoutPreset: 2,
      numberPrefix: 'INM',
      themeStyle: 'minimal',
      defaultCurrency: 'USD',
      defaultPaymentTerms: MINIMAL_INV_TERMS,
      taxProfile: null,
    },
    {
      code: 'LIB_INV_03',
      name: 'Enterprise Ledger',
      templateType: 'general',
      layoutPreset: 3,
      numberPrefix: 'INE',
      themeStyle: 'enterprise',
      defaultCurrency: 'USD',
      defaultPaymentTerms: ENTERPRISE_INV_TERMS,
      taxProfile: null,
    },
    {
      code: 'LIB_INV_04',
      name: 'SaaS Subscription',
      templateType: 'general',
      layoutPreset: 4,
      numberPrefix: 'INS',
      themeStyle: 'saas',
      defaultCurrency: 'USD',
      defaultPaymentTerms: SAAS_INV_TERMS,
      taxProfile: null,
    },
    {
      code: 'LIB_INV_05',
      name: 'Agency Retainer',
      templateType: 'general',
      layoutPreset: 5,
      numberPrefix: 'INA',
      themeStyle: 'agency',
      defaultCurrency: 'USD',
      defaultPaymentTerms: AGENCY_INV_TERMS,
      taxProfile: null,
    },
    {
      code: 'LIB_INV_06',
      name: 'Retail & POS',
      templateType: 'general',
      layoutPreset: 6,
      numberPrefix: 'INR',
      themeStyle: 'retail',
      defaultCurrency: 'USD',
      defaultPaymentTerms: RETAIL_INV_TERMS,
      taxProfile: null,
    },
    {
      code: 'LIB_INV_07',
      name: 'EU VAT Standard',
      templateType: 'vat',
      layoutPreset: 7,
      numberPrefix: 'INT',
      themeStyle: 'eu-vat',
      defaultCurrency: 'EUR',
      defaultPaymentTerms: VAT_INV_TERMS,
      taxProfile: { regime: 'VAT', region: 'EU' },
    },
    {
      code: 'LIB_INV_08',
      name: 'Proforma & Deposit',
      templateType: 'proforma',
      layoutPreset: 8,
      numberPrefix: 'IPF',
      themeStyle: 'proforma',
      defaultCurrency: 'USD',
      defaultPaymentTerms: PROFORMA_TERMS,
      taxProfile: null,
    },
  ]
}

const QT_STATIC = {
  defaultCurrency: 'USD',
  language: 'en',
  status: 'active',
  watermark: 'none',
  sectionSettings: null,
  logoOverrideUrl: null,
  accentOverride: null,
  defaultTermsBlocks: null,
  showDiscount: true,
  showTaxPerLine: true,
  approvalRules: null,
}

const INV_STATIC = {
  nextNumber: 1001,
  autoNumbering: true,
  status: 'active',
  sectionSettings: null,
}

/**
 * Idempotent: inserts library rows per workspace when missing (by code).
 * @param {{ workspaceId: string, companyId: string }} scope
 * @param {{ transaction?: import('sequelize').Transaction }} [opts]
 */
export async function ensureLibrarySalesDocTemplates(scope, opts = {}) {
  const { workspaceId, companyId } = scope
  const { transaction } = opts

  for (const spec of quotationLibraryDefaults()) {
    await QuotationTemplate.findOrCreate({
      where: { workspaceId, companyId, code: spec.code },
      defaults: {
        workspaceId,
        companyId,
        ...QT_STATIC,
        ...spec,
      },
      transaction,
    })
  }

  for (const spec of invoiceLibraryDefaults()) {
    await InvoiceTemplate.findOrCreate({
      where: { workspaceId, companyId, code: spec.code },
      defaults: {
        workspaceId,
        companyId,
        ...INV_STATIC,
        ...spec,
      },
      transaction,
    })
  }
}

/**
 * Raw SQL seed for Sequelize migrations (no model import cycle).
 * @param {import('sequelize').QueryInterface} queryInterface
 */
export async function seedLibraryTemplatesAllWorkspaces(queryInterface) {
  const tables = await queryInterface.showAllTables()
  const tQ = 'quotation_templates'
  const tI = 'invoice_templates'
  if (!tables.includes(tQ) || !tables.includes(tI)) return

  const [workspaces] = await queryInterface.sequelize.query(`
    SELECT id, company_id AS companyId
    FROM workspaces
    WHERE id IS NOT NULL AND company_id IS NOT NULL
  `)

  const now = new Date()

  for (const ws of workspaces) {
    const workspaceId = ws.id
    const companyId = ws.companyId

    for (const spec of quotationLibraryDefaults()) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO quotation_templates (
          id, workspace_id, company_id, name, code, category,
          default_currency, language, status, default_tax_type, default_validity_days,
          default_payment_terms, watermark, theme_color, font_family, layout_preset,
          section_settings, logo_override_url, accent_override, default_terms_blocks, default_notes,
          show_sku, show_hsn, show_discount, show_tax_per_line, approval_rules,
          created_at, updated_at
        )
        SELECT UUID(), :workspaceId, :companyId, :name, :code, :category,
          :defaultCurrency, :language, :status, :defaultTaxType, :defaultValidityDays,
          :defaultPaymentTerms, :watermark, :themeColor, :fontFamily, :layoutPreset,
          NULL, NULL, NULL, NULL, :defaultNotes,
          :showSku, :showHsn, 1, 1, NULL,
          :now, :now
        FROM (SELECT 1 AS _s) AS _seed
        WHERE NOT EXISTS (
          SELECT 1 FROM quotation_templates q
          WHERE q.workspace_id = :workspaceId AND q.code = :code
        )
      `,
        {
          replacements: {
            workspaceId,
            companyId,
            name: spec.name,
            code: spec.code,
            category: spec.category,
            defaultCurrency: QT_STATIC.defaultCurrency,
            language: QT_STATIC.language,
            status: QT_STATIC.status,
            defaultTaxType: spec.defaultTaxType,
            defaultValidityDays: spec.defaultValidityDays,
            defaultPaymentTerms: spec.defaultPaymentTerms,
            watermark: spec.watermark,
            themeColor: spec.themeColor,
            fontFamily: spec.fontFamily,
            layoutPreset: spec.layoutPreset,
            defaultNotes: spec.defaultNotes,
            showSku: spec.showSku ? 1 : 0,
            showHsn: spec.showHsn ? 1 : 0,
            now,
          },
        },
      )
    }

    for (const spec of invoiceLibraryDefaults()) {
      const taxJson = spec.taxProfile ? JSON.stringify(spec.taxProfile) : null
      await queryInterface.sequelize.query(
        `
        INSERT INTO invoice_templates (
          id, workspace_id, company_id, name, code, template_type,
          number_prefix, next_number, default_currency, layout_preset, theme_style,
          auto_numbering, default_payment_terms, section_settings, tax_profile, status,
          created_at, updated_at
        )
        SELECT UUID(), :workspaceId, :companyId, :name, :code, :templateType,
          :numberPrefix, :nextNumber, :defaultCurrency, :layoutPreset, :themeStyle,
          1, :defaultPaymentTerms, NULL, :taxProfile, :status,
          :now, :now
        FROM (SELECT 1 AS _s) AS _seed
        WHERE NOT EXISTS (
          SELECT 1 FROM invoice_templates i
          WHERE i.workspace_id = :workspaceId AND i.code = :code
        )
      `,
        {
          replacements: {
            workspaceId,
            companyId,
            name: spec.name,
            code: spec.code,
            templateType: spec.templateType,
            numberPrefix: spec.numberPrefix,
            nextNumber: INV_STATIC.nextNumber,
            defaultCurrency: spec.defaultCurrency,
            layoutPreset: spec.layoutPreset,
            themeStyle: spec.themeStyle,
            defaultPaymentTerms: spec.defaultPaymentTerms,
            taxProfile: taxJson,
            status: INV_STATIC.status,
            now,
          },
        },
      )
    }
  }
}
