import crypto from 'node:crypto'
import bcrypt from 'bcrypt'

const OTP_LENGTH = 6
const OTP_EXPIRY_MIN = 15
const BCRYPT_ROUNDS = 9

export function generateOtpDigits() {
  const n = crypto.randomInt(0, 1_000_000)
  return String(n).padStart(OTP_LENGTH, '0')
}

export async function hashOtp(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyOtp(plain, hash) {
  if (!plain || !hash) return false
  return bcrypt.compare(plain, hash)
}

export function otpExpiresAt() {
  return new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000)
}

export { OTP_EXPIRY_MIN }
