import Joi from 'joi'
import {
  ALL_COMPANY_USER_ROLE_KIND_VALUES,
  COMPANY_USER_ROLE_KIND_CREATE_VALUES,
} from '../constants/companyUserRoleKind.js'

const email = Joi.string().email().required()
const companyRoleId = Joi.string().uuid().required()

const optionalProfilePhotoUrl = Joi.alternatives()
  .try(Joi.string().uri().max(1024), Joi.string().pattern(/^data:image\//).max(2_000_000))
  .allow('', null)
  .optional()

export const createInvitationSchema = Joi.object({
  name: Joi.string().min(2).max(120).allow('', null).optional(),
  email,
  companyRoleId,
  workspaceIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  department: Joi.string().max(120).allow('', null).optional(),
  jobTitle: Joi.string().max(160).allow('', null).optional(),
  businessPhone: Joi.string().max(32).allow('', null).optional(),
  whatsappNumber: Joi.string().max(32).allow('', null).optional(),
  profilePhotoUrl: optionalProfilePhotoUrl,
  street: Joi.string().max(500).allow('', null).optional(),
  city: Joi.string().max(120).allow('', null).optional(),
  country: Joi.string().max(120).allow('', null).optional(),
  postalCode: Joi.string().max(32).allow('', null).optional(),
})

export const previewInvitationSchema = Joi.object({
  invitationId: Joi.string().uuid().required(),
  token: Joi.string().min(20).max(512).required(),
})

export const acceptInvitationSchema = Joi.object({
  invitationId: Joi.string().uuid().required(),
  token: Joi.string().min(20).max(512).required(),
  name: Joi.string().min(2).max(120).required(),
  password: Joi.string().min(10).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords must match',
  }),
})

export const patchUserRoleSchema = Joi.object({
  companyRoleId,
})

export const patchUserProfileSchema = Joi.object({
  name: Joi.string().min(2).max(120).allow('', null).optional(),
  department: Joi.string().max(120).allow('', null).optional(),
  jobTitle: Joi.string().max(160).allow('', null).optional(),
  businessPhone: Joi.string().max(32).allow('', null).optional(),
  whatsappNumber: Joi.string().max(32).allow('', null).optional(),
  profilePhotoUrl: optionalProfilePhotoUrl,
  street: Joi.string().max(500).allow('', null).optional(),
  city: Joi.string().max(120).allow('', null).optional(),
  country: Joi.string().max(120).allow('', null).optional(),
  postalCode: Joi.string().max(32).allow('', null).optional(),
}).min(1)

export const deactivateUserSchema = Joi.object({
  reassignOwnerUserId: Joi.string().uuid().allow(null).optional(),
})

export const reassignLeadsSchema = Joi.object({
  toUserId: Joi.string().uuid().required(),
})

export const createTeamSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  description: Joi.string().max(500).allow('', null).optional(),
})

export const patchTeamSchema = Joi.object({
  name: Joi.string().min(2).max(120).optional(),
  description: Joi.string().max(500).allow('', null).optional(),
}).min(1)

export const teamMemberSchema = Joi.object({
  userId: Joi.string().uuid().required(),
})

export const replaceUserWorkspacesSchema = Joi.object({
  workspaceIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
})

export const createCompanyRoleSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  description: Joi.string().max(255).allow('', null).optional(),
  userRoleKind: Joi.string()
    .valid(...COMPANY_USER_ROLE_KIND_CREATE_VALUES)
    .required()
    .messages({
      'any.required': 'Select a role type (Workspace admin, Manager, or Sales)',
    }),
  menuPermissions: Joi.array()
    .items(
      Joi.object({
        menuId: Joi.string().uuid().required(),
        canView: Joi.boolean().required(),
        canEdit: Joi.boolean().required(),
        canUpdate: Joi.boolean().required(),
        canDelete: Joi.boolean().required(),
      }),
    )
    .min(1)
    .required(),
})

export const patchCompanyRoleSchema = Joi.object({
  name: Joi.string().min(2).max(120).optional(),
  description: Joi.string().max(255).allow('', null).optional(),
  userRoleKind: Joi.string().valid(...ALL_COMPANY_USER_ROLE_KIND_VALUES).optional(),
  menuPermissions: Joi.array()
    .items(
      Joi.object({
        menuId: Joi.string().uuid().required(),
        canView: Joi.boolean().required(),
        canEdit: Joi.boolean().required(),
        canUpdate: Joi.boolean().required(),
        canDelete: Joi.boolean().required(),
      }),
    )
    .min(1)
    .optional(),
}).min(1)

export const deleteCompanyRoleSchema = Joi.object({
  fallbackCompanyRoleId: Joi.string().uuid().allow(null).optional(),
})
