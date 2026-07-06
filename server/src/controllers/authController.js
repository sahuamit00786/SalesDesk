import bcrypt from 'bcrypt'
import { Company, sequelize, User } from '../models/index.js'
import { userAuthIncludes } from '../queries/userIncludes.js'
import { ensureCompanyWorkspace } from '../services/workspaceService.js'
import { ensureCompanyDefaultRoles } from '../services/companyRoleService.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshTokenPayloadForUser,
} from '../services/tokenService.js'
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validations/auth.js'
import {
  sendCompanyRegistrationNotifyEmail,
  sendPasswordResetOtpEmail,
  sendRegistrationEmails,
  sendResendOtpEmail,
} from '../services/mailService.js'
import {
  generateOtpDigits,
  hashOtp,
  otpExpiresAt,
  verifyOtp,
} from '../services/otpService.js'
import { serializeUser } from '../serializers/userSerializer.js'

const RESEND_COOLDOWN_MS = 60_000

function joiPublicMessages(error) {
  return error.details
    .map((d) => (d.context && typeof d.context.message === 'string' ? d.context.message : d.message))
    .join(', ')
}

function userResponse(user) {
  return serializeUser(user)
}

function tokensForUser(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.isCompanyAdmin ? 'company_admin' : 'member',
    companyRoleId: user.companyRoleId ?? null,
    userRoleKind: user.companyRole?.userRoleKind ?? null,
    isCompanyAdmin: Boolean(user.isCompanyAdmin),
    companyId: user.companyId ?? null,
  }
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(refreshTokenPayloadForUser(user)),
  }
}

async function assignPasswordResetOtp(user) {
  const plain = generateOtpDigits()
  const otpHash = await hashOtp(plain)
  user.passwordResetOtpHash = otpHash
  user.passwordResetOtpExpiresAt = otpExpiresAt()
  await user.save()
  return plain
}

async function assignVerificationOtp(user) {
  const plain = generateOtpDigits()
  const otpHash = await hashOtp(plain)
  user.emailVerificationOtpHash = otpHash
  user.emailVerificationOtpExpiresAt = otpExpiresAt()
  user.lastVerificationEmailSentAt = new Date()
  await user.save()
  return plain
}

