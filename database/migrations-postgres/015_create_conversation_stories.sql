-- Migration 015: Add Conversation Stories Table (PostgreSQL / Supabase)
-- Description: Table to persist interactive dialogue stories, speakers, clips, and vocabulary.

CREATE TABLE IF NOT EXISTS conversation_stories (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    topics VARCHAR(255) NOT NULL DEFAULT 'General',
    level VARCHAR(50) NOT NULL DEFAULT 'A1',
    dialogue_text TEXT NOT NULL,
    supplementary_text TEXT,
    speakers JSONB NOT NULL DEFAULT '[]'::jsonb,
    clips JSONB DEFAULT '[]'::jsonb,
    image_url VARCHAR(500),
    timestamp BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
