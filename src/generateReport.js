const RISK_ICONS = {
  none: 'none ✅',
  low_effort: 'low_effort ⚠️',
  possible_copy: 'possible_copy ❗',
  incomplete_work: 'incomplete_work ⚠️'
};

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatRisk(flag) {
  return RISK_ICONS[flag] || `${flag} ⚠️`;
}

function renderTeacherList(items, heading) {
  if (!items || items.length === 0) return `${heading}\n  (none noted)`;
  const lines = [heading];
  items.forEach((item, i) => {
    lines.push(`  ${i + 1}. ${item}`);
    lines.push('');
  });
  return lines.join('\n').trimEnd();
}

function buildStudentReport({ student, analysis, commitBundle }) {
  const date = formatDate();
  const { summary, strengths, mistakes, suggestions, learning_feedback, scores, risk_flag } = analysis;

  const strengthsBlock = renderTeacherList(strengths, '👍 What you did well');
  const mistakesBlock = renderTeacherList(mistakes, '⚠️ What needs work');
  const suggestionsBlock = renderTeacherList(suggestions, '📘 How to improve tomorrow');

  const subject = `[NIGHTWATCH] Your Daily Feedback — ${date}`;
  const body =
`Hi ${student.name},

🌙 This is your NIGHTWATCH end-of-day feedback for ${date}.

✅ Summary of your work today
  ${summary}

${strengthsBlock}

${mistakesBlock}

${suggestionsBlock}

💬 Mentor note
  ${learning_feedback}

📊 Your scores today
  - Understanding:   ${scores.understanding}/10
  - Implementation:  ${scores.implementation}/10
  - Code quality:    ${scores.code_quality}/10
  - Effort:          ${scores.effort}/10
  - OVERALL:         ${scores.overall}/10
  - Risk flag:       ${formatRisk(risk_flag)}

Commits reviewed: ${commitBundle.commits.length}

Keep pushing — see you tomorrow night.
— NIGHTWATCH`;

  return { to: student.email, subject, body };
}

function buildManagerReport({ results, date = formatDate() }) {
  const lines = [];
  lines.push(`🌙 NIGHTWATCH — Daily Intern Report — ${date}`);
  lines.push('='.repeat(50));
  lines.push('');

  let totalScore = 0;
  let activeCount = 0;
  const riskItems = [];

  for (const r of results) {
    lines.push(`👤 ${r.student.name}  (${r.student.github || '—'})`);
    lines.push(`   Repo: ${r.student.repo}`);

    if (r.error) {
      lines.push(`   ⚠️ Error: ${r.error}`);
      lines.push('');
      continue;
    }

    if (!r.isActive) {
      lines.push('   🟡 Inactive today — no commits across any branch');
      lines.push('');
      continue;
    }

    activeCount += 1;
    totalScore += r.analysis.scores.overall;

    lines.push(`   Work:   ${r.analysis.summary}`);
    lines.push(`   Score:  ${r.analysis.scores.overall}/10`);
    lines.push(`   Risk:   ${formatRisk(r.analysis.risk_flag)}`);
    if (r.analysis.risk_flag && r.analysis.risk_flag !== 'none') {
      riskItems.push(`${r.student.name} — ${r.analysis.risk_flag}`);
    }
    lines.push('');
  }

  const avgScore = activeCount === 0 ? 0 : Math.round((totalScore / activeCount) * 10) / 10;

  lines.push('📊 Summary');
  lines.push(`   - Total Interns:  ${results.length}`);
  lines.push(`   - Active Today:   ${activeCount}`);
  lines.push(`   - Inactive:       ${results.length - activeCount}`);
  lines.push(`   - Avg Score:      ${avgScore}/10`);
  if (riskItems.length > 0) {
    lines.push(`   - Risk Alerts:    ${riskItems.length}`);
    for (const item of riskItems) lines.push(`       • ${item}`);
  } else {
    lines.push('   - Risk Alerts:    none');
  }

  return {
    subject: `[NIGHTWATCH] Daily Intern Report — ${date}`,
    body: lines.join('\n')
  };
}

module.exports = { buildStudentReport, buildManagerReport };
