import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const DuplicateLead = sequelize.define(
  'DuplicateLead',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    leadData: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'lead_data',
    },
    matchedLeadId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'matched_lead_id',
    },
    matchedLeadTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'matched_lead_title',
    },
    matchField: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'match_field',
    },
    source: {
      type: DataTypes.ENUM('manual', 'csv_import', 'opportunity'),
      allowNull: false,
      defaultValue: 'manual',
    },
    status: {
      type: DataTypes.ENUM('pending', 'merged', 'created', 'deleted'),
      allowNull: false,
      defaultValue: 'pending',
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'workspace_id',
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
    },
    createdByUserId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'created_by_user_id',
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_deleted',
    },
  },
  {
    tableName: 'duplicate_leads',
    timestamps: true,
    underscored: true,
  },
)
