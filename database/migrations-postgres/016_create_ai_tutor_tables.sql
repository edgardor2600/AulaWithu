-- Migration 016: AI Tutor Materials and Evaluations
-- Schema derived from ai_tutor_library.py (Python/SQLite legacy) → PostgreSQL

-- Biblioteca de Guiones de Lecciones estructuradas por IA
CREATE TABLE IF NOT EXISTS ai_tutor_materials (
    id          SERIAL PRIMARY KEY,
    content_id  VARCHAR(255) NOT NULL UNIQUE,   -- Unique identifier (from legacy: library_id)
    title       VARCHAR(255) NOT NULL,
    topic       VARCHAR(255) NOT NULL,
    subject     VARCHAR(100) NOT NULL DEFAULT 'English',
    level       VARCHAR(50)  NOT NULL DEFAULT 'B1',
    mode        VARCHAR(50)  NOT NULL DEFAULT 'guided',   -- 'guided' | 'practice'
    context     TEXT         NOT NULL DEFAULT '',
    source_kind VARCHAR(50)  NOT NULL DEFAULT 'generated',
    script_json JSONB        NOT NULL,                    -- Complete lesson script with phases
    created_by  VARCHAR(255),                              -- user_id or email
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_materials_mode       ON ai_tutor_materials(mode);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_materials_updated_at ON ai_tutor_materials(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_materials_content_id ON ai_tutor_materials(content_id);

-- Historial de evaluaciones formativas por fase
-- NOTE: board screenshots are NOT stored here — they are sent directly to LLM and only
-- the resulting feedback text is persisted.
CREATE TABLE IF NOT EXISTS student_ai_evaluations (
    id          SERIAL PRIMARY KEY,
    session_id  VARCHAR(255) NOT NULL,
    student_id  VARCHAR(255),
    material_id INT REFERENCES ai_tutor_materials(id) ON DELETE SET NULL,
    phase_index INT  NOT NULL DEFAULT 0,
    score       INT  NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    feedback    TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_ai_evals_session    ON student_ai_evaluations(session_id);
CREATE INDEX IF NOT EXISTS idx_student_ai_evals_material   ON student_ai_evaluations(material_id);
CREATE INDEX IF NOT EXISTS idx_student_ai_evals_created_at ON student_ai_evaluations(created_at DESC);
