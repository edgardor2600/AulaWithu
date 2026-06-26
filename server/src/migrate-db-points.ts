import { runQuery, closeDb } from './db/database';

async function migrate() {
  console.log('🚀 Starting DB points column type migration to DECIMAL(5,2)...');
  try {
    // 1. Alter exam_questions
    console.log('Altering exam_questions.points to DECIMAL(5,2)...');
    await runQuery('ALTER TABLE exam_questions ALTER COLUMN points TYPE DECIMAL(5,2);');

    // 2. Alter exam_attempts
    console.log('Altering exam_attempts.total_points and earned_points to DECIMAL(5,2)...');
    await runQuery('ALTER TABLE exam_attempts ALTER COLUMN total_points TYPE DECIMAL(5,2);');
    await runQuery('ALTER TABLE exam_attempts ALTER COLUMN earned_points TYPE DECIMAL(5,2);');

    // 3. Alter exam_answers
    console.log('Altering exam_answers.points_earned to DECIMAL(5,2)...');
    await runQuery('ALTER TABLE exam_answers ALTER COLUMN points_earned TYPE DECIMAL(5,2);');

    console.log('✅ DB points column type migration completed successfully!');
  } catch (error: any) {
    console.error('❌ DB migration failed:', error.message);
  } finally {
    await closeDb();
    process.exit(0);
  }
}

migrate();
