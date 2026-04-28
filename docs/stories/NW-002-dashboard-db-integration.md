# User Story: Dashboard DB Integration — Serve Report History from PostgreSQL

**Story ID:** NW-002
**Epic:** NIGHTWATCH Data Persistence
**Feature:** Pull intern report history from PostgreSQL into the React dashboard instead of local JSON log files
**Priority:** P1 (High)
**Effort:** 1 day (3.5 hours)
**Sprint:** Phase 2 — Persistence Layer
**Status:** Ready for Development
**Depends On:** NW-001 (PostgreSQL report persistence must be in place)

---

## Story Overview

**As a** Wisright manager
**I want** the NIGHTWATCH dashboard to display report history fetched from the PostgreSQL database
**So that** I can see all historical reports across all dates — not just what exists in local JSON files on one machine

**As a** developer
**I want** the dashboard data pipeline to read from the DB when DATABASE_URL is set, and fall back to JSON files when it is not
**So that** the system works in both connected and offline environments without code changes

---

## Why This Feature?

### Current Gap:
- `copyDataForDashboard.js` reads only from `logs/*.json` files — local, ephemeral, machine-specific
- If the logs folder is cleared or the project is opened on a new machine, all history is lost
- The history object passed to the `Reports` view (`frontend/src/views/Reports.jsx:196`) only reflects what is on disk locally
- Re-running `/nightwatch` after NW-001 saves to DB, but the dashboard still ignores the DB

### Real-World Use Case (New Machine, Full History):
Manager opens the dashboard on a new laptop — the `logs/` folder is empty. Dashboard shows no history.
- With NW-002: `npm run dashboard:data` queries PostgreSQL, rebuilds `data.json` with all historical reports, dashboard shows complete history immediately.

This cannot be done with the current implementation.

### Solution:
Update `scripts/copyDataForDashboard.js` to:
- **Query `student_repo_reports` from PostgreSQL** when `DATABASE_URL` is set
- **Build the identical payload shape** (`{ log, students, history }`) from DB rows — no React changes needed
- **Fall back to JSON files** when `DATABASE_URL` is not set — offline/mock mode still works
- **Backward compatible** — the React dashboard reads `data.json` exactly as before

---

## User Personas

### Primary: Logesh — The Wisright Manager
- **Role:** Oversees 3 interns, reviews daily NIGHTWATCH reports in the dashboard
- **Goal:** See full report history across all dates from any machine
- **Pain Point:** "I open the dashboard on my laptop and the history is empty — the logs are on the server."

### Secondary: Developer setting up a new environment
- **Role:** Runs `npm run dashboard:dev` for the first time on a fresh clone
- **Goal:** Dashboard works immediately without copying over JSON files
- **Pain Point:** "I have to manually copy logs/ from the production server to see any data."

---

## Detailed Sub-Stories

### Sub-Story 1: Add DB query logic to copyDataForDashboard.js

**Story ID:** NW-002.1
**Points:** 3 | **Effort:** 1.5 hours

```gherkin
As the dashboard data pipeline
I want copyDataForDashboard.js to query PostgreSQL when DATABASE_URL is set
So that data.json reflects DB contents rather than local JSON files
```

Tasks:
- Import `pg` Pool in `scripts/copyDataForDashboard.js`
- Add `loadFromDb()` function that queries `student_repo_reports` ordered by `report_date DESC`
- Build the same `{ log, students, history }` payload from DB rows
- Keep existing `loadLogs()` as fallback when `DATABASE_URL` is not set
- No changes to the payload shape — React reads `data.json` identically

---

### Sub-Story 2: Update package.json scripts for DB-aware dashboard

**Story ID:** NW-002.2
**Points:** 1 | **Effort:** 0.5 hours

```gherkin
As a developer
I want npm run dashboard:data to automatically use the DB when configured
So that refreshing dashboard data is a single command regardless of environment
```

Tasks:
- No script name changes — `dashboard:data` and `dashboard:dev` stay the same
- Ensure `dotenv` is loaded at the top of `copyDataForDashboard.js` so `DATABASE_URL` is available

---

### Sub-Story 3: Build history payload from DB rows

**Story ID:** NW-002.3
**Points:** 3 | **Effort:** 1 hour

```gherkin
As the React dashboard
I want the history object to contain all dates from the DB per intern
So that the Reports view date selector shows the full historical range
```

Tasks:
- Map each DB row to the history entry shape already expected by `Reports.jsx:107` (`InternExpansion`)
- History entry shape: `{ date, isActive, commitCount, error, analysis }`
- `analysis` shape: `{ summary, scores, strengths, mistakes, suggestions, learning_feedback, risk_flag }`
- `log` field: most recent run's metadata (runAt, mode, results summary)

