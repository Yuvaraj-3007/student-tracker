require('dotenv').config();

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const { fetchCommitsForStudent } = require('./fetchCommits');
const { analyzeStudentWork } = require('./analyzeCommit');
const { sendEmail } = require('./sendEmail');
const { buildStudentReport, buildManagerReport } = require('./generateReport');
const { runMigration, saveReport, closePool } = require('./db/reportRepository');

const STUDENTS_FILE = path.join(__dirname, '..', 'config', 'students.json');
const LOGS_DIR = path.join(__dirname, '..', 'logs');
const CRON_SCHEDULE = '0 19 * * *';
const CRON_TIMEZONE = 'Asia/Kolkata';
const CONCURRENCY = 3;

function loadStudents() {
  if (!fs.existsSync(STUDENTS_FILE)) {
    throw new Error(`students.json not found at ${STUDENTS_FILE}`);
  }
  const raw = fs.readFileSync(STUDENTS_FILE, 'utf8');
  const list = JSON.parse(raw);
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('students.json must be a non-empty array.');
  }
  for (const s of list) {
    if (!s.name || !s.email || !s.repo) {
      throw new Error(`Invalid student entry: ${JSON.stringify(s)}`);
    }
  }
  return list;
}

function validateEnv() {
  const useMocks = process.env.USE_MOCKS === 'true';
  const required = ['MANAGER_EMAIL'];
  if (!useMocks) {
    required.push('GITHUB_TOKEN', 'ANTHROPIC_API_KEY', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS');
  }
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  return { useMocks };
}

async function runInBatches(items, batchSize, worker) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((item) => worker(item)));
    results.push(...batchResults);
  }
  return results;
}

async function processStudent(student) {
  try {
    const commitBundle = await fetchCommitsForStudent(student);

    if (!commitBundle.isActive) {
      return {
        student,
        isActive: false,
        commitBundle,
        analysis: null,
        error: null
      };
    }

    const analysis = await analyzeStudentWork(commitBundle);

    return {
      student,
      isActive: true,
      commitBundle,
      analysis,
      error: null
    };
  } catch (err) {
    return {
      student,
      isActive: false,
      commitBundle: null,
      analysis: null,
      error: err.message || String(err)
    };
  }
}

function writeDailyLog(results, runAt) {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
  const at = runAt instanceof Date ? runAt : new Date();
  const fileName = `${at.toISOString().slice(0, 10)}.json`;
  const filePath = path.join(LOGS_DIR, fileName);
  const payload = {
    runAt: at.toISOString(),
    mode: process.env.USE_MOCKS === 'true' ? 'mock' : 'real',
    results: results.map((r) => ({
      student: r.student,
      isActive: r.isActive,
      error: r.error,
      commitCount: r.commitBundle ? r.commitBundle.commits.length : 0,
      analysis: r.analysis
    }))
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return filePath;
}

async function sendManagerEmail(results) {
  const managerEmail = process.env.MANAGER_EMAIL;
  const { subject, body } = buildManagerReport({ results });
  return sendEmail({ to: managerEmail, subject, body, kind: 'manager' });
}

async function sendStudentEmails(results) {
  if (process.env.SEND_STUDENT_EMAILS !== 'true') return [];
  const sent = [];
  for (const r of results) {
    if (!r.isActive || r.error || !r.analysis) continue;
    try {
      const { subject, body, to } = buildStudentReport({
        student: r.student,
        analysis: r.analysis,
        commitBundle: r.commitBundle
      });
      const result = await sendEmail({ to, subject, body, kind: 'student' });
      sent.push({ student: r.student.name, ...result });
    } catch (err) {
      console.error(`[sendStudentEmails] Failed for ${r.student.name}: ${err.message}`);
    }
  }
  return sent;
}

async function runOnce() {
  const { useMocks } = validateEnv();
  const runAt = new Date();
  console.log('========================================');
  console.log('  🌙 NIGHTWATCH — Intern Tracking Agent');
  console.log('========================================');
  if (useMocks) {
    console.log('⚠️  RUNNING IN MOCK MODE — no real APIs will be called.');
  }

  const dbEnabled = !!process.env.DATABASE_URL;
  if (dbEnabled) {
    try {
      await runMigration();
    } catch (err) {
      console.error(`[db] Migration failed: ${err.message} — continuing without DB.`);
    }
  }

  try {
    const students = loadStudents();
    console.log(`Loaded ${students.length} intern(s).`);

    const results = await runInBatches(students, CONCURRENCY, processStudent);

    const logPath = writeDailyLog(results, runAt);
    console.log(`Log written: ${logPath}`);

    if (dbEnabled) {
      const date = runAt.toISOString().slice(0, 10);
      const runMode = useMocks ? 'mock' : 'real';
      let saved = 0;
      for (const r of results) {
        try {
          await saveReport(r.student, r, date, runAt, runMode);
          saved += 1;
        } catch (err) {
          console.error(`[db] Failed to save report for ${r.student.name}: ${err.message}`);
        }
      }
      console.log(`[db] Reports saved to PostgreSQL: ${saved}/${results.length}.`);
    }

    const managerResult = await sendManagerEmail(results);
    console.log(`Manager report: ${managerResult.path || 'sent'}`);

    const studentResults = await sendStudentEmails(results);
    console.log(`Student emails sent: ${studentResults.length}`);

    const active = results.filter((r) => r.isActive && !r.error).length;
    const inactive = results.filter((r) => !r.isActive && !r.error).length;
    const errored = results.filter((r) => r.error).length;
    console.log(`Done. Active: ${active} · Inactive: ${inactive} · Errored: ${errored}`);
  } finally {
    if (dbEnabled) {
      try { await closePool(); } catch (err) { console.error(`[db] closePool failed: ${err.message}`); }
    }
  }
}

function startCron() {
  console.log(`🌙 NIGHTWATCH scheduler started. Cron: "${CRON_SCHEDULE}" ${CRON_TIMEZONE} (daily 7 PM IST).`);
  cron.schedule(
    CRON_SCHEDULE,
    () => {
      runOnce().catch((err) => {
        console.error(`[cron] run failed: ${err.stack || err.message || err}`);
      });
    },
    { timezone: CRON_TIMEZONE }
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--once')) {
    await runOnce();
    return;
  }
  startCron();
}

main().catch((err) => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
