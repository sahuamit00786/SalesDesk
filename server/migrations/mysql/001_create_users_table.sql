-- Connexify / LeadFlow — baseline users table (matches Sequelize User model)
-- Run against your DB_NAME after CREATE DATABASE.
-- MySQL 8+

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'rep') NOT NULL DEFAULT 'rep',
  avatar VARCHAR(512) NULL,
  company_name VARCHAR(200) NOT NULL DEFAULT '',
  email_verified TINYINT(1) NOT NULL DEFAULT 1,
  email_verification_otp_hash VARCHAR(255) NULL,
  email_verification_otp_expires_at DATETIME NULL,
  last_verification_email_sent_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
