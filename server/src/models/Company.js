import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const Company = sequelize.define(
  'Company',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    industry: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    addressLine1: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    websiteUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    employeeRange: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    monthlyLeadsBand: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    leadPainNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    leadPainTags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    currentToolsNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    onboardingCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    /** Days of week treated as weekly off for leave (0=Sun … 6=Sat), e.g. [0, 6]. */
    leaveWeeklyOffDays: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'leave_weekly_off_days',
    },
  },
  {
    tableName: 'companies',
  },
)
