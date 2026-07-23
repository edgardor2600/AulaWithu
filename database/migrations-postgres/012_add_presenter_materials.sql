-- Migration 012: Add Presenter Materials (PostgreSQL)
-- Description: Create session_materials table to persist documents uploaded to the presenter tool.
-- Created: 2026-07-21

CREATE TABLE IF NOT EXISTS session_materials (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    slide_urls JSONB NOT NULL, -- Array of URLs ["/uploads/slide_1.png", ...]
    current_slide_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
