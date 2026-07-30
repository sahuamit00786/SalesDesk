import { Router } from 'express'
import multer from 'multer'
import { validateUpload } from '../../middleware/validateUpload.js'
import * as documentsController from '../../controllers/documentsController.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

router.get('/', documentsController.listAllDocuments)
router.get('/folder-tree', documentsController.folderTree)
router.get('/lead-summaries', documentsController.listLeadDocumentSummariesHandler)
router.post('/folders', documentsController.createFolder)
router.get('/folders/:id/info', documentsController.getFolderInfo)
router.delete('/folders/:id', documentsController.deleteFolderWithContents)
router.post('/email-attachments/save', documentsController.saveEmailAttachmentToDocuments)
router.patch('/:id', documentsController.patchDocument)
router.delete('/:id', documentsController.deleteDocument)
router.get('/:id/viewer-meta', documentsController.getDocumentViewerMeta)
router.get('/:id/versions', documentsController.listVersions)
router.post('/:id/versions/:versionId/restore', documentsController.restoreDocumentVersion)
router.get('/:id/shares', documentsController.listDocumentShareLinks)
router.post('/:id/share', documentsController.createDocumentShareLink)
router.post('/:id/esign/request', documentsController.requestDocumentESign)
router.post('/:id/links', documentsController.linkDocument)
router.post('/:id/folders', documentsController.linkDocumentFolders)
router.delete('/:id/folders/:folderId', documentsController.removeDocumentFolder)
router.post('/:id/move-folder', documentsController.moveDocumentFolder)
router.post('/', upload.single('file'), validateUpload, documentsController.createDocument)

export default router
