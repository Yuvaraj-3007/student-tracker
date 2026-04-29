const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs = require('fs');
const { runMigration, saveReport, closePool } = require('../src/db/reportRepository');

const LOGS_DIR = path.join(__dirname, '..', 'logs');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('[saveReports] DATABASE_URL not set — nothing to do.');
    return;
  }

  if (!fs.existsSync(LOGS_DIR)) {
    console.error(`[saveReports] Logs directory not found: ${LOGS_DIR}`);
    process.exit(2);
  }

  const files = fs.readdirSync(LOGS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();

  if (files.length === 0) {
    console.log('[saveReports] No log files found.');
    return;
  }

  const latest = files[files.length - 1];
  const date = latest.replace('.json', '');
  const filePath = path.join(LOGS_DIR, latest);

  let log;
  try {
    log = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`[saveReports] Failed to parse ${latest}: ${err.message}`);
    process.exit(2);
  }

  if (!log || !Array.isArray(log.results)) {
    console.error(`[saveReports] Invalid log shape in ${latest} — expected { results: [...] }.`);
    process.exit(2);
  }

  const runAt = log.runAt ? new Date(log.runAt) : new Date();
  const runMode = log.mode === 'mock' ? 'mock' : 'real';

  try {
    await runMigration();
  } catch (err) {
    console.error(`[saveReports] Migration failed: ${err.message}`);
    await closePool();
    process.exit(2);
  }

  let saved = 0;
  for (const r of log.results) {
    try {
      await saveReport(r.student, r, date, runAt, runMode);
      console.log(`[saveReports] Saved: ${r.student.name} — ${date}`);
      saved += 1;
    } catch (err) {
      console.error(`[saveReports] Failed: ${r.student.name} — ${err.message}`);
    }
  }

  await closePool();
  console.log(`[saveReports] Done. Saved ${saved}/${log.results.length} for ${date}.`);
}

main().catch(async (err) => {
  console.error(`[saveReports] Fatal: ${err.stack || err.message || err}`);
  try { await closePool(); } catch (_) { /* swallow */ }
  process.exit(2);
});
