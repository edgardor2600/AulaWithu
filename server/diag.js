const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.vyfkuuatwsoulgrirgey:perromuerto05@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  const client = await pool.connect();
  
  // Test with student "pepito" (username: edgardo) id: f9e0da1d
  const studentId = 'f9e0da1d-f1da-472c-9976-c90183e8f2a7';
  const classId = '256bdaf1-d205-4bc4-9158-6c84a4c14a74';
  const examGroupId = 'd891f274-6e96-4310-9270-c3176f01f651';
  
  console.log('=== Test with student pepito (edgardo) ===');
  console.log('Student ID:', studentId);
  console.log('Class ID:', classId);
  
  // 1. assertStudentEnrolled - getStudentClasses
  const t1 = await client.query(`
    SELECT DISTINCT c.id as class_id
    FROM enrollments e
    JOIN groups g ON e.group_id = g.id
    JOIN classes c ON g.class_id = c.id
    WHERE e.student_id = $1 AND e.status = 'active' AND g.active = 1
  `, [studentId]);
  console.log('\n1. Classes student is enrolled in:', JSON.stringify(t1.rows));
  const classIds = t1.rows.map(r => r.class_id);
  console.log('   Includes exam class?', classIds.includes(classId));

  // 2. Get student groups in exam class
  const t2 = await client.query(`
    SELECT e.group_id 
    FROM enrollments e
    JOIN groups g ON g.id = e.group_id
    WHERE e.student_id = $1 AND g.class_id = $2 AND e.status = 'active' AND g.active = 1
  `, [studentId, classId]);
  console.log('\n2. Student group_ids in class:', JSON.stringify(t2.rows));
  const studentGroupIds = t2.rows.map(r => r.group_id);
  
  // 3. Get exams visible to student
  const groupIdsList = studentGroupIds.length > 0 
    ? `AND (group_id IS NULL OR group_id = ANY(ARRAY['${studentGroupIds.join("','")}']))`
    : "AND group_id IS NULL";
  const t3 = await client.query(`
    SELECT id, title, status, group_id 
    FROM exams 
    WHERE class_id = '${classId}' AND status != 'draft' ${groupIdsList}
    ORDER BY created_at DESC
  `);
  console.log('\n3. Exams visible to student:', JSON.stringify(t3.rows));

  // 4. assertStudentInExamGroup - COUNT check (the bug!)
  const t4 = await client.query(
    'SELECT COUNT(*) as count FROM enrollments WHERE student_id = $1 AND group_id = $2',
    [studentId, examGroupId]
  );
  console.log('\n4. COUNT result:', JSON.stringify(t4.rows));
  console.log('   count value:', t4.rows[0].count, 'type:', typeof t4.rows[0].count);
  console.log('   count === 0:', t4.rows[0].count === 0);
  console.log('   Number(count) === 0:', Number(t4.rows[0].count) === 0);

  client.release();
  await pool.end();
}
run().catch(e => { console.error('ERR:', e.message, e.stack); process.exit(1); });
