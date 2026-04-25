import { Company, User } from '../models/index.js'
import { userAuthIncludes } from '../queries/userIncludes.js'
import { patchMyCompanySchema } from '../validations/company.js'
import { serializeUser } from '../serializers/userSerializer.js'
import { ensureCompanyWorkspace } from '../services/workspaceService.js'

export async function patchMyCompany(req, res, next) {
  try {
    const { error, value } = patchMyCompanySchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = error.details.map((d) => d.message).join(', ')
      err.details = error.details
      throw err
    }

    const user = await User.findByPk(req.user.id)
    if (!user?.companyId) {
      const err = new Error('No company linked')
      err.status = 400
      err.code = 'NO_COMPANY'
      err.publicMessage = 'Your account is not linked to a company yet'
      throw err
    }

    const company = await Company.findByPk(user.companyId)
    if (!company) {
      const err = new Error('Company not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Company not found'
      throw err
    }

    const {
      name,
      websiteUrl,
      industry,
      city,
      country,
      employeeRange,
      monthlyLeadsBand,
      leadPainTags,
      leadPainNotes,
      currentToolsNotes,
      onboardingCompleted,
    } = value

    if (name !== undefined) company.name = name
    if (websiteUrl !== undefined) {
      const raw = typeof websiteUrl === 'string' ? websiteUrl.trim() : ''
      if (!raw) company.websiteUrl = null
      else company.websiteUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    }
    if (industry !== undefined) company.industry = industry || null
    if (city !== undefined) company.city = city || null
    if (country !== undefined) company.country = country || null
    if (employeeRange !== undefined) company.employeeRange = employeeRange || null
    if (monthlyLeadsBand !== undefined) company.monthlyLeadsBand = monthlyLeadsBand || null
    if (leadPainTags !== undefined) company.leadPainTags = leadPainTags ?? null
    if (leadPainNotes !== undefined) company.leadPainNotes = leadPainNotes || null
    if (currentToolsNotes !== undefined) company.currentToolsNotes = currentToolsNotes || null
    if (onboardingCompleted === true) {
      company.onboardingCompletedAt = new Date()
    }

    await company.save()
    await ensureCompanyWorkspace(company)

    await user.reload({ include: userAuthIncludes })

    return res.json({
      success: true,
      data: serializeUser(user),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}
