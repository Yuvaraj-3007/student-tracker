require('dotenv').config();
process.env.USE_MOCKS = 'true';

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { fetchCommitsForStudent } = require('../src/fetchCommits');
const { analyzeStudentWork } = require('../src/analyzeCommit');
const { buildStudentReport, buildManagerReport } = require('../src/generateReport');

const STUDENTS_FILE = path.join(__dirname, '..', 'config', 'students.json');
const TEST_RECIPIENT = 'wisright.support@gmail.com';

function banner(line) {
  console.log(`\n${line}`);
  console.log('='.repeat(line.length));
}

async function main() {
  banner('🔌 Step 1 — SMTP connection check');
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error('Missing SMTP_HOST / SMTP_USER / SMTP_PASS in .env');
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000
  });
  await transporter.verify();
  console.log(`✅ Connected to ${host}:${port} as ${user}`);

  banner('🧠 Step 2 — Running mock pipeline (GitHub + Claude mocks)');
  const students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8'));
  console.log(`Loaded ${students.length} intern(s).`);

  const results = [];
  for (const student of students) {
    const bundle = await fetchCommitsForStudent(student);
    let analysis = null;
    if (bundle.isActive) {
      analysis = await analyzeStudentWork(bundle);
    }
    results.push({
      student,
      isActive: bundle.isActive,
      commitBundle: bundle,
      analysis,
      error: null
    });
    const status = bundle.isActive
      ? `✅ ${analysis.scores.overall}/10 (${analysis.risk_flag})`
      : '🟡 inactive';
    console.log(`  ${student.name.padEnd(10)} → ${status}`);
  }

  banner(`📬 Step 3 — Sending real emails to ${TEST_RECIPIENT}`);
  const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || 'NIGHTWATCH Agent';
  const from = `"${fromName}" <${fromAddr}>`;

  const sentList = [];

  const manager = buildManagerReport({ results });
  const managerInfo = await transporter.sendMail({
    from,
    to: TEST_RECIPIENT,
    subject: manager.subject,
    text: manager.body
  });
  sentList.push(`📋 Manager report → ${TEST_RECIPIENT}  (id: ${managerInfo.messageId})`);

  for (const r of results) {
    if (!r.isActive || !r.analysis) continue;
    const report = buildStudentReport({
      student: r.student,
      analysis: r.analysis,
      commitBundle: r.commitBundle
    });
    const redirectedSubject = `${report.subject} [redirected, original → ${r.student.email}]`;
    const header = `⚠️ THIS EMAIL IS A REDIRECTED TEST.\nOriginally addressed to: ${r.student.email}\nShown here so you can preview the content.\n\n---\n\n`;
    const info = await transporter.sendMail({
      from,
      to: TEST_RECIPIENT,
      subject: redirectedSubject,
      text: header + report.body
    });
    sentList.push(`👤 ${r.student.name.padEnd(10)} → ${TEST_RECIPIENT}  (id: ${info.messageId})`);
  }

  banner('✅ All emails sent');
  for (const line of sentList) console.log('  ' + line);
  console.log(`\nCheck inbox: ${TEST_RECIPIENT}`);
}

main().catch((err) => {
  console.error('\n❌ Failed:', err.message || err);
  if (err && err.code) console.error('   code:', err.code);
  if (err && err.response) console.error('   response:', err.response);
  process.exit(1);
});
