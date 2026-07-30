import { Router } from 'express'
import multer from 'multer'
import { validateUpload } from '../middleware/validateUpload.js'
import * as publicFormController from '../controllers/publicFormController.js'

const router = Router()
const upload = multer({
  dest: 'uploads/webforms',
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
})

router.get('/forms/:token', publicFormController.publicFormSchema)
router.post('/forms/:token/submit', upload.any(), validateUpload, publicFormController.submitForm)
router.post('/forms/:token/view', publicFormController.trackView)

export default router
