-- Migration 002: Add Indexes for Performance
-- Created: 2025-12-12

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_slides_class ON slides(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class ON sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_events_session ON events_log(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_student_copies_student ON student_copies(student_id);
CREATE INDEX IF NOT EXISTS idx_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
