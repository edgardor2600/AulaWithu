-- Migration 011: Advanced Exams Fields
-- AulaWithu - Sistema de Evaluaciones Avanzado
-- Created: 2026-06-25
-- Purpose: Add skill_type, scale_max, skill_category, and media_url to support specialized exam templates.

-- 1. Add fields to 'exams' table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS scale_max DECIMAL(4,2) NOT NULL DEFAULT 5.00;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS skill_type VARCHAR(50) NOT NULL DEFAULT 'complete';

-- 2. Add fields to 'exam_questions' table
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS skill_category VARCHAR(50) NOT NULL DEFAULT 'complete';
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS media_url VARCHAR(2083) NULL;
