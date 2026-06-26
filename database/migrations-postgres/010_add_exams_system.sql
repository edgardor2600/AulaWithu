-- Migration 010: Exams System (PostgreSQL)
-- AulaWithu - Sistema de Evaluaciones
-- Created: 2026-06-24
-- Purpose: Add a full exam/evaluation system for teachers and students

-- ============================================
-- EXAMS TABLE
-- ============================================
-- An exam belongs to a class. The teacher who owns the class creates it.
-- It has a time window (available_from / available_to) that controls when
-- students can take it. Status lifecycle: draft -> active -> closed

CREATE TABLE IF NOT EXISTS exams (
  id               VARCHAR(255)   PRIMARY KEY,
  class_id         VARCHAR(255)   NOT NULL,
  title            VARCHAR(255)   NOT NULL,
  description      TEXT,
  duration_minutes INTEGER        NOT NULL DEFAULT 60,
  passing_score    INTEGER        NOT NULL DEFAULT 60 CHECK(passing_score BETWEEN 0 AND 100),
  status           VARCHAR(50)    NOT NULL DEFAULT 'draft'
                                  CHECK(status IN ('draft', 'active', 'closed')),
  available_from   TIMESTAMP      NULL,   -- When students can start taking it
  available_to     TIMESTAMP      NULL,   -- When access closes
  created_by       VARCHAR(255)   NOT NULL,
  created_at       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id)   REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)   ON DELETE CASCADE
);

-- ============================================
-- EXAM QUESTIONS TABLE
-- ============================================
-- Questions belong to an exam. Two types:
--   multiple_choice: options = JSON array of strings, correct_answer = index string ("0","1","2","3")
--   short_answer:    options = NULL, correct_answer = NULL (teacher reviews manually)
-- question_number ensures stable ordering and is unique per exam.

CREATE TABLE IF NOT EXISTS exam_questions (
  id              VARCHAR(255)  PRIMARY KEY,
  exam_id         VARCHAR(255)  NOT NULL,
  question_number INTEGER       NOT NULL,
  type            VARCHAR(50)   NOT NULL CHECK(type IN ('multiple_choice', 'short_answer')),
  text            TEXT          NOT NULL,
  options         JSONB         NULL,   -- ["Option A", "Option B", "Option C", "Option D"]
  correct_answer  TEXT          NULL,   -- "0", "1", "2", "3" for multiple_choice; NULL for short_answer
  points          INTEGER       NOT NULL DEFAULT 1 CHECK(points > 0),
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  UNIQUE(exam_id, question_number)
);

-- ============================================
-- EXAM ATTEMPTS TABLE
-- ============================================
-- One attempt per student per exam (enforced by UNIQUE constraint).
-- Status lifecycle: in_progress -> submitted -> graded
-- Score is calculated server-side at submission time (auto for MC, pending for SA).
-- teacher_feedback is added later when teacher reviews short_answer questions.

CREATE TABLE IF NOT EXISTS exam_attempts (
  id               VARCHAR(255)    PRIMARY KEY,
  exam_id          VARCHAR(255)    NOT NULL,
  student_id       VARCHAR(255)    NOT NULL,
  status           VARCHAR(50)     NOT NULL DEFAULT 'in_progress'
                                   CHECK(status IN ('in_progress', 'submitted', 'graded')),
  started_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  submitted_at     TIMESTAMP       NULL,
  score            NUMERIC(5,2)    NULL,   -- Percentage 0.00 - 100.00
  total_points     INTEGER         NULL,   -- Sum of all question points
  earned_points    INTEGER         NULL,   -- Points earned (auto for MC)
  teacher_feedback TEXT            NULL,   -- Optional feedback from teacher
  FOREIGN KEY (exam_id)    REFERENCES exams(id)   ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id)   ON DELETE CASCADE,
  UNIQUE(exam_id, student_id)              -- ONE attempt per student per exam
);

-- ============================================
-- EXAM ANSWERS TABLE
-- ============================================
-- One answer per question per attempt.
-- For multiple_choice: answer_text = "0","1","2","3" (index of chosen option)
-- For short_answer:    answer_text = free text
-- is_correct and points_earned are populated at submit time (MC) or grading (SA).

CREATE TABLE IF NOT EXISTS exam_answers (
  id             VARCHAR(255)  PRIMARY KEY,
  attempt_id     VARCHAR(255)  NOT NULL,
  question_id    VARCHAR(255)  NOT NULL,
  answer_text    TEXT          NULL,
  is_correct     BOOLEAN       NULL,   -- NULL until evaluated
  points_earned  INTEGER       NULL,   -- NULL until evaluated
  answered_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attempt_id)  REFERENCES exam_attempts(id)  ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE,
  UNIQUE(attempt_id, question_id)   -- One answer per question per attempt
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Find exams by class quickly
CREATE INDEX IF NOT EXISTS idx_exams_class_id     ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_status        ON exams(status);
-- Critical: find active exams quickly for the student dashboard
CREATE INDEX IF NOT EXISTS idx_exams_active_window ON exams(status, available_from, available_to)
  WHERE status = 'active';

-- Find questions by exam (for loading exam form)
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id, question_number);

-- Find a student's attempt quickly
CREATE INDEX IF NOT EXISTS idx_attempts_exam       ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student    ON exam_attempts(student_id);

-- Find answers for an attempt (loading a student's in-progress exam)
CREATE INDEX IF NOT EXISTS idx_answers_attempt     ON exam_answers(attempt_id);

-- ============================================
-- MIGRATION NOTES
-- ============================================
-- 1. exams.status='draft'  → Teacher is building the exam. Students cannot see it.
-- 2. exams.status='active' → Students can take it if within the time window.
-- 3. exams.status='closed' → No new attempts. Results are visible.
-- 4. UNIQUE(exam_id, student_id) in exam_attempts = one shot per student.
-- 5. score is server-calculated; never trust client-submitted scores.
-- 6. options in exam_questions is JSONB for flexible option arrays.
-- 7. short_answer questions need manual grading by the teacher (future feature).
