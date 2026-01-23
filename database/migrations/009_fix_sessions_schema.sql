-- ============================================
-- MIGRATION 009: Fix Sessions Schema
-- ============================================
-- Description: Add missing columns to sessions table
-- The code expects columns that were never added to the schema
-- Date: 2025-01-20
-- ============================================

-- Add slide_id column (current slide being presented)
ALTER TABLE sessions ADD COLUMN slide_id TEXT;

-- Add session_code column (unique code for students to join)
ALTER TABLE sessions ADD COLUMN session_code TEXT;

-- Add is_active column (boolean: 1 = active, 0 = ended)
ALTER TABLE sessions ADD COLUMN is_active INTEGER DEFAULT 1;

-- Add allow_student_draw column (boolean: 1 = students can draw)
ALTER TABLE sessions ADD COLUMN allow_student_draw INTEGER DEFAULT 0;

-- Add created_at column (the code uses this instead of started_at)
ALTER TABLE sessions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Create unique index for session_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_code ON sessions(session_code) WHERE session_code IS NOT NULL;

-- Create index for active sessions by teacher
CREATE INDEX IF NOT EXISTS idx_sessions_active_teacher ON sessions(teacher_id, is_active);

-- ============================================
-- Notes:
-- - Existing sessions will have NULL for new columns
-- - is_active defaults to 1 (active)
-- - allow_student_draw defaults to 0 (no permission)
-- - The old "status" and "yjs_room_name" columns are kept for safety
-- ============================================
