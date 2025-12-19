-- Migration 004b: Fix role constraint to include admin
-- This migration recreates the users table without the role constraint
-- SQLite doesn't support ALTER table constraint, so we need to:
-- 1. Create new table with correct constraint
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table

-- Create new users table with admin role support
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
  avatar_color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  username TEXT,
  password_hash TEXT,
  active BOOLEAN DEFAULT 1,
  last_login DATETIME
);

-- Copy all data from old table
INSERT INTO users_new SELECT * FROM users;

-- Drop old table
DROP TABLE users;

-- Rename new table
ALTER TABLE users_new RENAME TO users;

-- Recreate the unique index
CREATE UNIQUE INDEX idx_users_unique_username 
  ON users(username) WHERE username IS NOT NULL;
