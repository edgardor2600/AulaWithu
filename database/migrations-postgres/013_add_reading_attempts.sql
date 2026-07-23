-- Migration 013: Add Reading Attempts (PostgreSQL)
-- Description: Table to persist student reading game attempts, scores, and evaluations.
-- Created: 2026-07-22

CREATE TABLE IF NOT EXISTS student_reading_attempts (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE,
    student_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    story_title VARCHAR(255),
    story_text TEXT NOT NULL,
    wpm_setting INT NOT NULL DEFAULT 120,
    overall_score INT NOT NULL DEFAULT 0,
    pronunciation_score INT NOT NULL DEFAULT 0,
    feedback TEXT,
    audio_url VARCHAR(255),
    words_alignment JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
