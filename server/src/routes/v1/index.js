import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { rateLimit } from '../../middleware/rateLimit.js'
import { requireAuth } from '../../middleware/auth.js'
import { requireCompany } from '../../middleware/requireCompany.js'
import { workspaceContext } from '../../middleware/workspaceContext.js'
import { requirePermission } from '../../middleware/requirePermission.js'
import { loadPermissions } from '../../middleware/loadPermissions.js'
import { requireHrRole } from '../../middleware/requireHrRole.js'
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
import * as campaignPaymentsController from '../../controllers/campaignPaymentsController.js'
import * as workflowsController from '../../controllers/workflowsController.js'
import * as templatesController from '../../controllers/templatesController.js'
import * as billingProfileController from '../../controllers/billingProfileController.js'
import * as quotationsController from '../../controllers/quotationsController.js'
import * as invoicesController from '../../controllers/invoicesController.js'
import * as salesDocTemplatesController from '../../controllers/salesDocTemplatesController.js'
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
import aiMeetingRoutes from '../AiMeetingRoutes.js'
import copilotRoutes from '../copilotRoutes.js'
import { getFilterPresets, createFilterPreset, deleteFilterPreset } from '../../controllers/filterPresetsController.js'
import { getNotifications as getNotificationsV2, markNotificationRead as markNotificationReadV2, markAllRead, getUnreadCount } from '../../controllers/notificationController.js'
import * as auditLogController from '../../controllers/auditLogController.js'
import * as emailSequencesController from '../../controllers/emailSequencesController.js'
import * as scoringRulesController from '../../controllers/scoringRulesController.js'

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
const otpLimiter = rateLimit({ routeKey: 'otp', windowSec: 3600, max: 5 })
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

router.use(
  '/meetings',
  requireAuth,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.meetings', 'view'),
  meetingRoutes,
)

// Authenticated recordings file serve — replaces the former public static /recordings route
router.get('/recordings/:filename', requireAuth, requireCompany, workspaceContext, (req, res) => {
  const { filename } = req.params
  // Prevent path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ success: false, error: 'Invalid filename' })
  }
  const recordingsDir = path.resolve(process.cwd(), 'recordings')
  const filePath = path.join(recordingsDir, filename)
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ success: false, error: 'Recording not found' })
    }
  })
})

router.use(
  '/transcription',
  requireAuth,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.meetings', 'view'),
  transcriptionRoutes
)

router.use(
  '/ai-meetings',
  requireAuth,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.meetings', 'view'),
  aiMeetingRoutes
)

router.use(
  '/copilot',
  requireAuth,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('main.copilot', 'view'),
  copilotRoutes
)



router.post('/auth/register', authLimiter, authController.register)
router.post('/auth/verify-email', otpLimiter, authController.verifyEmail)
router.post('/auth/resend-verification', otpLimiter, authController.resendVerification)
router.post('/auth/login', authLimiter, authController.login)
router.post('/auth/refresh', authLimiter, authController.refresh)
router.post('/auth/forgot-password', otpLimiter, authController.forgotPassword)
router.post('/auth/reset-password', otpLimiter, authController.resetPassword)
router.post('/auth/logout', requireAuth, authLimiter, authController.logout)
router.get('/auth/invitations/preview', authLimiter, teamController.previewInvitation)
router.post('/auth/invitations/accept', authLimiter, teamController.acceptInvitation)
router.post('/auth/sso/google', authLimiter, teamController.googleSsoPlaceholder)
router.get('/auth/me', requireAuth, apiLimiter, authController.me)
router.post('/auth/complete-onboarding', requireAuth, apiLimiter, async (req, res) => {
  try {
    await req.user.update({ onboardedAt: new Date() })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
})
router.patch(
  '/company/me',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.workspace', 'update'),
  companyController.patchMyCompany,
)
router.post(
  '/company/me/provision-workspace',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.workspace', 'create'),
  companyController.provisionMyWorkspace,
)

router.get(
  '/settings/notification-emails',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.workspace', 'view'),
  notificationSettingsController.getNotificationEmailSettings,
)
router.patch(
  '/settings/notification-emails',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.workspace', 'update'),
  notificationSettingsController.patchNotificationEmailSettings,
)
router.get(
  '/settings/notification-emails/history',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.workspace', 'view'),
  notificationSettingsController.listNotificationDeliveryHistory,
)

router.get(
  '/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.workspace', 'view'),
  workspaceController.listWorkspaces,
)
router.post(
  '/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.workspace', 'create'),
  workspaceController.createWorkspace,
)
router.patch(
  '/workspaces/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.workspace', 'update'),
  workspaceController.patchWorkspace,
)
router.delete(
  '/workspaces/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.workspace', 'delete'),
  workspaceController.deleteWorkspace,
)

