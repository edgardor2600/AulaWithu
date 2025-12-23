-- Migration 006: Groups and Enrollments System
-- Aula Colaborativa - Class Group Management
-- Created: 2025-12-19
-- Purpose: Add groups to organize students within classes and enrollment system

-- ============================================
-- CREATE GROUPS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  max_students INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE(class_id, name)
);

-- ============================================
-- CREATE ENROLLMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  enrolled_by TEXT, -- Teacher or admin who enrolled the student
  status TEXT CHECK(status IN ('active', 'inactive', 'completed')) DEFAULT 'active',
  notes TEXT, -- Optional: progress notes, observations
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (enrolled_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(group_id, student_id)
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_groups_class ON groups(class_id) WHERE active = 1;
CREATE INDEX idx_enrollments_group ON enrollments(group_id) WHERE status = 'active';
CREATE INDEX idx_enrollments_student ON enrollments(student_id) WHERE status = 'active';
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- 1. Groups belong to classes (N:1 relationship)
-- 2. Students can be enrolled in multiple groups (N:N through enrollments)
-- 3. Enrollments track who enrolled the student and when
-- 4. Status allows for lifecycle management: active, inactive, completed
-- 5. Soft delete with active=0 for groups
-- 6. max_students is a guideline, not enforced at DB level (enforced in service layer)
-- 7. Unique constraint ensures one enrollment per student per group
