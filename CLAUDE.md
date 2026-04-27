# CLAUDE.md — Working Rules for This Project

These rules apply to **every** prompt the user sends in this repo.

---

## 1. Plan → Approve → Implement (strict)

For every task, follow this order:

1. **Read** the user's prompt carefully.
2. **Enter plan mode** and produce a clear written plan:
   - What will change (files, functions)
   - Why (what problem it solves)
   - Risks / trade-offs
   - Test approach
3. **Wait for the user's explicit approval** of the plan.
4. Only **after approval**, start implementing.

**Do not write or edit code before the plan is approved.** Research/reading files is fine; editing is not.

---

## 2. No commits or pushes without approval

- **Never** run `git commit`, `git push`, `git tag`, or any destructive git command on your own.
- Only commit/push when the user **explicitly** says so ("commit this", "push now").
- One approval = one action. Don't reuse a past approval for a new commit.

---

## 3. Post-implementation quality gate

After **every** implementation (before asking for commit approval), run these in order:

1. **`security-review` skill** — complete security review of the pending changes. Fix every finding before proceeding.
2. **Code quality pass** — review for:
   - Dead code / unused imports
   - Input validation at boundaries (GitHub API, Claude API, SMTP, env vars)
   - Secret handling (never log tokens, API keys, passwords)
   - Error handling for external calls (rate limits, timeouts, auth failures)
   - Readable naming, small functions

> Note on CodeRabbit: CodeRabbit is an external GitHub bot, not something Claude runs locally. It reviews PRs automatically once this repo is on GitHub with CodeRabbit installed. Claude cannot invoke it from the CLI. The `security-review` skill + manual quality pass above cover the local equivalent.

3. **Report back to the user** with:
   - Summary of what was implemented
   - Security findings + fixes
   - Quality issues found + fixes
   - Then ask: "Ready to commit?"

---

## 4. Project context (for every prompt)

This is a **multi-repo student tracking system**:

- Students each have their own GitHub repo
- A cron job (7 PM daily) fetches each student's commits
- Claude API analyzes the code and scores the student
- Two emails go out: one summary to the manager, one personal feedback to each student

Tech stack: Node.js, Claude API (Anthropic SDK), Nodemailer, node-cron, VPS/Docker.

Files that already exist:
- `README.md` — full design doc
- `.env.example` — env var template
- `config/students.json` — student registry

Files still to build (under `src/`):
- `fetchCommits.js`
- `analyzeCommit.js`
- `generateReport.js`
- `sendEmail.js`
- `scheduler.js`

---

## 5. Non-negotiables

- Never store secrets in code or commit `.env`
- Never skip git hooks (`--no-verify`)
- Never force-push
- Never delete files/branches without explicit approval
- If a plan changes mid-implementation, stop and re-confirm
