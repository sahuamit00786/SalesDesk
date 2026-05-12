import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(190),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    isCompanyAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_company_admin',
    },
    companyRoleId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'company_role_id',
      references: {
        model: 'company_roles',
        key: 'id',
      },
    },
    avatar: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    jobTitle: {
      type: DataTypes.STRING(160),
      allowNull: true,
      field: 'job_title',
    },
    businessPhone: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'business_phone',
    },
    whatsappNumber: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'whatsapp_number',
    },
    street: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    postalCode: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'postal_code',
    },
    profilePhotoUrl: {
      // Base64 data URLs from "upload from device" are far longer than 1024 chars
      type: DataTypes.TEXT('medium'),
      allowNull: true,
      field: 'profile_photo_url',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at',
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'id',
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    deactivatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deactivated_at',
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    emailVerificationOtpHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    emailVerificationOtpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastVerificationEmailSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'users',
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
  },
)
