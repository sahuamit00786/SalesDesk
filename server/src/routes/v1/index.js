import { Router } from 'express'
import { rateLimit } from '../../middleware/rateLimit.js'
import { requireAuth } from '../../middleware/auth.js'
import { requireCompany } from '../../middleware/requireCompany.js'
import { requirePermission } from '../../middleware/requirePermission.js'
import { loadPermissions } from '../../middleware/loadPermissions.js'
import * as authController from '../../controllers/authController.js'
import * as analyticsController from '../../controllers/analyticsController.js'
import * as leadsController from '../../controllers/leadsController.js'
import * as companyController from '../../controllers/companyController.js'
import * as workspaceController from '../../controllers/workspaceController.js'
import * as teamController from '../../controllers/teamController.js'
import documentsRoutes from './documents.js'
import webFormsRoutes from '../webFormsRoutes.js'

const router = Router()

const authLimiter = rateLimit({ routeKey: 'auth', windowSec: 60, max: 30 })
const apiLimiter = rateLimit({ routeKey: 'api', windowSec: 60, max: 200 })

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' }, meta: {} })
})

router.post('/auth/register', authLimiter, authController.register)
router.post('/auth/verify-email', authLimiter, authController.verifyEmail)
router.post('/auth/resend-verification', authLimiter, authController.resendVerification)
router.post('/auth/login', authLimiter, authController.login)
router.post('/auth/refresh', authLimiter, authController.refresh)
router.post('/auth/invitations/accept', authLimiter, teamController.acceptInvitation)
router.post('/auth/sso/google', authLimiter, teamController.googleSsoPlaceholder)
router.get('/auth/me', requireAuth, apiLimiter, authController.me)
router.patch('/company/me', requireAuth, apiLimiter, companyController.patchMyCompany)

router.get('/workspaces', requireAuth, apiLimiter, workspaceController.listWorkspaces)
router.post('/workspaces', requireAuth, apiLimiter, workspaceController.createWorkspace)
router.patch('/workspaces/:id', requireAuth, apiLimiter, workspaceController.patchWorkspace)
router.delete('/workspaces/:id', requireAuth, apiLimiter, workspaceController.deleteWorkspace)

router.get('/analytics/dashboard', requireAuth, apiLimiter, analyticsController.dashboardStats)

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
router.post('/leads/setup/stages', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.createLeadStage)
router.post('/leads/setup/status-categories', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.createLeadStatusCategory)
router.patch('/leads/setup/status-categories/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.patchLeadStatusCategory)
router.delete('/leads/setup/status-categories/:id', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.deleteLeadStatusCategory)
router.post('/leads/setup/statuses', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'admin'), leadsController.createLeadStatus)
router.post('/leads/bulk', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.bulk)
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
router.get('/leads/:id/tasks', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'view'), leadsController.listTasks)
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
router.delete('/leads/:id/tasks/:taskId', requireAuth, apiLimiter, requireCompany, loadPermissions, requirePermission('leads', 'edit'), leadsController.deleteTask)
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
router.patch(
  '/team/users/:id/role',
  requireAuth,
  apiLimiter,
  requireCompany,
  loadPermissions,
  requirePermission('team', 'admin'),
  teamController.patchUserRole,
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

router.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  })
})

export default router
