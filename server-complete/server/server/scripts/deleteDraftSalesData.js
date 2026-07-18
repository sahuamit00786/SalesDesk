/**
 * Purge draft quotations/invoices and optionally all pipeline deals (opportunity leads).
 *
 * Default: dry-run (counts only). Add --execute to apply.
 *
 * Flags:
 *   --execute              Run deletions (required to change DB)
 *   --all-opportunities      Remove EVERY lead with is_opportunity = true (and their quotes/invoices).
 *                            Without this flag, only removes deals whose stage is draft/Draft/DRAFT.
 *
 * Always removes (when --execute): quotations + invoices with status = 'draft' (global).
 *
 * Usage:
 *   npm run db:purge-draft-sales -w server
 *   npm run db:purge-draft-sales -w server -- --execute --all-opportunities
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const { sequelize } = await import('../src/config/db.js')
const { Op } = await import('sequelize')
const { Invoice, InvoiceItem, InvoicePayment, Quotation, QuotationItem, Lead } = await import('../src/models/index.js')

const dryRun = !process.argv.includes('--execute')
const allOpportunities = process.argv.includes('--all-opportunities')

/** Hard-delete all invoices (any status) for these leads: payments, items, rows. */
async function deleteInvoicesForLeads(leadIds, transaction) {
  if (!leadIds.length) return
  const invoices = await Invoice.findAll({
    where: { leadId: { [Op.in]: leadIds } },
    attributes: ['id'],
    transaction,
  })
  const invoiceIds = invoices.map((r) => r.id)
  if (!invoiceIds.length) return
  await Quotation.update(
    { convertedInvoiceId: null },
    { where: { convertedInvoiceId: { [Op.in]: invoiceIds } }, transaction },
  )
  await InvoicePayment.destroy({ where: { invoiceId: { [Op.in]: invoiceIds } }, transaction })
  await InvoiceItem.destroy({ where: { invoiceId: { [Op.in]: invoiceIds } }, transaction })
  await Invoice.destroy({ where: { id: { [Op.in]: invoiceIds } }, transaction })
}

/** Hard-delete all quotations (any status) for these leads. */
async function deleteQuotationsForLeads(leadIds, transaction) {
  if (!leadIds.length) return
  const quotes = await Quotation.findAll({
    where: { leadId: { [Op.in]: leadIds } },
    attributes: ['id'],
    transaction,
  })
  const quotationIds = quotes.map((r) => r.id)
  if (!quotationIds.length) return
  await Invoice.update(
    { quotationId: null },
    { where: { quotationId: { [Op.in]: quotationIds } }, transaction },
  )
  await QuotationItem.destroy({ where: { quotationId: { [Op.in]: quotationIds } }, transaction })
  await Quotation.destroy({ where: { id: { [Op.in]: quotationIds } }, transaction })
}

/** Match app lead delete: is_deleted then paranoid destroy. */
async function softDeleteLeads(leadIds, transaction) {
  if (!leadIds.length) return
  await Lead.update({ isDeleted: true }, { where: { id: { [Op.in]: leadIds } }, transaction })
  await Lead.destroy({ where: { id: { [Op.in]: leadIds } }, transaction })
}

async function main() {
  const draftInvoices = await Invoice.findAll({
    where: { status: 'draft' },
    attributes: ['id'],
  })
  const draftQuotations = await Quotation.findAll({
    where: { status: 'draft' },
    attributes: ['id'],
  })
  const draftStageDeals = await Lead.findAll({
    where: {
      isOpportunity: true,
      isDeleted: false,
      opportunityStage: { [Op.in]: ['draft', 'Draft', 'DRAFT'] },
    },
    attributes: ['id', 'opportunityStage'],
  })
  const allOppLeads = await Lead.findAll({
    where: { isOpportunity: true, isDeleted: false },
    attributes: ['id'],
  })

  const dealIdsToRemove = allOpportunities ? allOppLeads.map((l) => l.id) : draftStageDeals.map((l) => l.id)

  console.log('[purge-draft-sales] Counts:')
  console.log(`  Draft invoices (global): ${draftInvoices.length}`)
  console.log(`  Draft quotations (global): ${draftQuotations.length}`)
  console.log(`  All pipeline deals (is_opportunity, not deleted): ${allOppLeads.length}`)
  if (!allOpportunities) {
    console.log(`  Deals only in draft/Draft/DRAFT stage (removed if not --all-opportunities): ${draftStageDeals.length}`)
  } else {
    console.log(`  Will remove ALL ${allOppLeads.length} pipeline deal(s) (--all-opportunities).`)
  }

  if (dryRun) {
    console.log('\nDry run only. Re-run with --execute (and --all-opportunities to clear the kanban).\n')
    await sequelize.close()
    process.exit(0)
  }

  const invoiceIds = draftInvoices.map((r) => r.id)
  const quotationIds = draftQuotations.map((r) => r.id)

  const t = await sequelize.transaction()
  try {
    if (invoiceIds.length) {
      await Quotation.update(
        { convertedInvoiceId: null },
        { where: { convertedInvoiceId: { [Op.in]: invoiceIds } }, transaction: t },
      )
      await InvoicePayment.destroy({ where: { invoiceId: { [Op.in]: invoiceIds } }, transaction: t })
      await InvoiceItem.destroy({ where: { invoiceId: { [Op.in]: invoiceIds } }, transaction: t })
      await Invoice.destroy({ where: { id: { [Op.in]: invoiceIds } }, transaction: t })
    }

    if (quotationIds.length) {
      await Invoice.update(
        { quotationId: null },
        { where: { quotationId: { [Op.in]: quotationIds } }, transaction: t },
      )
      await QuotationItem.destroy({ where: { quotationId: { [Op.in]: quotationIds } }, transaction: t })
      await Quotation.destroy({ where: { id: { [Op.in]: quotationIds } }, transaction: t })
    }

    if (dealIdsToRemove.length) {
      await deleteInvoicesForLeads(dealIdsToRemove, t)
      await deleteQuotationsForLeads(dealIdsToRemove, t)
      await softDeleteLeads(dealIdsToRemove, t)
    }

    await t.commit()
    console.log(
      `\nDone: removed draft quotations/invoices; ${allOpportunities ? 'all' : 'draft-stage'} pipeline deals soft-deleted with their quotes/invoices.\n`,
    )
  } catch (err) {
    await t.rollback()
    console.error(err)
    process.exitCode = 1
  } finally {
    await sequelize.close()
  }
}

main()
