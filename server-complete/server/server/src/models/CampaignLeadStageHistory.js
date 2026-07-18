import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const CampaignLeadStageHistory = sequelize.define(
  'CampaignLeadStageHistory',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    campaignId: { type: DataTypes.UUID, allowNull: false, field: 'campaign_id' },
    campaignLeadId: { type: DataTypes.UUID, allowNull: false, field: 'campaign_lead_id' },
    leadId: { type: DataTypes.UUID, allowNull: false, field: 'lead_id' },
    fromStageKey: { type: DataTypes.STRING(64), allowNull: true, field: 'from_stage_key' },
    toStageKey: { type: DataTypes.STRING(64), allowNull: false, field: 'to_stage_key' },
    changedByUserId: { type: DataTypes.UUID, allowNull: true, field: 'changed_by_user_id' },
  },
  {
    tableName: 'campaign_lead_stage_history',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  },
)
