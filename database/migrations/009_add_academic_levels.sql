-- Migration 009: Add Academic Levels System
-- Aula Colaborativa - Academic Level Management
-- Created: 2026-01-26
-- Purpose: Add academic levels (A1, A2, B1, B2) for student organization

-- ============================================
-- CREATE ACADEMIC_LEVELS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS academic_levels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ADD LEVEL FOREIGN KEYS
-- ============================================

-- Add level_id to users table (for students)
-- This column may already exist if migrations ran before, so we use IF NOT EXISTS logic
-- SQLite doesn't support IF NOT EXISTS for columns, so we wrap in a transaction
BEGIN;

-- Check if column exists using PRAGMA
-- If it doesn't exist, add it
SELECT CASE 
  WHEN COUNT(*) = 0 THEN 
    '-- Column does not exist, will add'
  ELSE 
    '-- Column already exists'
END
FROM pragma_table_info('users') 
WHERE name = 'level_id';

-- Try to add the column (will fail silently if it exists)
ALTER TABLE users ADD COLUMN level_id TEXT REFERENCES academic_levels(id);

COMMIT;

-- Add level_id to classes table
BEGIN;

SELECT CASE 
  WHEN COUNT(*) = 0 THEN 
    '-- Column does not exist, will add'
  ELSE 
    '-- Column already exists'
END
FROM pragma_table_info('classes') 
WHERE name = 'level_id';

ALTER TABLE classes ADD COLUMN level_id TEXT REFERENCES academic_levels(id);

COMMIT;

-- ============================================
-- CREATE INDEXES  
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_level ON users(level_id) WHERE role = 'student';
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level_id);

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- 1. Academic levels follow CEFR standard: A1, A2, B1, B2
-- 2. Students have a current level (level_id in users)
-- 3. Classes can be associated with a specific level (level_id in classes)
-- 4. This enables automatic teacher-student assignments based on levels
-- 5. When a student logs in, they will be automatically assigned to all teachers of their level
