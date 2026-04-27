# Student Tracker — Multi-Repo AI Feedback System

## What Is This?

An automated daily coaching system for junior developer students.
Each student has their own GitHub repo. This system checks their commits every day,
analyzes their work using AI, and sends feedback emails automatically.

---

## How It Works

```
Student writes code on GitHub
        ↓
System checks it every day automatically (7 PM)
        ↓
AI reads their work like a senior mentor
        ↓
Manager gets a summary email
Student gets personal feedback email
```

---

## Architecture

```
Student Repos (Multiple GitHub URLs)
        ↓
Repo Registry (students.json)
        ↓
Scheduler (node-cron — runs at 7 PM daily)
        ↓
GitHub API (Fetch commits per student)
        ↓
AI Analysis Engine (Claude API)
        ↓
Report Generator (Manager + Student reports)
        ↓
Email Service (Nodemailer)
```

---

## Project Structure

```
student-tracker-poc/
├── config/
│   └── students.json          # Student repo registry
├── src/
│   ├── fetchCommits.js        # GitHub API — fetch daily commits
│   ├── analyzeCommit.js       # Claude AI — analyze student work
│   ├── generateReport.js      # Build manager + student reports
│   ├── sendEmail.js           # Send emails via Nodemailer
│   └── scheduler.js           # Cron entry point (7 PM daily)
├── .env.example               # Environment variable template
├── package.json
└── README.md
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your keys in .env
```

### 3. Add students
Edit `config/students.json` with each student's name, email, and GitHub repo.

### 4. Run manually (test)
```bash
node src/scheduler.js
```

### 5. Run on schedule (production)
Deploy to VPS — cron runs automatically at 7 PM daily.

---

## Environment Variables

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | GitHub personal access token |
| `ANTHROPIC_API_KEY` | Claude API key |
| `SMTP_HOST` | Email SMTP host |
| `SMTP_PORT` | Email SMTP port |
| `SMTP_USER` | Email username |
| `SMTP_PASS` | Email password |
| `MANAGER_EMAIL` | Your email (receives manager report) |
| `SEND_STUDENT_EMAILS` | `true` or `false` |

---

## AI Evaluation Model

Each student is scored across 5 dimensions:

| Dimension | What It Measures |
|---|---|
| Understanding | Did they grasp the concept? |
| Implementation | Is the code correct? |
| Code Quality | Naming, structure, readability |
| Effort | Genuine work vs copy-paste |
| Overall | Combined score (1–10) |

Risk flags detected automatically:
- `none` — all good
- `low_effort` — minimal work
- `possible_copy` — suspected copy-paste
- `incomplete_work` — work not finished

---

## Reports

### Manager Report (you receive this)
- All students summarized in one email
- Who was active, who wasn't
- Scores + risk flags
- Daily average score

### Student Report (each student receives)
- What they did today
- Strengths
- Mistakes
- Suggestions
- Mentor encouragement note
- Score out of 10

---

## Tech Stack

| Layer | Tool |
|---|---|
| Runtime | Node.js |
| AI | Claude API (Anthropic) |
| Email | Nodemailer |
| Scheduler | node-cron |
| Hosting | VPS / Docker |

---

## Future Upgrades

- Weekly trend analysis ("improved from 5 → 8 this week")
- Student leaderboard / gamification
- Auto GitHub PR comments
- LMS integration
- PostgreSQL for history tracking