---

### Sub-Story 4: Verify React dashboard backward compatibility

**Story ID:** NW-002.4
**Points:** 1 | **Effort:** 0.5 hours

```gherkin
As a developer without a DB configured
I want the dashboard to still work using local JSON files
So that offline/mock mode is not broken
```

Tasks:
- Test `npm run dashboard:dev` without `DATABASE_URL` — confirm falls back to JSON
- Test with `DATABASE_URL` — confirm reads from DB
- Confirm `useData.js` requires zero changes — it still fetches `/data.json`
- Confirm `App.jsx`, `Reports.jsx`, `Interns.jsx`, `Overview.jsx` require zero changes

---

## Acceptance Criteria

### AC1: DB data populates dashboard when DATABASE_URL is set
```gherkin
GIVEN DATABASE_URL is set in the environment
AND student_repo_reports has rows for multiple dates
WHEN npm run dashboard:data is run
THEN data.json is written with history entries for all dates in the DB
AND the Reports view date selector shows all historical dates
```

### AC2: JSON fallback works when DATABASE_URL is not set
```gherkin
GIVEN DATABASE_URL is NOT set in the environment
WHEN npm run dashboard:data is run
THEN the script falls back to reading from logs/*.json files
AND the dashboard displays data exactly as before NW-002
```

### AC3: History shape matches what Reports.jsx expects
```gherkin
GIVEN DB rows exist for intern "Selvam" across 5 dates
WHEN npm run dashboard:data is run
THEN history["Selvam"] contains 5 entries sorted newest first
AND each entry has: date, isActive, commitCount, error, analysis
AND analysis contains: summary, scores, strengths, mistakes, suggestions, learning_feedback, risk_flag
```

### AC4: Latest log entry is set correctly
```gherkin
GIVEN multiple dates of reports exist in the DB
WHEN npm run dashboard:data is run
THEN the log field contains the most recent run date
AND Overview.jsx shows the correct "as of" date
```

### AC5: Inactive intern entries are included
```gherkin
GIVEN an intern was inactive on a given date (is_active = false in DB)
WHEN npm run dashboard:data is run
THEN the history entry for that date is included with analysis = null
AND the dashboard shows "No activity" for that date
```

### AC6: No React component changes required
```gherkin
GIVEN NW-002 is fully implemented
WHEN the developer inspects frontend/src/
THEN useData.js, App.jsx, Reports.jsx, Interns.jsx, Overview.jsx are unchanged
AND the dashboard renders identically to before
```

### AC7: JSONB arrays render correctly in the Reports view
```gherkin
GIVEN a DB row has strengths, mistakes, suggestions as JSONB arrays
WHEN the report is displayed in Reports.jsx via InternExpansion
THEN TeacherList renders each array item as a list item
AND no "[object Object]" or raw JSON strings appear in the UI
```

### AC8: dashboard:dev command works end-to-end with DB
```gherkin
GIVEN DATABASE_URL is set and the DB has data
WHEN npm run dashboard:dev is run
THEN copyDataForDashboard.js runs first and queries the DB
AND the Vite dev server starts
AND the dashboard at localhost:5173 shows DB-sourced data
```

---

## Technical Implementation

### Part 1: Update copyDataForDashboard.js (2 hours)

#### Task 1.1: Add dotenv and pg imports

**File:** `scripts/copyDataForDashboard.js`

Add at the top:

```javascript
require('dotenv').config();
const { Pool } = require('pg');
```

#### Task 1.2: Add loadFromDb() function

**File:** `scripts/copyDataForDashboard.js`

Add after existing `loadStudents()` function (currently line 50):

```javascript
async function loadFromDb() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const { rows } = await pool.query(`
      SELECT
        intern_name, repo, report_date::text AS report_date,
        is_active, commit_count,
        score_understanding, score_implementation,
        score_code_quality, score_effort, score_overall,
        risk_flag, summary, strengths, mistakes,
        suggestions, learning_feedback,
        run_at, created_at
      FROM student_repo_reports
      ORDER BY report_date DESC, intern_name ASC
    `);
    return rows;
  } finally {
    await pool.end();
  }
}
```

#### Task 1.3: Add buildHistoryFromDb() function

**File:** `scripts/copyDataForDashboard.js`

