-- Migration 017: Quiz Interactive Tables
-- Schema derived from quizzes.db (SQLite legacy) + quiz_generator.py

-- Banco de Quizzes Interactivos
-- questions_json follows the schema from QUIZ_PROTOCOL_TEMPLATE in quiz_generator.py:
-- [ { id, type, question, sentence, options, correct, explanation, image_prompt, ... } ]
CREATE TABLE IF NOT EXISTS quizzes (
    id             SERIAL PRIMARY KEY,
    title          VARCHAR(255) NOT NULL,
    subject        VARCHAR(100) NOT NULL DEFAULT 'English',
    level          VARCHAR(50)  NOT NULL DEFAULT 'A2',
    topic          VARCHAR(255) NOT NULL,
    questions_json JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_by     VARCHAR(255),
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject    ON quizzes(subject);

-- Resultados y Respuestas de Estudiantes en Quizzes
-- answers_json: [ { questionId, answer, isCorrect, score } ]
CREATE TABLE IF NOT EXISTS quiz_student_results (
    id               SERIAL PRIMARY KEY,
    quiz_id          INT REFERENCES quizzes(id) ON DELETE CASCADE,
    session_id       VARCHAR(255) NOT NULL,
    student_id       VARCHAR(255),
    student_name     VARCHAR(255),
    score            INT NOT NULL DEFAULT 0,
    total_questions  INT NOT NULL DEFAULT 0,
    answers_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_session ON quiz_student_results(quiz_id, session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_session      ON quiz_student_results(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_student      ON quiz_student_results(student_id);
