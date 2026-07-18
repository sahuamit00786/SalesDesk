import crypto from 'node:crypto'
import bcrypt from 'bcrypt'

const BCRYPT_ROUNDS = 10

export function generateInvitePlainToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export async function hashInviteToken(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyInviteToken(plain, hash) {
  if (!plain || !hash) return false
  return bcrypt.compare(plain, hash)
}

export function inviteExpiresAt(hours = 48) {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}
