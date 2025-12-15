/**
 * Test script for Sessions API (Block 4D - Phase 1)
 * 
 * Run with: npx ts-node src/test-sessions.ts
 */

import axios from 'axios';

const API_URL = 'http://localhost:3002/api';

// Test data (you'll need to replace these with real IDs from your database)
let authToken = '';
let teacherId = '';
let classId = '';
let slideId = '';
let sessionId = '';
let sessionCode = '';

async function testPhase1() {
  console.log('🧪 Testing Block 4D - Phase 1: Sessions API\n');

  try {
    // Step 1: Login as teacher
    console.log('1️⃣ Logging in as teacher...');
    const loginResponse = await axios.post(`${API_URL}/auth/join`, {
      name: 'Test Teacher',
      role: 'teacher'
    });
    
    authToken = loginResponse.data.token;
    teacherId = loginResponse.data.user.id;
    console.log(`✅ Logged in as: ${loginResponse.data.user.name}`);
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
    console.log(`   User ID: ${teacherId}\n`);

    // Step 2: Get first class
    console.log('2️⃣ Getting classes...');
    const classesResponse = await axios.get(`${API_URL}/classes`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (classesResponse.data.classes.length === 0) {
      console.log('❌ No classes found. Please create a class first.');
      return;
    }
    
    classId = classesResponse.data.classes[0].id;
    console.log(`✅ Found class: ${classesResponse.data.classes[0].title}`);
    console.log(`   Class ID: ${classId}\n`);

    // Step 3: Get first slide
    console.log('3️⃣ Getting slides...');
    const slidesResponse = await axios.get(`${API_URL}/slides/class/${classId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (slidesResponse.data.slides.length === 0) {
      console.log('❌ No slides found. Please create a slide first.');
      return;
    }
    
    slideId = slidesResponse.data.slides[0].id;
    console.log(`✅ Found slide: Slide ${slidesResponse.data.slides[0].slide_number}`);
    console.log(`   Slide ID: ${slideId}\n`);

    // Step 4: Create session
    console.log('4️⃣ Creating live session...');
    const createResponse = await axios.post(`${API_URL}/sessions`, {
      class_id: classId,
      slide_id: slideId,
      allow_student_draw: false
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    sessionId = createResponse.data.session.id;
    sessionCode = createResponse.data.session.session_code;
    console.log(`✅ Session created!`);
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Session Code: ${sessionCode}`);
    console.log(`   Active: ${createResponse.data.session.is_active === 1 ? 'Yes' : 'No'}`);
    console.log(`   Allow Student Draw: ${createResponse.data.session.allow_student_draw === 1 ? 'Yes' : 'No'}\n`);

    // Step 5: Get session by ID
    console.log('5️⃣ Getting session by ID...');
    const getResponse = await axios.get(`${API_URL}/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Session retrieved: ${getResponse.data.session.session_code}\n`);

    // Step 6: Update permissions
    console.log('6️⃣ Updating permissions (allow students to draw)...');
    const updateResponse = await axios.put(`${API_URL}/sessions/${sessionId}/permissions`, {
      allow_student_draw: true
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Permissions updated!`);
    console.log(`   Allow Student Draw: ${updateResponse.data.session.allow_student_draw === 1 ? 'Yes' : 'No'}\n`);

    // Step 7: Test join with code (as student)
    console.log('7️⃣ Testing join with session code (as student)...');
    const studentLoginResponse = await axios.post(`${API_URL}/auth/join`, {
      name: 'Test Student',
      role: 'student'
    });
    
    const studentToken = studentLoginResponse.data.token;
    
    const joinResponse = await axios.post(`${API_URL}/sessions/join`, {
      session_code: sessionCode
    }, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log(`✅ Student joined session: ${joinResponse.data.session.session_code}\n`);

    // Step 8: Get active sessions
    console.log('8️⃣ Getting active sessions for teacher...');
    const activeResponse = await axios.get(`${API_URL}/sessions/teacher/active`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Active sessions: ${activeResponse.data.count}`);
    activeResponse.data.sessions.forEach((s: any) => {
      console.log(`   - ${s.session_code} (Created: ${s.created_at})`);
    });
    console.log();

    // Step 9: Get stats
    console.log('9️⃣ Getting session statistics...');
    const statsResponse = await axios.get(`${API_URL}/sessions/teacher/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Statistics:`);
    console.log(`   Total: ${statsResponse.data.stats.total}`);
    console.log(`   Active: ${statsResponse.data.stats.active}`);
    console.log(`   Ended: ${statsResponse.data.stats.ended}\n`);

    // Step 10: End session
    console.log('🔟 Ending session...');
    const endResponse = await axios.put(`${API_URL}/sessions/${sessionId}/end`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Session ended!`);
    console.log(`   Active: ${endResponse.data.session.is_active === 1 ? 'Yes' : 'No'}`);
    console.log(`   Ended at: ${endResponse.data.session.ended_at}\n`);

    // Final summary
    console.log('🎉 ALL TESTS PASSED! Phase 1 is working correctly.\n');
    console.log('✅ Checklist:');
    console.log('   [✓] Create session');
    console.log('   [✓] Get session by ID');
    console.log('   [✓] Join with session code');
    console.log('   [✓] Update permissions');
    console.log('   [✓] Get active sessions');
    console.log('   [✓] Get statistics');
    console.log('   [✓] End session');
    console.log('\n🚀 Ready for Phase 2: Yjs + Canvas Integration\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED!');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message || error.response.data.error}`);
      console.error(`   Details:`, error.response.data);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Run tests
testPhase1();
