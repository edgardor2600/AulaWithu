-- ============================================
-- MIGRATION 008: Add Topics System
-- ============================================
-- This migration adds a new TOPICS layer between CLASSES and SLIDES
-- Structure: CLASS → TOPIC → SLIDE → GROUP

-- Create topics table
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  topic_number INTEGER NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE(class_id, topic_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_topics_class ON topics(class_id);
CREATE INDEX IF NOT EXISTS idx_topics_active ON topics(active);
CREATE INDEX IF NOT EXISTS idx_topics_number ON topics(class_id, topic_number);

-- Add topic_id to slides table
ALTER TABLE slides ADD COLUMN topic_id TEXT;

-- Create index for slides by topic
CREATE INDEX IF NOT EXISTS idx_slides_topic ON slides(topic_id);

-- ============================================
-- IMPORTANT: Manual step required after this migration
-- ============================================
-- Existing slides will have topic_id = NULL
-- You need to either:
-- 1. Delete all existing slides (if they're test data)
-- 2. Create a "General" topic for each class and assign slides to it
-- 
-- The foreign key constraint is NOT added yet to allow
-- existing slides to remain. Once all slides are assigned
-- to topics, you can add the constraint manually:
--
-- ALTER TABLE slides ADD CONSTRAINT fk_slides_topic 
--   FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;
