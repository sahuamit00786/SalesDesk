import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { rateLimit } from '../../middleware/rateLimit.js'
import { requireAuth } from '../../middleware/auth.js'
import { requireCompany } from '../../middleware/requireCompany.js'
import { workspaceContext } from '../../middleware/workspaceContext.js'
import * as authController from '../../controllers/authController.js'
import * as analyticsController from '../../controllers/analyticsController.js'
import * as analyticsReportsExtended from '../../controllers/analyticsReportsExtended.js'
import { requireAnalyticsView, requireTeamAnalytics, requireAnalyticsAdmin } from '../../middleware/requireAnalyticsView.js'
import * as leadsController from '../../controllers/leadsController.js'
import * as searchController from '../../controllers/searchController.js'
import { serveFile, serveRecording } from '../../controllers/fileAccessController.js'
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
import * as emailStatusController from '../../controllers/emailStatusController.js'
import documentsRoutes from './documents.js'
import webFormsRoutes from '../webFormsRoutes.js'
import whatsappRoutes from '../whatsappRoutes.js'
import { verifyWhatsAppWebhook, receiveWhatsAppWebhook } from '../../controllers/whatsappWebhookController.js'
import * as googleController from '../../controllers/googleController.js'
import * as mailboxController from '../../controllers/mailboxController.js'
import * as duplicateLeadsController from '../../controllers/duplicateLeadsController.js'
import * as callController from '../../controllers/callController.js'
import * as notificationSettingsController from '../../controllers/notificationSettingsController.js'
import { handleGmailPubSubPushHttp } from '../../services/gmail/gmailPushService.js'
import meetingRoutes from '../meetingRoutes.js'
import transcriptionRoutes from '../transcriptionRoutes.js'
import aiMeetingRoutes from '../AiMeetingRoutes.js'
import copilotRoutes from '../copilotRoutes.js'
import { getFilterPresets, createFilterPreset, deleteFilterPreset } from '../../controllers/filterPresetsController.js'
import {
  getNotifications as getNotificationsV2,
  markNotificationRead as markNotificationReadV2,
  markAllRead,
  getUnreadCount,
  markNotificationsSeen,
  getNotificationSummary,
} from '../../controllers/notificationController.js'
import * as auditLogController from '../../controllers/auditLogController.js'
import * as emailSequencesController from '../../controllers/emailSequencesController.js'
import * as scoringRulesController from '../../controllers/scoringRulesController.js'

const router = Router()
const emailUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 24 * 1024 * 1024, files: 12 } })

