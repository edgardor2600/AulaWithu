-- Migration 011: Update Academic Levels to CEFR Standard
-- Aula Colaborativa - English Academy Levels
-- Created: 2026-01-27
-- Purpose: Replace generic levels with CEFR standard levels (A1, A2, B1, B2)

-- ============================================
-- CLEAR EXISTING LEVELS
-- ============================================

DELETE FROM academic_levels;

-- ============================================
-- INSERT CEFR STANDARD LEVELS FOR ENGLISH
-- ============================================

INSERT INTO academic_levels (id, name, description) VALUES
('level-a1', 'A1', 'Principiante - Puede comprender y utilizar expresiones cotidianas de uso frecuente'),
('level-a2', 'A2', 'Elemental - Puede comunicarse en tareas simples y cotidianas'),
('level-b1', 'B1', 'Intermedio - Puede desenvolverse en la mayoría de situaciones que surgen al viajar'),
('level-b2', 'B2', 'Intermedio Alto - Puede interactuar con hablantes nativos con fluidez');

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- 1. CEFR = Common European Framework of Reference for Languages
-- 2. These levels are the international standard for English language proficiency
-- 3. Future levels C1 and C2 can be added as needed
-- 4. All existing student level_id references will be NULL after this migration
-- 5. Update existing students' levels manually or via admin panel
