# User Story: PostgreSQL Report Persistence — Store NIGHTWATCH Daily Reports

**Story ID:** NW-001
**Epic:** NIGHTWATCH Data Persistence
**Feature:** Save each intern's daily AI-generated report into a PostgreSQL table for historical querying and trend analysis
**Priority:** P1 (High)
**Effort:** 1 day (3 hours)
**Sprint:** Phase 2 — Persistence Layer
**Status:** Ready for Development
**Depends On:** None

---

## Story Overview

**As a** Wisright manager
**I want** each NIGHTWATCH daily report to be saved into a PostgreSQL database
**So that** I can query intern progress over time, track score trends, and access past reports without relying on local JSON files

**As a** system administrator
**I want** the database write to happen automatically after every NIGHTWATCH run
**So that** no manual intervention is needed to persist report data

---

## Why This Feature?

### Current Gap:
- Daily reports are written to `logs/YYYY-MM-DD.json` — local files that are not queryable
- Re-running `/nightwatch` on the same day overwrites the JSON log with no history
- No way to query "show all interns who scored below 5 this week" or "Selvam's score trend over 30 days"
- Reports only exist on the machine that ran the skill — not centrally accessible

### Real-World Use Case (Week-Over-Week Review):
Manager wants to open a Monday review and ask: "Which interns improved from last week to this week?"
- Today: must manually open multiple JSON files and compare by eye
- With this feature: one SQL query — `SELECT intern_name, report_date, score_overall FROM student_repo_reports ORDER BY intern_name, report_date`

This cannot be done with the current implementation.

### Solution:
Add a PostgreSQL persistence layer that:
- **Saves structured report data** — scores, feedback, risk flag, commit count per intern per day
- **Upserts on re-run** — running `/nightwatch` twice on the same day updates, not duplicates
- **Is additive** — existing JSON log files and dashboard continue to work unchanged
- **Auto-runs migration** — table is created on first run if it does not exist

---

## User Personas

### Primary: Logesh — The Wisright Manager
- **Role:** Oversees 3 interns, reviews daily NIGHTWATCH reports
- **Goal:** Track intern progress over weeks without manual file comparison
- **Pain Point:** "I have to open 20 JSON files to understand if Selvam is improving or declining."

### Secondary: NIGHTWATCH Skill (Automated Agent)
- **Role:** Runs the full intern tracking pipeline when `/nightwatch` is invoked
- **Goal:** Persist every run's results to a central store without extra user steps
- **Pain Point:** "Every run overwrites the previous log — there is no history."

---

## Detailed Sub-Stories

### Sub-Story 1: Add pg dependency and DATABASE_URL config

**Story ID:** NW-001.1
**Points:** 1 | **Effort:** 0.5 hours

```gherkin
As a developer setting up the project
I want the pg package installed and DATABASE_URL documented
So that the application can connect to PostgreSQL without extra setup steps
```

Tasks:
- Install `pg` npm package
- Add `DATABASE_URL` to `.env.example` with a placeholder value
- No code changes yet — just infrastructure

---

### Sub-Story 2: Create migration SQL for student_repo_reports table

**Story ID:** NW-001.2
**Points:** 1 | **Effort:** 0.5 hours

```gherkin
As a developer
I want a SQL migration file that defines the student_repo_reports table
So that the schema is version-controlled and reproducible on any environment
```

Tasks:
- Create `db/migrations/001_create_student_repo_reports.sql`
- Define all columns: scores, feedback arrays as JSONB, risk_flag, dates
- Add UNIQUE constraint on `(intern_name, report_date)` for upsert safety

---

### Sub-Story 3: Build reportRepository.js with saveReport() and runMigration()

**Story ID:** NW-001.3
**Points:** 3 | **Effort:** 1 hour

```gherkin
As a developer
I want a repository module that handles DB connection, migration, and upsert
So that all database logic is isolated in one place and testable independently
```

Tasks:
- Create `src/db/reportRepository.js`
- `getPool()` — lazy singleton pg pool using `DATABASE_URL`
- `runMigration()` — reads and executes the SQL migration file on first run
- `saveReport(student, result, date)` — upserts one row per intern per day

---

### Sub-Story 4: Wire saveReport into scheduler.js

**Story ID:** NW-001.4
**Points:** 2 | **Effort:** 0.5 hours

```gherkin
As the NIGHTWATCH system
I want saveReport called automatically after each intern is processed
So that every run persists to the database without any user action
```

Tasks:
- Import `reportRepository` in `src/scheduler.js`
- Call `runMigration()` once at startup
- Call `saveReport()` per intern result inside `runOnce()`
- Wrap in try/catch — DB failure must not crash the email/report pipeline

---

### Sub-Story 5: Update NIGHTWATCH skill Phase 4 to include DB save step

**Story ID:** NW-001.5
**Points:** 1 | **Effort:** 0.5 hours

