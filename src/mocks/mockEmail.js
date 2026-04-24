const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'output');

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function sanitizeForFilename(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

async function sendEmail({ to, subject, body, kind }) {
  ensureOutputDir();

  if (!to || !subject || !body) {
    throw new Error('[mockEmail] "to", "subject", and "body" are required.');
  }

  const cc = process.env.CC_EMAIL || '';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeTo = sanitizeForFilename(to);

  let fileName;
  if (kind === 'manager') {
    fileName = 'manager-report.txt';
  } else if (kind === 'student') {
    fileName = `intern-${safeTo}.txt`;
  } else {
    fileName = `${timestamp}_${safeTo}.txt`;
  }

  const filePath = path.join(OUTPUT_DIR, fileName);
  const content =
    `From: NIGHTWATCH Agent <${process.env.SMTP_FROM || process.env.SMTP_USER || 'nightwatch@local'}>\n` +
    `To: ${to}\n` +
    (cc ? `Cc: ${cc}\n` : '') +
    `Subject: ${subject}\n` +
    `Sent: ${new Date().toISOString()}\n` +
    `----\n${body}\n`;

  fs.writeFileSync(filePath, content, 'utf8');
  return { ok: true, path: filePath };
}

module.exports = { sendEmail };
