import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { rateLimit } from '../../middleware/rateLimit.js'
import { requireAuth } from '../../middleware/auth.js'
import { requireCompany } from '../../middleware/requireCompany.js'
import { requirePermission } from '../../middleware/requirePermission.js'
import { loadPermissions } from '../../middleware/loadPermissions.js'
import * as authController from '../../controllers/authController.js'
import * as analyticsController from '../../controllers/analyticsController.js'
import * as analyticsReportsExtended from '../../controllers/analyticsReportsExtended.js'
import { requireAnalyticsView, requireAnalyticsAdmin } from '../../middleware/requireAnalyticsView.js'
import * as leadsController from '../../controllers/leadsController.js'
import * as activitiesController from '../../controllers/activitiesController.js'
import * as companyController from '../../controllers/companyController.js'
import * as workspaceController from '../../controllers/workspaceController.js'
import * as teamController from '../../controllers/teamController.js'
import * as opportunitiesController from '../../controllers/opportunitiesController.js'
import * as dealsController from '../../controllers/dealsController.js'
import * as dealPaymentsController from '../../controllers/dealPaymentsController.js'
import * as calendarController from '../../controllers/calendarController.js'
import * as remindersController from '../../controllers/remindersController.js'
import * as campaignsController from '../../controllers/campaignsController.js'
import * as workflowsController from '../../controllers/workflowsController.js'
import * as templatesController from '../../controllers/templatesController.js'
import * as billingProfileController from '../../controllers/billingProfileController.js'
import * as quotationsController from '../../controllers/quotationsController.js'
import * as quotationTemplatesController from '../../controllers/quotationTemplatesController.js'
import * as invoicesController from '../../controllers/invoicesController.js'
import * as invoiceTemplatesController from '../../controllers/invoiceTemplatesController.js'
import * as emailTrackingController from '../../controllers/emailTrackingController.js'
import * as emailReportsController from '../../controllers/emailReportsController.js'
import documentsRoutes from './documents.js'
import webFormsRoutes from '../webFormsRoutes.js'
import * as googleController from '../../controllers/googleController.js'
import * as mailboxController from '../../controllers/mailboxController.js'
import * as attendanceController from '../../controllers/attendanceController.js'
import * as leaveController from '../../controllers/leaveController.js'
import * as duplicateLeadsController from '../../controllers/duplicateLeadsController.js'
import * as callController from '../../controllers/callController.js'
import * as notificationSettingsController from '../../controllers/notificationSettingsController.js'
import { handleGmailPubSubPushHttp } from '../../services/gmail/gmailPushService.js'
import meetingRoutes from '../meetingRoutes.js'
import transcriptionRoutes from '../transcriptionRoutes.js'
import aiMeetingRoutes from '../aiMeetingRoutes.js'

const router = Router()
const emailUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 24 * 1024 * 1024, files: 12 } })

const leaveUploadDir = path.resolve(process.cwd(), 'uploads', 'leave')
mkdirSync(leaveUploadDir, { recursive: true })
const leaveUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, leaveUploadDir),
    filename: (_req, file, cb) => {
      const safe = String(file.originalname || 'document').replace(/[^\w.\-]+/g, '_')
      cb(null, `${Date.now()}_${safe}`)
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
})

const authLimiter = rateLimit({ routeKey: 'auth', windowSec: 60, max: 30 })
const apiLimiter = rateLimit({ routeKey: 'api', windowSec: 60, max: 200 })

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' }, meta: {} })
})

/** Gmail API → Pub/Sub push (OIDC). Configure topic + subscription in GCP; see GMAIL_PUBSUB_* env vars. */
router.post('/webhooks/gmail-pubsub', (req, res, next) => {
  handleGmailPubSubPushHttp(req, res).catch(next)
})

/** Browser OAuth redirect — must stay public (no Authorization header on redirect). */
router.get('/google/callback', apiLimiter, googleController.googleCallback)

router.use('/meetings', requireAuth, requireCompany, meetingRoutes)

