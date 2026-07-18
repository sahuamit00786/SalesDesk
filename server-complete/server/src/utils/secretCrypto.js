import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12

function getKey() {
  const raw = process.env.SMTP_CREDENTIALS_ENC_KEY
  if (!raw) {
    const err = new Error('SMTP_CREDENTIALS_ENC_KEY is not configured')
    err.code = 'ENC_KEY_MISSING'
    throw err
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    const err = new Error('SMTP_CREDENTIALS_ENC_KEY must decode to 32 bytes (base64)')
    err.code = 'ENC_KEY_INVALID'
    throw err
  }
  return key
}

/** AES-256-GCM encrypt; returns base64(iv|authTag|ciphertext). */
export function encryptSecret(plain) {
  if (plain == null || plain === '') return null
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64')
}

/** Reverses encryptSecret(). Returns null for empty input. */
export function decryptSecret(encoded) {
  if (!encoded) return null
  const key = getKey()
  const buf = Buffer.from(encoded, 'base64')
  const iv = buf.subarray(0, IV_LENGTH)
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16)
  const ciphertext = buf.subarray(IV_LENGTH + 16)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

export function secretCryptoConfigured() {
  return Boolean(process.env.SMTP_CREDENTIALS_ENC_KEY)
}