// Analytics/reports tier-gating (requireAnalyticsView/requireAnalyticsAdmin) is a separate,
// parallel axis from the menu-CRUD system (see userRoleKind-based tier checks) — left
// unchanged by this rebuild per the RBAC plan's decision to keep the two axes independent.
router.get('/analytics/dashboard', requireAuth, apiLimiter, requireCompany, workspaceContext, analyticsController.dashboardStats)
router.get('/analytics/nav-badges', requireAuth, apiLimiter, requireCompany, workspaceContext, analyticsController.navBadges)
router.get('/analytics/dashboard-charts', requireAuth, apiLimiter, requireCompany, workspaceContext, analyticsController.dashboardCharts)
router.get('/analytics/leads-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsController.leadsReport)
router.get('/analytics/pipeline-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsController.pipelineReport)
router.get('/analytics/activities-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsController.activitiesReport)
router.get('/analytics/meetings-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsController.meetingsReport)
router.get('/analytics/tasks-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsController.tasksReport)
router.get('/analytics/team-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsController.teamReport)
router.get('/analytics/deals-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsController.dealsReport)
router.get('/analytics/opportunities-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsReportsExtended.opportunitiesReport)
router.get('/analytics/followups-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsReportsExtended.followupsReport)
router.get('/analytics/sales-docs-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsReportsExtended.salesDocsReport)
router.get('/analytics/payments-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsReportsExtended.paymentsReport)
router.get('/analytics/leave-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsReportsExtended.leaveReport)
router.get('/analytics/employee-monthly-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsReportsExtended.employeeMonthlyReport)
router.get('/analytics/data-health-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsAdmin, analyticsReportsExtended.dataHealthReport)
router.get('/analytics/campaigns-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsReportsExtended.campaignsReport)

router.get(
  '/billing-profile',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('settings.billing_profile', 'view'),
  billingProfileController.getBillingProfile,
)
router.patch(
  '/billing-profile',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('settings.billing_profile', 'update'),
  billingProfileController.patchBillingProfile,
)

router.get(
  '/sales-docs/templates',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.quotation_templates', 'view'),
  salesDocTemplatesController.listSalesDocTemplates,
)
router.post(
  '/sales-docs/templates',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.quotation_templates', 'create'),
  salesDocTemplatesController.createSalesDocTemplate,
)
router.get(
  '/sales-docs/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.quotation_templates', 'view'),
  salesDocTemplatesController.getSalesDocTemplate,
)
router.patch(
  '/sales-docs/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.quotation_templates', 'update'),
  salesDocTemplatesController.patchSalesDocTemplate,
)
router.delete(
  '/sales-docs/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.quotation_templates', 'delete'),
  salesDocTemplatesController.deleteSalesDocTemplate,
)

router.post(
  '/quotations/:id/convert-to-invoice',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.quotations', 'update'),
  quotationsController.convertQuotationToInvoice,
)
router.get(
  '/quotations',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.quotations', 'view'),
  quotationsController.listQuotations,
)
router.post(
  '/quotations',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.quotations', 'create'),
  quotationsController.createQuotation,
)
router.get(
  '/quotations/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.quotations', 'view'),
  quotationsController.getQuotation,
)
router.patch(
  '/quotations/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.quotations', 'update'),
  quotationsController.patchQuotation,
)
router.delete(
  '/quotations/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.quotations', 'delete'),
  quotationsController.deleteQuotation,
)

router.post(
  '/invoices/:id/payments',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.invoices', 'update'),
  invoicesController.recordInvoicePayment,
)
router.delete(
  '/invoices/:id/payments/:paymentId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.invoices', 'update'),
  invoicesController.deleteInvoicePayment,
)
router.get(
  '/invoices',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.invoices', 'view'),
  invoicesController.listInvoices,
)
router.post(
  '/invoices',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.invoices', 'create'),
  invoicesController.createInvoice,
)
router.get(
  '/invoices/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.invoices', 'view'),
  invoicesController.getInvoice,
)
router.patch(
  '/invoices/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.invoices', 'update'),
  invoicesController.patchInvoice,
)
router.delete(
  '/invoices/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.invoices', 'delete'),
  invoicesController.deleteInvoice,
)

router.get('/activities/book/:token', apiLimiter, activitiesController.getBookingLinkInfo)
router.post('/activities/book/:token', apiLimiter, activitiesController.confirmBooking)
router.get('/activities', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.activities', 'view'), activitiesController.listActivities)
router.post('/activities', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.activities', 'create'), activitiesController.createActivity)
router.get('/calls', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.meetings', 'view'), callController.getCalls)
router.post('/calls', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.meetings', 'create'), callController.createCall)
router.get('/calls/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.meetings', 'view'), callController.getCallById)
router.patch('/calls/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.meetings', 'update'), callController.updateCall)
router.delete('/calls/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.meetings', 'delete'), callController.deleteCall)
router.post('/calls/:id/convert', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.meetings', 'update'), callController.convertCall)
router.get('/activities/types', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.activities', 'view'), activitiesController.listActivityTypes)
router.post('/activities/types', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.activities', 'admin'), activitiesController.createActivityType)
router.patch('/activities/types/:typeId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.activities', 'admin'), activitiesController.patchActivityType)
router.delete('/activities/types/:typeId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.activities', 'admin'), activitiesController.deleteActivityType)
router.post('/activities/booking-link', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.activities', 'create'), activitiesController.createBookingLink)
router.get('/activities/reminders/upcoming', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.activities', 'view'), activitiesController.listUpcomingReminders)
router.post('/activities/:activityId/reminders', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.activities', 'create'), activitiesController.createReminder)

// Filter presets (saved filter configurations per user/workspace/module) — intentionally
// ungated beyond auth+company: these are personal, per-user presets, not shared company data.
router.get('/filter-presets', requireAuth, apiLimiter, requireCompany, workspaceContext, getFilterPresets)
router.post('/filter-presets', requireAuth, apiLimiter, requireCompany, workspaceContext, createFilterPreset)
router.delete('/filter-presets/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, deleteFilterPreset)

router.get('/leads/duplicates', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), duplicateLeadsController.list)
router.delete('/leads/duplicates/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), duplicateLeadsController.remove)
router.post('/leads/duplicates/:id/create', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'create'), duplicateLeadsController.createAsLead)
router.post('/leads/duplicates/:id/merge', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), duplicateLeadsController.merge)

router.get(
  '/leads',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('main.leads', 'view'),
  leadsController.list,
)
router.get('/leads/analytics/source', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.sourceAnalytics)
router.get('/leads/form-meta', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.formMeta)
router.get('/leads/saved-views', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.listSavedViews)
router.post('/leads/saved-views', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'create'), leadsController.createSavedView)
router.delete('/leads/saved-views/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.deleteSavedView)
router.get('/leads/assignment-rules', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.listAssignmentRules)
router.post('/leads/assignment-rules', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.createAssignmentRule)
router.patch('/leads/assignment-rules/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.patchAssignmentRule)
router.delete('/leads/assignment-rules/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.deleteAssignmentRule)
router.get('/leads/custom-fields', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.listCustomFields)
router.post('/leads/custom-fields', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.createCustomField)
router.post('/leads/custom-fields/reorder', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.reorderCustomFieldsHandler)
router.patch('/leads/custom-fields/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.patchCustomField)
router.delete('/leads/custom-fields/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.deleteCustomField)
router.post('/leads/import', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'create'), leadsController.importRows)
router.post('/leads/export', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.exportRows)
router.get('/leads/setup', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.getLeadSetup)
router.post('/leads/setup/sources', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.createLeadSource)
router.patch('/leads/setup/sources/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.patchLeadSource)
router.delete('/leads/setup/sources/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.deleteLeadSource)
router.post('/leads/setup/tags', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.createLeadTag)
router.patch('/leads/setup/tags/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.patchLeadTag)
router.delete('/leads/setup/tags/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.deleteLeadTag)
router.post('/leads/setup/deal-statuses', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.createDealStatus)
router.patch('/leads/setup/deal-statuses/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.patchDealStatus)
router.delete('/leads/setup/deal-statuses/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.deleteDealStatus)
router.post('/leads/setup/deal-statuses/reorder', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.reorderDealStatuses)
router.post('/leads/setup/opportunity-statuses', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.createOpportunityStatus)
router.patch('/leads/setup/opportunity-statuses/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.updateOpportunityStatus)
router.delete('/leads/setup/opportunity-statuses/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.deleteOpportunityStatus)
router.post('/leads/setup/opportunity-statuses/reorder', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), leadsController.reorderOpportunityStatuses)
router.post('/leads/bulk', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.bulk)
router.post('/leads/resolve-by-ids', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.resolveByIds)
router.post(
  '/leads/distribute-round-robin',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('main.leads', 'update'),
  leadsController.distributeRoundRobin,
)
router.get('/leads/archived', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.listArchived)
router.post('/leads/archived/bulk', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'delete'), leadsController.bulkArchived)
router.post('/leads/:id/restore', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.restoreLead)
router.delete('/leads/:id/permanent', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'delete'), leadsController.destroyLeadPermanently)
router.get('/leads/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.getOne)
router.post('/leads', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'create'), leadsController.create)
router.put('/leads/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.update)
router.patch('/leads/:id/status', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.patchStatus)
router.delete('/leads/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'delete'), leadsController.remove)
router.get('/leads/:id/activities', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.listActivities)
router.post('/leads/:id/activities', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'create'), leadsController.createActivity)
router.patch('/leads/:id/activities/:activityId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.patchActivity)
router.delete('/leads/:id/activities/:activityId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.deleteActivity)
router.get('/leads/:id/notes', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.listNotes)
router.post('/leads/:id/notes', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'create'), leadsController.createNote)
router.patch('/leads/:id/notes/:noteId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.patchNote)
router.delete('/leads/:id/notes/:noteId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.deleteNote)
router.get('/leads/email/google/status', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.getGoogleEmailAuthStatus)
router.get('/leads/email/google/connect-url', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.getGoogleEmailConnectUrl)
router.get('/leads/email/google/callback', apiLimiter, leadsController.connectGoogleEmailCallback)
router.get('/leads/:id/emails', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.listLeadEmails)
router.get('/leads/:id/email-threads', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.listLeadEmailThreads)
router.get('/leads/:id/email-threads/:threadId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.getLeadEmailThread)
router.post('/leads/:id/emails/send', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'create'), leadsController.sendLeadEmail)
router.post('/leads/:id/emails/sync', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.syncLeadEmailReplies)
router.get('/email/threads', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.email', 'view'), leadsController.listEmailThreads)
router.get('/email/threads/:threadId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.email', 'view'), leadsController.getEmailThread)
router.get('/email/mailbox-badge', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.email', 'view'), mailboxController.getMailboxInboxBadge)
router.get('/email/mailbox-threads', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.email', 'view'), mailboxController.listMailboxThreads)
router.get('/email/mailbox-threads/:threadId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.email', 'view'), mailboxController.getMailboxThread)
router.post(
  '/email/mailbox-threads/:threadId/read',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.email', 'update'),
  mailboxController.markMailboxThreadRead,
)
router.get(
  '/email/mailbox-attachments/:messageId/:attachmentId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.email', 'view'),
  mailboxController.downloadMailboxAttachment,
)
router.post(
  '/email/mailbox-save-attachment',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.documents', 'create'),
  mailboxController.saveMailboxAttachmentToLead,
)
router.post('/email/sync', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.email', 'update'), leadsController.syncEmailReplies)
router.post('/email/attachments', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.email', 'create'), emailUpload.array('files', 10), leadsController.uploadEmailAttachments)
router.get('/leads/:id/tasks', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.tasks', 'view'), leadsController.listTasks)
router.get('/tasks', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.tasks', 'view'), leadsController.listAllTasks)
router.patch('/tasks/:taskId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.tasks', 'update'), leadsController.patchTaskById)
router.get('/opportunities', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.opportunities', 'view'), opportunitiesController.list)
router.get('/opportunities/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.opportunities', 'view'), opportunitiesController.getOne)
router.post('/opportunities', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.opportunities', 'create'), opportunitiesController.create)
router.put('/opportunities/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.opportunities', 'update'), opportunitiesController.update)
router.patch('/opportunities/:id/status', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.opportunities', 'update'), opportunitiesController.patchStatus)
router.delete('/opportunities/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.opportunities', 'delete'), opportunitiesController.remove)
router.get('/deals', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deals', 'view'), dealsController.list)
router.get('/deals/payments', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deal_payments', 'view'), dealPaymentsController.listAll)
router.post('/deals', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deals', 'create'), dealsController.create)
router.get('/deals/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deals', 'view'), dealsController.getOne)
router.patch('/deals/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deals', 'update'), dealsController.update)
router.patch('/deals/:id/stage', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deals', 'update'), dealsController.patchStage)
router.delete('/deals/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deals', 'delete'), dealsController.remove)
router.get('/deals/:id/activities', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deals', 'view'), dealsController.listActivities)
router.post('/deals/:id/activities', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deals', 'create'), dealsController.createActivity)
router.get('/deals/:id/payments', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deal_payments', 'view'), dealPaymentsController.listForDeal)
router.post('/deals/:id/payments', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deal_payments', 'create'), dealPaymentsController.create)
router.patch('/deals/:id/payments/:paymentId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deal_payments', 'update'), dealPaymentsController.patch)
router.delete('/deals/:id/payments/:paymentId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.deal_payments', 'delete'), dealPaymentsController.remove)
router.post('/leads/:id/tasks', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.tasks', 'create'), leadsController.createTask)
router.patch('/leads/:id/tasks/:taskId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.tasks', 'update'), leadsController.patchTask)
router.post(
  '/leads/:id/tasks/:taskId/comments',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.tasks', 'create'),
  leadsController.addTaskComment,
)
router.get(
  '/leads/:id/tasks/:taskId/timeline',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.tasks', 'view'),
  leadsController.getTaskTimeline,
)
router.delete('/leads/:id/tasks/:taskId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.tasks', 'update'), leadsController.deleteTask)
router.get('/leads/:id/followups', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.listFollowups)
router.post('/leads/:id/followups', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'create'), leadsController.createFollowup)
router.patch('/leads/:id/followups/:followupId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.patchFollowup)
router.delete('/leads/:id/followups/:followupId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'update'), leadsController.deleteFollowup)
router.get('/leads/:id/files', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'view'), leadsController.listFiles)
router.post('/leads/:id/files', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'create'), leadsController.createFile)
router.use(
  '/documents',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('manage.documents', 'view'),
  documentsRoutes,
)
router.use(
  '/forms',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.forms', 'view'),
  webFormsRoutes,
)

router.get(
  '/team/roles',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'view'),
  teamController.listRoles,
)
router.get(
  '/team/menus',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'admin'),
  teamController.listMenuMaster,
)
router.post(
  '/team/roles',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'admin'),
  teamController.createCompanyRole,
)
router.patch(
  '/team/roles/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'admin'),
  teamController.patchCompanyRole,
)
router.delete(
  '/team/roles/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'admin'),
  teamController.deleteCompanyRole,
)
router.get(
  '/team/invitations',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'view'),
  teamController.listInvitations,
)
router.post(
  '/team/invitations',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'create'),
  teamController.createInvitation,
)
router.delete(
  '/team/invitations/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'delete'),
  teamController.cancelInvitation,
)
router.get(
  '/team/users',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'view'),
  teamController.listCompanyUsers,
)
router.get(
  '/team/users/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'view'),
  teamController.getCompanyUser,
)
router.patch(
  '/team/users/:id/role',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'admin'),
  teamController.patchUserRole,
)
router.patch(
  '/team/users/:id/profile',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'admin'),
  teamController.patchUserProfile,
)
router.get(
  '/team/users/:id/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'view'),
  teamController.getUserWorkspaces,
)
router.put(
  '/team/users/:id/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'admin'),
  teamController.replaceUserWorkspaces,
)
router.get(
  '/team/users/:id/menu-permissions',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'view'),
  teamController.getUserMenuPermissions,
)
router.put(
  '/team/users/:id/menu-permissions',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'admin'),
  teamController.putUserMenuPermissions,
)
router.post(
  '/team/users/:id/deactivate',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'admin'),
  teamController.deactivateUser,
)
router.post(
  '/team/users/:id/reactivate',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'admin'),
  teamController.reactivateUser,
)
router.post(
  '/team/users/:id/reassign-leads',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('settings.team', 'admin'),
  teamController.reassignUserLeads,
)
router.get(
  '/team/teams',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('settings.team', 'view'),
  teamController.listTeams,
)
router.post(
  '/team/teams',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('settings.team', 'create'),
  teamController.createTeam,
)
router.patch(
  '/team/teams/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('settings.team', 'update'),
  teamController.patchTeam,
)
router.delete(
  '/team/teams/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('settings.team', 'admin'),
  teamController.deleteTeam,
)
router.post(
  '/team/teams/:id/members',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('settings.team', 'create'),
  teamController.addTeamMember,
)
router.delete(
  '/team/teams/:id/members/:userId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('settings.team', 'delete'),
  teamController.removeTeamMember,
)

// Calendar & Reminders routes
router.get(
  '/calendar/events',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.calendar', 'view'),
  calendarController.listEvents,
)
router.get(
  '/calendar/today',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.calendar', 'view'),
  calendarController.getDayDigest,
)
router.get(
  '/reminders',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.calendar', 'view'),
  remindersController.listReminders,
)
router.post(
  '/reminders',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.calendar', 'create'),
  remindersController.createReminder,
)
router.patch(
  '/reminders/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.calendar', 'update'),
  remindersController.patchReminder,
)
router.delete(
  '/reminders/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.calendar', 'update'),
  remindersController.deleteReminder,
)

router.get(
  '/campaigns',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'view'),
  campaignsController.list,
)
router.post(
  '/campaigns',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'create'),
  campaignsController.create,
)
router.get(
  '/campaigns/:id/leads',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'view'),
  campaignsController.listLeads,
)
router.get(
  '/campaigns/:id/leads/export',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'view'),
  campaignsController.exportLeadsCsv,
)
router.patch(
  '/campaigns/:id/stages',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'update'),
  campaignsController.patchStages,
)
router.patch(
  '/campaigns/:id/leads/:leadId/stage',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'update'),
  campaignsController.patchLeadStage,
)
router.get(
  '/campaigns/:id/leads/:leadId/stage-history',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'view'),
  campaignsController.listStageHistory,
)
router.patch(
  '/campaigns/:id/leads/:leadId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'update'),
  campaignsController.patchCampaignLead,
)
router.get(
  '/campaigns/:id/report',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'view'),
  campaignsController.getCampaignReport,
)
router.get(
  '/campaigns/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'view'),
  campaignsController.getOne,
)
router.patch(
  '/campaigns/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'update'),
  campaignsController.patchCampaign,
)
router.delete(
  '/campaigns/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'delete'),
  campaignsController.remove,
)
router.post(
  '/campaigns/:id/leads',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'create'),
  campaignsController.addLeads,
)
router.delete(
  '/campaigns/:id/leads/:leadId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'update'),
  campaignsController.removeLead,
)
router.post(
  '/campaigns/:id/members',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'create'),
  campaignsController.addMembers,
)
router.delete(
  '/campaigns/:id/members/:userId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'update'),
  campaignsController.removeMember,
)
router.post(
  '/campaigns/:id/distribute',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'update'),
  campaignsController.distributeLeads,
)
router.get(
  '/campaigns/:id/payments',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'view'),
  campaignPaymentsController.listForCampaign,
)
router.get(
  '/campaigns/:id/payments/export',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'view'),
  campaignPaymentsController.exportPaymentsCsv,
)
router.get(
  '/campaigns/:id/leads/:leadId/payments',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'view'),
  campaignPaymentsController.listForLead,
)
router.post(
  '/campaigns/:id/leads/:leadId/payments',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'create'),
  campaignPaymentsController.create,
)
router.patch(
  '/campaigns/:id/leads/:leadId/payments/:paymentId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'update'),
  campaignPaymentsController.patch,
)
router.delete(
  '/campaigns/:id/leads/:leadId/payments/:paymentId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.campaigns', 'update'),
  campaignPaymentsController.remove,
)