router.use(
  '/transcription',
  requireAuth,
  requireCompany,
  transcriptionRoutes
)

router.use(
  '/ai-meetings',
  requireAuth,
  requireCompany,
  aiMeetingRoutes
)



router.post('/auth/register', authLimiter, authController.register)
router.post('/auth/verify-email', authLimiter, authController.verifyEmail)
router.post('/auth/resend-verification', authLimiter, authController.resendVerification)
router.post('/auth/login', authLimiter, authController.login)
router.post('/auth/refresh', authLimiter, authController.refresh)
router.post('/auth/forgot-password', authLimiter, authController.forgotPassword)
router.post('/auth/reset-password', authLimiter, authController.resetPassword)
router.post('/auth/logout', requireAuth, authLimiter, authController.logout)
router.post('/auth/invitations/accept', authLimiter, teamController.acceptInvitation)
router.post('/auth/sso/google', authLimiter, teamController.googleSsoPlaceholder)
router.get('/auth/me', requireAuth, apiLimiter, authController.me)
router.patch('/company/me', requireAuth, apiLimiter, companyController.patchMyCompany)

router.get(
  '/settings/notification-emails',
  requireAuth,
  apiLimiter,
  requireCompany,
  notificationSettingsController.getNotificationEmailSettings,
)
router.patch(
  '/settings/notification-emails',
  requireAuth,
  apiLimiter,
  requireCompany,
  notificationSettingsController.patchNotificationEmailSettings,
)
router.get(
  '/settings/notification-emails/history',
  requireAuth,
  apiLimiter,
  requireCompany,
  notificationSettingsController.listNotificationDeliveryHistory,
)

router.get('/workspaces', requireAuth, apiLimiter, workspaceController.listWorkspaces)
router.post('/workspaces', requireAuth, apiLimiter, workspaceController.createWorkspace)
router.patch('/workspaces/:id', requireAuth, apiLimiter, workspaceController.patchWorkspace)
router.delete('/workspaces/:id', requireAuth, apiLimiter, workspaceController.deleteWorkspace)

