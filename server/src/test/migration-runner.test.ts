/**
 * 🧪 TEST SUITE: MigrationRunner & Repository Clean DDL
 * 
 * Verifies:
 * 1. MigrationRunner executes migrations sequentially and records them in _migrations table.
 * 2. MigrationRunner is idempotent on second execution.
 * 3. Repositories (Reading, Quiz, Tutor, Conversation) operate cleanly without runtime CREATE TABLE.
 */

import dotenv from 'dotenv';
dotenv.config();

import { MigrationRunner } from '../db/migration-runner';
import { getAll, runQuery } from '../db/database';
import { ReadingRepository } from '../db/repositories/reading-repository';
import { QuizRepository } from '../db/repositories/quiz-repository';
import { TutorRepository } from '../db/repositories/tutor-repository';
import { ConversationRepository } from '../db/repositories/conversation-repository';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING TEST: MigrationRunner & Repositories');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // TEST 1: Run migrations
    console.log('Test 1: Running MigrationRunner.run()...');
    const firstRun = await MigrationRunner.run();
    assert(
      Array.isArray(firstRun.applied),
      'MigrationRunner.run() returns an applied array'
    );

    // TEST 2: Check _migrations table exists and has entries
    console.log('\nTest 2: Verifying _migrations tracking table...');
    const recorded = await getAll<{ name: string }>('SELECT name FROM _migrations');
    assert(
      recorded.length > 0,
      `_migrations table contains recorded migrations (Count: ${recorded.length})`
    );

    // TEST 3: Idempotency (second run should have 0 pending)
    console.log('\nTest 3: Testing idempotency on second run...');
    const secondRun = await MigrationRunner.run();
    assert(
      secondRun.alreadyUpToDate === true && secondRun.applied.length === 0,
      'Second run is completely idempotent (0 pending migrations applied)'
    );

    // TEST 4: ReadingRepository query without ensureTableExists
    console.log('\nTest 4: ReadingRepository.getAttemptsBySession()...');
    const readingAttempts = await ReadingRepository.getAttemptsBySession('test-session-id');
    assert(
      Array.isArray(readingAttempts),
      'ReadingRepository queries student_reading_attempts cleanly without runtime DDL'
    );

    // TEST 5: QuizRepository query without ensureTablesExist
    console.log('\nTest 5: QuizRepository.getAllQuizzes()...');
    const quizzes = await QuizRepository.getAllQuizzes();
    assert(
      Array.isArray(quizzes),
      'QuizRepository queries quizzes cleanly without runtime DDL'
    );

    // TEST 6: TutorRepository query without ensureTablesExist
    console.log('\nTest 6: TutorRepository.getAllMaterials()...');
    const tutorResult = await TutorRepository.getAllMaterials();
    assert(
      Array.isArray(tutorResult.materials) && typeof tutorResult.total === 'number',
      'TutorRepository queries ai_tutor_materials cleanly without runtime DDL'
    );

    // TEST 7: ConversationRepository query without ensureTableExists
    console.log('\nTest 7: ConversationRepository.getAllStories()...');
    const stories = await ConversationRepository.getAllStories();
    assert(
      Array.isArray(stories),
      'ConversationRepository queries conversation_stories cleanly without runtime DDL'
    );

  } catch (error: any) {
    console.error('\n❌ Unexpected error during tests:', error.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
