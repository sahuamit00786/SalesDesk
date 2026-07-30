import { open, unlink } from 'node:fs/promises'

// SVG intentionally excluded: it's an executable document (<svg onload="...">
// runs JS when opened directly), and served alongside every other upload from
// the same origin it was a stored-XSS vector — see §6.2 of the bug audit.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg',
  'video/mp4', 'video/webm', 'video/ogg',
])

// Magic-byte signatures for the types most worth verifying: the declared MIME comes
// straight from the client's Content-Type header and is trivially spoofed (e.g. an
// attacker relabels an .svg/.html payload as "image/png" to slip past the allowlist).
// Checked for images (the XSS-adjacent risk) and PDF; other allowed types are lower-risk
// as passive downloads and aren't magic-byte-checked here.
const SIGNATURES = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
}

function matchesSignature(buf, sig) {
  return sig.every((byte, i) => buf[i] === byte)
}

async function readHeaderBytes(file, length) {
  if (file.buffer) return file.buffer.subarray(0, length)
  if (file.path) {
    let handle
    try {
      handle = await open(file.path, 'r')
      const buf = Buffer.alloc(length)
      const { bytesRead } = await handle.read(buf, 0, length, 0)
      return buf.subarray(0, bytesRead)
    } catch {
      return null
    } finally {
      await handle?.close().catch(() => {})
    }
  }
  return null
}

/** WEBP is a RIFF container: bytes 0-3 "RIFF", bytes 8-11 "WEBP". */
function isWebp(buf) {
  if (!buf || buf.length < 12) return false
  return matchesSignature(buf, [0x52, 0x49, 0x46, 0x46]) && matchesSignature(buf.subarray(8), [0x57, 0x45, 0x42, 0x50])
}

async function contentMatchesDeclaredType(file) {
  if (file.mimetype === 'image/webp') {
    const header = await readHeaderBytes(file, 12)
    return isWebp(header)
  }
  const signatures = SIGNATURES[file.mimetype]
  if (!signatures) return true // no signature defined for this type — allowlist-only check
  const header = await readHeaderBytes(file, 8)
  if (!header) return false
  return signatures.some((sig) => matchesSignature(header, sig))
}

async function rejectFile(file) {
  // validateUpload runs after multer has already written disk-stored files —
  // a rejected upload must not linger on disk under a guessable name.
  if (file.path) await unlink(file.path).catch(() => {})
}

export async function validateUpload(req, res, next) {
  const files = req.files || (req.file ? [req.file] : [])
  if (files.length === 0) return next()

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      await Promise.all(files.map(rejectFile))
      return res.status(400).json({
        success: false,
        error: { message: `File type "${file.mimetype}" is not allowed. Supported: images, PDF, Word, Excel, CSV, audio, video.` },
      })
    }
  }

  for (const file of files) {
    const ok = await contentMatchesDeclaredType(file)
    if (!ok) {
      await Promise.all(files.map(rejectFile))
      return res.status(400).json({
        success: false,
        error: { message: `File content does not match its declared type (${file.mimetype}).` },
      })
    }
  }

  next()
}
