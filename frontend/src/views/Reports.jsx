import React, { useMemo, useState } from 'react';
import { scoreClass } from '../hooks/useData.js';
import Icon from '../components/Icon.jsx';

const RISK_LABELS = {
  none: 'No concerns',
  low_effort: 'Low activity',
  possible_copy: 'Possibly copied work',
  incomplete_work: 'Unfinished work'
};

const SCORE_LABELS = [
  ['understanding', 'Understanding'],
  ['implementation', 'Execution'],
  ['code_quality', 'Code Quality'],
  ['effort', 'Effort'],
  ['overall', 'Overall']
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function initials(name) {
  return (name || '')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function inRange(dateStr, start, end) {
  if (!start && !end) return true;
  if (start && dateStr < start) return false;
  if (end && dateStr > end) return false;
  return true;
}

function formatShortDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(monthIdx) || Number.isNaN(day) || monthIdx < 0 || monthIdx > 11) {
    return dateStr;
  }
  return `${MONTHS_SHORT[monthIdx]} ${day}`;
}

function TeacherList({ title, items, iconName, variant }) {
  if (!items || items.length === 0) return null;
  return (
    <>
      <div className={`section-title ${variant || ''}`}>
        <Icon name={iconName} size={14} stroke={2.25} />
        {title}
      </div>
      <ul className="teacher-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </>
  );
}

