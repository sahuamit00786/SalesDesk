import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const CountryPhoneCode = sequelize.define(
  'CountryPhoneCode',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    countryName: { type: DataTypes.STRING(120), allowNull: false, field: 'country_name' },
    iso2: { type: DataTypes.STRING(2), allowNull: false },
    dialCode: { type: DataTypes.STRING(8), allowNull: false, field: 'dial_code' },
    flagEmoji: { type: DataTypes.STRING(8), allowNull: true, field: 'flag_emoji' },
    leadingDigits: { type: DataTypes.STRING(12), allowNull: true, field: 'leading_digits' },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_default' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  },
  { tableName: 'country_phone_codes', timestamps: true },
)
