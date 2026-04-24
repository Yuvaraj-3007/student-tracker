#!/usr/bin/env node
// Thin NIGHTWATCH email sender — takes a daily log file path,
// renders manager + per-intern emails, sends via SMTP.
//
// Usage:  node scripts/sendNightwatchEmails.js logs/YYYY-MM-DD.json
// Env:    .env must define SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
//         MANAGER_EMAIL, CC_EMAIL (optional), SEND_STUDENT_EMAILS=true|false

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sendEmail } = require('../src/real/realEmail');
const { buildStudentReport, buildManagerReport } = require('../src/generateReport');

function fail(msg) {
  console.log(`[ERR] ${msg}`);
  process.exit(1);
}

async function main() {
  const logArg = process.argv[2];
  if (!logArg) fail('usage: node scripts/sendNightwatchEmails.js <log-file>');

  const logPath = path.isAbsolute(logArg) ? logArg : path.join(process.cwd(), logArg);
  if (!fs.existsSync(logPath)) fail(`log file not found: ${logPath}`);

  let log;
  try {
    log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  } catch (err) {
    fail(`invalid JSON in log file: ${err.message}`);
  }

  const results = Array.isArray(log.results) ? log.results : [];
  if (results.length === 0) fail('log has no results[]');

  const managerEmail = process.env.MANAGER_EMAIL;
  if (!managerEmail) fail('MANAGER_EMAIL missing in .env');

  const date = (log.runAt || new Date().toISOString()).slice(0, 10);

  let ok = 0;
  let err = 0;

  // Manager report
  try {
    const mgr = buildManagerReport({ results, date });
    await sendEmail({ to: managerEmail, subject: mgr.subject, body: mgr.body, kind: 'manager' });
    console.log(`[OK] manager -> ${managerEmail}`);
    ok += 1;
  } catch (e) {
    console.log(`[ERR] manager send failed: ${e.message}`);
    err += 1;
  }

  // Per-student reports (opt-in via env)
  const sendStudents = String(process.env.SEND_STUDENT_EMAILS || 'false').toLowerCase() === 'true';
  if (sendStudents) {
    for (const r of results) {
      if (!r.isActive || !r.analysis || !r.student || !r.student.email) continue;
      try {
        const msg = buildStudentReport({
          student: r.student,
          analysis: r.analysis,
          commitBundle: { commits: new Array(r.commitCount || 0) }
        });
        await sendEmail({ to: msg.to, subject: msg.subject, body: msg.body, kind: 'student' });
        console.log(`[OK] student ${r.student.name} -> ${msg.to}`);
        ok += 1;
      } catch (e) {
        console.log(`[ERR] student ${r.student.name} send failed: ${e.message}`);
        err += 1;
      }
    }
  } else {
    console.log('[SKIP] student emails disabled (SEND_STUDENT_EMAILS != true)');
  }

  console.log(`[DONE] ${ok} sent, ${err} failed`);
  process.exit(err > 0 ? 2 : 0);
}

main().catch((e) => fail(`uncaught: ${e.stack || e.message}`));
