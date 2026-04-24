const REPO_URL_RE = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s?#]+?)(?:\.git)?\/?$/i;

function parseGitHubRepoUrl(url) {
  if (typeof url !== 'string') {
    throw new Error('Repo URL must be a string');
  }
  const match = url.trim().match(REPO_URL_RE);
  if (!match) {
    throw new Error(`Invalid GitHub repo URL: ${url}`);
  }
  return { owner: match[1], repo: match[2] };
}

function truncateDiff(diff, maxBytes) {
  if (typeof diff !== 'string') return '';
  const buf = Buffer.byteLength(diff, 'utf8');
  if (buf <= maxBytes) return diff;
  const sliced = diff.slice(0, maxBytes);
  return (
    sliced +
    `\n\n... [diff truncated: ${buf} bytes total, showing first ${maxBytes}] ...\n`
  );
}

function isSameAuthor(commitAuthor, intern) {
  if (!commitAuthor) return false;
  const internUsername = (intern.github || '').toLowerCase();
  const internEmail = (intern.email || '').toLowerCase();
  const internName = (intern.name || '').toLowerCase();

  const author = commitAuthor.login ? commitAuthor.login.toLowerCase() : '';
  const committerName = commitAuthor.name ? commitAuthor.name.toLowerCase() : '';
  const committerEmail = commitAuthor.email ? commitAuthor.email.toLowerCase() : '';

  if (internUsername && author === internUsername) return true;
  if (internEmail && committerEmail === internEmail) return true;
  if (internName && committerName.includes(internName)) return true;
  return false;
}

module.exports = { parseGitHubRepoUrl, truncateDiff, isSameAuthor };
