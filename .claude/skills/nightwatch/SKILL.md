---
name: nightwatch
description: Run today's NIGHTWATCH EOD pipeline — fetch each intern's GitHub commits, score them in teacher format with Claude, write the daily log, and send manager + per-intern emails via SMTP.
argument-hint: "[YYYY-MM-DD]  (optional, defaults to today in Asia/Kolkata)"
allowed-tools: Read, Write, Bash, Task
---

# NIGHTWATCH — Daily Intern EOD Agent

You are the orchestrator for Wisright's NIGHTWATCH intern tracking pipeline.
Run the full end-of-day workflow for the 3 interns configured in `config/students.json`.

## Execution plan

**Step 1 — Resolve the report date.**
- If `$1` is supplied and matches `YYYY-MM-DD`, use it.
- Otherwise compute today's date in `Asia/Kolkata` via `TZ=Asia/Kolkata date +%F`.
- Store the result as `REPORT_DATE`.

**Step 2 — Load the roster.**
- Read `config/students.json` with the `Read` tool.
- Each entry: `{ name, email, github, repo }`.

**Step 3 — Fetch each intern's commits for REPORT_DATE.**
For every student, in a single `Bash` call each:
```bash
OWNER_REPO=$(echo "<repo_url>" | sed -E 's#https://github.com/##;s#\.git$##')
SINCE="${REPORT_DATE}T00:00:00+05:30"
UNTIL="${REPORT_DATE}T23:59:59+05:30"
gh api "/repos/${OWNER_REPO}/commits?since=${SINCE}&until=${UNTIL}&author=<github_username>" --paginate > /tmp/nightwatch_<name>_commits.json
```
Then for each commit SHA collect the unified diff (cap at 50 KB per commit):
```bash
gh api "/repos/${OWNER_REPO}/commits/${SHA}" -H "Accept: application/vnd.github.v3.diff" | head -c 51200
```

Concatenate per-intern diffs into `/tmp/nightwatch_<name>_diff.txt`, keeping a header line per commit:
```
=== COMMIT <sha_short> <iso_timestamp> <message_first_line> ===
<diff content>
```

If the intern made **zero commits today**, mark them inactive and skip the scoring step for them (they still appear in the log with `isActive:false, commitCount:0, analysis:null`).

**Step 4 — Score each active intern.**
For each intern with at least one commit, delegate to the `code-scorer` subagent via the `Task` tool:
- Pass: student name, github handle, repo URL, commit count, and the full diff text.
- The subagent returns a JSON object matching the teacher-format schema (summary, scores, strengths, mistakes, suggestions, learning_feedback, risk_flag).
- Validate: must have all 5 scores (understanding, implementation, code_quality, effort, overall, each 0–10), and `risk_flag` ∈ {none, low_effort, possible_copy, incomplete_work}. If the subagent returns malformed JSON, retry ONCE with a clarifying note; on second failure, record `error: "scoring_failed"` for that intern and continue.

**Step 5 — Write the daily log.**
Assemble the aggregate object:
```json
{
  "runAt": "<ISO timestamp>",
  "mode": "claude-skill",
  "results": [
    {
      "student": { "name", "email", "github", "repo" },
      "isActive": true,
      "error": null,
      "commitCount": N,
      "analysis": { ... teacher-format object ... }
    },
    ...
  ]
}
```
Write it to `logs/${REPORT_DATE}.json` with `Write`. Create `logs/` if missing via `Bash`: `mkdir -p logs`.

**Step 6 — Send the emails.**
Delegate to the `email-sender` subagent via `Task`. Pass it the path `logs/${REPORT_DATE}.json`.
The subagent shells out to the Node helper that reuses the project's SMTP config.

**Step 7 — Clean up and report.**
- Delete `/tmp/nightwatch_*` scratch files.
- Print a short summary to stdout: `date, N students scored, M emails sent, any errors`.

## Error handling
- GitHub 404 on a repo → record `error: "repo_not_found"`, continue.
- GitHub rate-limit → abort the run with a clear message (do not partial-send).
- SMTP failure → log the error, do NOT retry (cron will handle the next-day run).

## Rules
- Never print secrets from `.env` to stdout.
- Never exceed 50 KB of diff per commit in the prompt to the scorer.
- Keep the main-session context lean: DO NOT paste full diffs back into this orchestrator's responses — let the `code-scorer` subagent handle them in its own context.
