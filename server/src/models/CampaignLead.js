import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const CampaignLead = sequelize.define(
  'CampaignLead',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    campaignId: { type: DataTypes.UUID, allowNull: false, field: 'campaign_id' },
    leadId: { type: DataTypes.UUID, allowNull: false, field: 'lead_id' },
    stageKey: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'new', field: 'stage_key' },
    assignedUserId: { type: DataTypes.UUID, allowNull: true, field: 'assigned_user_id' },
  },
  { tableName: 'campaign_leads', timestamps: true },
)
