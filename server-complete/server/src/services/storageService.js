import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Phase 6 — storage service abstraction.
 *
 * ONE place that knows where files physically live and how to resolve a stored
 * reference ("/uploads/documents/<ws>/<file>") to something servable. Today it's
 * local disk; swapping to S3 later means implementing the same 4 methods in an
 * s3Driver and flipping STORAGE_DRIVER — no controller changes.
 *
 * This does NOT change how files are WRITTEN (multer still writes to disk); it
 * centralizes READ/resolve/authorize so the authenticated file route (see
 * fileAccessController) has a single, safe path resolver that can't be tricked
 * into traversal.
 */

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const UPLOADS_ROOT = path.join(appRoot, 'uploads')

// Allowed logical scopes → their on-disk subdir. Anything else is rejected.
const SCOPE_DIRS = {
  documents: 'documents',
  email: 'email',
  leave: 'leave',
  webforms: 'webforms',
  leads: 'leads',
}

/**
 * Parse a stored reference like "/uploads/documents/<ws>/<name>" (or a bare
 * "documents/<ws>/<name>") into { scope, workspaceId, fileName } — or null if it
 * doesn't match the safe shape. Rejects any traversal attempt.
 */
export function parseStoredRef(ref) {
  if (!ref || typeof ref !== 'string') return null
  const clean = ref.replace(/^\/+/, '').replace(/^uploads\//, '')
  const parts = clean.split('/').filter(Boolean)
  if (parts.length < 3) return null
  const [scope, workspaceId, ...rest] = parts
  const fileName = rest.join('/')
  if (!SCOPE_DIRS[scope]) return null
  // No traversal, no separators smuggled into the filename segment.
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) return null
  if (workspaceId.includes('..') || workspaceId.includes('/') || workspaceId.includes('\\')) return null
  return { scope, workspaceId, fileName }
}

const localDriver = {
  /** Absolute path for a parsed ref, guaranteed inside UPLOADS_ROOT. */
  resolveAbsolute({ scope, workspaceId, fileName }) {
    const abs = path.join(UPLOADS_ROOT, SCOPE_DIRS[scope], workspaceId, fileName)
    const normalized = path.normalize(abs)
    // Defense in depth: the resolved path must stay under UPLOADS_ROOT.
    if (!normalized.startsWith(UPLOADS_ROOT + path.sep)) return null
    return normalized
  },
  exists(absPath) {
    try {
      return Boolean(absPath) && fs.existsSync(absPath) && fs.statSync(absPath).isFile()
    } catch {
      return false
    }
  },
  createReadStream(absPath) {
    return fs.createReadStream(absPath)
  },
  stat(absPath) {
    return fs.statSync(absPath)
  },
}

// Driver selection — local today; add s3Driver and switch on env later.
function getDriver() {
  // if (process.env.STORAGE_DRIVER === 's3') return s3Driver
  return localDriver
}

/**
 * Resolve a stored ref to { absPath, scope, workspaceId, fileName } if valid and
 * present, else null. The caller (file route) still enforces tenant access —
 * this only resolves location safely.
 */
export function resolveStoredFile(ref) {
  const parsed = parseStoredRef(ref)
  if (!parsed) return null
  const driver = getDriver()
  const absPath = driver.resolveAbsolute(parsed)
  if (!absPath || !driver.exists(absPath)) return null
  return { ...parsed, absPath }
}

export function streamStoredFile(absPath) {
  return getDriver().createReadStream(absPath)
}

export function statStoredFile(absPath) {
  return getDriver().stat(absPath)
}

export { UPLOADS_ROOT, SCOPE_DIRS }