function DayReport({ entry }) {
  const a = entry && entry.analysis;
  if (!a) {
    return (
      <div className="day-report empty">
        <div className="day-report-head">
          <div className="timeline-date">
            <Icon name="calendar" size={12} />
            {entry ? entry.date : '—'}
          </div>
          <span className="badge status-inactive">Didn't work this day</span>
        </div>
        <div
          className="report-summary"
          style={{ background: 'var(--surface-2)', borderLeftColor: 'var(--border)' }}
        >
          {entry && entry.error ? `Error: ${entry.error}` : 'No work submitted on this day.'}
        </div>
      </div>
    );
  }
  return (
    <div className="day-report">
      <div className="day-report-head">
        <div className="timeline-date">
          <Icon name="calendar" size={12} />
          {entry.date}
        </div>
        <div className="day-report-meta">
          <span className={`score-chip ${scoreClass(a.scores.overall)}`}>
            {a.scores.overall}/10
          </span>
          <span className={`badge risk-${a.risk_flag}`}>
            {RISK_LABELS[a.risk_flag] || a.risk_flag}
          </span>
          <span className="commit-count">
            <Icon name="gitBranch" size={12} />
            {entry.commitCount} update{entry.commitCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="report-summary">{a.summary}</div>

      <div className="scores-row">
        {SCORE_LABELS.map(([key, label]) => (
          <div key={key} className="score-box">
            <div className="lbl">{label}</div>
            <div className="val">{a.scores[key]}</div>
          </div>
        ))}
      </div>

      <TeacherList title="What Went Well" items={a.strengths} iconName="checkCircle" variant="strengths" />
      <TeacherList title="Areas to Improve" items={a.mistakes} iconName="alertCircle" variant="mistakes" />
      <TeacherList title="Recommended Next Steps" items={a.suggestions} iconName="lightbulb" variant="suggestions" />

      {a.learning_feedback && (
        <div className="mentor-note">
          <Icon name="messageSquare" size={16} />
          <div>{a.learning_feedback}</div>
        </div>
      )}
    </div>
  );
}

function InternExpansion({ history, rangeStart, rangeEnd }) {
  const entries = (history || []).filter((e) => inRange(e.date, rangeStart, rangeEnd));
  const firstDate = entries[0] ? entries[0].date : '';
  const [selectedDate, setSelectedDate] = useState(firstDate);

  const activeDate = entries.find((e) => e.date === selectedDate)
    ? selectedDate
    : firstDate;
  const selected = entries.find((e) => e.date === activeDate);

  if (entries.length === 0) {
    return (
      <div className="expansion">
        <div className="empty-state" style={{ padding: 30 }}>
          <Icon name="inbox" size={36} stroke={1.5} />
          <div className="empty-title">No feedback available for this date range.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="expansion">
      <div className="date-filter">
        <label>
          <Icon name="calendar" size={13} />
          Choose a day
        </label>
        <select value={activeDate} onChange={(e) => setSelectedDate(e.target.value)}>
          {entries.map((e) => (
            <option key={e.date} value={e.date}>
              {e.date} — {e.analysis ? `${e.analysis.scores.overall}/10` : 'inactive'}
            </option>
          ))}
        </select>
        <span className="entries-count">
          {entries.length} day{entries.length === 1 ? '' : 's'} with feedback
        </span>
      </div>
      {selected ? <DayReport entry={selected} /> : null}
    </div>
  );
}

function InternCard({ row, history, expanded, onToggle, rangeStart, rangeEnd, datesInRange }) {
  const inRangeEntries = (history || []).filter((e) => inRange(e.date, rangeStart, rangeEnd));

  const sortedDesc = [...inRangeEntries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latestInRange = sortedDesc[0] || null;
  const analysis = latestInRange && latestInRange.analysis;
  const scoreVal = analysis ? analysis.scores.overall : null;
  const riskFlag = analysis ? analysis.risk_flag : null;

  const entryByDate = new Map();
  for (const e of inRangeEntries) entryByDate.set(e.date, e);

  const totalUpdates = inRangeEntries.reduce(
    (sum, e) => sum + (Number(e.commitCount) || 0),
    0
  );
  const activeCountInRange = inRangeEntries.filter((e) => e.isActive).length;
  const totalDaysInRange = datesInRange.length;

  const scoredEntries = inRangeEntries.filter((e) => e.analysis);
  const avgScore = scoredEntries.length
    ? Math.round(
        (scoredEntries.reduce((s, e) => s + (e.analysis.scores.overall || 0), 0) /
          scoredEntries.length) *
          10
      ) / 10
    : null;

  const latestRiskLabel =
    riskFlag && riskFlag !== 'none'
      ? RISK_LABELS[riskFlag] || riskFlag
      : analysis
        ? 'OK'
        : '—';

  return (
    <div className={`intern-card ${expanded ? 'expanded' : ''}`}>
      <div className="intern-card-head" onClick={onToggle}>
        <div className="intern-left">
          <div className="avatar small">{initials(row.name)}</div>
          <div>
            <div className="intern-name">{row.name}</div>
            <div className="intern-handle">{row.github ? '@' + row.github : '—'}</div>
          </div>
        </div>
        <div className="intern-card-meta">
          {scoreVal != null ? (
            <span className={`score-chip ${scoreClass(scoreVal)}`}>{scoreVal}/10</span>
          ) : (
            <span className="score-chip gray">—</span>
          )}
          {riskFlag ? (
            <span className={`badge risk-${riskFlag}`}>
              {RISK_LABELS[riskFlag] || riskFlag}
            </span>
          ) : (
            <span className="badge status-inactive">No activity in this range</span>
          )}
        </div>
      </div>

      <div className="day-cells">
        {datesInRange.map((d) => {
          const entry = entryByDate.get(d);
          const isActive = !!(entry && entry.isActive);
          const dayAnalysis = entry && entry.analysis;
          const dayScore = dayAnalysis ? dayAnalysis.scores.overall : null;
          const commitCount = entry ? Number(entry.commitCount) || 0 : 0;
          return (
            <div
              key={d}
              className={`day-cell ${isActive ? 'active' : 'inactive'}`}
              title={d}
            >
              <div className="day-cell-date">{formatShortDate(d)}</div>
              <div className="day-cell-commits">
                {isActive
                  ? `${commitCount} update${commitCount === 1 ? '' : 's'}`
                  : '—'}
              </div>
              <div className="day-cell-score">
                {dayScore != null ? (
                  <span className={`score-chip ${scoreClass(dayScore)}`}>
                    {dayScore}/10
                  </span>
                ) : (
                  <span className="day-cell-placeholder">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="progress-footer">
        <div className="progress-stat">
          <Icon name="calendar" size={12} />
          Worked <strong>{activeCountInRange}/{totalDaysInRange}</strong> days
        </div>
        <div className="progress-stat">
          <Icon name="gitBranch" size={12} />
          <strong>{totalUpdates}</strong> total update{totalUpdates === 1 ? '' : 's'}
        </div>
        <div className="progress-stat">
          <Icon name="trendingUp" size={12} />
          Avg <strong>{avgScore != null ? `${avgScore}/10` : '—'}</strong>
        </div>
        <div
          className={`progress-stat flag ${
            riskFlag && riskFlag !== 'none' ? 'warn' : analysis ? 'ok' : ''
          }`}
        >
          <Icon name="alertCircle" size={12} />
          Latest: <strong>{latestRiskLabel}</strong>
        </div>
      </div>

      {expanded && (
        <InternExpansion
          history={history}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      )}
    </div>
  );
}

export default function Reports({ rows, history, search }) {
  const [expandedName, setExpandedName] = useState(null);

  const allDates = useMemo(() => {
    const set = new Set();
    for (const name of Object.keys(history || {})) {
      for (const entry of history[name]) set.add(entry.date);
    }
    return Array.from(set).sort();
  }, [history]);

  const minDate = allDates[0] || '';
  const maxDate = allDates[allDates.length - 1] || '';

  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');

  const onShow = () => {
    setAppliedStart(startInput);
    setAppliedEnd(endInput);
  };

  const onClear = () => {
    setStartInput('');
    setEndInput('');
    setAppliedStart('');
    setAppliedEnd('');
  };

  const filteredRows = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.github || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const toggle = (name) => {
    setExpandedName((cur) => (cur === name ? null : name));
  };

  const rangeLabel = appliedStart || appliedEnd
    ? `${appliedStart || '…'} → ${appliedEnd || '…'}`
    : 'All dates';

  const datesInRange = useMemo(() => {
    return allDates.filter((d) => inRange(d, appliedStart, appliedEnd));
  }, [allDates, appliedStart, appliedEnd]);

  const overall = useMemo(() => {
    const dateSet = new Set();
    let totalUpdates = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    let flaggedInterns = 0;

    for (const name of Object.keys(history || {})) {
      const entries = (history[name] || []).filter((e) =>
        inRange(e.date, appliedStart, appliedEnd)
      );
      if (entries.length === 0) continue;

      for (const e of entries) {
        dateSet.add(e.date);
        totalUpdates += Number(e.commitCount) || 0;
        if (e.analysis && typeof e.analysis.scores?.overall === 'number') {
          scoreSum += e.analysis.scores.overall;
          scoreCount += 1;
        }
      }

      const sortedDesc = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
      const latest = sortedDesc[0];
      const latestRisk = latest && latest.analysis && latest.analysis.risk_flag;
      if (latestRisk && latestRisk !== 'none') flaggedInterns += 1;
    }

    return {
      totalDays: dateSet.size,
      totalUpdates,
      teamAvg: scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : null,
      flaggedInterns
    };
  }, [history, appliedStart, appliedEnd]);

  const flaggedClass = overall.flaggedInterns > 0 ? 'bad' : 'good';

  return (
    <section className="view">
      <div className="page-title">
        <Icon name="fileText" size={16} stroke={2} />
        Daily Feedback
      </div>
      <div className="page-subtitle">
        Pick a date range, then click any intern to read their daily AI feedback.
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>
        <Icon name="trendingUp" size={14} stroke={2.25} />
        Overall Progress
      </div>
      <div className="feedback-summary">
        <div className="summary-stat gold">
          <div className="summary-stat-body">
            <div className="summary-stat-label">Total Days Tracked</div>
            <div className="summary-stat-value">{overall.totalDays}</div>
            <div className="summary-stat-sub">
              {appliedStart || appliedEnd ? 'in selected range' : 'across all history'}
            </div>
          </div>
          <div className="summary-stat-icon gold">
            <Icon name="calendar" size={18} stroke={2} />
          </div>
        </div>

        <div className="summary-stat">
          <div className="summary-stat-body">
            <div className="summary-stat-label">Total Updates</div>
            <div className="summary-stat-value">{overall.totalUpdates}</div>
            <div className="summary-stat-sub">commits across the team</div>
          </div>
          <div className="summary-stat-icon">
            <Icon name="gitBranch" size={18} stroke={2} />
          </div>
        </div>

        <div className="summary-stat">
          <div className="summary-stat-body">
            <div className="summary-stat-label">Team Avg Performance</div>
            <div className="summary-stat-value">
              {overall.teamAvg != null ? `${overall.teamAvg}/10` : '—'}
            </div>
            <div className="summary-stat-sub">mean of daily AI scores</div>
          </div>
          <div className="summary-stat-icon">
            <Icon name="trendingUp" size={18} stroke={2} />
          </div>
        </div>

        <div className={`summary-stat ${flaggedClass}`}>
          <div className="summary-stat-body">
            <div className="summary-stat-label">Interns Flagged</div>
            <div className="summary-stat-value">{overall.flaggedInterns}</div>
            <div className="summary-stat-sub">
              {overall.flaggedInterns > 0 ? 'need a closer look' : 'all clear'}
            </div>
          </div>
          <div className={`summary-stat-icon ${flaggedClass}`}>
            <Icon name="alertCircle" size={18} stroke={2} />
          </div>
        </div>
      </div>

      <div className="date-range-bar">
        <div className="date-field">
          <label htmlFor="start-date">From</label>
          <div className="date-input-wrap">
            <Icon name="calendar" size={14} className="date-input-icon" />
            <input
              id="start-date"
              type="date"
              value={startInput}
              min={minDate}
              max={maxDate}
              onChange={(e) => setStartInput(e.target.value)}
            />
          </div>
        </div>
        <div className="date-field">
          <label htmlFor="end-date">To</label>
          <div className="date-input-wrap">
            <Icon name="calendar" size={14} className="date-input-icon" />
            <input
              id="end-date"
              type="date"
              value={endInput}
              min={startInput || minDate}
              max={maxDate}
              onChange={(e) => setEndInput(e.target.value)}
            />
          </div>
        </div>
        <button className="show-btn" onClick={onShow} disabled={!startInput && !endInput}>
          Apply
        </button>
        <button className="clear-btn" onClick={onClear}>
          Clear
        </button>
        <span className="entries-count">
          <Icon name="calendar" size={12} />
          {rangeLabel}
        </span>
      </div>

      <div className="help-banner">
        <div className="help-banner-icon">
          <Icon name="lightbulb" size={16} stroke={2} />
        </div>
        <div className="help-banner-body">
          <strong>How to read each card:</strong>
          <span><strong>Day cells</strong> — one tile per day in the range, showing the date, update count, and that day's AI score.</span>
          <span><strong>Progress footer</strong> — total days worked, total updates, team average, and the latest AI concern.</span>
          <span>Click any intern card to open the full AI feedback for any specific day.</span>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="empty-state">
          <Icon name="search" size={48} stroke={1.5} />
          <div className="empty-title">No interns match your filters.</div>
        </div>
      ) : (
        <div className="intern-grid">
          {filteredRows.map((r) => (
            <InternCard
              key={r.name}
              row={r}
              history={history[r.name] || []}
              expanded={expandedName === r.name}
              onToggle={() => toggle(r.name)}
              rangeStart={appliedStart}
              rangeEnd={appliedEnd}
              datesInRange={datesInRange}
            />
          ))}
        </div>
      )}
    </section>
  );
}
