const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs = require('fs');
const { Octokit } = require('@octokit/rest');
const { parseGitHubRepoUrl, truncateDiff, isSameAuthor } = require('../src/real/githubUtils');
const { analyzeStudentWork } = require('../src/real/realClaude');
const { runMigration, saveReport, closePool } = require('../src/db/reportRepository');

const STUDENTS_FILE = path.join(__dirname, '..', 'config', 'students.json');
const MAX_DIFF_BYTES = 50 * 1024;
const MAX_BRANCHES = 50;
const REQUEST_TIMEOUT_MS = 15000;

const DEFAULT_FROM = '2026-04-24';
const DEFAULT_TO   = '2026-05-06';

function parseDateArg(args, flag, fallback) {
  const idx = args.indexOf(flag);
  return (idx !== -1 && args[idx + 1]) ? args[idx + 1] : fallback;
}

function dateRange(from, to) {
  const dates = [];
  const cur = new Date(from + 'T00:00:00Z');
  const end = new Date(to   + 'T00:00:00Z');
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

async function fetchForDate(octokit, student, date) {
  const { owner, repo } = parseGitHubRepoUrl(student.repo);
  const since = `${date}T00:00:00+05:30`;
  const until = `${date}T23:59:59+05:30`;

  let branchNames;
  try {
    const result = await octokit.paginate(octokit.repos.listBranches, {
      owner, repo, per_page: 100
    });
    branchNames = result.map((b) => b.name);
  } catch (err) {
    if (err && err.status === 404) throw new Error('repo_not_found');
    throw err;
  }

  const commitMap = new Map();
  for (const branch of branchNames.slice(0, MAX_BRANCHES)) {
    try {
      const commits = await octokit.paginate(octokit.repos.listCommits, {
        owner, repo, sha: branch, since, until, per_page: 100
      });
      for (const c of commits) {
        if (!commitMap.has(c.sha)) {
          commitMap.set(c.sha, { raw: c, branches: [branch] });
        } else if (!commitMap.get(c.sha).branches.includes(branch)) {
          commitMap.get(c.sha).branches.push(branch);
        }
      }
    } catch (err) {
      if (err && err.status === 409) continue;
      throw err;
    }
  }

  const authored = Array.from(commitMap.values()).filter((entry) => {
    const info = {
      login: entry.raw.author ? entry.raw.author.login : null,
      name:  entry.raw.commit && entry.raw.commit.author ? entry.raw.commit.author.name  : null,
      email: entry.raw.commit && entry.raw.commit.author ? entry.raw.commit.author.email : null
    };
    return isSameAuthor(info, student);
  });

  if (authored.length === 0) {
    return {
      student: { name: student.name, email: student.email, repo: student.repo, github: student.github },
      commits: [], combinedDiff: '', totalFiles: 0, isActive: false
    };
  }

  const enriched = [];
  const diffParts = [];
  const filesSeen = new Set();

  for (const entry of authored) {
    const detail = (await octokit.repos.getCommit({ owner, repo, ref: entry.raw.sha })).data;
    const files = Array.isArray(detail.files) ? detail.files : [];
    files.forEach((f) => filesSeen.add(f.filename));

    enriched.push({
      sha:          entry.raw.sha,
      message:      entry.raw.commit && entry.raw.commit.message ? entry.raw.commit.message : '',
      author:       entry.raw.commit && entry.raw.commit.author  ? entry.raw.commit.author.name : student.name,
      timestamp:    entry.raw.commit && entry.raw.commit.author  ? entry.raw.commit.author.date : new Date().toISOString(),
      branch:       entry.branches[0],
      branches:     entry.branches,
      filesChanged: files.map((f) => f.filename),
      additions:    detail.stats ? detail.stats.additions : 0,
      deletions:    detail.stats ? detail.stats.deletions : 0
    });

    const header  = `# Commit ${entry.raw.sha.slice(0, 8)} on ${entry.branches.join(', ')}`;
    const patches = files
      .filter((f) => typeof f.patch === 'string' && f.patch.length > 0)
      .map((f) => `--- ${f.filename}\n${f.patch}`)
      .join('\n');
    diffParts.push(`${header}\n${patches}`);
  }

  return {
    student: { name: student.name, email: student.email, repo: student.repo, github: student.github },
    commits:      enriched,
    combinedDiff: truncateDiff(diffParts.join('\n\n'), MAX_DIFF_BYTES),
    totalFiles:   filesSeen.size,
    isActive:     true
  };
}

async function main() {
  const args     = process.argv.slice(2);
  const fromDate = parseDateArg(args, '--from', DEFAULT_FROM);
  const toDate   = parseDateArg(args, '--to',   DEFAULT_TO);
  const dates    = dateRange(fromDate, toDate);

  const missing = ['DATABASE_URL', 'GITHUB_TOKEN', 'ANTHROPIC_API_KEY'].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[backfill] Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  const students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8'));
  const octokit  = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    userAgent: 'nightwatch-backfill/0.1',
    request: { timeout: REQUEST_TIMEOUT_MS }
  });

  console.log('============================================');
  console.log('  NIGHTWATCH Backfill — DB only, no emails');
  console.log('============================================');
  console.log(`Dates   : ${fromDate} → ${toDate} (${dates.length} days)`);
  console.log(`Students: ${students.map((s) => s.name).join(', ')}\n`);

  try {
    await runMigration();
  } catch (err) {
    console.error(`[backfill] Migration failed: ${err.message}`);
    process.exit(1);
  }

  let saved = 0;
  let errors = 0;

  for (const date of dates) {
    console.log(`\n── ${date} ──`);
    for (const student of students) {
      try {
        const commitBundle = await fetchForDate(octokit, student, date);
        let analysis = null;

        if (commitBundle.isActive) {
          analysis = await analyzeStudentWork(commitBundle);
        }

        const result = {
          isActive:     commitBundle.isActive,
          commitBundle,
          commitCount:  commitBundle.commits.length,
          analysis
        };

        const runAt = new Date(`${date}T19:00:00+05:30`);
        await saveReport(student, result, date, runAt, 'real');

        const status = commitBundle.isActive
          ? `active · ${commitBundle.commits.length} commit(s) · score ${analysis ? analysis.scores.overall : 'n/a'}`
          : 'inactive';
        console.log(`  ✓ ${student.name}: ${status}`);
        saved++;
      } catch (err) {
        const label = err.message === 'repo_not_found' ? 'repo not found' : err.message;
        console.error(`  ✗ ${student.name}: ${label}`);
        errors++;
      }
    }
  }

  await closePool();
  console.log(`\n============================================`);
  console.log(`  Done. Saved: ${saved} · Errors: ${errors}`);
  console.log(`  Run "npm run dashboard:data" to refresh.`);
  console.log(`============================================`);
}

main().catch(async (err) => {
  console.error(`[backfill] Fatal: ${err.stack || err.message}`);
  try { await closePool(); } catch (_) {}
  process.exit(1);
});
