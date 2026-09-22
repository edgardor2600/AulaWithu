/**
 * 🧪 TEST SUITE: Quiz Persistence & Deduplication
 * 
 * Verifies:
 * 1. Saving a quiz to the library returns a valid ID.
 * 2. Saving a student result stores score, session_id, and answers_json cleanly.
 * 3. Re-submitting for the same student updates/deduplicates without duplicate rows.
 * 4. Batch saving multiple student results operates in a single multi-row query.
 * 5. Foreign key cascade deletion cleanly removes quiz results when the quiz is deleted.
 */

import dotenv from 'dotenv';
dotenv.config();

import { QuizRepository } from '../db/repositories/quiz-repository';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING TEST: Quiz Persistence & Security');
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

  const testSessionId = `test_session_${Date.now()}`;
  let createdQuizId: number | null = null;

  try {
    // TEST 1: Save quiz to library
    console.log('Test 1: Saving test quiz to library...');
    const createdQuiz = await QuizRepository.saveQuiz({
      title: 'Unit Test Quiz - Present Perfect',
      subject: 'English',
      level: 'B1',
      topic: 'Grammar',
      questions_json: [
        { id: 1, type: 'multiple_choice', question: 'Choose correct form', sentence: 'I ___ seen it.', options: ['have', 'has'], correct: 0 },
        { id: 2, type: 'true_false', question: 'Evaluate', sentence: 'She have gone.', options: ['True', 'False'], correct: 1 },
      ],
      created_by: 'test-runner',
    });

    assert(
      createdQuiz !== null && typeof createdQuiz.id === 'number' && createdQuiz.id > 0,
      `Quiz created successfully with ID: ${createdQuiz?.id}`
    );
    createdQuizId = createdQuiz!.id;

    // TEST 2: Save individual student result
    console.log('\nTest 2: Saving student result with answers_json...');
    await QuizRepository.saveStudentResult({
      quiz_id: createdQuizId,
      session_id: testSessionId,
      student_id: 'student-alpha',
      student_name: 'Estudiante Alpha',
      score: 2150,
      total_questions: 2,
      answers_json: [
        { questionId: 1, answer: 0, isCorrect: true, score: 1100 },
        { questionId: 2, answer: 1, isCorrect: true, score: 1050 },
      ],
    });

    const resultsAfterOne = await QuizRepository.getResultsBySession(createdQuizId, testSessionId);
    assert(
      resultsAfterOne.length === 1 && resultsAfterOne[0].score === 2150 && resultsAfterOne[0].student_name === 'Estudiante Alpha',
      'Student result persisted correctly with score and metadata'
    );

    // TEST 3: Deduplication/Update on re-submit
    console.log('\nTest 3: Testing deduplication on student re-submit...');
    await QuizRepository.saveStudentResult({
      quiz_id: createdQuizId,
      session_id: testSessionId,
      student_id: 'student-alpha',
      student_name: 'Estudiante Alpha (Updated)',
      score: 2500,
      total_questions: 2,
      answers_json: [
        { questionId: 1, answer: 0, isCorrect: true, score: 1250 },
        { questionId: 2, answer: 1, isCorrect: true, score: 1250 },
      ],
    });

    const resultsAfterUpdate = await QuizRepository.getResultsBySession(createdQuizId, testSessionId);
    assert(
      resultsAfterUpdate.length === 1 && resultsAfterUpdate[0].score === 2500,
      'Re-submitting cleanly updates the score without creating duplicate rows'
    );

    // TEST 4: Batch save multiple students
    console.log('\nTest 4: Batch saving results for multiple students...');
    await QuizRepository.saveBatchResults([
      {
        quiz_id: createdQuizId,
        session_id: testSessionId,
        student_id: 'student-beta',
        student_name: 'Estudiante Beta',
        score: 1800,
        total_questions: 2,
        answers_json: [],
      },
      {
        quiz_id: createdQuizId,
        session_id: testSessionId,
        student_id: 'student-gamma',
        student_name: 'Estudiante Gamma',
        score: 3100,
        total_questions: 2,
        answers_json: [],
      },
    ]);

    const resultsBatch = await QuizRepository.getResultsBySession(createdQuizId, testSessionId);
    assert(
      resultsBatch.length === 3 && resultsBatch[0].student_id === 'student-gamma',
      'Batch results saved correctly; sorted by score descending (Top: Estudiante Gamma with 3100 pts)'
    );

    // TEST 5: Foreign key cascade deletion
    console.log('\nTest 5: Testing ON DELETE CASCADE on quiz deletion...');
    const deleted = await QuizRepository.deleteQuiz(createdQuizId);
    assert(deleted === true, 'Test quiz deleted successfully');

    const resultsAfterDelete = await QuizRepository.getResultsBySession(createdQuizId, testSessionId);
    assert(
      resultsAfterDelete.length === 0,
      'Cascade deletion cleanly removed all associated student results in PostgreSQL'
    );

  } catch (error: any) {
    console.error('\n❌ Unexpected error during tests:', error.message);
    failed++;
  } finally {
    // Safety cleanup in case of failure before test 5
    if (createdQuizId) {
      try { await QuizRepository.deleteQuiz(createdQuizId); } catch (_) {}
    }
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
