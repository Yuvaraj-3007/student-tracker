const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'logs');
const STUDENTS_FILE = path.join(__dirname, '..', 'config', 'students.json');
const OUT_FILE = path.join(__dirname, '..', 'dashboard.html');

function pickLatestLog() {
  if (!fs.existsSync(LOGS_DIR)) return null;
  const files = fs
    .readdirSync(LOGS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  const file = files[0];
  try {
    const raw = fs.readFileSync(path.join(LOGS_DIR, file), 'utf8');
    return { fileName: file, data: JSON.parse(raw) };
  } catch (err) {
    console.error(`[buildDashboard] Failed to read ${file}: ${err.message}`);
    return null;
  }
}

function loadStudents() {
  try {
    return JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function safeJSON(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function template(dataLiteral, studentsLiteral) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NIGHTWATCH Dashboard</title>
<style>
  :root {
    --bg: #f5f7fb;
    --surface: #ffffff;
    --surface-2: #f1f5f9;
    --border: #e2e8f0;
    --text: #0f172a;
    --text-dim: #475569;
    --text-muted: #64748b;
    --accent: #4f46e5;
    --accent-hover: #4338ca;
    --good: #059669;
    --mid: #d97706;
    --bad: #dc2626;
    --gray: #64748b;
    --purple: #7c3aed;
    --blue: #2563eb;
    --radius: 10px;
    --radius-sm: 6px;
    --shadow: 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
    --shadow-lg: 0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    font-size: 14px;
    overflow: hidden;
  }

  /* Layout */
  .app {
    display: grid;
    grid-template-columns: 240px 1fr;
    height: 100vh;
  }

  /* Sidebar */
  .sidebar {
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 20px 0;
    overflow-y: auto;
  }
  .sidebar-brand {
    padding: 0 20px 24px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
  }
  .sidebar-brand h1 {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--text);
  }
  .sidebar-brand .tagline {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 2px;
  }
  .nav-group { padding: 0 12px; margin-bottom: 4px; }
  .nav-group-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: 10px 8px 6px;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: var(--radius-sm);
    color: var(--text-dim);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    user-select: none;
    transition: background 0.12s, color 0.12s;
    border: 1px solid transparent;
  }
  .nav-item:hover { background: var(--surface-2); color: var(--text); }
  .nav-item.active {
    background: rgba(79,70,229,0.1);
    color: var(--accent-hover);
    border-color: rgba(79,70,229,0.25);
    font-weight: 600;
  }
  .nav-item .icon { width: 18px; text-align: center; font-size: 14px; }
  .sidebar-footer {
    margin-top: auto;
    padding: 16px 20px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--text-muted);
  }
  .sidebar-footer .mode-pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-family: monospace;
    font-size: 10px;
    margin-top: 4px;
  }
  .mode-pill.mock { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
  .mode-pill.real { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }

  /* Main content */
  .main {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 28px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .topbar .title {
    font-size: 16px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .topbar .search {
    flex: 1;
    max-width: 420px;
    position: relative;
  }
  .topbar .search input {
    width: 100%;
    padding: 8px 12px 8px 34px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 13px;
    outline: none;
    transition: border-color 0.12s;
  }
  .topbar .search input:focus { border-color: var(--accent); }
  .topbar .search .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    font-size: 13px;
  }
  .topbar .date-pill {
    padding: 6px 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--text-dim);
    font-family: monospace;
  }
  .topbar .refresh-btn {
    padding: 6px 14px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }
  .topbar .refresh-btn:hover { background: var(--accent-hover); }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 28px;
  }

  .view { display: none; }
  .view.active { display: block; animation: fadeIn 0.2s; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

  .page-title {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .page-subtitle {
    color: var(--text-dim);
    margin-bottom: 24px;
    font-size: 13px;
  }

  /* KPI cards */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 28px;
  }
  .kpi {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  .kpi::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: var(--accent);
  }
  .kpi.good::before { background: var(--good); }
  .kpi.mid::before { background: var(--mid); }
  .kpi.bad::before { background: var(--bad); }
  .kpi.purple::before { background: var(--purple); }
  .kpi .label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }
  .kpi .value {
    font-size: 28px;
    font-weight: 700;
  }
  .kpi .sub {
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 4px;
  }

  /* Section card */
  .section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: var(--shadow);
  }
  .section h2 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Score distribution bars */
  .score-bars { display: flex; flex-direction: column; gap: 10px; }
  .score-bar {
    display: grid;
    grid-template-columns: 120px 1fr auto;
    gap: 12px;
    align-items: center;
    font-size: 13px;
  }
  .score-bar .bar-wrap {
    height: 8px;
    background: var(--surface-2);
    border-radius: 4px;
    overflow: hidden;
  }
  .score-bar .bar-fill {
    height: 100%;
    transition: width 0.5s ease;
  }
  .score-bar .bar-value {
    color: var(--text-dim);
    font-family: monospace;
    font-size: 12px;
    min-width: 50px;
    text-align: right;
  }

  /* Filters bar */
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 16px;
    align-items: center;
  }
  .filter {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .filter label {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }
  .filter select, .filter input[type=text] {
    padding: 6px 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 13px;
    outline: none;
    min-width: 140px;
  }
  .filter select:focus, .filter input[type=text]:focus { border-color: var(--accent); }
  .filter input[type=range] {
    width: 160px;
    accent-color: var(--accent);
  }
  .filter .toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 13px;
    user-select: none;
  }
  .filter .toggle input { accent-color: var(--accent); }
  .results-count {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-dim);
  }
  .clear-btn {
    padding: 7px 12px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-dim);
    cursor: pointer;
    font-size: 12px;
  }
  .clear-btn:hover { border-color: var(--bad); color: var(--bad); }

  /* Table */
  .table-wrap {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    background: var(--surface-2);
    text-align: left;
    padding: 12px 16px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
  }
  th:hover { color: var(--text); }
  th .sort-indicator { font-size: 9px; margin-left: 4px; opacity: 0.5; }
  td {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    color: var(--text);
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--surface-2); }
  tr.inactive td { opacity: 0.55; }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    font-family: monospace;
    border: 1px solid;
  }
  .badge.risk-none { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
  .badge.risk-low_effort { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
  .badge.risk-possible_copy { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
  .badge.risk-incomplete_work { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
  .badge.status-active { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
  .badge.status-inactive { background: #e2e8f0; color: #475569; border-color: #cbd5e1; }

  .score-chip {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 4px;
    font-family: monospace;
    font-weight: 700;
    font-size: 12px;
  }
  .score-chip.good { background: #d1fae5; color: #065f46; }
  .score-chip.mid { background: #fef3c7; color: #92400e; }
  .score-chip.bad { background: #fee2e2; color: #991b1b; }
  .score-chip.gray { background: var(--surface-2); color: var(--gray); }

  .link {
    color: var(--accent-hover);
    text-decoration: none;
    font-size: 12px;
    font-family: monospace;
  }
  .link:hover { text-decoration: underline; }

  /* Report cards (teacher format) */
  .report-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 22px;
    margin-bottom: 16px;
    box-shadow: var(--shadow);
  }
  .report-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }
  .report-head .who h3 {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .report-head .who .gh {
    font-size: 12px;
    color: var(--text-muted);
    font-family: monospace;
  }
  .report-head .meta {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-end;
  }
  .report-summary {
    font-size: 14px;
    color: var(--text);
    margin-bottom: 18px;
    padding: 12px 16px;
    background: #eef2ff;
    border-left: 3px solid var(--accent);
    border-radius: var(--radius-sm);
  }
  .scores-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 20px;
  }
  .score-box {
    padding: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    text-align: center;
  }
  .score-box .lbl {
    font-size: 9px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .score-box .val {
    font-size: 18px;
    font-weight: 700;
  }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin: 14px 0 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .teacher-list { padding-left: 20px; }
  .teacher-list li { padding: 5px 0; color: var(--text); font-size: 13px; line-height: 1.6; }
  .mentor-note {
    padding: 12px 16px;
    background: #f3e8ff;
    border-left: 3px solid var(--purple);
    border-radius: var(--radius-sm);
    font-style: italic;
    color: #581c87;
    font-size: 13px;
    margin-top: 12px;
  }

  /* Repo cards */
  .repo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }
  .repo-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    box-shadow: var(--shadow);
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .repo-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
  .repo-card h3 {
    font-size: 15px;
    margin-bottom: 4px;
  }
  .repo-card .gh-handle {
    font-size: 12px;
    color: var(--text-muted);
    font-family: monospace;
    margin-bottom: 12px;
  }
  .repo-card .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--text-dim);
    margin-top: 10px;
  }
  .repo-card a {
    color: var(--accent-hover);
    text-decoration: none;
    font-size: 12px;
    font-family: monospace;
    display: inline-block;
    margin-top: 8px;
    word-break: break-all;
  }

  /* Settings list */
  .settings-list dl {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 12px 20px;
  }
  .settings-list dt {
    color: var(--text-muted);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-weight: 600;
    padding-top: 2px;
  }
  .settings-list dd {
    font-family: monospace;
    font-size: 13px;
    word-break: break-all;
  }

  /* Empty state */
  .empty-state {
    padding: 60px 30px;
    text-align: center;
    color: var(--text-muted);
  }
  .empty-state code {
    background: var(--surface-2);
    padding: 4px 10px;
    border-radius: 4px;
    color: var(--accent-hover);
  }
  .empty-state .icon { font-size: 48px; margin-bottom: 12px; opacity: 0.4; }

  @media (max-width: 900px) {
    .app { grid-template-columns: 60px 1fr; }
    .sidebar-brand .tagline, .nav-item .label, .nav-group-label, .sidebar-footer { display: none; }
    .sidebar-brand { text-align: center; padding: 0 0 20px; }
    .sidebar-brand h1 { font-size: 11px; }
    .nav-item { justify-content: center; padding: 10px; }
    .scores-row { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>

<div class="app">

  <aside class="sidebar">
    <div class="sidebar-brand">
      <h1>🌙 NIGHTWATCH</h1>
      <div class="tagline">Intern EOD Agent</div>
    </div>

    <div class="nav-group">
      <div class="nav-group-label">Main</div>
      <div class="nav-item active" data-view="overview"><span class="icon">📊</span><span class="label">Overview</span></div>
      <div class="nav-item" data-view="interns"><span class="icon">👥</span><span class="label">Interns</span></div>
      <div class="nav-item" data-view="reports"><span class="icon">📄</span><span class="label">Reports</span></div>
      <div class="nav-item" data-view="repos"><span class="icon">📁</span><span class="label">Repositories</span></div>
    </div>

    <div class="nav-group">
      <div class="nav-group-label">System</div>
      <div class="nav-item" data-view="settings"><span class="icon">⚙️</span><span class="label">Settings</span></div>
    </div>

    <div class="sidebar-footer">
      <div>System mode</div>
      <div id="footer-mode" class="mode-pill mock">MOCK</div>
    </div>
  </aside>

  <div class="main">
    <header class="topbar">
      <div class="title" id="topbar-title">Overview</div>
      <div class="search">
        <span class="search-icon">🔍</span>
        <input type="text" id="global-search" placeholder="Search intern by name or GitHub username..." />
      </div>
      <div class="date-pill" id="date-pill">—</div>
      <button class="refresh-btn" onclick="location.reload()">Refresh</button>
    </header>

    <main class="content">

      <!-- OVERVIEW -->
      <section class="view active" id="view-overview">
        <div class="page-title">📊 Overview</div>
        <div class="page-subtitle">Snapshot of today's intern activity and AI-generated feedback.</div>

        <div class="kpi-grid" id="kpi-grid"></div>

        <div class="section">
          <h2>Score Distribution</h2>
          <div class="score-bars" id="score-bars"></div>
        </div>

        <div class="section" id="risk-section">
          <h2>Risk Alerts</h2>
          <div id="risk-list"></div>
        </div>
      </section>

      <!-- INTERNS -->
      <section class="view" id="view-interns">
        <div class="page-title">👥 Interns</div>
        <div class="page-subtitle">Filter, sort, and inspect each intern's daily performance.</div>

        <div class="filters" id="intern-filters">
          <div class="filter">
            <label for="f-name">Name</label>
            <input type="text" id="f-name" placeholder="e.g. akilan" />
          </div>
          <div class="filter">
            <label for="f-risk">Risk flag</label>
            <select id="f-risk">
              <option value="">All</option>
              <option value="none">none</option>
              <option value="low_effort">low_effort</option>
              <option value="possible_copy">possible_copy</option>
              <option value="incomplete_work">incomplete_work</option>
            </select>
          </div>
          <div class="filter">
            <label for="f-status">Status</label>
            <select id="f-status">
              <option value="">All</option>
              <option value="active">Active today</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div class="filter">
            <label for="f-score">Min score: <span id="f-score-val">0</span></label>
            <input type="range" id="f-score" min="0" max="10" step="0.5" value="0" />
          </div>
          <button class="clear-btn" onclick="clearFilters()">Clear filters</button>
          <span class="results-count" id="results-count"></span>
        </div>

        <div class="table-wrap">
          <table id="interns-table">
            <thead>
              <tr>
                <th data-sort="name">Name <span class="sort-indicator">▲▼</span></th>
                <th data-sort="github">GitHub <span class="sort-indicator">▲▼</span></th>
                <th data-sort="status">Status <span class="sort-indicator">▲▼</span></th>
                <th data-sort="commits">Commits <span class="sort-indicator">▲▼</span></th>
                <th data-sort="score">Score <span class="sort-indicator">▲▼</span></th>
                <th data-sort="risk">Risk <span class="sort-indicator">▲▼</span></th>
                <th>Repo</th>
              </tr>
            </thead>
            <tbody id="interns-tbody"></tbody>
          </table>
        </div>
      </section>

      <!-- REPORTS -->
      <section class="view" id="view-reports">
        <div class="page-title">📄 Today's Reports</div>
        <div class="page-subtitle">Full teacher-format AI feedback for each active intern.</div>
        <div id="reports-container"></div>
      </section>

      <!-- REPOS -->
      <section class="view" id="view-repos">
        <div class="page-title">📁 Tracked Repositories</div>
        <div class="page-subtitle">Source of truth for each intern's daily commits.</div>
        <div class="repo-grid" id="repos-grid"></div>
      </section>

      <!-- SETTINGS -->
      <section class="view" id="view-settings">
        <div class="page-title">⚙️ Settings</div>
        <div class="page-subtitle">Runtime configuration at the time of the last dashboard build.</div>
        <div class="section settings-list">
          <dl id="settings-dl"></dl>
        </div>
      </section>

    </main>
  </div>
</div>

<script>
const LOG = ${dataLiteral};
const CONFIGURED_STUDENTS = ${studentsLiteral};

function scoreClass(score) {
  if (score == null) return 'gray';
  if (score >= 8) return 'good';
  if (score >= 5) return 'mid';
  return 'bad';
}

function el(tag, opts) {
  const node = document.createElement(tag);
  if (opts) {
    if (opts.cls) node.className = opts.cls;
    if (opts.text != null) node.textContent = opts.text;
    if (opts.html != null) node.innerHTML = opts.html;
    if (opts.attrs) for (const k of Object.keys(opts.attrs)) node.setAttribute(k, opts.attrs[k]);
  }
  return node;
}

const state = {
  view: 'overview',
  results: (LOG && LOG.data && LOG.data.results) || [],
  mode: (LOG && LOG.data && LOG.data.mode) || 'mock',
  runAt: (LOG && LOG.data && LOG.data.runAt) || null,
  date: LOG ? (LOG.fileName || '').replace('.json', '') : '—',
  filters: { name: '', risk: '', status: '', minScore: 0 },
  sort: { key: 'name', dir: 'asc' }
};

function mergedRows() {
  const resultMap = {};
  for (const r of state.results) {
    resultMap[r.student.name.toLowerCase()] = r;
  }
  const seen = new Set();
  const rows = [];
  for (const s of CONFIGURED_STUDENTS) {
    const r = resultMap[s.name.toLowerCase()];
    seen.add(s.name.toLowerCase());
    rows.push(mergeRow(s, r));
  }
  for (const r of state.results) {
    if (!seen.has(r.student.name.toLowerCase())) {
      rows.push(mergeRow(r.student, r));
    }
  }
  return rows;
}

function mergeRow(student, result) {
  const analysis = result && result.analysis;
  return {
    name: student.name,
    github: student.github || '',
    email: student.email || '',
    repo: student.repo || '',
    isActive: !!(result && result.isActive),
    error: result ? result.error : null,
    commits: (result && result.commitCount) || 0,
    score: analysis ? analysis.scores.overall : null,
    risk: analysis ? analysis.risk_flag : null,
    summary: analysis ? analysis.summary : null,
    analysis
  };
}

function applyFilters(rows) {
  const f = state.filters;
  return rows.filter((r) => {
    if (f.name && !(r.name.toLowerCase().includes(f.name) || r.github.toLowerCase().includes(f.name))) return false;
    if (f.risk && r.risk !== f.risk) return false;
    if (f.status === 'active' && !r.isActive) return false;
    if (f.status === 'inactive' && r.isActive) return false;
    if (f.minScore > 0 && (r.score == null || r.score < f.minScore)) return false;
    return true;
  });
}

function sortRows(rows) {
  const { key, dir } = state.sort;
  const factor = dir === 'asc' ? 1 : -1;
  return rows.slice().sort((a, b) => {
    let x = a[key];
    let y = b[key];
    if (key === 'status') { x = a.isActive ? 1 : 0; y = b.isActive ? 1 : 0; }
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    if (typeof x === 'string') return x.localeCompare(y) * factor;
    return (x - y) * factor;
  });
}

// === Rendering ===

function renderTopbar() {
  document.getElementById('date-pill').textContent = state.date;
  const mode = document.getElementById('footer-mode');
  mode.textContent = state.mode.toUpperCase();
  mode.className = 'mode-pill ' + (state.mode === 'real' ? 'real' : 'mock');
}

function renderOverview() {
  const grid = document.getElementById('kpi-grid');
  grid.innerHTML = '';
  const rows = mergedRows();
  const total = rows.length;
  const active = rows.filter((r) => r.isActive).length;
  const scores = rows.filter((r) => r.score != null).map((r) => r.score);
  const avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
  const risks = rows.filter((r) => r.risk && r.risk !== 'none').length;

  const kpis = [
    { label: 'Total Interns', value: total, sub: 'Configured', cls: 'purple' },
    { label: 'Active Today', value: active, sub: total - active + ' inactive', cls: 'good' },
    { label: 'Avg Score', value: avg + '/10', sub: scores.length + ' scored', cls: scoreClass(avg) },
    { label: 'Risk Alerts', value: risks, sub: risks > 0 ? 'Needs attention' : 'All clear', cls: risks > 0 ? 'bad' : 'good' }
  ];

  for (const k of kpis) {
    const card = el('div', { cls: 'kpi ' + k.cls });
    card.appendChild(el('div', { cls: 'label', text: k.label }));
    card.appendChild(el('div', { cls: 'value', text: String(k.value) }));
    card.appendChild(el('div', { cls: 'sub', text: k.sub }));
    grid.appendChild(card);
  }

  const bars = document.getElementById('score-bars');
  bars.innerHTML = '';
  const activeScored = rows.filter((r) => r.isActive && r.score != null)
    .sort((a, b) => b.score - a.score);
  if (activeScored.length === 0) {
    bars.appendChild(el('div', { cls: 'empty-state', text: 'No scored interns yet.' }));
  }
  for (const r of activeScored) {
    const row = el('div', { cls: 'score-bar' });
    row.appendChild(el('div', { text: r.name }));
    const wrap = el('div', { cls: 'bar-wrap' });
    const fill = el('div', { cls: 'bar-fill' });
    fill.style.width = (r.score * 10) + '%';
    fill.style.background = r.score >= 8 ? 'var(--good)' : r.score >= 5 ? 'var(--mid)' : 'var(--bad)';
    wrap.appendChild(fill);
    row.appendChild(wrap);
    row.appendChild(el('div', { cls: 'bar-value', text: r.score + '/10' }));
    bars.appendChild(row);
  }

  const riskList = document.getElementById('risk-list');
  riskList.innerHTML = '';
  const flagged = rows.filter((r) => r.risk && r.risk !== 'none');
  if (flagged.length === 0) {
    riskList.appendChild(el('div', { cls: 'empty-state', html: '✅ No risk flags today.' }));
  } else {
    for (const r of flagged) {
      const line = el('div');
      line.style.display = 'flex';
      line.style.justifyContent = 'space-between';
      line.style.alignItems = 'center';
      line.style.padding = '8px 0';
      line.style.borderBottom = '1px solid var(--border)';
      const leftWrap = el('div');
      leftWrap.appendChild(el('strong', { text: r.name }));
      const sub = el('span');
      sub.style.color = 'var(--text-dim)';
      sub.style.marginLeft = '8px';
      sub.style.fontSize = '12px';
      sub.textContent = r.summary ? r.summary.slice(0, 80) : '';
      leftWrap.appendChild(sub);
      line.appendChild(leftWrap);
      line.appendChild(el('span', { cls: 'badge risk-' + r.risk, text: r.risk }));
      riskList.appendChild(line);
    }
  }
}

function renderInterns() {
  const tbody = document.getElementById('interns-tbody');
  tbody.innerHTML = '';
  const rows = sortRows(applyFilters(mergedRows()));
  document.getElementById('results-count').textContent = rows.length + ' intern' + (rows.length === 1 ? '' : 's');

  if (rows.length === 0) {
    const tr = el('tr');
    const td = el('td', { attrs: { colspan: '7' } });
    const empty = el('div', { cls: 'empty-state' });
    empty.appendChild(el('div', { cls: 'icon', text: '🕵️' }));
    empty.appendChild(el('div', { text: 'No interns match the current filters.' }));
    td.appendChild(empty);
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const r of rows) {
    const tr = el('tr');
    if (!r.isActive) tr.classList.add('inactive');

    tr.appendChild(el('td', { text: r.name }));

    const ghTd = el('td');
    if (r.github) {
      const a = el('a', { cls: 'link', text: '@' + r.github, attrs: { href: 'https://github.com/' + r.github, target: '_blank', rel: 'noopener' } });
      ghTd.appendChild(a);
    } else {
      ghTd.textContent = '—';
    }
    tr.appendChild(ghTd);

    const statusTd = el('td');
    statusTd.appendChild(el('span', { cls: 'badge ' + (r.isActive ? 'status-active' : 'status-inactive'), text: r.isActive ? 'Active' : 'Inactive' }));
    tr.appendChild(statusTd);

    tr.appendChild(el('td', { text: String(r.commits) }));

    const scoreTd = el('td');
    if (r.score != null) {
      scoreTd.appendChild(el('span', { cls: 'score-chip ' + scoreClass(r.score), text: r.score + '/10' }));
    } else {
      scoreTd.textContent = '—';
    }
    tr.appendChild(scoreTd);

    const riskTd = el('td');
    if (r.risk) {
      riskTd.appendChild(el('span', { cls: 'badge risk-' + r.risk, text: r.risk }));
    } else {
      riskTd.textContent = '—';
    }
    tr.appendChild(riskTd);

    const repoTd = el('td');
    if (r.repo) {
      const a = el('a', { cls: 'link', text: r.repo.replace('https://github.com/', ''), attrs: { href: r.repo, target: '_blank', rel: 'noopener' } });
      repoTd.appendChild(a);
    } else {
      repoTd.textContent = '—';
    }
    tr.appendChild(repoTd);

    tbody.appendChild(tr);
  }
}

function renderReports() {
  const container = document.getElementById('reports-container');
  container.innerHTML = '';
  const rows = mergedRows().filter((r) => r.analysis);
  if (rows.length === 0) {
    const empty = el('div', { cls: 'empty-state' });
    empty.appendChild(el('div', { cls: 'icon', text: '📭' }));
    empty.appendChild(el('div', { text: 'No reports yet. Run the agent first.' }));
    const cmd = el('div');
    cmd.style.marginTop = '10px';
    cmd.appendChild(document.createTextNode('Try '));
    cmd.appendChild(el('code', { text: 'npm run run-once && npm run dashboard' }));
    empty.appendChild(cmd);
    container.appendChild(empty);
    return;
  }

  for (const r of rows) {
    const a = r.analysis;
    const card = el('div', { cls: 'report-card' });

    const head = el('div', { cls: 'report-head' });
    const who = el('div', { cls: 'who' });
    who.appendChild(el('h3', { text: '👤 ' + r.name }));
    who.appendChild(el('div', { cls: 'gh', text: r.github ? '@' + r.github : '—' }));
    head.appendChild(who);
    const meta = el('div', { cls: 'meta' });
    meta.appendChild(el('span', { cls: 'score-chip ' + scoreClass(a.scores.overall), text: a.scores.overall + '/10' }));
    meta.appendChild(el('span', { cls: 'badge risk-' + a.risk_flag, text: a.risk_flag }));
    head.appendChild(meta);
    card.appendChild(head);

    card.appendChild(el('div', { cls: 'report-summary', text: a.summary }));

    const scoresRow = el('div', { cls: 'scores-row' });
    const scoreLabels = [
      ['understanding', 'Understanding'],
      ['implementation', 'Implementation'],
      ['code_quality', 'Code Quality'],
      ['effort', 'Effort'],
      ['overall', 'Overall']
    ];
    for (const [key, label] of scoreLabels) {
      const box = el('div', { cls: 'score-box' });
      box.appendChild(el('div', { cls: 'lbl', text: label }));
      box.appendChild(el('div', { cls: 'val', text: String(a.scores[key]) }));
      scoresRow.appendChild(box);
    }
    card.appendChild(scoresRow);

    function addList(title, items) {
      if (!items || items.length === 0) return;
      card.appendChild(el('div', { cls: 'section-title', text: title }));
      const ul = el('ul', { cls: 'teacher-list' });
      for (const item of items) ul.appendChild(el('li', { text: item }));
      card.appendChild(ul);
    }

    addList('✅ Strengths', a.strengths);
    addList('⚠️ Mistakes', a.mistakes);
    addList('💡 Suggestions', a.suggestions);

    if (a.learning_feedback) {
      card.appendChild(el('div', { cls: 'mentor-note', text: '💬 ' + a.learning_feedback }));
    }

    container.appendChild(card);
  }
}

function renderRepos() {
  const grid = document.getElementById('repos-grid');
  grid.innerHTML = '';
  const rows = mergedRows();
  for (const r of rows) {
    const card = el('div', { cls: 'repo-card' });
    card.appendChild(el('h3', { text: r.name }));
    card.appendChild(el('div', { cls: 'gh-handle', text: r.github ? '@' + r.github : '—' }));
    if (r.repo) {
      const a = el('a', { text: r.repo, attrs: { href: r.repo, target: '_blank', rel: 'noopener' } });
      card.appendChild(a);
    }
    const meta = el('div', { cls: 'meta-row' });
    meta.appendChild(el('span', { cls: 'badge ' + (r.isActive ? 'status-active' : 'status-inactive'), text: r.isActive ? 'Active' : 'Inactive' }));
    if (r.score != null) {
      meta.appendChild(el('span', { cls: 'score-chip ' + scoreClass(r.score), text: r.score + '/10' }));
    }
    card.appendChild(meta);
    grid.appendChild(card);
  }
}

function renderSettings() {
  const dl = document.getElementById('settings-dl');
  dl.innerHTML = '';
  const items = [
    ['Codename', 'NIGHTWATCH'],
    ['Mode', state.mode.toUpperCase()],
    ['Last Run', state.runAt || '(no run yet)'],
    ['Report Date', state.date],
    ['Log File', LOG ? 'logs/' + LOG.fileName : '—'],
    ['Configured Interns', String(CONFIGURED_STUDENTS.length)],
    ['Cron', '0 20 * * *  (Asia/Kolkata, 8 PM IST)'],
    ['Teacher Format', 'Enabled (step-by-step feedback)']
  ];
  for (const [k, v] of items) {
    dl.appendChild(el('dt', { text: k }));
    dl.appendChild(el('dd', { text: v }));
  }
}

// === Navigation ===
function switchView(name) {
  state.view = name;
  document.querySelectorAll('.nav-item').forEach((n) => {
    n.classList.toggle('active', n.dataset.view === name);
  });
  document.querySelectorAll('.view').forEach((v) => {
    v.classList.toggle('active', v.id === 'view-' + name);
  });
  const titles = {
    overview: 'Overview',
    interns: 'Interns',
    reports: 'Reports',
    repos: 'Repositories',
    settings: 'Settings'
  };
  document.getElementById('topbar-title').textContent = titles[name] || '';
}

function clearFilters() {
  state.filters = { name: '', risk: '', status: '', minScore: 0 };
  document.getElementById('f-name').value = '';
  document.getElementById('f-risk').value = '';
  document.getElementById('f-status').value = '';
  document.getElementById('f-score').value = '0';
  document.getElementById('f-score-val').textContent = '0';
  document.getElementById('global-search').value = '';
  renderInterns();
}

function bindEvents() {
  document.querySelectorAll('.nav-item').forEach((n) => {
    n.addEventListener('click', () => switchView(n.dataset.view));
  });
  document.getElementById('f-name').addEventListener('input', (e) => {
    state.filters.name = e.target.value.trim().toLowerCase();
    renderInterns();
  });
  document.getElementById('f-risk').addEventListener('change', (e) => {
    state.filters.risk = e.target.value;
    renderInterns();
  });
  document.getElementById('f-status').addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    renderInterns();
  });
  const scoreInput = document.getElementById('f-score');
  scoreInput.addEventListener('input', (e) => {
    state.filters.minScore = Number(e.target.value);
    document.getElementById('f-score-val').textContent = e.target.value;
    renderInterns();
  });
  document.querySelectorAll('#interns-table th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sort.key === key) {
        state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort.key = key;
        state.sort.dir = 'asc';
      }
      renderInterns();
    });
  });
  const search = document.getElementById('global-search');
  search.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    state.filters.name = q;
    document.getElementById('f-name').value = q;
    if (state.view !== 'interns') switchView('interns');
    renderInterns();
  });
}

function init() {
  renderTopbar();
  renderOverview();
  renderInterns();
  renderReports();
  renderRepos();
  renderSettings();
  bindEvents();
}

init();
</script>
</body>
</html>
`;
}

function main() {
  const log = pickLatestLog();
  const students = loadStudents();
  const payload = log ? { fileName: log.fileName, data: log.data } : null;
  const html = template(safeJSON(payload), safeJSON(students));
  fs.writeFileSync(OUT_FILE, html, 'utf8');
  console.log(`Dashboard written: ${OUT_FILE}`);
  if (log) {
    console.log(`Log source: logs/${log.fileName}`);
  } else {
    console.log('No log found — dashboard will show empty state.');
  }
  console.log(`Configured interns: ${students.length}`);
}

main();
