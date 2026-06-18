require('dotenv').config();
const axios = require('axios');

const BASE = 'http://localhost:5000';
let token = null;

async function req(method, path, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await axios({ method, url: `${BASE}${path}`, data, headers, validateStatus: () => true, timeout: 15000 });
  return { status: res.status, body: res.data };
}

function log(step, msg, body) {
  console.log(`\nSTEP ${step}: ${msg}`);
  if (body !== undefined) console.log('  Response:', JSON.stringify(body, null, 2).split('\n').map(l => '  ' + l).join('\n').trimStart());
}

async function run() {
  console.log('='.repeat(56));
  console.log('  SCORE SETUP SCRIPT');
  console.log('='.repeat(56));

  // ── STEP 1: Login ───────────────────────────────────────────
  const { status: s1, body: b1 } = await req('POST', '/api/auth/login', {
    email: 'monica@meetai.com', password: 'Test@123'
  });
  if (s1 !== 200 || !b1.token) {
    log(1, 'Login ❌', b1);
    process.exit(1);
  }
  token = b1.token;
  log(1, `Login ✅  (token saved)`);

  // ── STEP 2: Get all schedules ───────────────────────────────
  const { status: s2, body: b2 } = await req('GET', '/api/schedule');
  if (s2 !== 200 || !Array.isArray(b2.data) || !b2.data.length) {
    log(2, 'Get schedules ❌', b2);
    process.exit(1);
  }
  const schedules = b2.data;
  log(2, `Got ${schedules.length} schedule(s) ✅`);
  schedules.forEach((s, i) => console.log(`    [${i}] ${s._id}  "${s.title}"  status:${s.status}  finalized:${s.attendanceFinalized}`));

  // Pick completed+finalized if exists, else pick first
  let schedule = schedules.find(s => s.status === 'completed' && s.attendanceFinalized);
  if (schedule) {
    console.log(`\n  Already have a completed+finalized schedule: "${schedule.title}"`);
    console.log(`  Skipping steps 3-5, going straight to scoring.`);
  } else {
    schedule = schedules[0];
    console.log(`\n  Using schedule: "${schedule.title}" (${schedule._id})`);
  }
  const scheduleId = schedule._id;

  if (!schedule.attendanceFinalized) {
    // ── STEP 3: Init attendance ───────────────────────────────
    const { status: s3, body: b3 } = await req('POST', `/api/attendance/init/${scheduleId}`);
    if (s3 !== 200 && s3 !== 201) {
      log(3, `Init attendance ❌  (HTTP ${s3})`, b3);
      process.exit(1);
    }
    log(3, `Attendance initialized ✅`, b3);

    // ── STEP 4: Finalize attendance ───────────────────────────
    const { status: s4, body: b4 } = await req('PUT', `/api/attendance/${scheduleId}/finalize`);
    if (s4 !== 200) {
      log(4, `Finalize attendance ❌  (HTTP ${s4})`, b4);
      process.exit(1);
    }
    log(4, `Attendance finalized ✅`, b4);

    // ── STEP 5: Mark schedule completed ──────────────────────
    const { status: s5, body: b5 } = await req('PUT', `/api/schedule/${scheduleId}/status`, { status: 'completed' });
    if (s5 !== 200) {
      log(5, `Mark completed ❌  (HTTP ${s5})`, b5);
      process.exit(1);
    }
    log(5, `Schedule marked completed ✅`, b5);
  } else {
    log(3, 'Init attendance — SKIPPED (already finalized)');
    log(4, 'Finalize attendance — SKIPPED (already finalized)');
    log(5, 'Mark completed — SKIPPED (already completed)');
  }

  // ── STEP 6: Calculate score ──────────────────────────────────
  const { status: s6, body: b6 } = await req('POST', '/api/score/calculate', {
    scheduleId,
    actualDuration: 65,
    startedOnTime: true
  });
  log(6, `Calculate score  (HTTP ${s6})`, b6);
  if (s6 !== 200) {
    console.log('\n  Setup failed at step 6 — tests 22/23 will still fail.');
    process.exit(1);
  }
  console.log(`\n  Score: ${b6.score}/10  Grade: ${b6.grade}  ✅`);

  console.log('\n' + '='.repeat(56));
  console.log('  Setup complete — schedule is scored and ready.');
  console.log('='.repeat(56) + '\n');
}

run().catch(err => {
  console.error('Setup script crashed:', err.message);
  process.exit(1);
});
