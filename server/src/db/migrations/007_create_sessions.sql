-- Migration 007: Create sessions table for live collaboration
-- Purpose: Track active and historical live sessions between teachers and students

CREATE TABLE IF NOT EXISTS sessions (
  -- Primary identification
  id TEXT PRIMARY KEY,
  
  -- Session context
  class_id TEXT NOT NULL,
  slide_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  
  -- Session access
  session_code TEXT UNIQUE NOT NULL,
  
  -- Session state
  is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
  allow_student_draw INTEGER DEFAULT 0 CHECK(allow_student_draw IN (0, 1)),
  
  -- Metadata
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  
  -- Foreign key constraints
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (slide_id) REFERENCES slides(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance (only create if table exists)
CREATE INDEX IF NOT EXISTS idx_sessions_class_id ON sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher_id ON sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_code ON sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_active_teacher ON sessions(teacher_id, is_active);
