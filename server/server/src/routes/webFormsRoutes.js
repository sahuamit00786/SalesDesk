import { Router } from 'express'
import * as webFormsController from '../controllers/webFormsController.js'
import { requirePermission } from '../middleware/requirePermission.js'

const router = Router()

// Mount point (routes/v1/index.js) already applies loadPermissions + 'automate.forms':'view'
// for the whole sub-router; these add the write-level distinction on top (previously a
// view-only role could create/update/delete forms and email templates here).
router.get('/', webFormsController.list)
router.post('/', requirePermission('automate.forms', 'create'), webFormsController.create)
router.post('/generate-email-template', requirePermission('automate.forms', 'create'), webFormsController.generateEmailTemplate)
router.get('/email-templates', webFormsController.listEmailTemplates)
router.post('/email-templates', requirePermission('automate.forms', 'create'), webFormsController.createEmailTemplate)
router.patch('/email-templates/:templateId', requirePermission('automate.forms', 'update'), webFormsController.updateEmailTemplate)
router.delete('/email-templates/:templateId', requirePermission('automate.forms', 'delete'), webFormsController.deleteEmailTemplate)
router.get('/:id', webFormsController.getOne)
router.put('/:id', requirePermission('automate.forms', 'update'), webFormsController.update)
router.delete('/:id', requirePermission('automate.forms', 'delete'), webFormsController.remove)

export default router
