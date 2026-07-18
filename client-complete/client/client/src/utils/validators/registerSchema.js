import { z } from 'zod'
import {
  PASSWORD_MAX_LENGTH,
  passwordMeetsPolicy,
  passwordPolicySummary,
} from '@/utils/passwordPolicy'

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    companyName: z.string().min(2, 'Company name is required'),
    email: z.string().email('Enter a valid work email'),
    password: z
      .string()
      .max(PASSWORD_MAX_LENGTH, `At most ${PASSWORD_MAX_LENGTH} characters`)
      .refine((p) => passwordMeetsPolicy(p), { message: passwordPolicySummary() }),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
})
