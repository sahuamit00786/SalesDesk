'use strict'
const { randomUUID } = require('node:crypto')

const rows = [
  ['India', 'IN', '+91', '🇮🇳'],
  ['United States', 'US', '+1', '🇺🇸'],
  ['Canada', 'CA', '+1', '🇨🇦'],
  ['United Kingdom', 'GB', '+44', '🇬🇧'],
  ['Australia', 'AU', '+61', '🇦🇺'],
  ['New Zealand', 'NZ', '+64', '🇳🇿'],
  ['Singapore', 'SG', '+65', '🇸🇬'],
  ['United Arab Emirates', 'AE', '+971', '🇦🇪'],
  ['Saudi Arabia', 'SA', '+966', '🇸🇦'],
  ['Qatar', 'QA', '+974', '🇶🇦'],
  ['Kuwait', 'KW', '+965', '🇰🇼'],
  ['Oman', 'OM', '+968', '🇴🇲'],
  ['Bahrain', 'BH', '+973', '🇧🇭'],
  ['Pakistan', 'PK', '+92', '🇵🇰'],
  ['Bangladesh', 'BD', '+880', '🇧🇩'],
  ['Sri Lanka', 'LK', '+94', '🇱🇰'],
  ['Nepal', 'NP', '+977', '🇳🇵'],
  ['Bhutan', 'BT', '+975', '🇧🇹'],
  ['Maldives', 'MV', '+960', '🇲🇻'],
  ['Afghanistan', 'AF', '+93', '🇦🇫'],
  ['China', 'CN', '+86', '🇨🇳'],
  ['Japan', 'JP', '+81', '🇯🇵'],
  ['South Korea', 'KR', '+82', '🇰🇷'],
  ['Thailand', 'TH', '+66', '🇹🇭'],
  ['Malaysia', 'MY', '+60', '🇲🇾'],
  ['Indonesia', 'ID', '+62', '🇮🇩'],
  ['Philippines', 'PH', '+63', '🇵🇭'],
  ['Vietnam', 'VN', '+84', '🇻🇳'],
  ['Hong Kong', 'HK', '+852', '🇭🇰'],
  ['Taiwan', 'TW', '+886', '🇹🇼'],
  ['Germany', 'DE', '+49', '🇩🇪'],
  ['France', 'FR', '+33', '🇫🇷'],
  ['Italy', 'IT', '+39', '🇮🇹'],
  ['Spain', 'ES', '+34', '🇪🇸'],
  ['Netherlands', 'NL', '+31', '🇳🇱'],
  ['Belgium', 'BE', '+32', '🇧🇪'],
  ['Switzerland', 'CH', '+41', '🇨🇭'],
  ['Austria', 'AT', '+43', '🇦🇹'],
  ['Sweden', 'SE', '+46', '🇸🇪'],
  ['Norway', 'NO', '+47', '🇳🇴'],
  ['Denmark', 'DK', '+45', '🇩🇰'],
  ['Finland', 'FI', '+358', '🇫🇮'],
  ['Ireland', 'IE', '+353', '🇮🇪'],
  ['Portugal', 'PT', '+351', '🇵🇹'],
  ['Poland', 'PL', '+48', '🇵🇱'],
  ['Czech Republic', 'CZ', '+420', '🇨🇿'],
  ['Romania', 'RO', '+40', '🇷🇴'],
  ['Greece', 'GR', '+30', '🇬🇷'],
  ['Turkey', 'TR', '+90', '🇹🇷'],
  ['Russia', 'RU', '+7', '🇷🇺'],
  ['Ukraine', 'UA', '+380', '🇺🇦'],
  ['Israel', 'IL', '+972', '🇮🇱'],
  ['South Africa', 'ZA', '+27', '🇿🇦'],
  ['Egypt', 'EG', '+20', '🇪🇬'],
  ['Nigeria', 'NG', '+234', '🇳🇬'],
  ['Kenya', 'KE', '+254', '🇰🇪'],
  ['Ethiopia', 'ET', '+251', '🇪🇹'],
  ['Morocco', 'MA', '+212', '🇲🇦'],
  ['Algeria', 'DZ', '+213', '🇩🇿'],
  ['Tunisia', 'TN', '+216', '🇹🇳'],
  ['Brazil', 'BR', '+55', '🇧🇷'],
  ['Argentina', 'AR', '+54', '🇦🇷'],
  ['Chile', 'CL', '+56', '🇨🇱'],
  ['Colombia', 'CO', '+57', '🇨🇴'],
  ['Peru', 'PE', '+51', '🇵🇪'],
  ['Mexico', 'MX', '+52', '🇲🇽'],
]

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('country_phone_codes')
    if (!table.flag_emoji) {
      await queryInterface.addColumn('country_phone_codes', 'flag_emoji', {
        type: Sequelize.STRING(8),
        allowNull: true,
      })
    }

    const now = new Date()
    const payload = rows.map(([country_name, iso2, dial_code, flag_emoji], idx) => ({
      id: randomUUID(),
      country_name,
      iso2,
      dial_code,
      flag_emoji,
      leading_digits: null,
      is_default: idx === 0,
      is_active: true,
      created_at: now,
      updated_at: now,
    }))

    await queryInterface.bulkInsert('country_phone_codes', payload, {
      ignoreDuplicates: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('country_phone_codes', 'flag_emoji').catch(() => {})
  },
}
