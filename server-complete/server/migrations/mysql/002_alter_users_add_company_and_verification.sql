-- Upgrade path: existing `users` table from before SalesDesk / email verification.
-- Run ONLY if those columns are missing. If a statement errors with "Duplicate column", skip it.
-- MySQL 8+

ALTER TABLE users
  ADD COLUMN company_name VARCHAR(200) NOT NULL DEFAULT '' AFTER avatar;

ALTER TABLE users
  ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 1 AFTER company_name;

ALTER TABLE users
  ADD COLUMN email_verification_otp_hash VARCHAR(255) NULL AFTER email_verified;

ALTER TABLE users
  ADD COLUMN email_verification_otp_expires_at DATETIME NULL AFTER email_verification_otp_hash;

ALTER TABLE users
  ADD COLUMN last_verification_email_sent_at DATETIME NULL AFTER email_verification_otp_expires_at;