router.get(
  '/workflows',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.automation', 'view'),
  workflowsController.list,
)
router.post(
  '/workflows',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.automation', 'create'),
  workflowsController.create,
)
router.get(
  '/workflows/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.automation', 'view'),
  workflowsController.getOne,
)
router.patch(
  '/workflows/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.automation', 'update'),
  workflowsController.patch,
)
router.delete(
  '/workflows/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.automation', 'delete'),
  workflowsController.remove,
)
router.post(
  '/workflows/:id/publish',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.automation', 'update'),
  workflowsController.publish,
)
router.post(
  '/workflows/:id/test',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.automation', 'view'),
  workflowsController.testRun,
)
router.get(
  '/workflows/:id/runs',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.automation', 'view'),
  workflowsController.listRuns,
)
router.get(
  '/workflow-runs/:runId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('automate.automation', 'view'),
  workflowsController.getRun,
)

router.post(
  '/templates',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.templates', 'create'),
  templatesController.createTemplate,
)
router.get(
  '/templates',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.templates', 'view'),
  templatesController.getTemplateListWithStats,
)
router.get(
  '/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.templates', 'view'),
  templatesController.getTemplate,
)
router.put(
  '/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.templates', 'update'),
  templatesController.updateTemplate,
)
router.delete(
  '/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.templates', 'delete'),
  templatesController.archiveTemplate,
)
router.post(
  '/templates/:id/preview-send',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.templates', 'create'),
  templatesController.previewSend,
)
router.post(
  '/templates/generate-content',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.templates', 'create'),
  templatesController.generateTemplateContent,
)
router.post(
  '/templates/:id/send',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.templates', 'create'),
  templatesController.sendTemplate,
)
router.get(
  '/templates/:id/send-history',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('engage.templates', 'view'),
  templatesController.templateSendHistory,
)
router.get(
  '/leads/:id/email-history',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  loadPermissions,
  requirePermission('main.leads', 'view'),
  templatesController.leadEmailHistory,
)

