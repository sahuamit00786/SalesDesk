import { Router } from 'express'
import multer from 'multer'
import * as documentsController from '../../controllers/documentsController.js'
import { requirePermission } from '../../middleware/requirePermission.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

router.get('/', documentsController.listAllDocuments)
router.get('/folder-tree', documentsController.folderTree)
router.get('/lead-summaries', documentsController.listLeadDocumentSummariesHandler)
router.post('/folders', requirePermission('manage.documents', 'create'), documentsController.createFolder)
router.get('/folders/:id/info', documentsController.getFolderInfo)
router.delete('/folders/:id', requirePermission('manage.documents', 'delete'), documentsController.deleteFolderWithContents)
router.post('/email-attachments/save', requirePermission('manage.documents', 'create'), documentsController.saveEmailAttachmentToDocuments)
router.patch('/:id', requirePermission('manage.documents', 'update'), documentsController.patchDocument)
router.delete('/:id', requirePermission('manage.documents', 'delete'), documentsController.deleteDocument)
router.get('/:id/viewer-meta', documentsController.getDocumentViewerMeta)
router.get('/:id/versions', documentsController.listVersions)
router.post('/:id/versions/:versionId/restore', requirePermission('manage.documents', 'update'), documentsController.restoreDocumentVersion)
router.get('/:id/shares', documentsController.listDocumentShareLinks)
router.post('/:id/share', requirePermission('manage.documents', 'update'), documentsController.createDocumentShareLink)
router.post('/:id/esign/request', requirePermission('manage.documents', 'update'), documentsController.requestDocumentESign)
router.post('/:id/links', requirePermission('manage.documents', 'update'), documentsController.linkDocument)
router.post('/:id/folders', requirePermission('manage.documents', 'update'), documentsController.linkDocumentFolders)
router.delete('/:id/folders/:folderId', requirePermission('manage.documents', 'update'), documentsController.removeDocumentFolder)
router.post('/:id/move-folder', requirePermission('manage.documents', 'update'), documentsController.moveDocumentFolder)
router.post('/', requirePermission('manage.documents', 'create'), upload.single('file'), documentsController.createDocument)

export default router
