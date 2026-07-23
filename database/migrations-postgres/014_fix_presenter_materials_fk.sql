-- Migration 014: Fix Presenter Materials Foreign Key Constraint
-- Description: Allow session_materials to store presenter documents for any slide or standalone session ID.
-- Created: 2026-07-22

ALTER TABLE session_materials DROP CONSTRAINT IF EXISTS session_materials_session_id_fkey;
