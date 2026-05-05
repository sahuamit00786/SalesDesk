import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Opportunity = sequelize.define(
  'Opportunity',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    companyId: { type: DataTypes.UUID, allowNull: false, field: 'company_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: true, field: 'workspace_id' },
    leadId: { type: DataTypes.UUID, allowNull: true, field: 'lead_id' },
    ownerUserId: { type: DataTypes.CHAR(36), allowNull: true, field: 'owner_user_id' },
    createdBy: { type: DataTypes.CHAR(36), allowNull: true, field: 'created_by' },
    updatedBy: { type: DataTypes.CHAR(36), allowNull: true, field: 'updated_by' },

    fullName: { type: DataTypes.STRING(255), allowNull: false, field: 'full_name' },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phoneNumber: { type: DataTypes.STRING(64), allowNull: true, field: 'phone_number' },
    directPhone: { type: DataTypes.STRING(64), allowNull: true, field: 'direct_phone' },
    jobTitle: { type: DataTypes.STRING(160), allowNull: true, field: 'job_title' },

    companyName: { type: DataTypes.STRING(255), allowNull: false, field: 'company_name' },
    industry: { type: DataTypes.STRING(160), allowNull: true },
    companySize: { type: DataTypes.STRING(80), allowNull: true, field: 'company_size' },
    employeeRange: { type: DataTypes.STRING(80), allowNull: true, field: 'employee_range' },
    website: { type: DataTypes.STRING(255), allowNull: true },
    linkedin: { type: DataTypes.STRING(255), allowNull: true },
    location: { type: DataTypes.STRING(160), allowNull: true },
    timezone: { type: DataTypes.STRING(80), allowNull: true },

    dealValue: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'deal_value' },
    currentStage: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'Lead Inbound', field: 'current_stage' },
    leadScore: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'lead_score' },
    tags: { type: DataTypes.JSON, allowNull: true },

    lastActivityType: { type: DataTypes.STRING(80), allowNull: true, field: 'last_activity_type' },
    lastActivityText: { type: DataTypes.TEXT, allowNull: true, field: 'last_activity_text' },
    lastActivityAt: { type: DataTypes.DATE, allowNull: true, field: 'last_activity_at' },

    isDeleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_deleted' },
  },
  {
    tableName: 'opportunities',
    timestamps: true,
    paranoid: true,
  },
)

