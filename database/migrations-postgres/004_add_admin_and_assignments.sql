-- Migration 004: Admin Role and Teacher-Student Assignments (PostgreSQL)
-- Aula Colaborativa - Administrative Features
-- Created: 2025-12-19
-- Converted to PostgreSQL: 2026-01-23
-- Purpose: Add admin role and teacher-student assignment system

-- ============================================
-- ADD ADMIN ROLE TO USERS
-- ============================================

-- PostgreSQL: The CHECK constraint in table users already includes 'admin'
-- No changes needed here

-- ============================================
-- CREATE TEACHER-STUDENTS ASSIGNMENT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_students (
  id VARCHAR(255) PRIMARY KEY,
  teacher_id VARCHAR(255) NOT NULL,
  student_id VARCHAR(255) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by VARCHAR(255), -- Admin user who made the assignment
  notes TEXT, -- Optional: level, group, comments
  active INTEGER DEFAULT 1,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(teacher_id, student_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher ON teacher_students(teacher_id) WHERE active = 1;
CREATE INDEX IF NOT EXISTS idx_teacher_students_student ON teacher_students(student_id) WHERE active = 1;

-- ============================================
-- CREATE INITIAL ADMIN USER
-- ============================================

-- Admin user credentials:
-- Username: admin
-- Password: admin123 (MUST BE CHANGED after first login)
-- Password hash for 'admin123' generated with bcrypt (10 rounds)

INSERT INTO users (
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
)
ON CONFLICT (id) DO NOTHING;

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
