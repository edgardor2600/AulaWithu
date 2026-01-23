-- Migration 003: Add Authentication Fields (PostgreSQL)
-- Aula Colaborativa - Secure Authentication
-- Created: 2025-12-19
-- Converted to PostgreSQL: 2026-01-23
-- Purpose: Add username/password authentication to users table

-- ============================================
-- ADD AUTHENTICATION COLUMNS TO USERS TABLE
-- ============================================

-- Username for login (will be UNIQUE and NOT NULL after seed)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);

-- Password hash (bcrypt)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- User active status (soft delete)
ALTER TABLE users ADD COLUMN IF NOT EXISTS active INTEGER DEFAULT 1;

-- Last login timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- ============================================
-- CREATE UNIQUE INDEX FOR USERNAME
-- ============================================

-- Partial unique index (allows NULL during migration phase)
-- After seed, all users will have username
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unique_username 
  ON users(username) 
  WHERE username IS NOT NULL;

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- 1. All existing users will have NULL in new columns initially
-- 2. Seed script will delete old test users and create new ones
-- 3. New users will have username and password_hash populated
-- 4. For production: users would need to be migrated with a data script
-- 5. This is a CLEAN migration (no backward compatibility with old auth)