```javascript
function buildHistoryFromDb(rows) {
  const history = {};

  for (const row of rows) {
    const name = row.intern_name;
    if (!history[name]) history[name] = [];

    const analysis = row.is_active && row.score_overall != null ? {
      summary: row.summary,
      scores: {
        understanding: Number(row.score_understanding),
        implementation: Number(row.score_implementation),
        code_quality:   Number(row.score_code_quality),
        effort:         Number(row.score_effort),
        overall:        Number(row.score_overall)
      },
      strengths:         row.strengths || [],
      mistakes:          row.mistakes  || [],
      suggestions:       row.suggestions || [],
      learning_feedback: row.learning_feedback,
      risk_flag:         row.risk_flag
    } : null;

    history[name].push({
      date:        row.report_date,
      isActive:    row.is_active,
      commitCount: row.commit_count,
      error:       null,
      analysis
    });
  }

  return history;
}
```

#### Task 1.4: Update main() to branch on DATABASE_URL

**File:** `scripts/copyDataForDashboard.js`

Replace existing `main()` function (currently lines 58-76):

```javascript
async function main() {
  const students = loadStudents();
  let log = null;
  let history = {};

  if (process.env.DATABASE_URL) {
    console.log('[copyDataForDashboard] DATABASE_URL detected — reading from PostgreSQL.');
    const rows = await loadFromDb();
    history = buildHistoryFromDb(rows);

    // Build log from the most recent date's rows
    const latestDate = rows.length > 0 ? rows[0].report_date : null;
    if (latestDate) {
      const latestRows = rows.filter(r => r.report_date === latestDate);
      log = {
        fileName: `${latestDate}.json`,
        data: {
          runAt: latestRows[0] ? latestRows[0].created_at : new Date().toISOString(),
          mode: 'real',
          results: latestRows.map(r => ({
            student: { name: r.intern_name, repo: r.repo },
            isActive: r.is_active,
            error: null,
            commitCount: r.commit_count,
            analysis: history[r.intern_name] && history[r.intern_name][0]
              ? history[r.intern_name][0].analysis
              : null
          }))
        }
      };
    }
  } else {
    console.log('[copyDataForDashboard] No DATABASE_URL — reading from logs/*.json files.');
    const logs = loadLogs();
    const latest = logs.length > 0 ? logs[logs.length - 1] : null;
    log = latest ? { fileName: latest.fileName, data: latest.data } : null;
    history = buildHistory(logs);
  }

  const payload = { log, students, history };

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Dashboard data written: ${OUT_FILE}`);
  console.log(`  Source: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'logs/*.json'}`);
  console.log(`  Latest: ${log ? log.fileName : '(none)'}`);
  console.log(`  Interns with history: ${Object.keys(history).length}`);
}

main().catch(err => {
  console.error('[copyDataForDashboard] Error:', err.message);
  process.exit(1);
});
```

---

### Part 2: No React Changes (0 hours)

The following files require **zero changes**:

- `frontend/src/hooks/useData.js` — still fetches `/data.json`, same shape
- `frontend/src/App.jsx` — reads `{ log, students, history }` as before
- `frontend/src/views/Reports.jsx` — `InternExpansion` and `DayReport` components unchanged
- `frontend/src/views/Interns.jsx` — table view unchanged
- `frontend/src/views/Overview.jsx` — KPI cards unchanged

The payload shape produced by `buildHistoryFromDb()` exactly matches what `buildHistory()` already produces from JSON logs.

---

## File Summary

| File | Action | Approximate Lines |
|------|--------|-------------------|
| `scripts/copyDataForDashboard.js` | Modify — add DB branch in main(), add loadFromDb(), buildHistoryFromDb() | +80 lines |
| `frontend/src/hooks/useData.js` | No change | 0 |
| `frontend/src/App.jsx` | No change | 0 |
| `frontend/src/views/Reports.jsx` | No change | 0 |
| `frontend/src/views/Interns.jsx` | No change | 0 |
| `frontend/src/views/Overview.jsx` | No change | 0 |

**DB impact:** Read-only queries against `student_repo_reports` (created in NW-001). No schema changes.

---

## UI Test Setup

| Field | Value |
|-------|-------|
| **App URL** | http://127.0.0.1:5173 |
| **Test Route** | `/` — Reports view (click "Student Reports" in sidebar) |
| **Login as** | N/A — no auth on dashboard |
| **Test Data** | Requires NW-001 complete + at least one `/nightwatch` run with DATABASE_URL set |
| **Verify DB source** | Run `npm run dashboard:data` — console should print "Source: PostgreSQL" |
| **Verify history** | Open Reports view — date selector should show all dates from DB, not just local logs |
| **Non-testable ACs via UI** | AC2 (fallback) — test by temporarily unsetting DATABASE_URL and re-running dashboard:data |