```gherkin
As a user running /nightwatch
I want the skill instructions to include the DB save step
So that Claude follows the full pipeline including persistence
```

Tasks:
- Update `~/.claude/skills/nightwatch/SKILL.md` Phase 4
- Add instruction: after writing the JSON log, run `node scripts/saveReports.js` or call the repository inline
- Create `scripts/saveReports.js` as a standalone runner that reads the latest log and saves to DB

---

## Acceptance Criteria

### AC1: Table is created automatically on first run
```gherkin
GIVEN DATABASE_URL is set in the environment
WHEN the application runs for the first time
THEN the student_repo_reports table is created if it does not already exist
AND no manual SQL execution is required
```

### AC2: Active intern report is saved correctly
```gherkin
GIVEN an intern has commits in the last 24 hours
WHEN /nightwatch completes analysis for that intern
THEN one row is inserted into student_repo_reports
AND score_overall, risk_flag, summary, strengths, mistakes, suggestions are all populated
AND report_date equals today's date
```

### AC3: Inactive intern is recorded
```gherkin
GIVEN an intern has no commits in the last 24 hours
WHEN /nightwatch runs
THEN one row is inserted with is_active = false
AND all score columns are NULL
AND analysis columns are NULL
```

### AC4: Re-running on the same day upserts, not duplicates
```gherkin
GIVEN a report already exists for intern_name + report_date
WHEN /nightwatch runs again on the same day
THEN the existing row is updated with new values
AND no duplicate rows are created
AND the total row count for that intern+date remains 1
```

### AC5: DB failure does not crash the pipeline
```gherkin
GIVEN DATABASE_URL is misconfigured or the DB is unreachable
WHEN /nightwatch runs
THEN the email reports and JSON log are still generated
AND an error is logged to the console
AND the process exits with success (not failure)
```

### AC6: Existing JSON log and dashboard are unaffected
```gherkin
GIVEN the DB persistence feature is active
WHEN /nightwatch runs
THEN logs/YYYY-MM-DD.json is still written as before
AND node scripts/copyDataForDashboard.js still works
AND the React dashboard at localhost:5173 still displays correct data
```

### AC7: JSONB fields store arrays correctly
```gherkin
GIVEN an active intern with 3 strengths, 3 mistakes, and 3 suggestions
WHEN the row is saved to student_repo_reports
THEN strengths, mistakes, suggestions columns contain valid JSONB arrays
AND each array has the correct number of items
```

### AC8: Data can be queried by date range
```gherkin
GIVEN multiple days of reports exist in student_repo_reports
WHEN a SQL query filters by report_date BETWEEN date1 AND date2
THEN only rows within that range are returned
AND results are orderable by score_overall DESC
```

---

## Technical Implementation

### Part 1: Dependencies and Config (0.5 hours)

#### Task 1.1: Install pg

```bash
npm install pg
```

#### Task 1.2: Update .env.example

**File:** `.env.example`

Add below existing SMTP config:

```bash
# --- PostgreSQL (optional — enables report history) ---
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

---

### Part 2: Migration SQL (0.5 hours)

#### Task 2.1: Create migration file

**File:** `db/migrations/001_create_student_repo_reports.sql`

```sql
CREATE TABLE IF NOT EXISTS student_repo_reports (
  id                    SERIAL PRIMARY KEY,
  intern_name           VARCHAR(100) NOT NULL,
  repo                  TEXT NOT NULL,
  report_date           DATE NOT NULL,
  is_active             BOOLEAN DEFAULT false,
  commit_count          INTEGER DEFAULT 0,
  score_understanding   NUMERIC(4,1),
  score_implementation  NUMERIC(4,1),
  score_code_quality    NUMERIC(4,1),
  score_effort          NUMERIC(4,1),
  score_overall         NUMERIC(4,1),
  risk_flag             VARCHAR(50),
  summary               TEXT,
  strengths             JSONB,
  mistakes              JSONB,
  suggestions           JSONB,
  learning_feedback     TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (intern_name, report_date)
);