export async function register(req, res, next) {
  try {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      err.details = error.details
      throw err
    }

    const { name, companyName, email, password } = value
    const passwordHash = await bcrypt.hash(password, 10)

    const existing = await User.unscoped().findOne({ where: { email }, include: userAuthIncludes })

    if (existing?.emailVerified) {
      const err = new Error('Email already registered')
      err.status = 409
      err.code = 'CONFLICT'
      err.publicMessage = 'Email already registered'
      throw err
    }

    const hadExistingUnverified = Boolean(existing)
    let user
    let company
    let isNewCompany = false

    await sequelize.transaction(async (t) => {
      company = null
      if (existing?.companyId) {
        company = await Company.findByPk(existing.companyId, { transaction: t })
      }
      if (company) {
        await company.update({ name: companyName }, { transaction: t })
        await company.reload({ transaction: t })
      } else {
        company = await Company.create({ name: companyName }, { transaction: t })
        isNewCompany = true
      }

      await ensureCompanyWorkspace(company, { transaction: t })
      await ensureCompanyDefaultRoles(company, { transaction: t })

      const userCount = await User.unscoped().count({
        where: { companyId: company.id },
        transaction: t,
      })
      const isCompanyAdmin = userCount === 0

      if (existing) {
        user = existing
        user.name = name
        user.password = passwordHash
        user.isCompanyAdmin = isCompanyAdmin
        user.companyRoleId = null
        user.isActive = true
        user.deactivatedAt = null
        user.emailVerified = false
        user.companyId = company.id
        await user.save({ transaction: t })
      } else {
        user = await User.unscoped().create(
          {
            name,
            email,
            password: passwordHash,
            isCompanyAdmin,
            companyRoleId: null,
            isActive: true,
            emailVerified: false,
            companyId: company.id,
          },
          { transaction: t },
        )
      }
    })

    await user.reload({ include: userAuthIncludes })

    const otpPlain = await assignVerificationOtp(user)

    let emailMeta = { sent: true }
    try {
      emailMeta = await sendRegistrationEmails({
        to: email,
        name,
        companyName,
        otpPlain,
      })
    } catch (mailErr) {
      return next(mailErr)
    }

    if (isNewCompany) {
      sendCompanyRegistrationNotifyEmail({ company, user }).catch((notifyErr) => {
        // eslint-disable-next-line no-console
        console.error('[company registration notify]', notifyErr?.message || notifyErr)
      })
    }

    return res.status(hadExistingUnverified ? 200 : 201).json({
      success: true,
      data: {
        user: { ...userResponse(user), emailVerified: false },
        message: emailMeta.sent
          ? 'We sent a verification code to your email.'
          : 'Account created. Check the server console for your OTP (development only).',
        meta: {
          emailDispatched: emailMeta.sent,
        },
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { error, value } = verifyEmailSchema.validate(req.body, { abortEarly: false })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      err.details = error.details
      throw err
    }

    const user = await User.unscoped().findOne({
      where: { email: value.email },
      include: userAuthIncludes,
    })
    if (!user) {
      const err = new Error('User not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'No account found for this email'
      throw err
    }

    if (user.emailVerified) {
      const err = new Error('Already verified')
      err.status = 400
      err.code = 'ALREADY_VERIFIED'
      err.publicMessage = 'Email is already verified. Sign in instead.'
      throw err
    }

    if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpiresAt) {
      const err = new Error('No pending verification')
      err.status = 400
      err.code = 'NO_OTP'
      err.publicMessage = 'Request a new verification code'
      throw err
    }

    if (new Date(user.emailVerificationOtpExpiresAt) < new Date()) {
      const err = new Error('OTP expired')
      err.status = 400
      err.code = 'OTP_EXPIRED'
      err.publicMessage = 'Code expired. Resend a new code.'
      throw err
    }

    const ok = await verifyOtp(value.otp, user.emailVerificationOtpHash)
    if (!ok) {
      const err = new Error('Invalid OTP')
      err.status = 400
      err.code = 'INVALID_OTP'
      err.publicMessage = 'Invalid verification code'
      throw err
    }

    user.emailVerified = true
    user.emailVerificationOtpHash = null
    user.emailVerificationOtpExpiresAt = null
    user.lastLoginAt = new Date()
    await user.save()
    await user.reload({ include: userAuthIncludes })

    const tokens = tokensForUser(user)
    return res.json({
      success: true,
      data: {
        user: userResponse(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        message: 'Email verified. You are signed in.',
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function resendVerification(req, res, next) {
  try {
    const { error, value } = resendVerificationSchema.validate(req.body, { abortEarly: false })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      err.details = error.details
      throw err
    }

    const user = await User.unscoped().findOne({ where: { email: value.email } })
    if (!user) {
      const err = new Error('User not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'No account found for this email'
      throw err
    }

    if (user.emailVerified) {
      const err = new Error('Already verified')
      err.status = 400
      err.code = 'ALREADY_VERIFIED'
      err.publicMessage = 'This email is already verified'
      throw err
    }

    const last = user.lastVerificationEmailSentAt
    if (last && Date.now() - new Date(last).getTime() < RESEND_COOLDOWN_MS) {
      const err = new Error('Too many requests')
      err.status = 429
      err.code = 'RATE_LIMIT'
      err.publicMessage = 'Please wait a minute before requesting another code'
      throw err
    }

    const otpPlain = await assignVerificationOtp(user)

    try {
      await sendResendOtpEmail({ to: user.email, name: user.name, otpPlain })
    } catch (mailErr) {
      return next(mailErr)
    }

    return res.json({
      success: true,
      data: {
        message: 'A new verification code was sent to your email.',
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function login(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      err.details = error.details
      throw err
    }

    const user = await User.unscoped().findOne({
      where: { email: value.email },
      include: userAuthIncludes,
    })
    if (!user) {
      const err = new Error('Invalid credentials')
      err.status = 401
      err.code = 'INVALID_CREDENTIALS'
      err.publicMessage = 'Invalid credentials'
      throw err
    }

    const match = await bcrypt.compare(value.password, user.password)
    if (!match) {
      const err = new Error('Invalid credentials')
      err.status = 401
      err.code = 'INVALID_CREDENTIALS'
      err.publicMessage = 'Invalid credentials'
      throw err
    }

    if (!user.emailVerified) {
      const err = new Error('Email not verified')
      err.status = 403
      err.code = 'EMAIL_NOT_VERIFIED'
      err.publicMessage = 'Verify your email before signing in. Check your inbox or resend the code from registration.'
      throw err
    }

    if (user.isActive === false) {
      const err = new Error('Account disabled')
      err.status = 403
      err.code = 'ACCOUNT_DISABLED'
      err.publicMessage = 'Your account has been deactivated. Contact your workspace admin.'
      throw err
    }

    if (!user.companyId) {
      const label = value.email.includes('@') ? value.email.split('@')[1] : 'Workspace'
      await sequelize.transaction(async (t) => {
        const company = await Company.create({ name: label }, { transaction: t })
        await ensureCompanyWorkspace(company, { transaction: t })
        await ensureCompanyDefaultRoles(company, { transaction: t })
        user.companyId = company.id
        user.isCompanyAdmin = true
        user.companyRoleId = null
        await user.save({ transaction: t })
      })
      await user.reload({ include: userAuthIncludes })
    }

    user.lastLoginAt = new Date()
    await user.save()

    const tokens = tokensForUser(user)
    return res.json({
      success: true,
      data: {
        user: userResponse(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function refresh(req, res, next) {
  try {
    const { error, value } = refreshSchema.validate(req.body, { abortEarly: false })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }

    let decoded
    try {
      decoded = verifyRefreshToken(value.refreshToken)
    } catch {
      const err = new Error('Invalid refresh token')
      err.status = 401
      err.code = 'UNAUTHORIZED'
      err.publicMessage = 'Invalid refresh token'
      throw err
    }

    const user = await User.findByPk(decoded.sub, { include: userAuthIncludes })
    if (!user) {
      const err = new Error('User not found')
      err.status = 401
      err.code = 'UNAUTHORIZED'
      err.publicMessage = 'Invalid refresh token'
      throw err
    }

    if (!user.isActive) {
      const err = new Error('Account disabled')
      err.status = 403
      err.code = 'ACCOUNT_DISABLED'
      err.publicMessage = 'Your account has been deactivated.'
      throw err
    }

    const tokenVersion = decoded.rtv === undefined ? 0 : Number(decoded.rtv)
    const userVersion = Number(user.refreshTokenVersion) || 0
    if (!Number.isFinite(tokenVersion) || tokenVersion !== userVersion) {
      const err = new Error('Invalid refresh token')
      err.status = 401
      err.code = 'UNAUTHORIZED'
      err.publicMessage = 'Session expired — please sign in again'
      throw err
    }

    const tokens = tokensForUser(user)
    return res.json({
      success: true,
      data: {
        user: userResponse(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function logout(req, res, next) {
  try {
    const user = await User.unscoped().findByPk(req.user.id)
    if (user) {
      user.refreshTokenVersion = (Number(user.refreshTokenVersion) || 0) + 1
      await user.save()
    }
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body, { abortEarly: false })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }

    const user = await User.unscoped().findOne({ where: { email: value.email } })
    if (user?.isActive && user.emailVerified) {
      const otpPlain = await assignPasswordResetOtp(user)
      await sendPasswordResetOtpEmail({ to: user.email, name: user.name, otpPlain })
    }

    return res.json({
      success: true,
      data: { message: 'If an account exists for that email, a reset code has been sent.' },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body, { abortEarly: false })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = joiPublicMessages(error)
      throw err
    }

    const user = await User.unscoped().findOne({ where: { email: value.email }, include: userAuthIncludes })
    if (!user?.isActive) {
      const err = new Error('Invalid reset request')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'Invalid or expired reset code'
      throw err
    }

    const expired =
      !user.passwordResetOtpExpiresAt || new Date(user.passwordResetOtpExpiresAt).getTime() < Date.now()
    const otpOk = !expired && (await verifyOtp(value.otp, user.passwordResetOtpHash))
    if (!otpOk) {
      const err = new Error('Invalid reset code')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'Invalid or expired reset code'
      throw err
    }

    user.password = await bcrypt.hash(value.password, 10)
    user.passwordResetOtpHash = null
    user.passwordResetOtpExpiresAt = null
    user.refreshTokenVersion = (Number(user.refreshTokenVersion) || 0) + 1
    await user.save()

    return res.json({
      success: true,
      data: { message: 'Password updated. You can sign in with your new password.' },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function me(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id, { include: userAuthIncludes })
    if (!user) {
      const err = new Error('User not found')
      err.status = 401
      err.code = 'UNAUTHORIZED'
      err.publicMessage = 'Session is no longer valid'
      throw err
    }
    return res.json({
      success: true,
      data: userResponse(user),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}
