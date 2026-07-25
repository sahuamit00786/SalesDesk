import { Router } from 'express'
import * as webFormsController from '../controllers/webFormsController.js'

const router = Router()

router.get('/', webFormsController.list)
router.post('/', webFormsController.create)
router.post('/generate-email-template', webFormsController.generateEmailTemplate)
router.get('/email-templates', webFormsController.listEmailTemplates)
router.post('/email-templates', webFormsController.createEmailTemplate)
router.patch('/email-templates/:templateId', webFormsController.updateEmailTemplate)
router.delete('/email-templates/:templateId', webFormsController.deleteEmailTemplate)
router.get('/:id', webFormsController.getOne)
router.put('/:id', webFormsController.update)
router.delete('/:id', webFormsController.remove)

export default router
