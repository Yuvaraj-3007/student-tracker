const nodemailer = require('nodemailer');

const CONNECTION_TIMEOUT_MS = 20000;

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS are required when USE_MOCKS=false');
  }
  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: CONNECTION_TIMEOUT_MS
  });
  return _transporter;
}

function buildFrom() {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || 'NIGHTWATCH Agent';
  return `"${fromName}" <${fromEmail}>`;
}

async function sendEmail({ to, subject, body, kind }) {
  if (!to || !subject || !body) {
    throw new Error('sendEmail: "to", "subject", and "body" are required.');
  }

  const transporter = getTransporter();
  const cc = process.env.CC_EMAIL || undefined;
  const from = buildFrom();

  const prefixedSubject = subject.startsWith('[NIGHTWATCH]')
    ? subject
    : `[NIGHTWATCH] ${subject}`;

  const info = await transporter.sendMail({
    from,
    to,
    cc,
    subject: prefixedSubject,
    text: body
  });

  return { ok: true, messageId: info.messageId, kind: kind || 'generic' };
}

module.exports = { sendEmail };
