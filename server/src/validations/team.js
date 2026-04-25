import Joi from 'joi'

const email = Joi.string().email().required()
const companyRoleId = Joi.string().uuid().required()

export const createInvitationSchema = Joi.object({
  email,
  companyRoleId,
  workspaceIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
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
