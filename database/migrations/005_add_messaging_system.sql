-- ============================================
-- MIGRATION 005: Messaging System
-- ============================================
-- Description: Add messaging system for teacher-student communication
-- Date: 2025-12-19
-- ============================================

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read INTEGER DEFAULT 0,  -- SQLite uses INTEGER for boolean (0 = false, 1 = true)
  deleted_by_sender INTEGER DEFAULT 0,
  deleted_by_receiver INTEGER DEFAULT 0,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================
-- Notes:
-- - Messages are only between teacher and their assigned students
-- - Validation of teacher-student relationship is done in service layer
-- - Soft delete using deleted_by_sender/deleted_by_receiver flags
-- - read = 0 (unread), read = 1 (read)
-- ============================================
