import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const CampaignTeamMember = sequelize.define(
  'CampaignTeamMember',
  {
    campaignId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: 'campaign_id' },
    userId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: 'user_id' },
  },
  { tableName: 'campaign_team_members', timestamps: true },
)
