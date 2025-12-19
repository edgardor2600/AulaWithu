-- Migration 004: Admin Role and Teacher-Student Assignments
-- Aula Colaborativa - Administrative Features
-- Created: 2025-12-19
-- Purpose: Add admin role and teacher-student assignment system

-- ============================================
-- ADD ADMIN ROLE TO USERS
-- ============================================

-- Note: SQLite doesn't support ALTER CHECK constraint directly
-- We'll handle the constraint at application level
-- The role column will accept 'admin', 'teacher', 'student'

-- ============================================
-- CREATE TEACHER-STUDENTS ASSIGNMENT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_students (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  assigned_by TEXT, -- Admin user who made the assignment
  notes TEXT, -- Optional: level, group, comments
  active BOOLEAN DEFAULT 1,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(teacher_id, student_id)
);

-- Create index for performance
CREATE INDEX idx_teacher_students_teacher ON teacher_students(teacher_id) WHERE active = 1;
CREATE INDEX idx_teacher_students_student ON teacher_students(student_id) WHERE active = 1;

-- ============================================
-- CREATE INITIAL ADMIN USER
-- ============================================

-- Admin user credentials:
-- Username: admin
-- Password: admin123 (MUST BE CHANGED after first login)
-- Password hash for 'admin123' generated with bcrypt (10 rounds)

INSERT OR IGNORE INTO users (
  id,
  name,
  username,
  password_hash,
  role,
  avatar_color,
  active,
  created_at
) VALUES (
  'admin-001',
  'Administrador',
  'admin',
  '$2b$10$Bl5l5O4wzS993o585xJCuu1BjVIQ9bNCDDkEPPJOMwyYJJDYcH2Vu',
  'admin',
  '#1e293b',
  1,
  CURRENT_TIMESTAMP
);

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- 1. teacher_students table creates N:N relationship between teachers and students
-- 2. A student can be assigned to multiple teachers
-- 3. A teacher can have multiple students
-- 4. Assignments can be deactivated (soft delete) with active=0
-- 5. Admin user created with default credentials
-- 6. SECURITY: Admin password MUST be changed on first use
-- 7. Role validation enforced at application level (TypeScript/Service layer)
