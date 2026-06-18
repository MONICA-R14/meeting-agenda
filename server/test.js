require('dotenv').config();
const axios = require('axios');

const BASE = 'http://localhost:5000';
const DELAY_MS = 500;

let token = null;
let firstTeamId = null;
let createdTeamId = null;
let completedScheduleId = null;

let passed = 0;
let failed = 0;

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(method, path, data) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await axios({
      method,
      url: `${BASE}${path}`,
      data,
      headers,
      validateStatus: () => true,
      timeout: 15000
    });
    return { status: res.status, body: res.data };

  } catch (err) {
    // Build a detailed error object so we always see what went wrong
    const detail = {
      message: err.message || '(empty)',
      code: err.code || '(none)',
      name: err.name || '(none)'
    };
    if (err.response) {
      detail.httpStatus = err.response.status;
      detail.httpBody   = err.response.data;
    } else if (err.request) {
      detail.note = 'Request was made but no response received';
    }
    return { status: 0, body: { networkError: detail } };
  }
}

function pass(n, name) {
  console.log(`TEST ${n}: ${name}`);
  console.log(`  Status: PASS ✅`);
  passed++;
}

function fail(n, name, status, body) {
  console.log(`TEST ${n}: ${name}`);
  console.log(`  Status: FAIL ❌  (HTTP ${status})`);
  console.log(`  Response: ${JSON.stringify(body, null, 2).split('\n').map(l => '    ' + l).join('\n').trimStart()}`);
  failed++;
}

// ── Connectivity pre-check ────────────────────────────────────────────────────

