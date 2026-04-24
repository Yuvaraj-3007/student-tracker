const fs = require('fs');
const path = require('path');

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

function main() {
  const logs = loadLogs();
  const students = loadStudents();
  const latest = logs.length > 0 ? logs[logs.length - 1] : null;
  const log = latest ? { fileName: latest.fileName, data: latest.data } : null;
  const history = buildHistory(logs);

  const payload = { log, students, history };

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Dashboard data written: ${OUT_FILE}`);
  console.log(`  Logs loaded: ${logs.length}`);
  console.log(`  Latest: ${log ? 'logs/' + log.fileName : '(none — empty state)'}`);
  console.log(`  Interns with history: ${Object.keys(history).length}`);
}

main();
