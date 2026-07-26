import { Router } from 'express'
import multer from 'multer'
import { validateUpload } from '../middleware/validateUpload.js'
import * as whatsappSettingsController from '../controllers/whatsappSettingsController.js'
import * as whatsappConversationsController from '../controllers/whatsappConversationsController.js'
import * as whatsappTemplatesController from '../controllers/whatsappTemplatesController.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } })

router.get('/settings', whatsappSettingsController.getSettings)
router.put('/settings', whatsappSettingsController.saveSettings)
router.post('/settings/regenerate-token', whatsappSettingsController.regenerateVerifyToken)

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

router.get('/templates', whatsappTemplatesController.listTemplates)
router.post('/templates', whatsappTemplatesController.createTemplate)
router.post('/templates/sync', whatsappTemplatesController.syncTemplates)
router.delete('/templates/:id', whatsappTemplatesController.deleteTemplate)

export default router
