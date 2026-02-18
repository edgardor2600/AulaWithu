-- Migration 010: Add Schedule Time to Groups
-- Aula Colaborativa - Group Schedule Management
-- Created: 2026-01-26
-- Purpose: Add specific hour schedule to groups (8-9, 9-10, etc.)

-- ============================================
-- ADD SCHEDULE_TIME COLUMN TO GROUPS
-- ============================================

-- Add new schedule_time column
-- Format: "HH:00-HH:00" (e.g., "08:00-09:00", "14:00-15:00")
-- Note: Old schedule_days, schedule_start, schedule_end columns will be deprecated but kept for backward compatibility
ALTER TABLE groups ADD COLUMN schedule_time TEXT;

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- 1. Schedule time is now a single field with format "HH:00-HH:00"
-- 2. Valid times:
--    Morning: 08:00-09:00, 09:00-10:00, 10:00-11:00, 11:00-12:00
--    Afternoon/Evening: 14:00-15:00, 15:00-16:00, 16:00-17:00, 17:00-18:00, 18:00-19:00, 19:00-20:00, 20:00-21:00, 21:00-22:00
-- 3. This is validated in the service layer
-- 4. Old schedule_days, schedule_start, schedule_end columns are deprecated but kept for backward compatibility
