const { Octokit } = require('@octokit/rest');
const { parseGitHubRepoUrl, truncateDiff, isSameAuthor } = require('./githubUtils');

const LOOKBACK_HOURS = 24;
const MAX_DIFF_BYTES = 50 * 1024;
const MAX_BRANCHES = 50;
const REQUEST_TIMEOUT_MS = 15000;

let _octokit = null;

function getOctokit() {
  if (_octokit) return _octokit;
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required when USE_MOCKS=false');
  }
  _octokit = new Octokit({
    auth: token,
    userAgent: 'nightwatch-agent/0.1',
    request: { timeout: REQUEST_TIMEOUT_MS }
  });
  return _octokit;
}

async function fetchCommitsForStudent(student) {
  const octokit = getOctokit();
  const { owner, repo } = parseGitHubRepoUrl(student.repo);
  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString();

  const branches = await listBranches(octokit, owner, repo);
  const commitMap = new Map();

  for (const branchName of branches.slice(0, MAX_BRANCHES)) {
    const branchCommits = await listBranchCommits(octokit, owner, repo, branchName, since);
    for (const c of branchCommits) {
      if (!commitMap.has(c.sha)) {
        commitMap.set(c.sha, { raw: c, branches: [branchName] });
      } else if (!commitMap.get(c.sha).branches.includes(branchName)) {
        commitMap.get(c.sha).branches.push(branchName);
      }
    }
  }

  const uniqueCommits = Array.from(commitMap.values());
  const authored = uniqueCommits.filter((entry) => {
    const info = {
      login: entry.raw.author ? entry.raw.author.login : null,
      name: entry.raw.commit && entry.raw.commit.author ? entry.raw.commit.author.name : null,
      email: entry.raw.commit && entry.raw.commit.author ? entry.raw.commit.author.email : null
    };
    return isSameAuthor(info, student);
  });

  if (authored.length === 0) {
    return {
      student: { name: student.name, email: student.email, repo: student.repo, github: student.github },
      commits: [],
      combinedDiff: '',
      totalFiles: 0,
      isActive: false
    };
  }

  const enriched = [];
  const diffParts = [];
  const filesSeen = new Set();

  for (const entry of authored) {
    const detail = await getCommitDetail(octokit, owner, repo, entry.raw.sha);
    const files = Array.isArray(detail.files) ? detail.files : [];
    const fileNames = files.map((f) => f.filename);
    fileNames.forEach((f) => filesSeen.add(f));

    const additions = detail.stats ? detail.stats.additions : 0;
    const deletions = detail.stats ? detail.stats.deletions : 0;

    enriched.push({
      sha: entry.raw.sha,
      message: entry.raw.commit && entry.raw.commit.message ? entry.raw.commit.message : '',
      author: entry.raw.commit && entry.raw.commit.author ? entry.raw.commit.author.name : student.name,
      timestamp:
        entry.raw.commit && entry.raw.commit.author ? entry.raw.commit.author.date : new Date().toISOString(),
      branch: entry.branches[0],
      branches: entry.branches,
      filesChanged: fileNames,
      additions,
      deletions
    });

    const header = `# Commit ${entry.raw.sha.slice(0, 8)} on ${entry.branches.join(', ')}`;
    const patchBlocks = files
      .filter((f) => typeof f.patch === 'string' && f.patch.length > 0)
      .map((f) => `--- ${f.filename}\n${f.patch}`)
      .join('\n');
    diffParts.push(`${header}\n${patchBlocks}`);
  }

  const combinedDiff = truncateDiff(diffParts.join('\n\n'), MAX_DIFF_BYTES);

  return {
    student: { name: student.name, email: student.email, repo: student.repo, github: student.github },
    commits: enriched,
    combinedDiff,
    totalFiles: filesSeen.size,
    isActive: true
  };
}

async function listBranches(octokit, owner, repo) {
  try {
    const branches = await octokit.paginate(octokit.repos.listBranches, {
      owner,
      repo,
      per_page: 100
    });
    return branches.map((b) => b.name);
  } catch (err) {
    throw wrapGitHubError(`listBranches(${owner}/${repo})`, err);
  }
}

async function listBranchCommits(octokit, owner, repo, branch, since) {
  try {
    return await octokit.paginate(octokit.repos.listCommits, {
      owner,
      repo,
      sha: branch,
      since,
      per_page: 100
    });
  } catch (err) {
    if (err && err.status === 409) return [];
    throw wrapGitHubError(`listCommits(${owner}/${repo}@${branch})`, err);
  }
}

async function getCommitDetail(octokit, owner, repo, sha) {
  try {
    const response = await octokit.repos.getCommit({ owner, repo, ref: sha });
    return response.data;
  } catch (err) {
    throw wrapGitHubError(`getCommit(${owner}/${repo}@${sha})`, err);
  }
}

function wrapGitHubError(context, err) {
  const status = err && err.status ? err.status : '?';
  const message = err && err.message ? err.message : String(err);
  const clean = new Error(`GitHub API error [${status}] in ${context}: ${message}`);
  clean.status = status;
  return clean;
}

module.exports = { fetchCommitsForStudent };
