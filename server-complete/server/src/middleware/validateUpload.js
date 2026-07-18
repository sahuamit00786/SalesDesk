const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg',
  'video/mp4', 'video/webm', 'video/ogg',
])

export function validateUpload(req, res, next) {
  const files = req.files || (req.file ? [req.file] : [])
  if (files.length === 0) return next()
  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: { message: `File type "${file.mimetype}" is not allowed. Supported: images, PDF, Word, Excel, CSV, audio, video.` },
      })
    }
  }
  next()
}