async function checkConnectivity() {
  console.log(`Checking server at ${BASE} ...`);
  try {
    await axios.get(BASE, { timeout: 5000, validateStatus: () => true });
    console.log('Server reachable ✅');
  } catch (err) {
    console.error(`Cannot reach ${BASE}`);
    console.error('  Error:', err.message, '|', err.code);
    console.error('  Make sure the server is running: node index.js');
    process.exit(1);
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

async function test1() {
  const { status, body } = await request('POST', '/api/auth/login', {
    email: 'monica@meetai.com',
    password: 'Test@123'
  });
  if (status === 200 && body.token) {
    token = body.token;
    pass(1, 'POST /api/auth/login');
  } else {
    fail(1, 'POST /api/auth/login', status, body);
  }
}

async function test2() {
  const { status, body } = await request('POST', '/api/auth/register', {
    name: 'Test User',
    email: 'test@test.com',
    password: 'Test@123'
  });
  if ((status === 200 || status === 201) && body.message) {
    pass(2, 'POST /api/auth/register');
  } else if (status === 400 && body.message && body.message.includes('already')) {
    console.log(`TEST 2: POST /api/auth/register`);
    console.log(`  Status: PASS ✅  (user already exists — that's fine)`);
    passed++;
  } else {
    fail(2, 'POST /api/auth/register', status, body);
  }
}

async function test3() {
  const { status, body } = await request('POST', '/api/agenda/generate', {
    goal: 'hi',
    attendees: 'Monica',
    duration: 60
  });
  const isRejected = status !== 200 || body.error || body.message;
  if (isRejected) {
    pass(3, 'POST /api/agenda/generate — casual greeting rejected');
  } else {
    fail(3, 'POST /api/agenda/generate — casual greeting rejected', status, body);
  }
}

async function test4() {
  const { status, body } = await request('POST', '/api/agenda/generate', {
    goal: 'short',
    attendees: 'Monica',
    duration: 60
  });
  if (status === 400) {
    pass(4, 'POST /api/agenda/generate — too-short goal → 400');
  } else {
    fail(4, 'POST /api/agenda/generate — too-short goal → 400', status, body);
  }
}

async function test5() {
  const { status, body } = await request('POST', '/api/agenda/generate', {
    goal: 'Q2 product launch planning with marketing team',
    attendees: 'Monica, Ravi, Priya',
    duration: 60,
    language: 'English'
  });
  if (status === 200 && body.agenda) {
    pass(5, 'POST /api/agenda/generate — valid input → agenda returned');
  } else {
    fail(5, 'POST /api/agenda/generate — valid input → agenda returned', status, body);
  }
}

async function test6() {
  const { status, body } = await request('GET', '/api/agenda/history');
  if (status === 200 && Array.isArray(body)) {
    pass(6, 'GET /api/agenda/history');
  } else {
    fail(6, 'GET /api/agenda/history', status, body);
  }
}

async function test7() {
  const { status, body } = await request('POST', '/api/agenda/summary', {
    meetingGoal: 'hi',
    notes: 'we talked'
  });
  const isRejected = status !== 200 || body.error || body.message;
  if (isRejected) {
    pass(7, 'POST /api/agenda/summary — casual greeting / too-short notes rejected');
  } else {
    fail(7, 'POST /api/agenda/summary — casual greeting / too-short notes rejected', status, body);
  }
}

async function test8() {
  const { status, body } = await request('POST', '/api/agenda/summary', {
    meetingGoal: 'Q1 sales review with regional managers',
    attendees: 'Monica, Ravi, Priya',
    duration: 60,
    notes: 'Revenue dropped by 10 percent. Ravi confirmed new client pipeline is strong with 15 prospects. Priya suggested increasing digital marketing budget. John will prepare detailed regional report by next Friday.',
    language: 'English'
  });
  if (status === 200 && body.data && body.data.summary && body.data.actionItems) {
    pass(8, 'POST /api/agenda/summary — valid input → summary + actionItems');
  } else {
    fail(8, 'POST /api/agenda/summary — valid input → summary + actionItems', status, body);
  }
}

async function test9() {
  const { status, body } = await request('GET', '/api/team');
  if (status === 200 && body.data && Array.isArray(body.data) && body.data.length >= 3) {
    firstTeamId = body.data[0]._id;
    pass(9, `GET /api/team — ${body.data.length} teams found`);
  } else {
    fail(9, 'GET /api/team — expected ≥3 teams', status, body);
  }
}

async function test10() {
  const { status, body } = await request('POST', '/api/team', {
    name: 'Test Team',
    description: 'Testing'
  });
  if (status === 201 && body.data && body.data._id) {
    createdTeamId = body.data._id;
    pass(10, 'POST /api/team — team created');
  } else {
    fail(10, 'POST /api/team — team created', status, body);
  }
}

async function test11() {
  if (!firstTeamId) {
    console.log(`TEST 11: POST /api/team/:id/members`);
    console.log(`  Status: FAIL ❌  (skipped — test 9 failed, no firstTeamId)`);
    failed++;
    return;
  }
  const { status, body } = await request('POST', `/api/team/${firstTeamId}/members`, {
    name: 'New Member',
    email: 'new@test.com',
    role: 'member'
  });
  if (status === 200 && body.data) {
    pass(11, 'POST /api/team/:id/members — member added');
  } else if (status === 400 && body.message && body.message.includes('already')) {
    console.log(`TEST 11: POST /api/team/:id/members`);
    console.log(`  Status: PASS ✅  (member already exists — that's fine)`);
    passed++;
  } else {
    fail(11, 'POST /api/team/:id/members — member added', status, body);
  }
}

async function test12() {
  if (!createdTeamId) {
    console.log(`TEST 12: DELETE /api/team/:id`);
    console.log(`  Status: FAIL ❌  (skipped — test 10 failed, no createdTeamId)`);
    failed++;
    return;
  }
  const { status, body } = await request('DELETE', `/api/team/${createdTeamId}`);
  if (status === 200) {
    pass(12, 'DELETE /api/team/:id — test team deleted');
  } else {
    fail(12, 'DELETE /api/team/:id — test team deleted', status, body);
  }
}

async function test13() {
  const { status, body } = await request('GET', '/api/schedule');
  if (status === 200 && body.data && Array.isArray(body.data)) {
    pass(13, `GET /api/schedule — ${body.data.length} schedules found`);
  } else {
    fail(13, 'GET /api/schedule', status, body);
  }
}

async function test14() {
  const { status, body } = await request('POST', '/api/schedule', {
    title: 'Test Meeting',
    meetingGoal: 'Testing the schedule API endpoint properly',
    attendees: [{ name: 'Monica', email: 'monica@meetai.com' }],
    date: '2026-12-01T10:00:00.000Z',
    duration: 30,
    meetingType: 'online',
    platform: 'google-meet',
    meetingLink: 'https://meet.jit.si/test'
  });
  if (status === 201 && body.data) {
    pass(14, 'POST /api/schedule — meeting scheduled');
  } else if (status === 500) {
    console.log(`TEST 14: POST /api/schedule`);
    console.log(`  Status: FAIL ❌  (HTTP 500 — email sender likely not configured)`);
    console.log(`  Message: ${body.message || JSON.stringify(body)}`);
    failed++;
  } else {
    fail(14, 'POST /api/schedule — meeting scheduled', status, body);
  }
}

async function test15() {
  const { status, body } = await request('GET', '/api/actionitems');
  if (status === 200 && body.data && Array.isArray(body.data)) {
    pass(15, `GET /api/actionitems — ${body.data.length} items found`);
  } else {
    fail(15, 'GET /api/actionitems', status, body);
  }
}

async function test16() {
  const { status, body } = await request('GET', '/api/actionitems/stats');
  const d = body.data;
  if (
    status === 200 && d &&
    typeof d.total === 'number' &&
    typeof d.completed === 'number' &&
    typeof d.pending === 'number' &&
    typeof d.percentage === 'number'
  ) {
    pass(16, `GET /api/actionitems/stats — total:${d.total} completed:${d.completed} pending:${d.pending} (${d.percentage}%)`);
  } else {
    fail(16, 'GET /api/actionitems/stats', status, body);
  }
}

async function test17() {
  const { status, body } = await request('GET', '/api/admin/stats');
  const d = body.data;
  if (
    status === 200 && d &&
    typeof d.totalUsers === 'number' &&
    typeof d.totalTeams === 'number' &&
    typeof d.totalMeetings === 'number'
  ) {
    pass(17, `GET /api/admin/stats — users:${d.totalUsers} teams:${d.totalTeams} meetings:${d.totalMeetings}`);
  } else {
    fail(17, 'GET /api/admin/stats', status, body);
  }
}

async function test18() {
  const { status, body } = await request('GET', '/api/admin/users');
  if (status === 200 && body.data && Array.isArray(body.data) && body.data.length > 0) {
    pass(18, `GET /api/admin/users — ${body.data.length} users found`);
  } else {
    fail(18, 'GET /api/admin/users', status, body);
  }
}

async function test19() {
  const { status, body } = await request('GET', '/api/admin/teams');
  if (status === 200 && body.data && Array.isArray(body.data)) {
    pass(19, `GET /api/admin/teams — ${body.data.length} teams found`);
  } else {
    fail(19, 'GET /api/admin/teams', status, body);
  }
}

async function test20() {
  const { status, body } = await request('GET', '/api/admin/meetings/recent');
  if (status === 200 && body.data && Array.isArray(body.data)) {
    pass(20, `GET /api/admin/meetings/recent — ${body.data.length} entries found`);
  } else {
    fail(20, 'GET /api/admin/meetings/recent', status, body);
  }
}

async function test21() {
  const { status, body } = await request('GET', '/api/score/stats');
  if (status === 200 && body.data && typeof body.data.totalMeetingsScored === 'number') {
    pass(21, `GET /api/score/stats — total scored: ${body.data.totalMeetingsScored}`);
  } else {
    fail(21, 'GET /api/score/stats', status, body);
  }
}

async function test22() {
  // Find a completed + finalized schedule to score
  const { status: s1, body: b1 } = await request('GET', '/api/schedule');
  if (s1 !== 200 || !b1.data) {
    fail(22, 'POST /api/score/calculate — setup: fetch schedules', s1, b1);
    return;
  }
  const finalized = b1.data.filter(s => s.status === 'completed' && s.attendanceFinalized);
  if (!finalized.length) {
    console.log(`TEST 22: POST /api/score/calculate`);
    console.log(`  Status: FAIL ❌  (no completed+finalized schedule — run: node server/seed.js)`);
    failed++;
    return;
  }
  completedScheduleId = finalized[0]._id;

  const { status, body } = await request('POST', '/api/score/calculate', {
    scheduleId: completedScheduleId,
    actualDuration: 55,
    startedOnTime: true
  });
  if (status === 200 && typeof body.score === 'number' && body.grade && body.breakdown) {
    pass(22, `POST /api/score/calculate — score: ${body.score}/10 (${body.grade})`);
  } else {
    fail(22, 'POST /api/score/calculate', status, body);
  }
}

async function test23() {
  const { status, body } = await request('GET', '/api/score/history');
  if (status === 200 && Array.isArray(body.data) && body.data.length >= 1) {
    pass(23, `GET /api/score/history — ${body.data.length} score(s) found`);
  } else {
    fail(23, 'GET /api/score/history', status, body);
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────

async function run() {
  console.log('='.repeat(54));
  console.log('   MEETING AGENDA API TEST SUITE');
  console.log('   Server:', BASE);
  console.log('='.repeat(54));
  console.log();

  await checkConnectivity();
  console.log();

  const tests = [
    test1,  test2,  test3,  test4,  test5,
    test6,  test7,  test8,  test9,  test10,
    test11, test12, test13, test14, test15,
    test16, test17, test18, test19, test20,
    test21, test22, test23
  ];

  for (const t of tests) {
    await t();
    console.log();
    await sleep(DELAY_MS);
  }

  console.log('='.repeat(54));
  console.log(`  RESULTS: ${passed}/${tests.length} tests passed`);
  if (failed > 0) {
    console.log(`  FAILED : ${failed} test(s) — see FAIL lines above`);
  } else {
    console.log('  All tests passed! 🎉');
  }
  console.log('='.repeat(54));
}

run().catch(err => {
  console.error('Test runner crashed:', err.message);
  process.exit(1);
});