// —— HR: Attendance ——
// Menu-CRUD gate (loadPermissions + requirePermission) runs first — cheap Set lookup that
// answers "can this role touch the Attendance module at all". requireHrRole runs after —
// answers "within Attendance, does this user have manager/admin-tier data visibility"
// (hits the DB for resolveHrRole). The two are independent layers, both required.
router.get('/attendance/today', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.attendance', 'view'), attendanceController.getTodayStatus)
router.post('/attendance/check-in', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.attendance', 'create'), attendanceController.checkIn)
router.post('/attendance/check-out', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.attendance', 'update'), attendanceController.checkOut)
router.get('/attendance/me', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.attendance', 'view'), attendanceController.getMyAttendance)
router.get('/attendance/team', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.attendance', 'view'), requireHrRole('manager'), attendanceController.getTeamAttendance)
router.get('/attendance/day/:date', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.attendance', 'view'), requireHrRole('manager'), attendanceController.getDayDetail)
router.get('/attendance/export', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.attendance', 'view'), requireHrRole('manager'), attendanceController.exportAttendanceCsv)
router.post('/attendance/logs', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.attendance', 'create'), requireHrRole('admin'), attendanceController.createAttendanceLog)
router.put('/attendance/logs/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.attendance', 'update'), requireHrRole('manager'), attendanceController.editAttendanceLog)

// —— HR: Leave ——
router.get('/leave/types', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_config', 'view'), leaveController.getLeaveTypes)
router.post('/leave/types', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_config', 'create'), requireHrRole('admin'), leaveController.createLeaveType)
router.put('/leave/types/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_config', 'update'), requireHrRole('admin'), leaveController.updateLeaveType)
router.delete('/leave/types/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_config', 'delete'), requireHrRole('admin'), leaveController.deleteLeaveType)
router.get('/leave/balance/me', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave', 'view'), leaveController.getMyLeaveBalance)
router.get('/leave/balance/:userId', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_approval', 'view'), requireHrRole('manager'), leaveController.getUserLeaveBalance)
router.post('/leave/balance/adjust', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_config', 'update'), requireHrRole('admin'), leaveController.adjustLeaveBalance)
router.get('/leave/preview-days', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave', 'view'), leaveController.previewLeaveDays)
router.get('/leave/settings', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_config', 'view'), leaveController.getLeaveSettings)
router.put('/leave/settings', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_config', 'update'), requireHrRole('admin'), leaveController.updateLeaveSettings)
router.post('/leave/requests', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_requests', 'create'), leaveUpload.single('document'), leaveController.applyLeave)
router.get('/leave/requests/me', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_requests', 'view'), leaveController.getMyLeaves)
router.get('/leave/requests/all', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_approval', 'view'), requireHrRole('manager'), leaveController.getAllLeaves)
router.post('/leave/requests/bulk-approve', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_approval', 'update'), requireHrRole('manager'), leaveController.bulkApproveLeaves)
router.post('/leave/requests/:id/approve', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_approval', 'update'), requireHrRole('manager'), leaveController.approveLeave)
router.post('/leave/requests/:id/reject', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_approval', 'update'), requireHrRole('manager'), leaveController.rejectLeave)
router.post('/leave/requests/:id/cancel', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_requests', 'update'), leaveController.cancelLeave)
router.get('/leave/calendar', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave', 'view'), leaveController.getTeamLeaveCalendar)
router.get('/leave/holidays', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave', 'view'), leaveController.getPublicHolidays)
router.post('/leave/holidays', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_config', 'create'), requireHrRole('admin'), leaveController.createHoliday)
router.put('/leave/holidays/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_config', 'update'), requireHrRole('admin'), leaveController.updateHoliday)
router.delete('/leave/holidays/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_config', 'delete'), requireHrRole('admin'), leaveController.deleteHoliday)

// —— HR: Leave — Manager Approval ——
router.get('/leave/pending-approvals', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_approval', 'view'), requireHrRole('manager'), leaveController.getPendingApprovals)
router.post('/leave/:id/approve', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_approval', 'update'), requireHrRole('manager'), leaveController.managerApproveLeave)
router.post('/leave/:id/reject', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('hr.leave_approval', 'update'), requireHrRole('manager'), leaveController.managerRejectLeave)

// —— Notifications —— (self-service personal inbox, intentionally no module gate)
// Static paths must come before /:id param routes to avoid param matching
router.get('/notifications/unread-count', requireAuth, apiLimiter, requireCompany, workspaceContext, getUnreadCount)
router.post('/notifications/read-all', requireAuth, apiLimiter, requireCompany, workspaceContext, markAllRead)
router.post('/notifications/mark-all-read', requireAuth, apiLimiter, requireCompany, workspaceContext, leaveController.markAllNotificationsRead)
router.get('/notifications', requireAuth, apiLimiter, requireCompany, workspaceContext, getNotificationsV2)
router.post('/notifications/:id/read', requireAuth, apiLimiter, requireCompany, workspaceContext, markNotificationReadV2)
router.patch('/notifications/:id/read', requireAuth, apiLimiter, requireCompany, workspaceContext, leaveController.markNotificationRead)

router.get('/track/open', emailTrackingController.trackOpen)
router.get('/track/click', emailTrackingController.trackClick)
router.get('/unsubscribe', emailTrackingController.unsubscribe)
router.get('/email/tracking/reports', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('engage.email', 'view'), emailReportsController.getEmailTrackingReport)

// —— Audit Logs (admin only) ——
router.get('/audit-logs', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('settings.workspace', 'admin'), auditLogController.getAuditLogs)

// —— Email Sequences / Drip Campaigns ——
router.get('/email-sequences', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('automate.email_sequences', 'view'), emailSequencesController.listSequences)
router.post('/email-sequences', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('automate.email_sequences', 'create'), emailSequencesController.createSequence)
router.get('/email-sequences/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('automate.email_sequences', 'view'), emailSequencesController.getSequence)
router.put('/email-sequences/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('automate.email_sequences', 'update'), emailSequencesController.updateSequence)
router.delete('/email-sequences/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('automate.email_sequences', 'delete'), emailSequencesController.deleteSequence)
router.post('/email-sequences/:id/enroll', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('automate.email_sequences', 'create'), emailSequencesController.enrollLead)
router.post('/email-sequences/:id/unenroll', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('automate.email_sequences', 'update'), emailSequencesController.unenrollLead)
router.get('/email-sequences/:id/enrollments', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('automate.email_sequences', 'view'), emailSequencesController.getEnrollments)

// —— Lead Scoring Engine —— (config sub-page of Leads, same tier as assignment-rules/custom-fields)
// Static sub-paths must come before /:id param routes
router.post('/scoring-rules/reorder', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), scoringRulesController.reorderScoringRules)
router.post('/scoring-rules/recalculate', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), scoringRulesController.recalculateAllLeadScores)
router.get('/scoring-rules', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), scoringRulesController.getScoringRules)
router.post('/scoring-rules', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), scoringRulesController.createScoringRule)
router.put('/scoring-rules/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), scoringRulesController.updateScoringRule)
router.delete('/scoring-rules/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, loadPermissions, requirePermission('main.leads', 'admin'), scoringRulesController.deleteScoringRule)

router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
})

export default router