const leadFileUploadDir = path.resolve(process.cwd(), 'uploads', 'leads')
mkdirSync(leadFileUploadDir, { recursive: true })
const leadFileUpload = multer({
  storage: multer.diskStorage({
    // Workspace-scoped subdir, matching the documents/webforms convention
    // (uploads/<scope>/<workspaceId>/<file>) so these files are also servable
    // through the Phase 6 authenticated /files route.
    destination: (req, _file, cb) => {
      const workspaceId = String(req.workspaceId || 'unscoped').replace(/[^\w-]+/g, '_')
      const dir = path.join(leadFileUploadDir, workspaceId)
      mkdirSync(dir, { recursive: true })
      cb(null, dir)
    },
    filename: (_req, file, cb) => {
      const safe = String(file.originalname || 'attachment').replace(/[^\w.\-]+/g, '_')
      cb(null, `${Date.now()}_${safe}`)
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
})

const authLimiter = rateLimit({ routeKey: 'auth', windowSec: 60, max: 30 })
const otpLimiter = rateLimit({ routeKey: 'otp', windowSec: 3600, max: 5 })
const apiLimiter = rateLimit({ routeKey: 'api', windowSec: 60, max: 200 })

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' }, meta: {} })
})

router.get('/search', requireAuth, apiLimiter, requireCompany, workspaceContext, searchController.globalSearch)

// Phase 6 Stage 1 — authenticated file serving, additive. The static /uploads
// mount stays live until clients migrate (Stage 2) and it's removed (Stage 3).
router.get('/files', requireAuth, apiLimiter, requireCompany, workspaceContext, serveFile)

/** Gmail API → Pub/Sub push (OIDC). Configure topic + subscription in GCP; see GMAIL_PUBSUB_* env vars. */
router.post('/webhooks/gmail-pubsub', (req, res, next) => {
  handleGmailPubSubPushHttp(req, res).catch(next)
})

/** Browser OAuth redirect — must stay public (no Authorization header on redirect). */
router.get('/google/callback', apiLimiter, googleController.googleCallback)

/**
 * WhatsApp Cloud API webhook. Each company owns its own Meta App/subscription
 * and pastes back a callback URL containing its own companyId, so — unlike the
 * single shared gmail-pubsub topic above — company identification here is a
 * direct primary-key lookup, not a scan. Public: Meta can't send our bearer token.
 */
router.get('/webhooks/whatsapp/:companyId', (req, res, next) => {
  verifyWhatsAppWebhook(req, res).catch(next)
})
router.post('/webhooks/whatsapp/:companyId', (req, res, next) => {
  receiveWhatsAppWebhook(req, res).catch(next)
})

router.use(
  '/meetings',
  requireAuth,
  requireCompany, workspaceContext,
  meetingRoutes,
)

// Authenticated recordings file serve — replaces the former public static /recordings route
// SECURITY FIX (BUG-1): ownership is now verified in serveRecording.
// The previous inline handler had no tenant check — any authenticated user could
// download any company's call recording by filename.
router.get('/recordings/:filename', requireAuth, apiLimiter, requireCompany, workspaceContext, serveRecording)

router.use(
  '/transcription',
  requireAuth,
  requireCompany, workspaceContext,
  transcriptionRoutes
)

router.use(
  '/ai-meetings',
  requireAuth,
  requireCompany, workspaceContext,
  aiMeetingRoutes
)

router.use(
  '/copilot',
  requireAuth,
  requireCompany, workspaceContext,
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
router.post('/auth/change-password', requireAuth, authLimiter, authController.changePassword)
router.get('/auth/invitations/preview', authLimiter, teamController.previewInvitation)
router.post('/auth/invitations/accept', authLimiter, teamController.acceptInvitation)
router.post('/auth/sso/google', authLimiter, teamController.googleSsoPlaceholder)
router.get('/auth/me', requireAuth, apiLimiter, authController.me)
router.get('/auth/workspace-access', requireAuth, apiLimiter, authController.checkWorkspaceAccess)
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
  companyController.patchMyCompany,
)
router.post(
  '/company/me/provision-workspace',
  requireAuth,
  apiLimiter,
  requireCompany,
  companyController.provisionMyWorkspace,
)

// Read is open to every company member — it backs the read-only "Email notifications"
// tab every user sees under topbar Settings; only editing needs the workspace grant.
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

router.get(
  '/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  workspaceController.listWorkspaces,
)
router.post(
  '/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  workspaceController.createWorkspace,
)
router.patch(
  '/workspaces/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  workspaceController.patchWorkspace,
)
router.delete(
  '/workspaces/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
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
router.get('/analytics/team-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireTeamAnalytics, analyticsController.teamReport)
router.get('/analytics/deals-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsController.dealsReport)
router.get('/analytics/opportunities-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsReportsExtended.opportunitiesReport)
router.get('/analytics/followups-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsReportsExtended.followupsReport)
router.get('/analytics/sales-docs-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsReportsExtended.salesDocsReport)
router.get('/analytics/payments-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsReportsExtended.paymentsReport)
router.get('/analytics/employee-monthly-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireTeamAnalytics, analyticsReportsExtended.employeeMonthlyReport)
router.get('/analytics/data-health-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsAdmin, analyticsReportsExtended.dataHealthReport)
router.get('/analytics/campaigns-report', requireAuth, apiLimiter, requireCompany, workspaceContext, requireAnalyticsView, analyticsReportsExtended.campaignsReport)

// Read is open to every company member — it backs the read-only "Company information"
// tab every user sees under topbar Settings; only editing needs the billing_profile grant.
router.get(
  '/billing-profile',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  billingProfileController.getBillingProfile,
)
router.patch(
  '/billing-profile',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  billingProfileController.patchBillingProfile,
)

router.get(
  '/sales-docs/templates',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  salesDocTemplatesController.listSalesDocTemplates,
)
router.post(
  '/sales-docs/templates',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  salesDocTemplatesController.createSalesDocTemplate,
)
router.get(
  '/sales-docs/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  salesDocTemplatesController.getSalesDocTemplate,
)
router.patch(
  '/sales-docs/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  salesDocTemplatesController.patchSalesDocTemplate,
)
router.delete(
  '/sales-docs/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  salesDocTemplatesController.deleteSalesDocTemplate,
)

router.post(
  '/quotations/:id/convert-to-invoice',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  quotationsController.convertQuotationToInvoice,
)
router.get(
  '/quotations',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  quotationsController.listQuotations,
)
router.post(
  '/quotations',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  quotationsController.createQuotation,
)
router.get(
  '/quotations/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  quotationsController.getQuotation,
)
router.get(
  '/quotations/:id/pdf',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  quotationsController.downloadQuotationPdf,
)
router.patch(
  '/quotations/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  quotationsController.patchQuotation,
)
router.delete(
  '/quotations/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  quotationsController.deleteQuotation,
)

router.post(
  '/invoices/:id/payments',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  invoicesController.recordInvoicePayment,
)
router.delete(
  '/invoices/:id/payments/:paymentId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  invoicesController.deleteInvoicePayment,
)
router.get(
  '/invoices',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  invoicesController.listInvoices,
)
router.post(
  '/invoices',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  invoicesController.createInvoice,
)
router.get(
  '/invoices/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  invoicesController.getInvoice,
)
router.get(
  '/invoices/:id/pdf',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  invoicesController.downloadInvoicePdf,
)
router.patch(
  '/invoices/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  invoicesController.patchInvoice,
)
router.delete(
  '/invoices/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  invoicesController.deleteInvoice,
)

router.get('/activities/book/:token', apiLimiter, activitiesController.getBookingLinkInfo)
router.post('/activities/book/:token', apiLimiter, activitiesController.confirmBooking)
router.get('/activities', requireAuth, apiLimiter, requireCompany, workspaceContext, activitiesController.listActivities)
router.post('/activities', requireAuth, apiLimiter, requireCompany, workspaceContext, activitiesController.createActivity)
router.get('/calls', requireAuth, apiLimiter, requireCompany, workspaceContext, callController.getCalls)
router.post('/calls', requireAuth, apiLimiter, requireCompany, workspaceContext, callController.createCall)
router.post('/calls/bulk-sync', requireAuth, apiLimiter, requireCompany, workspaceContext, callController.bulkSyncCalls)
router.get('/calls/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, callController.getCallById)
router.patch('/calls/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, callController.updateCall)
router.delete('/calls/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, callController.deleteCall)
router.post('/calls/:id/convert', requireAuth, apiLimiter, requireCompany, workspaceContext, callController.convertCall)
router.get('/activities/types', requireAuth, apiLimiter, requireCompany, workspaceContext, activitiesController.listActivityTypes)
router.post('/activities/types', requireAuth, apiLimiter, requireCompany, workspaceContext, activitiesController.createActivityType)
router.patch('/activities/types/:typeId', requireAuth, apiLimiter, requireCompany, workspaceContext, activitiesController.patchActivityType)
router.delete('/activities/types/:typeId', requireAuth, apiLimiter, requireCompany, workspaceContext, activitiesController.deleteActivityType)
router.post('/activities/booking-link', requireAuth, apiLimiter, requireCompany, workspaceContext, activitiesController.createBookingLink)
router.get('/activities/reminders/upcoming', requireAuth, apiLimiter, requireCompany, workspaceContext, activitiesController.listUpcomingReminders)
router.post('/activities/:activityId/reminders', requireAuth, apiLimiter, requireCompany, workspaceContext, activitiesController.createReminder)

// Filter presets (saved filter configurations per user/workspace/module) — intentionally
// ungated beyond auth+company: these are personal, per-user presets, not shared company data.
router.get('/filter-presets', requireAuth, apiLimiter, requireCompany, workspaceContext, getFilterPresets)
router.post('/filter-presets', requireAuth, apiLimiter, requireCompany, workspaceContext, createFilterPreset)
router.delete('/filter-presets/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, deleteFilterPreset)

router.get('/leads/duplicates', requireAuth, apiLimiter, requireCompany, workspaceContext, duplicateLeadsController.list)
router.delete('/leads/duplicates/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, duplicateLeadsController.remove)
router.post('/leads/duplicates/:id/create', requireAuth, apiLimiter, requireCompany, workspaceContext, duplicateLeadsController.createAsLead)
router.post('/leads/duplicates/:id/merge', requireAuth, apiLimiter, requireCompany, workspaceContext, duplicateLeadsController.merge)

router.get(
  '/leads',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  leadsController.list,
)
router.get('/leads/ids', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listIds)
router.get('/leads/analytics/source', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.sourceAnalytics)
router.get('/leads/form-meta', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.formMeta)
router.get('/leads/saved-views', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listSavedViews)
router.post('/leads/saved-views', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.createSavedView)
router.delete('/leads/saved-views/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.deleteSavedView)
router.get('/leads/assignment-rules', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listAssignmentRules)
router.post('/leads/assignment-rules', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.createAssignmentRule)
router.patch('/leads/assignment-rules/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.patchAssignmentRule)
router.delete('/leads/assignment-rules/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.deleteAssignmentRule)
router.get('/leads/custom-fields', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listCustomFields)
router.post('/leads/custom-fields', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.createCustomField)
router.post('/leads/custom-fields/reorder', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.reorderCustomFieldsHandler)
router.patch('/leads/custom-fields/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.patchCustomField)
router.delete('/leads/custom-fields/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.deleteCustomField)
router.post('/leads/import', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.importRows)
router.post('/leads/export', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.exportRows)
router.get('/leads/setup', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.getLeadSetup)
router.post('/leads/setup/sources', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.createLeadSource)
router.patch('/leads/setup/sources/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.patchLeadSource)
router.delete('/leads/setup/sources/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.deleteLeadSource)
router.post('/leads/setup/tags', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.createLeadTag)
router.patch('/leads/setup/tags/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.patchLeadTag)
router.delete('/leads/setup/tags/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.deleteLeadTag)
router.post('/leads/setup/deal-statuses', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.createDealStatus)
router.patch('/leads/setup/deal-statuses/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.patchDealStatus)
router.delete('/leads/setup/deal-statuses/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.deleteDealStatus)
router.post('/leads/setup/deal-statuses/reorder', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.reorderDealStatuses)
router.post('/leads/setup/pipeline-statuses', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.createPipelineStatus)
router.patch('/leads/setup/pipeline-statuses/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.updatePipelineStatus)
router.delete('/leads/setup/pipeline-statuses/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.deletePipelineStatus)
router.post('/leads/setup/pipeline-statuses/reorder', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.reorderPipelineStatuses)
router.post('/leads/bulk', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.bulk)
router.post('/leads/resolve-by-ids', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.resolveByIds)
router.post(
  '/leads/distribute-round-robin',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  leadsController.distributeRoundRobin,
)
router.get('/leads/archived', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listArchived)
router.post('/leads/archived/bulk', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.bulkArchived)
router.post('/leads/:id/restore', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.restoreLead)
router.delete('/leads/:id/permanent', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.destroyLeadPermanently)
router.get('/leads/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.getOne)
router.post('/leads', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.create)
router.put('/leads/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.update)
router.patch('/leads/:id/status', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.patchStatus)
router.delete('/leads/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.remove)
router.get('/leads/:id/activities', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listActivities)
router.post('/leads/:id/activities', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.createActivity)
router.patch('/leads/:id/activities/:activityId', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.patchActivity)
router.delete('/leads/:id/activities/:activityId', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.deleteActivity)
router.get('/leads/:id/notes', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listNotes)
router.post('/leads/:id/notes', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.createNote)
router.patch('/leads/:id/notes/:noteId', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.patchNote)
router.delete('/leads/:id/notes/:noteId', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.deleteNote)
router.get('/leads/email/google/status', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.getGoogleEmailAuthStatus)
router.get('/leads/email/google/connect-url', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.getGoogleEmailConnectUrl)
router.get('/leads/email/google/callback', apiLimiter, leadsController.connectGoogleEmailCallback)
router.get('/leads/:id/emails', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listLeadEmails)
router.get('/leads/:id/email-threads', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listLeadEmailThreads)
router.get('/leads/:id/email-threads/:threadId', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.getLeadEmailThread)
router.post('/leads/:id/emails/send', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.sendLeadEmail)
router.post('/leads/:id/emails/sync', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.syncLeadEmailReplies)
router.get('/email/threads', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listEmailThreads)
router.get('/email/threads/:threadId', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.getEmailThread)
router.get('/email/mailbox-badge', requireAuth, apiLimiter, requireCompany, workspaceContext, mailboxController.getMailboxInboxBadge)
router.get('/email/mailbox-threads', requireAuth, apiLimiter, requireCompany, workspaceContext, mailboxController.listMailboxThreads)
router.get('/email/mailbox-threads/:threadId', requireAuth, apiLimiter, requireCompany, workspaceContext, mailboxController.getMailboxThread)
router.post(
  '/email/mailbox-threads/:threadId/read',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  mailboxController.markMailboxThreadRead,
)
router.get(
  '/email/mailbox-attachments/:messageId/:attachmentId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  mailboxController.downloadMailboxAttachment,
)
router.post(
  '/email/mailbox-save-attachment',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  mailboxController.saveMailboxAttachmentToLead,
)
router.post('/email/sync', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.syncEmailReplies)
router.post('/email/attachments', requireAuth, apiLimiter, requireCompany, workspaceContext, emailUpload.array('files', 10), leadsController.uploadEmailAttachments)
router.get('/leads/:id/tasks', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listTasks)
router.get('/tasks', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listAllTasks)
router.patch('/tasks/:taskId', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.patchTaskById)
router.get('/followups', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listAllFollowups)
router.get('/opportunities', requireAuth, apiLimiter, requireCompany, workspaceContext, opportunitiesController.list)
router.get('/opportunities/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, opportunitiesController.getOne)
router.post('/opportunities', requireAuth, apiLimiter, requireCompany, workspaceContext, opportunitiesController.create)
router.put('/opportunities/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, opportunitiesController.update)
router.patch('/opportunities/:id/status', requireAuth, apiLimiter, requireCompany, workspaceContext, opportunitiesController.patchStatus)
router.patch('/opportunities/:id/revert-to-lead', requireAuth, apiLimiter, requireCompany, workspaceContext, opportunitiesController.revertToLead)
router.delete('/opportunities/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, opportunitiesController.remove)
router.get('/deals', requireAuth, apiLimiter, requireCompany, workspaceContext, dealsController.list)
router.get('/deals/payments', requireAuth, apiLimiter, requireCompany, workspaceContext, dealPaymentsController.listAll)
router.post('/deals', requireAuth, apiLimiter, requireCompany, workspaceContext, dealsController.create)
router.get('/deals/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, dealsController.getOne)
router.patch('/deals/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, dealsController.update)
router.patch('/deals/:id/stage', requireAuth, apiLimiter, requireCompany, workspaceContext, dealsController.patchStage)
router.delete('/deals/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, dealsController.remove)
router.get('/deals/:id/activities', requireAuth, apiLimiter, requireCompany, workspaceContext, dealsController.listActivities)
router.post('/deals/:id/activities', requireAuth, apiLimiter, requireCompany, workspaceContext, dealsController.createActivity)
router.get('/deals/:id/tasks', requireAuth, apiLimiter, requireCompany, workspaceContext, dealsController.listTasks)
router.post('/deals/:id/tasks', requireAuth, apiLimiter, requireCompany, workspaceContext, dealsController.createTask)
router.patch('/deals/:id/tasks/:taskId', requireAuth, apiLimiter, requireCompany, workspaceContext, dealsController.patchTask)
router.delete('/deals/:id/tasks/:taskId', requireAuth, apiLimiter, requireCompany, workspaceContext, dealsController.deleteTask)
router.post(
  '/deals/:id/tasks/:taskId/comments',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  dealsController.addTaskComment,
)
router.get(
  '/deals/:id/tasks/:taskId/timeline',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  dealsController.getTaskTimeline,
)
router.get('/deals/:id/payments', requireAuth, apiLimiter, requireCompany, workspaceContext, dealPaymentsController.listForDeal)
router.post('/deals/:id/payments', requireAuth, apiLimiter, requireCompany, workspaceContext, dealPaymentsController.create)
router.patch('/deals/:id/payments/:paymentId', requireAuth, apiLimiter, requireCompany, workspaceContext, dealPaymentsController.patch)
router.delete('/deals/:id/payments/:paymentId', requireAuth, apiLimiter, requireCompany, workspaceContext, dealPaymentsController.remove)
router.post('/leads/:id/tasks', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.createTask)
router.patch('/leads/:id/tasks/:taskId', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.patchTask)
router.post(
  '/leads/:id/tasks/:taskId/comments',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  leadsController.addTaskComment,
)
router.get(
  '/leads/:id/tasks/:taskId/timeline',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  leadsController.getTaskTimeline,
)
router.delete('/leads/:id/tasks/:taskId', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.deleteTask)
router.get('/leads/:id/followups', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listFollowups)
router.post('/leads/:id/followups', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.createFollowup)
router.patch('/leads/:id/followups/:followupId', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.patchFollowup)
router.delete('/leads/:id/followups/:followupId', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.deleteFollowup)
router.get('/leads/:id/files', requireAuth, apiLimiter, requireCompany, workspaceContext, leadsController.listFiles)
router.post('/leads/:id/files', requireAuth, apiLimiter, requireCompany, workspaceContext, leadFileUpload.array('files', 10), leadsController.createFile)
router.use(
  '/documents',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  documentsRoutes,
)
router.use(
  '/forms',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  webFormsRoutes,
)
router.use(
  '/whatsapp',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  whatsappRoutes,
)

router.get(
  '/team/roles',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.listRoles,
)
router.post(
  '/team/roles',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.createCompanyRole,
)
router.patch(
  '/team/roles/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.patchCompanyRole,
)
router.delete(
  '/team/roles/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.deleteCompanyRole,
)
router.get(
  '/team/invitations',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.listInvitations,
)
router.post(
  '/team/invitations',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.createInvitation,
)
router.delete(
  '/team/invitations/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.cancelInvitation,
)
router.get(
  '/team/invitations/check-email',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.checkInvitationEmail,
)
router.get(
  '/team/users',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.listCompanyUsers,
)
router.get(
  '/team/users/:id',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.getCompanyUser,
)
router.patch(
  '/team/users/:id/role',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.patchUserRole,
)
router.patch(
  '/team/users/:id/profile',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.patchUserProfile,
)
router.get(
  '/team/users/:id/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.getUserWorkspaces,
)
router.put(
  '/team/users/:id/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.replaceUserWorkspaces,
)
router.post(
  '/team/users/:id/workspaces',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.addUserWorkspace,
)
router.post(
  '/team/users/:id/deactivate',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.deactivateUser,
)
router.post(
  '/team/users/:id/reactivate',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.reactivateUser,
)
router.post(
  '/team/users/:id/reassign-leads',
  requireAuth,
  apiLimiter,
  requireCompany,
  teamController.reassignUserLeads,
)
router.get(
  '/team/teams',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  teamController.listTeams,
)
router.post(
  '/team/teams',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  teamController.createTeam,
)
router.patch(
  '/team/teams/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  teamController.patchTeam,
)
router.delete(
  '/team/teams/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  teamController.deleteTeam,
)
router.post(
  '/team/teams/:id/members',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  teamController.addTeamMember,
)
router.delete(
  '/team/teams/:id/members/:userId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  teamController.removeTeamMember,
)

// Calendar & Reminders routes
router.get(
  '/calendar/events',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  calendarController.listEvents,
)
router.get(
  '/calendar/today',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  calendarController.getDayDigest,
)
router.get(
  '/reminders',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  remindersController.listReminders,
)
router.post(
  '/reminders',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  remindersController.createReminder,
)
router.patch(
  '/reminders/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  remindersController.patchReminder,
)
router.delete(
  '/reminders/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  remindersController.deleteReminder,
)

router.get(
  '/campaigns',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.list,
)
router.post(
  '/campaigns',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.create,
)
router.get(
  '/campaigns/:id/leads',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.listLeads,
)
router.get(
  '/campaigns/:id/leads/export',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.exportLeadsCsv,
)
router.patch(
  '/campaigns/:id/stages',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.patchStages,
)
router.patch(
  '/campaigns/:id/leads/:leadId/stage',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.patchLeadStage,
)
router.get(
  '/campaigns/:id/leads/:leadId/stage-history',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.listStageHistory,
)
router.patch(
  '/campaigns/:id/leads/:leadId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.patchCampaignLead,
)
router.get(
  '/campaigns/:id/report',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.getCampaignReport,
)
router.get(
  '/campaigns/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.getOne,
)
router.patch(
  '/campaigns/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.patchCampaign,
)
router.delete(
  '/campaigns/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.remove,
)
router.post(
  '/campaigns/:id/leads',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.addLeads,
)
router.delete(
  '/campaigns/:id/leads/:leadId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.removeLead,
)
router.post(
  '/campaigns/:id/members',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.addMembers,
)
router.delete(
  '/campaigns/:id/members/:userId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.removeMember,
)
router.post(
  '/campaigns/:id/distribute',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignsController.distributeLeads,
)
router.get(
  '/campaigns/:id/payments',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignPaymentsController.listForCampaign,
)
router.get(
  '/campaigns/:id/payments/export',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignPaymentsController.exportPaymentsCsv,
)
router.get(
  '/campaigns/:id/leads/:leadId/payments',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignPaymentsController.listForLead,
)
router.post(
  '/campaigns/:id/leads/:leadId/payments',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignPaymentsController.create,
)
router.patch(
  '/campaigns/:id/leads/:leadId/payments/:paymentId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignPaymentsController.patch,
)
router.delete(
  '/campaigns/:id/leads/:leadId/payments/:paymentId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  campaignPaymentsController.remove,
)

router.get(
  '/workflows',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  workflowsController.list,
)
router.post(
  '/workflows',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  workflowsController.create,
)
router.get(
  '/workflows/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  workflowsController.getOne,
)
router.patch(
  '/workflows/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  workflowsController.patch,
)
router.delete(
  '/workflows/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  workflowsController.remove,
)
router.post(
  '/workflows/:id/publish',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  workflowsController.publish,
)
router.post(
  '/workflows/:id/test',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  workflowsController.testRun,
)
router.get(
  '/workflows/:id/runs',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  workflowsController.listRuns,
)
router.get(
  '/workflow-runs/:runId',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  workflowsController.getRun,
)

router.post(
  '/templates',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  templatesController.createTemplate,
)
router.get(
  '/templates',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  templatesController.getTemplateListWithStats,
)
router.get(
  '/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  templatesController.getTemplate,
)
router.put(
  '/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  templatesController.updateTemplate,
)
router.delete(
  '/templates/:id',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  templatesController.archiveTemplate,
)
router.post(
  '/templates/:id/preview-send',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  templatesController.previewSend,
)
router.post(
  '/templates/generate-content',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  templatesController.generateTemplateContent,
)
router.post(
  '/templates/:id/send',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  templatesController.sendTemplate,
)
router.get(
  '/templates/:id/send-history',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  templatesController.templateSendHistory,
)
router.get(
  '/leads/:id/email-history',
  requireAuth,
  apiLimiter,
  requireCompany, workspaceContext,
  templatesController.leadEmailHistory,
)

// —— Notifications —— (self-service personal inbox, intentionally no module gate)
// Static paths must come before /:id param routes to avoid param matching
router.get('/notifications/unread-count', requireAuth, apiLimiter, requireCompany, workspaceContext, getUnreadCount)
router.get('/notifications/summary', requireAuth, apiLimiter, requireCompany, workspaceContext, getNotificationSummary)
router.post('/notifications/read-all', requireAuth, apiLimiter, requireCompany, workspaceContext, markAllRead)
router.post('/notifications/mark-seen', requireAuth, apiLimiter, requireCompany, workspaceContext, markNotificationsSeen)
router.get('/notifications', requireAuth, apiLimiter, requireCompany, workspaceContext, getNotificationsV2)
router.post('/notifications/:id/read', requireAuth, apiLimiter, requireCompany, workspaceContext, markNotificationReadV2)

router.get('/track/open', emailTrackingController.trackOpen)
router.get('/track/click', emailTrackingController.trackClick)
router.get('/unsubscribe', emailTrackingController.unsubscribe)
router.get('/email/tracking/reports', requireAuth, apiLimiter, requireCompany, workspaceContext, emailReportsController.getEmailTrackingReport)
router.get('/email/status', requireAuth, apiLimiter, requireCompany, workspaceContext, emailStatusController.listEmailStatus)

// —— Audit Logs (admin only) ——
router.get('/audit-logs', requireAuth, apiLimiter, requireCompany, auditLogController.getAuditLogs)

// —— Email Sequences / Drip Campaigns ——
router.get('/email-sequences', requireAuth, apiLimiter, requireCompany, workspaceContext, emailSequencesController.listSequences)
router.post('/email-sequences', requireAuth, apiLimiter, requireCompany, workspaceContext, emailSequencesController.createSequence)
router.get('/email-sequences/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, emailSequencesController.getSequence)
router.put('/email-sequences/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, emailSequencesController.updateSequence)
router.delete('/email-sequences/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, emailSequencesController.deleteSequence)
router.post('/email-sequences/:id/enroll', requireAuth, apiLimiter, requireCompany, workspaceContext, emailSequencesController.enrollLead)
router.post('/email-sequences/:id/unenroll', requireAuth, apiLimiter, requireCompany, workspaceContext, emailSequencesController.unenrollLead)
router.get('/email-sequences/:id/enrollments', requireAuth, apiLimiter, requireCompany, workspaceContext, emailSequencesController.getEnrollments)

// —— Lead Scoring Engine —— (config sub-page of Leads, same tier as assignment-rules/custom-fields)
// Static sub-paths must come before /:id param routes
router.post('/scoring-rules/reorder', requireAuth, apiLimiter, requireCompany, workspaceContext, scoringRulesController.reorderScoringRules)
router.post('/scoring-rules/recalculate', requireAuth, apiLimiter, requireCompany, workspaceContext, scoringRulesController.recalculateAllLeadScores)
router.get('/scoring-rules', requireAuth, apiLimiter, requireCompany, workspaceContext, scoringRulesController.getScoringRules)
router.post('/scoring-rules', requireAuth, apiLimiter, requireCompany, workspaceContext, scoringRulesController.createScoringRule)
router.put('/scoring-rules/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, scoringRulesController.updateScoringRule)
router.delete('/scoring-rules/:id', requireAuth, apiLimiter, requireCompany, workspaceContext, scoringRulesController.deleteScoringRule)

router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
})

export default router
