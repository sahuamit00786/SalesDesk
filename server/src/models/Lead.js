import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Lead = sequelize.define(
  'Lead',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
    },
    ownerUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'owner_user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'workspace_id',
      references: {
        model: 'workspaces',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    contactName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'contact_name',
    },
    company: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    designation: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    phoneCountryCode: {
      type: DataTypes.STRING(8),
      allowNull: true,
      field: 'phone_country_code',
    },
    altPhone: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'alt_phone',
    },
    altPhoneCountryCode: {
      type: DataTypes.STRING(8),
      allowNull: true,
      field: 'alt_phone_country_code',
    },
    value: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    /** ISO 4217 code for `value` (deals / opportunities). */
    valueCurrency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      field: 'value_currency',
    },
    status: {
      type: DataTypes.ENUM('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'junk'),
      allowNull: false,
      defaultValue: 'new',
    },
    source: {
      type: DataTypes.ENUM('web_form', 'manual', 'csv_import', 'api', 'referral', 'campaign', 'linkedin', 'cold_email', 'other'),
      allowNull: false,
    },
    sourceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'source_id',
    },
    score: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_to',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    closingDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'closing_date',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    requirement: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    street: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    state: {
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
    profileMeta: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'profile_meta',
    },
    lostReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'lost_reason',
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_deleted',
    },
    isOpportunity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_opportunity',
    },
    opportunityStage: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'opportunity_stage',
    },
    opportunityStatus: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'opportunity_status_id',
    },
  },
  {
    tableName: 'leads',
    timestamps: true,
    paranoid: true,
  },
)