CREATE INDEX IF NOT EXISTS idx_srr_intern_date ON student_repo_reports (intern_name, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_srr_date ON student_repo_reports (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_srr_risk ON student_repo_reports (risk_flag) WHERE risk_flag != 'none';
```

---

### Part 3: Report Repository (1 hour)

#### Task 3.1: Create reportRepository.js

**File:** `src/db/reportRepository.js`

```javascript
// Purpose: PostgreSQL persistence layer for NIGHTWATCH daily intern reports
// Input: student object + analysis result + date string
// Output: upserted row in student_repo_reports

require('dotenv').config();
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
  _pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  return _pool;
}

async function runMigration() {
  const pool = getPool();
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  await pool.query(sql);
  console.log('[db] Migration applied: student_repo_reports table ready.');
}

async function saveReport(student, result, date) {
  const pool = getPool();
  const analysis = result.analysis || null;

  const values = [
    student.name,
    student.repo,
    date,
    result.isActive,
    result.commitCount || 0,
    analysis ? analysis.scores.understanding : null,
    analysis ? analysis.scores.implementation : null,
    analysis ? analysis.scores.code_quality : null,
    analysis ? analysis.scores.effort : null,
    analysis ? analysis.scores.overall : null,
    analysis ? analysis.risk_flag : null,
    analysis ? analysis.summary : null,
    analysis ? JSON.stringify(analysis.strengths) : null,
    analysis ? JSON.stringify(analysis.mistakes) : null,
    analysis ? JSON.stringify(analysis.suggestions) : null,
    analysis ? analysis.learning_feedback : null
  ];

  const query = `
    INSERT INTO student_repo_reports (
      intern_name, repo, report_date, is_active, commit_count,
      score_understanding, score_implementation, score_code_quality,
      score_effort, score_overall, risk_flag, summary,
      strengths, mistakes, suggestions, learning_feedback, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, NOW()
    )
    ON CONFLICT (intern_name, report_date) DO UPDATE SET
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
  if (_pool) await _pool.end();
}

module.exports = { runMigration, saveReport, closePool };
```

---

### Part 4: Wire into scheduler.js (0.5 hours)

#### Task 4.1: Update scheduler.js

**File:** `src/scheduler.js`

Add after existing requires (line 9):

```javascript
const { runMigration, saveReport, closePool } = require('./db/reportRepository');
```

Add `saveToDb` call inside `runOnce()` after `writeDailyLog()` (around line 153):

```javascript
// Save to PostgreSQL if DATABASE_URL is configured
if (process.env.DATABASE_URL) {
  const date = new Date().toISOString().slice(0, 10);
  for (const r of results) {
    try {
      await saveReport(r.student, r, date);
    } catch (err) {
      console.error(`[db] Failed to save report for ${r.student.name}: ${err.message}`);
    }
  }
  console.log(`[db] Reports saved to PostgreSQL.`);
}
```

Add `runMigration()` call at top of `runOnce()` (before loading students):

```javascript
if (process.env.DATABASE_URL) {
  try {
    await runMigration();
  } catch (err) {
    console.error(`[db] Migration failed: ${err.message} — continuing without DB.`);
  }
}
```

---

### Part 5: Standalone save script for skill (0.5 hours)

#### Task 5.1: Create scripts/saveReports.js

**File:** `scripts/saveReports.js`

```javascript
// Purpose: Reads the latest logs/YYYY-MM-DD.json and saves all results to PostgreSQL
// Usage: node scripts/saveReports.js
// Called by: /nightwatch skill Phase 4

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { runMigration, saveReport, closePool } = require('../src/db/reportRepository');

const LOGS_DIR = path.join(__dirname, '..', 'logs');

async function main() {
  const files = fs.readdirSync(LOGS_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();

  if (files.length === 0) {
    console.log('[saveReports] No log files found.');
    return;
  }

  const latest = files[files.length - 1];
  const date = latest.replace('.json', '');
  const log = JSON.parse(fs.readFileSync(path.join(LOGS_DIR, latest), 'utf8'));

  await runMigration();

  for (const result of log.results) {
    try {
      await saveReport(result.student, result, date);
      console.log(`[saveReports] Saved: ${result.student.name} — ${date}`);
    } catch (err) {
      console.error(`[saveReports] Failed: ${result.student.name} — ${err.message}`);
    }
  }

  await closePool();
  console.log('[saveReports] Done.');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
```

---

## File Summary

| File | Action | Approximate Lines |
|------|--------|-------------------|
| `package.json` | Modify — add pg dependency | +1 line |
| `.env.example` | Modify — add DATABASE_URL | +3 lines |
| `db/migrations/001_create_student_repo_reports.sql` | NEW | ~25 lines |
| `src/db/reportRepository.js` | NEW | ~80 lines |
| `src/scheduler.js` | Modify — add DB save after run | +15 lines |
| `scripts/saveReports.js` | NEW | ~40 lines |
| `~/.claude/skills/nightwatch/SKILL.md` | Modify — add DB save to Phase 4 | +5 lines |

**DB impact:** Adds one new table `student_repo_reports` to the existing `LMS-Prod` PostgreSQL database. No existing tables are touched.

---

## UI Test Setup

| Field | Value |
|-------|-------|
| **App URL** | http://127.0.0.1:5173 |
| **Test Route** | N/A — this is a backend/CLI feature |
| **Login as** | N/A |
| **Test Data** | Requires `DATABASE_URL` set in `.env`, at least one NIGHTWATCH run completed |
| **Non-testable ACs via UI** | AC1, AC2, AC3, AC4, AC5, AC7, AC8 — verify via psql query: `SELECT * FROM student_repo_reports ORDER BY report_date DESC;` |
