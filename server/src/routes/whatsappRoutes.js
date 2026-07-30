import { Router } from 'express'
import multer from 'multer'
import { validateUpload } from '../middleware/validateUpload.js'
import { requireCompanyAdmin } from '../middleware/requireCompanyAdmin.js'
import * as whatsappSettingsController from '../controllers/whatsappSettingsController.js'
import * as whatsappConversationsController from '../controllers/whatsappConversationsController.js'
import * as whatsappTemplatesController from '../controllers/whatsappTemplatesController.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } })

// Settings hold the WABA access token/app secret — company-wide credentials, admin-only.
router.get('/settings', requireCompanyAdmin, whatsappSettingsController.getSettings)
router.put('/settings', requireCompanyAdmin, whatsappSettingsController.saveSettings)
router.post('/settings/regenerate-token', requireCompanyAdmin, whatsappSettingsController.regenerateVerifyToken)

router.get('/unread-badge', whatsappConversationsController.getUnreadBadge)
router.get('/starred', whatsappConversationsController.listStarredMessages)
router.get('/conversations', whatsappConversationsController.listConversations)
router.post('/conversations', whatsappConversationsController.createConversation)
router.patch('/conversations/:id', whatsappConversationsController.updateConversation)
router.post('/conversations/reorder-pins', whatsappConversationsController.reorderPinnedConversations)
router.delete('/conversations/:id', whatsappConversationsController.deleteConversation)
router.get('/conversations/:id/messages', whatsappConversationsController.getMessages)
router.get('/conversations/:id/messages/search', whatsappConversationsController.searchMessages)
router.post('/conversations/:id/read', whatsappConversationsController.markRead)
router.post('/conversations/:id/unread', whatsappConversationsController.markUnread)
router.post('/conversations/:id/messages', whatsappConversationsController.sendMessage)
router.post('/conversations/:id/messages/template', whatsappConversationsController.sendTemplateMessage)
router.post('/conversations/:id/messages/:messageId/react', whatsappConversationsController.reactToMessage)
router.post('/conversations/:id/messages/:messageId/star', whatsappConversationsController.starMessage)
router.post('/media', upload.single('file'), validateUpload, whatsappConversationsController.uploadMedia)

// Reps pick templates when sending — list stays open. Managing the template
// catalog against Meta's Business API is company-wide config, admin-only.
router.get('/templates', whatsappTemplatesController.listTemplates)
router.post('/templates', requireCompanyAdmin, whatsappTemplatesController.createTemplate)
router.post('/templates/sync', requireCompanyAdmin, whatsappTemplatesController.syncTemplates)
router.delete('/templates/:id', requireCompanyAdmin, whatsappTemplatesController.deleteTemplate)

export default router