router.get('/analytics/dashboard', requireAuth, apiLimiter, requireCompany, analyticsController.dashboardStats)
router.get('/analytics/nav-badges', requireAuth, apiLimiter, requireCompany, analyticsController.navBadges)
router.get('/analytics/dashboard-charts', requireAuth, apiLimiter, requireCompany, analyticsController.dashboardCharts)
router.get('/analytics/leads-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsController.leadsReport)
router.get('/analytics/pipeline-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsController.pipelineReport)
router.get('/analytics/activities-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsController.activitiesReport)
router.get('/analytics/meetings-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsController.meetingsReport)
router.get('/analytics/tasks-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsController.tasksReport)
router.get('/analytics/team-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsController.teamReport)
router.get('/analytics/deals-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsController.dealsReport)
router.get('/analytics/opportunities-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsReportsExtended.opportunitiesReport)
router.get('/analytics/followups-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsReportsExtended.followupsReport)
router.get('/analytics/sales-docs-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsReportsExtended.salesDocsReport)
router.get('/analytics/payments-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsReportsExtended.paymentsReport)
router.get('/analytics/leave-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsReportsExtended.leaveReport)
router.get('/analytics/employee-monthly-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsReportsExtended.employeeMonthlyReport)
router.get('/analytics/data-health-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsAdmin, analyticsReportsExtended.dataHealthReport)
router.get('/analytics/campaigns-report', requireAuth, apiLimiter, requireCompany, requireAnalyticsView, analyticsReportsExtended.campaignsReport)

router.get(
  '/billing-profile',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  billingProfileController.getBillingProfile,
)
router.patch(
  '/billing-profile',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  billingProfileController.patchBillingProfile,
)

router.get(
  '/quotations/templates',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  quotationTemplatesController.listQuotationTemplates,
)
router.post(
  '/quotations/templates',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  quotationTemplatesController.createQuotationTemplate,
)
router.get(
  '/quotations/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  quotationTemplatesController.getQuotationTemplate,
)
router.patch(
  '/quotations/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  quotationTemplatesController.patchQuotationTemplate,
)
router.delete(
  '/quotations/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  quotationTemplatesController.deleteQuotationTemplate,
)

router.post(
  '/quotations/:id/convert-to-invoice',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  quotationsController.convertQuotationToInvoice,
)
router.get(
  '/quotations',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  quotationsController.listQuotations,
)
router.post(
  '/quotations',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  quotationsController.createQuotation,
)
router.get(
  '/quotations/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  quotationsController.getQuotation,
)
router.patch(
  '/quotations/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  quotationsController.patchQuotation,
)
router.delete(
  '/quotations/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  quotationsController.deleteQuotation,
)

router.get(
  '/invoices/templates',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  invoiceTemplatesController.listInvoiceTemplates,
)
router.post(
  '/invoices/templates',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  invoiceTemplatesController.createInvoiceTemplate,
)
router.get(
  '/invoices/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  invoiceTemplatesController.getInvoiceTemplate,
)
router.patch(
  '/invoices/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  invoiceTemplatesController.patchInvoiceTemplate,
)
router.delete(
  '/invoices/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  invoiceTemplatesController.deleteInvoiceTemplate,
)

router.post(
  '/invoices/:id/payments',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  invoicesController.recordInvoicePayment,
)
router.get(
  '/invoices',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  invoicesController.listInvoices,
)
router.post(
  '/invoices',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  invoicesController.createInvoice,
)
router.get(
  '/invoices/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  invoicesController.getInvoice,
)
router.patch(
  '/invoices/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  invoicesController.patchInvoice,
)
router.delete(
  '/invoices/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  invoicesController.deleteInvoice,
)

router.get('/activities/book/:token', apiLimiter, activitiesController.getBookingLinkInfo)
router.post('/activities/book/:token', apiLimiter, activitiesController.confirmBooking)
router.get('/activities', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), activitiesController.listActivities)
router.post('/activities', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), activitiesController.createActivity)
router.get('/calls', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), callController.getCalls)
router.post('/calls', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), callController.createCall)
router.get('/calls/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), callController.getCallById)
router.patch('/calls/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), callController.updateCall)
router.delete('/calls/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), callController.deleteCall)
router.get('/activities/types', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), activitiesController.listActivityTypes)
router.post('/activities/types', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), activitiesController.createActivityType)
router.patch('/activities/types/:typeId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), activitiesController.patchActivityType)
router.delete('/activities/types/:typeId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), activitiesController.deleteActivityType)
router.post('/activities/booking-link', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), activitiesController.createBookingLink)
router.get('/activities/reminders/upcoming', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), activitiesController.listUpcomingReminders)
router.post('/activities/:activityId/reminders', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), activitiesController.createReminder)

router.get('/leads/duplicates', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), duplicateLeadsController.list)
router.delete('/leads/duplicates/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), duplicateLeadsController.remove)
router.post('/leads/duplicates/:id/create', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), duplicateLeadsController.createAsLead)
router.post('/leads/duplicates/:id/merge', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), duplicateLeadsController.merge)

router.get(
  '/leads',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  leadsController.list,
)
router.get('/leads/analytics/source', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.sourceAnalytics)
router.get('/leads/form-meta', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.formMeta)
router.get('/leads/saved-views', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.listSavedViews)
router.post('/leads/saved-views', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.createSavedView)
router.delete('/leads/saved-views/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.deleteSavedView)
router.get('/leads/assignment-rules', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.listAssignmentRules)
router.post('/leads/assignment-rules', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.createAssignmentRule)
router.patch('/leads/assignment-rules/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.patchAssignmentRule)
router.delete('/leads/assignment-rules/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.deleteAssignmentRule)
router.get('/leads/custom-fields', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.listCustomFields)
router.post('/leads/custom-fields', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.createCustomField)
router.patch('/leads/custom-fields/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.patchCustomField)
router.delete('/leads/custom-fields/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.deleteCustomField)
router.post('/leads/import', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.importRows)
router.post('/leads/export', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.exportRows)
router.get('/leads/setup', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.getLeadSetup)
router.post('/leads/setup/sources', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.createLeadSource)
router.patch('/leads/setup/sources/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.patchLeadSource)
router.delete('/leads/setup/sources/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.deleteLeadSource)
router.post('/leads/setup/tags', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.createLeadTag)
router.patch('/leads/setup/tags/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.patchLeadTag)
router.delete('/leads/setup/tags/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.deleteLeadTag)
router.post('/leads/setup/opportunity-stages', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.createOpportunityStage)
router.patch('/leads/setup/opportunity-stages/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.patchOpportunityStage)
router.delete('/leads/setup/opportunity-stages/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.deleteOpportunityStage)
router.post('/leads/setup/opportunity-stages/reorder', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.reorderOpportunityStages)
router.post('/leads/setup/deal-statuses', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.createDealStatus)
router.patch('/leads/setup/deal-statuses/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.patchDealStatus)
router.delete('/leads/setup/deal-statuses/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.deleteDealStatus)
router.post('/leads/setup/deal-statuses/reorder', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.reorderDealStatuses)
router.post('/leads/setup/opportunity-statuses', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.createOpportunityStatus)
router.patch('/leads/setup/opportunity-statuses/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.updateOpportunityStatus)
router.delete('/leads/setup/opportunity-statuses/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.deleteOpportunityStatus)
router.post('/leads/setup/opportunity-statuses/reorder', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.reorderOpportunityStatuses)
router.post('/leads/bulk', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.bulk)
router.post('/leads/resolve-by-ids', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.resolveByIds)
router.post(
  '/leads/distribute-round-robin',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  leadsController.distributeRoundRobin,
)
router.get('/leads/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.getOne)
router.post('/leads', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.create)
router.put('/leads/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.update)
router.patch('/leads/:id/status', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.patchStatus)
router.delete('/leads/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'delete'), leadsController.remove)
router.get('/leads/:id/activities', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.listActivities)
router.post('/leads/:id/activities', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.createActivity)
router.patch('/leads/:id/activities/:activityId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.patchActivity)
router.delete('/leads/:id/activities/:activityId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.deleteActivity)
router.get('/leads/:id/notes', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.listNotes)
router.post('/leads/:id/notes', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.createNote)
router.patch('/leads/:id/notes/:noteId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.patchNote)
router.delete('/leads/:id/notes/:noteId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.deleteNote)
router.get('/leads/email/google/status', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.getGoogleEmailAuthStatus)
router.get('/leads/email/google/connect-url', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.getGoogleEmailConnectUrl)
router.get('/leads/email/google/callback', apiLimiter, leadsController.connectGoogleEmailCallback)
router.get('/leads/:id/emails', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.listLeadEmails)
router.get('/leads/:id/email-threads', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.listLeadEmailThreads)
router.get('/leads/:id/email-threads/:threadId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.getLeadEmailThread)
router.post('/leads/:id/emails/send', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.sendLeadEmail)
router.post('/leads/:id/emails/sync', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.syncLeadEmailReplies)
router.get('/email/threads', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.listEmailThreads)
router.get('/email/threads/:threadId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.getEmailThread)
router.get('/email/mailbox-badge', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), mailboxController.getMailboxInboxBadge)
router.get('/email/mailbox-threads', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), mailboxController.listMailboxThreads)
router.get('/email/mailbox-threads/:threadId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), mailboxController.getMailboxThread)
router.post(
  '/email/mailbox-threads/:threadId/read',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  mailboxController.markMailboxThreadRead,
)
router.get(
  '/email/mailbox-attachments/:messageId/:attachmentId',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  mailboxController.downloadMailboxAttachment,
)
router.post(
  '/email/mailbox-save-attachment',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('documents', 'edit'),
  mailboxController.saveMailboxAttachmentToLead,
)
router.post('/email/sync', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.syncEmailReplies)
router.post('/email/attachments', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), emailUpload.array('files', 10), leadsController.uploadEmailAttachments)
router.get('/leads/:id/tasks', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.listTasks)
router.get('/tasks', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.listAllTasks)
router.patch('/tasks/:taskId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.patchTaskById)
router.get('/opportunities', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), opportunitiesController.list)
router.get('/opportunities/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), opportunitiesController.getOne)
router.post('/opportunities', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), opportunitiesController.create)
router.put('/opportunities/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), opportunitiesController.update)
router.patch('/opportunities/:id/stage', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), opportunitiesController.patchStage)
router.delete('/opportunities/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), opportunitiesController.remove)
router.get('/deals', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), dealsController.list)
router.get('/deals/payments', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), dealPaymentsController.listAll)
router.post('/deals', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), dealsController.create)
router.get('/deals/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), dealsController.getOne)
router.patch('/deals/:id/stage', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), dealsController.patchStage)
router.delete('/deals/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), dealsController.remove)
router.get('/deals/:id/activities', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), dealsController.listActivities)
router.post('/deals/:id/activities', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), dealsController.createActivity)
router.get('/deals/:id/payments', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), dealPaymentsController.listForDeal)
router.post('/deals/:id/payments', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), dealPaymentsController.create)
router.patch('/deals/:id/payments/:paymentId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), dealPaymentsController.patch)
router.delete('/deals/:id/payments/:paymentId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), dealPaymentsController.remove)
router.post('/leads/:id/tasks', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.createTask)
router.patch('/leads/:id/tasks/:taskId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.patchTask)
router.post(
  '/leads/:id/tasks/:taskId/comments',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  leadsController.addTaskComment,
)
router.get(
  '/leads/:id/tasks/:taskId/timeline',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  leadsController.getTaskTimeline,
)
router.delete('/leads/:id/tasks/:taskId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.deleteTask)
router.get('/leads/:id/followups', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.listFollowups)
router.post('/leads/:id/followups', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.createFollowup)
router.patch('/leads/:id/followups/:followupId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.patchFollowup)
router.delete('/leads/:id/followups/:followupId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.deleteFollowup)
router.get('/leads/:id/files', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.listFiles)
router.post('/leads/:id/files', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.createFile)
router.use(
  '/documents',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('documents', 'view'),
  documentsRoutes,
)
router.use(
  '/forms',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  webFormsRoutes,
)

router.get(
  '/team/roles',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'view'),
  teamController.listRoles,
)
router.get(
  '/team/menus',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.listMenuMaster,
)
router.post(
  '/team/roles',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.createCompanyRole,
)
router.patch(
  '/team/roles/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.patchCompanyRole,
)
router.delete(
  '/team/roles/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.deleteCompanyRole,
)
router.get(
  '/team/permissions',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings', 'admin'),
  teamController.getPermissionMatrix,
)
router.get(
  '/team/invitations',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'view'),
  teamController.listInvitations,
)
router.post(
  '/team/invitations',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'edit'),
  teamController.createInvitation,
)
router.delete(
  '/team/invitations/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'edit'),
  teamController.cancelInvitation,
)
router.get(
  '/team/users',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'view'),
  teamController.listCompanyUsers,
)
router.get(
  '/team/users/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'view'),
  teamController.getCompanyUser,
)
router.patch(
  '/team/users/:id/role',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.patchUserRole,
)
router.patch(
  '/team/users/:id/profile',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.patchUserProfile,
)
router.get(
  '/team/users/:id/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'view'),
  teamController.getUserWorkspaces,
)
router.put(
  '/team/users/:id/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.replaceUserWorkspaces,
)
router.post(
  '/team/users/:id/deactivate',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.deactivateUser,
)
router.post(
  '/team/users/:id/reactivate',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.reactivateUser,
)
router.post(
  '/team/users/:id/reassign-leads',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.reassignUserLeads,
)
router.get(
  '/team/teams',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'view'),
  teamController.listTeams,
)
router.post(
  '/team/teams',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'edit'),
  teamController.createTeam,
)
router.patch(
  '/team/teams/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'edit'),
  teamController.patchTeam,
)
router.delete(
  '/team/teams/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.deleteTeam,
)
router.post(
  '/team/teams/:id/members',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'edit'),
  teamController.addTeamMember,
)
router.delete(
  '/team/teams/:id/members/:userId',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'edit'),
  teamController.removeTeamMember,
)

// Calendar & Reminders routes
router.get(
  '/calendar/events',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  calendarController.listEvents,
)
router.get(
  '/calendar/today',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  calendarController.getDayDigest,
)
router.get(
  '/reminders',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  remindersController.listReminders,
)
router.post(
  '/reminders',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  remindersController.createReminder,
)
router.patch(
  '/reminders/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  remindersController.patchReminder,
)
router.delete(
  '/reminders/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  remindersController.deleteReminder,
)

router.get(
  '/campaigns',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('campaigns', 'view'),
  campaignsController.list,
)
router.post(
  '/campaigns',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('campaigns', 'edit'),
  campaignsController.create,
)
router.get(
  '/campaigns/:id/leads',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('campaigns', 'view'),
  campaignsController.listLeads,
)
router.patch(
  '/campaigns/:id/leads/:leadId/stage',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('campaigns', 'edit'),
  campaignsController.patchLeadStage,
)
router.get(
  '/campaigns/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('campaigns', 'view'),
  campaignsController.getOne,
)
router.patch(
  '/campaigns/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('campaigns', 'edit'),
  campaignsController.patchCampaign,
)
router.delete(
  '/campaigns/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('campaigns', 'edit'),
  campaignsController.remove,
)
router.post(
  '/campaigns/:id/leads',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('campaigns', 'edit'),
  campaignsController.addLeads,
)
router.delete(
  '/campaigns/:id/leads/:leadId',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('campaigns', 'edit'),
  campaignsController.removeLead,
)
router.post(
  '/campaigns/:id/members',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('campaigns', 'edit'),
  campaignsController.addMembers,
)
router.delete(
  '/campaigns/:id/members/:userId',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('campaigns', 'edit'),
  campaignsController.removeMember,
)
router.post(
  '/campaigns/:id/distribute',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('campaigns', 'edit'),
  campaignsController.distributeLeads,
)

router.get(
  '/workflows',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  workflowsController.list,
)
router.post(
  '/workflows',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  workflowsController.create,
)
router.get(
  '/workflows/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  workflowsController.getOne,
)
router.patch(
  '/workflows/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  workflowsController.patch,
)
router.delete(
  '/workflows/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  workflowsController.remove,
)
router.post(
  '/workflows/:id/publish',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  workflowsController.publish,
)
router.post(
  '/workflows/:id/test',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  workflowsController.testRun,
)
router.get(
  '/workflows/:id/runs',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  workflowsController.listRuns,
)
router.get(
  '/workflow-runs/:runId',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  workflowsController.getRun,
)

router.post(
  '/templates',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  templatesController.createTemplate,
)
router.get(
  '/templates',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  templatesController.getTemplateListWithStats,
)
router.get(
  '/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  templatesController.getTemplate,
)
router.put(
  '/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  templatesController.updateTemplate,
)
router.delete(
  '/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  templatesController.archiveTemplate,
)
router.post(
  '/templates/:id/preview-send',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  templatesController.previewSend,
)
router.post(
  '/templates/generate-content',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  templatesController.generateTemplateContent,
)
router.post(
  '/templates/:id/send',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'edit'),
  templatesController.sendTemplate,
)
router.get(
  '/templates/:id/send-history',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  templatesController.templateSendHistory,
)
router.get(
  '/leads/:id/email-history',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('leads', 'view'),
  templatesController.leadEmailHistory,
)

// —— HR: Attendance ——
router.get('/attendance/today', requireAuth, apiLimiter, requireCompany, attendanceController.getTodayStatus)
router.post('/attendance/check-in', requireAuth, apiLimiter, requireCompany, attendanceController.checkIn)
router.post('/attendance/check-out', requireAuth, apiLimiter, requireCompany, attendanceController.checkOut)
router.get('/attendance/me', requireAuth, apiLimiter, requireCompany, attendanceController.getMyAttendance)
router.get('/attendance/team', requireAuth, apiLimiter, requireCompany, attendanceController.getTeamAttendance)
router.get('/attendance/day/:date', requireAuth, apiLimiter, requireCompany, attendanceController.getDayDetail)
router.get('/attendance/export', requireAuth, apiLimiter, requireCompany, attendanceController.exportAttendanceCsv)
router.post('/attendance/logs', requireAuth, apiLimiter, requireCompany, attendanceController.createAttendanceLog)
router.put('/attendance/logs/:id', requireAuth, apiLimiter, requireCompany, attendanceController.editAttendanceLog)

// —— HR: Leave ——
router.get('/leave/types', requireAuth, apiLimiter, requireCompany, leaveController.getLeaveTypes)
router.post('/leave/types', requireAuth, apiLimiter, requireCompany, leaveController.createLeaveType)
router.put('/leave/types/:id', requireAuth, apiLimiter, requireCompany, leaveController.updateLeaveType)
router.delete('/leave/types/:id', requireAuth, apiLimiter, requireCompany, leaveController.deleteLeaveType)
router.get('/leave/balance/me', requireAuth, apiLimiter, requireCompany, leaveController.getMyLeaveBalance)
router.get('/leave/balance/:userId', requireAuth, apiLimiter, requireCompany, leaveController.getUserLeaveBalance)
router.post('/leave/balance/adjust', requireAuth, apiLimiter, requireCompany, leaveController.adjustLeaveBalance)
router.get('/leave/preview-days', requireAuth, apiLimiter, requireCompany, leaveController.previewLeaveDays)
router.get('/leave/settings', requireAuth, apiLimiter, requireCompany, leaveController.getLeaveSettings)
router.put('/leave/settings', requireAuth, apiLimiter, requireCompany, leaveController.updateLeaveSettings)
router.post('/leave/requests', requireAuth, apiLimiter, requireCompany, leaveUpload.single('document'), leaveController.applyLeave)
router.get('/leave/requests/me', requireAuth, apiLimiter, requireCompany, leaveController.getMyLeaves)
router.get('/leave/requests/all', requireAuth, apiLimiter, requireCompany, leaveController.getAllLeaves)
router.post('/leave/requests/bulk-approve', requireAuth, apiLimiter, requireCompany, leaveController.bulkApproveLeaves)
router.post('/leave/requests/:id/approve', requireAuth, apiLimiter, requireCompany, leaveController.approveLeave)
router.post('/leave/requests/:id/reject', requireAuth, apiLimiter, requireCompany, leaveController.rejectLeave)
router.post('/leave/requests/:id/cancel', requireAuth, apiLimiter, requireCompany, leaveController.cancelLeave)
router.get('/leave/calendar', requireAuth, apiLimiter, requireCompany, leaveController.getTeamLeaveCalendar)
router.get('/leave/holidays', requireAuth, apiLimiter, requireCompany, leaveController.getPublicHolidays)
router.post('/leave/holidays', requireAuth, apiLimiter, requireCompany, leaveController.createHoliday)
router.put('/leave/holidays/:id', requireAuth, apiLimiter, requireCompany, leaveController.updateHoliday)
router.delete('/leave/holidays/:id', requireAuth, apiLimiter, requireCompany, leaveController.deleteHoliday)

// —— HR: Notifications ——
router.get('/notifications', requireAuth, apiLimiter, requireCompany, leaveController.getNotifications)
router.patch('/notifications/:id/read', requireAuth, apiLimiter, requireCompany, leaveController.markNotificationRead)
router.post('/notifications/mark-all-read', requireAuth, apiLimiter, requireCompany, leaveController.markAllNotificationsRead)

router.get('/track/open', emailTrackingController.trackOpen)
router.get('/track/click', emailTrackingController.trackClick)
router.get('/unsubscribe', emailTrackingController.unsubscribe)
router.get('/email/tracking/reports', requireAuth, apiLimiter, requireCompany, emailReportsController.getEmailTrackingReport)

router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
})

export default router
