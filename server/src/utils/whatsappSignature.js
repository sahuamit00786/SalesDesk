import crypto from 'crypto'

/**
 * Verifies Meta's `X-Hub-Signature-256` header against the raw request body
 * using the company's own WhatsApp App Secret. Requires the raw (pre-JSON-parse)
 * bytes — see app.js's express.json `verify` callback which stashes them on
 * `req.rawBody`.
 */
export function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!rawBody || !signatureHeader || !appSecret) return false
  if (!signatureHeader.startsWith('sha256=')) return false
  const given = signatureHeader.slice(7)
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  if (given.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(given, 'utf8'), Buffer.from(expected, 'utf8'))
}

/** Constant-time string equality — same guard used for the HMAC check above. */
export function timingSafeStringEqual(given, expected) {
  if (!given || !expected) return false
  const a = Buffer.from(String(given), 'utf8')
  const b = Buffer.from(String(expected), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
