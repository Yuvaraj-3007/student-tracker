const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function loadFixture(studentName) {
  const safeName = String(studentName).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!safeName) return null;
  const fileName = `${safeName}-commits.json`;
  const filePath = path.join(FIXTURES_DIR, fileName);
  if (path.dirname(filePath) !== FIXTURES_DIR) return null;
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`[mockCommits] Failed to parse ${fileName}: ${err.message}`);
    return null;
  }
}

async function fetchCommitsForStudent(student) {
  const randomize = process.env.MOCK_RANDOMIZE === 'true';
  const fixture = loadFixture(student.name);

  if (!fixture || !fixture.commits || fixture.commits.length === 0) {
    return {
      student: { name: student.name, email: student.email, repo: student.repo },
      commits: [],
      combinedDiff: '',
      totalFiles: 0,
      isActive: false
    };
  }

  if (randomize && Math.random() < 0.15) {
    return {
      student: { name: student.name, email: student.email, repo: student.repo },
      commits: [],
      combinedDiff: '',
      totalFiles: 0,
      isActive: false
    };
  }

  const totalFiles = fixture.commits.reduce(
    (acc, c) => acc + (Array.isArray(c.filesChanged) ? c.filesChanged.length : 0),
    0
  );

  return {
    student: { name: student.name, email: student.email, repo: student.repo },
    commits: fixture.commits,
    combinedDiff: fixture.combinedDiff || '',
    totalFiles,
    isActive: true
  };
}

module.exports = { fetchCommitsForStudent };
