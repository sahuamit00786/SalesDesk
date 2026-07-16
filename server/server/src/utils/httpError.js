/**
 * Tiny helper so services stop hand-rolling `const err = new Error(...); err.status=...`
 * (the codebase does this in ~30 places). Same resulting shape the existing
 * errorHandler already understands — purely a convenience, old throws keep working.
 *
 *   throw httpError(404, 'NOT_FOUND', 'Lead not found')
 *   throw httpError(403, 'FORBIDDEN', 'You do not have access to this call')
 *   throw httpError(409, 'STALE_WRITE', 'This lead was changed by someone else. Refresh and retry.', { updatedAt })
 */
export function httpError(status, code, publicMessage, details) {
  const err = new Error(publicMessage)
  err.status = status
  err.code = code
  err.publicMessage = publicMessage
  if (details) err.details = details
  return err
}

export const notFound = (what = 'Record') => httpError(404, 'NOT_FOUND', `${what} not found`)
export const forbidden = (msg = 'You do not have permission for this action') =>
  httpError(403, 'FORBIDDEN', msg)
export const badRequest = (msg, details) => httpError(400, 'VALIDATION_ERROR', msg, details)
