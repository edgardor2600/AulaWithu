-- Migration 012: Drop teacher_students table
-- Date: 2026-02-17
-- Reason: Migrated to use enrollments for teacher-student relationships
-- 
-- IMPORTANT: This migration removes the teacher_students table as the
-- relationship is now managed implicitly through:
--   enrollments → groups → classes → teacher
--
-- No data migration needed as enrollments already contain the relationship.

-- Drop indexes first
DROP INDEX IF EXISTS idx_teacher_students_teacher;
DROP INDEX IF EXISTS idx_teacher_students_student;

-- Drop table
DROP TABLE IF EXISTS teacher_students;

-- Verification query (optional, for manual check):
-- SELECT 
--   c.teacher_id,
--   u.name as teacher_name,
--   COUNT(DISTINCT e.student_id) as student_count
-- FROM classes c
-- JOIN users u ON c.teacher_id = u.id
-- JOIN groups g ON c.id = g.class_id
-- JOIN enrollments e ON g.id = e.group_id
-- WHERE e.status = 'active' AND g.active = 1
-- GROUP BY c.teacher_id, u.name;
