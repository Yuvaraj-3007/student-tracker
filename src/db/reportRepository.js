const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATION_FILE = path.join(__dirname, '..', '..', 'db', 'migrations', '001_create_student_repo_reports.sql');

let _pool = null;

function getPool() {
  if (_pool) return _pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for DB persistence.');
  }
  const ssl = process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: false } : false;
  _pool = new Pool({ connectionString, ssl });
  return _pool;
}

async function runMigration() {
  const pool = getPool();
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  await pool.query(sql);
  console.log('[db] Migration applied: student_repo_reports table ready.');
}

async function saveReport(student, result, dateString, runAt, runMode) {
  const pool = getPool();
  const analysis = result.analysis || null;
  const commitCount = result.commitBundle ? result.commitBundle.commits.length : (result.commitCount || 0);

  const values = [
    student.name,
    student.repo,
    dateString,
    runAt instanceof Date ? runAt.toISOString() : runAt,
    runMode || 'real',
    !!result.isActive,
    commitCount,
    analysis ? analysis.scores.understanding : null,
    analysis ? analysis.scores.implementation : null,
    analysis ? analysis.scores.code_quality : null,
    analysis ? analysis.scores.effort : null,
    analysis ? analysis.scores.overall : null,
    analysis ? analysis.risk_flag : null,
    analysis ? analysis.summary : null,
    analysis ? JSON.stringify(analysis.strengths || []) : null,
    analysis ? JSON.stringify(analysis.mistakes || []) : null,
    analysis ? JSON.stringify(analysis.suggestions || []) : null,
    analysis ? analysis.learning_feedback : null
  ];

  const query = `
    INSERT INTO student_repo_reports (
      intern_name, repo, report_date, run_at, run_mode,
      is_active, commit_count,
      score_understanding, score_implementation, score_code_quality,
      score_effort, score_overall, risk_flag, summary,
      strengths, mistakes, suggestions, learning_feedback,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7,
      $8, $9, $10,
      $11, $12, $13, $14,
      $15, $16, $17, $18,
      NOW()
    )
    ON CONFLICT (intern_name, report_date) DO UPDATE SET
      repo                 = EXCLUDED.repo,
      run_at               = EXCLUDED.run_at,
      run_mode             = EXCLUDED.run_mode,
      is_active            = EXCLUDED.is_active,
      commit_count         = EXCLUDED.commit_count,
      score_understanding  = EXCLUDED.score_understanding,
      score_implementation = EXCLUDED.score_implementation,
      score_code_quality   = EXCLUDED.score_code_quality,
      score_effort         = EXCLUDED.score_effort,
      score_overall        = EXCLUDED.score_overall,
      risk_flag            = EXCLUDED.risk_flag,
      summary              = EXCLUDED.summary,
      strengths            = EXCLUDED.strengths,
      mistakes             = EXCLUDED.mistakes,
      suggestions          = EXCLUDED.suggestions,
      learning_feedback    = EXCLUDED.learning_feedback,
      updated_at           = NOW()
  `;

  await pool.query(query, values);
}

async function closePool() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

module.exports = { getPool, runMigration, saveReport, closePool };
