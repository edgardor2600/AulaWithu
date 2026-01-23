-- Migration 006: Groups and Enrollments System (PostgreSQL)
-- Aula Colaborativa - Class Group Management
-- Created: 2025-12-19
-- Converted to PostgreSQL: 2026-01-23
-- Purpose: Add groups to organize students within classes and enrollment system

-- ============================================
-- CREATE GROUPS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS groups (
  id VARCHAR(255) PRIMARY KEY,
  class_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  max_students INTEGER DEFAULT 30,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE(class_id, name)
);

-- ============================================
-- CREATE ENROLLMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS enrollments (
  id VARCHAR(255) PRIMARY KEY,
  group_id VARCHAR(255) NOT NULL,
  student_id VARCHAR(255) NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  enrolled_by VARCHAR(255), -- Teacher or admin who enrolled the student
  status VARCHAR(50) CHECK(status IN ('active', 'inactive', 'completed')) DEFAULT 'active',
  notes TEXT, -- Optional: progress notes, observations
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (enrolled_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(group_id, student_id)
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_groups_class ON groups(class_id) WHERE active = 1;
CREATE INDEX IF NOT EXISTS idx_enrollments_group ON enrollments(group_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

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
