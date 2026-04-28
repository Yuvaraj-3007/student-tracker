const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs = require('fs');
const { getPool, closePool } = require('../src/db/reportRepository');

const LOGS_DIR = path.join(__dirname, '..', 'logs');
const STUDENTS_FILE = path.join(__dirname, '..', 'config', 'students.json');
const OUT_DIR = path.join(__dirname, '..', 'frontend', 'public');
const OUT_FILE = path.join(OUT_DIR, 'data.json');

function loadLogs() {
  if (!fs.existsSync(LOGS_DIR)) return [];
  const files = fs
    .readdirSync(LOGS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  const logs = [];
  for (const f of files) {
    try {
      const raw = fs.readFileSync(path.join(LOGS_DIR, f), 'utf8');
      logs.push({ fileName: f, date: f.replace('.json', ''), data: JSON.parse(raw) });
    } catch (err) {
      console.error(`[copyDataForDashboard] Skipping ${f}: ${err.message}`);
    }
  }
  return logs;
}

function buildHistory(logs) {
  const history = {};
  for (const log of logs) {
    const results = (log.data && log.data.results) || [];
    for (const r of results) {
      const name = r.student && r.student.name;
      if (!name) continue;
      if (!history[name]) history[name] = [];
      history[name].push({
        date: log.date,
        isActive: !!r.isActive,
        commitCount: r.commitCount || 0,
        error: r.error || null,
        analysis: r.analysis || null
      });
    }
  }
  for (const name of Object.keys(history)) {
    history[name].sort((a, b) => b.date.localeCompare(a.date));
  }
  return history;
}

function loadStudents() {
  try {
    return JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

async function loadFromDb() {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT
      intern_name, repo, report_date::text AS report_date,
      run_at, run_mode, is_active, commit_count,
      score_understanding, score_implementation,
      score_code_quality, score_effort, score_overall,
      risk_flag, summary, strengths, mistakes,
      suggestions, learning_feedback, created_at
    FROM student_repo_reports
    WHERE run_mode = 'real'
    ORDER BY report_date DESC, intern_name ASC
  `);
  return rows;
}

function rowToAnalysis(row) {
  if (!row.is_active || row.score_overall == null) return null;
  return {
    summary: row.summary,
    scores: {
      understanding: Number(row.score_understanding),
      implementation: Number(row.score_implementation),
      code_quality: Number(row.score_code_quality),
      effort: Number(row.score_effort),
      overall: Number(row.score_overall)
    },
    strengths: row.strengths || [],
    mistakes: row.mistakes || [],
    suggestions: row.suggestions || [],
    learning_feedback: row.learning_feedback,
    risk_flag: row.risk_flag
  };
}

function buildHistoryFromDb(rows) {
  const history = {};
  for (const row of rows) {
    const name = row.intern_name;
    if (!name) continue;
    if (!history[name]) history[name] = [];
    history[name].push({
      date: row.report_date,
      isActive: !!row.is_active,
      commitCount: row.commit_count || 0,
      error: null,
      analysis: rowToAnalysis(row)
    });
  }
  for (const name of Object.keys(history)) {
    history[name].sort((a, b) => b.date.localeCompare(a.date));
  }
  return history;
}

function buildLogFromDb(rows, students) {
  if (rows.length === 0) return null;
  const latestDate = rows[0].report_date;
  const latestRows = rows.filter((r) => r.report_date === latestDate);
  const studentByName = new Map(students.map((s) => [s.name, s]));
  const firstRunAt = latestRows[0].run_at;

  return {
    fileName: `${latestDate}.json`,
    data: {
      runAt: firstRunAt instanceof Date ? firstRunAt.toISOString() : firstRunAt,
      mode: latestRows[0].run_mode || 'real',
      results: latestRows.map((r) => ({
        student: studentByName.get(r.intern_name) || { name: r.intern_name, repo: r.repo },
        isActive: !!r.is_active,
        error: null,
        commitCount: r.commit_count || 0,
        analysis: rowToAnalysis(r)
      }))
    }
  };
}

async function main() {
  const students = loadStudents();
  let log = null;
  let history = null;
  let source = 'logs/*.json';

  if (process.env.DATABASE_URL) {
    try {
      const rows = await loadFromDb();
      history = buildHistoryFromDb(rows);
      log = buildLogFromDb(rows, students);
      source = 'PostgreSQL';
    } catch (err) {
      console.error(`[copyDataForDashboard] DB read failed (${err.message}) — falling back to JSON logs.`);
      history = null;
      log = null;
    } finally {
      try { await closePool(); } catch (_) { /* swallow */ }
    }
  }

  if (!history) {
    const logs = loadLogs();
    const latest = logs.length > 0 ? logs[logs.length - 1] : null;
    log = latest ? { fileName: latest.fileName, data: latest.data } : null;
    history = buildHistory(logs);
    if (process.env.DATABASE_URL) source = 'logs/*.json (fallback)';
  }

  const payload = { log, students, history };

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Dashboard data written: ${OUT_FILE}`);
  console.log(`  Source: ${source}`);
  console.log(`  Latest: ${log ? log.fileName : '(none)'}`);
  console.log(`  Interns with history: ${Object.keys(history).length}`);
}

main().catch((err) => {
  console.error('[copyDataForDashboard] Fatal:', err.message);
  process.exit(1);
});
