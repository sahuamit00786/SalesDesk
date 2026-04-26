import { Router } from 'express'
import multer from 'multer'
import * as documentsController from '../../controllers/documentsController.js'
import { requirePermission } from '../../middleware/requirePermission.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
})

router.get('/', documentsController.listAllDocuments)
router.get('/folder-tree', documentsController.folderTree)
router.post('/folders', requirePermission('documents', 'edit'), documentsController.createFolder)
router.post('/email-attachments/save', requirePermission('documents', 'edit'), documentsController.saveEmailAttachmentToDocuments)
router.get('/:id/viewer-meta', documentsController.getDocumentViewerMeta)
router.get('/:id/versions', documentsController.listVersions)
router.post('/:id/versions/:versionId/restore', requirePermission('documents', 'edit'), documentsController.restoreDocumentVersion)
router.get('/:id/shares', documentsController.listDocumentShareLinks)
router.post('/:id/share', requirePermission('documents', 'edit'), documentsController.createDocumentShareLink)
router.post('/:id/esign/request', requirePermission('documents', 'edit'), documentsController.requestDocumentESign)
router.post('/:id/links', requirePermission('documents', 'edit'), documentsController.linkDocument)
router.post('/:id/folders', requirePermission('documents', 'edit'), documentsController.linkDocumentFolders)
router.post('/', requirePermission('documents', 'edit'), upload.single('file'), documentsController.createDocument)

export default router
