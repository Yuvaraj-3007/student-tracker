import React, { useMemo, useState } from 'react';
import { scoreClass } from '../hooks/useData.js';
import Icon from '../components/Icon.jsx';

const SCORE_LABELS = [
  ['understanding', 'Understanding'],
  ['implementation', 'Implementation'],
  ['code_quality', 'Code Quality'],
  ['effort', 'Effort'],
  ['overall', 'Overall']
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
          <span className="badge status-inactive">No activity</span>
        </div>
        <div
          className="report-summary"
          style={{ background: 'var(--surface-2)', borderLeftColor: 'var(--border)' }}
        >
          {entry && entry.error ? `Error: ${entry.error}` : 'No commits for this day.'}
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
            {a.risk_flag.replace(/_/g, ' ')}
          </span>
          <span className="commit-count">
            <Icon name="gitBranch" size={12} />
            {entry.commitCount} commit{entry.commitCount === 1 ? '' : 's'}
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

      <TeacherList title="Strengths" items={a.strengths} iconName="checkCircle" variant="strengths" />
      <TeacherList title="Mistakes" items={a.mistakes} iconName="alertCircle" variant="mistakes" />
      <TeacherList title="Suggestions" items={a.suggestions} iconName="lightbulb" variant="suggestions" />

      {a.learning_feedback && (
        <div className="mentor-note">
          <Icon name="messageSquare" size={16} />
          <div>{a.learning_feedback}</div>
        </div>
      )}
    </div>
  );
}

function InternExpansion({ history, forcedDate }) {
  const entries = history || [];
  const firstDate = entries[0] ? entries[0].date : '';
  const [selectedDate, setSelectedDate] = useState(firstDate);

  const activeDate = forcedDate || selectedDate || firstDate;
  const selected = entries.find((e) => e.date === activeDate);

  if (entries.length === 0) {
    return (
      <div className="expansion">
        <div className="empty-state" style={{ padding: 30 }}>
          <Icon name="inbox" size={36} stroke={1.5} />
          <div className="empty-title">No reports for this intern yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="expansion">
      {!forcedDate && (
        <div className="date-filter">
          <label>
            <Icon name="calendar" size={13} />
            Filter by date
          </label>
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            {entries.map((e) => (
              <option key={e.date} value={e.date}>
                {e.date} — {e.analysis ? `${e.analysis.scores.overall}/10` : 'inactive'}
              </option>
            ))}
          </select>
          <span className="entries-count">
            {entries.length} report{entries.length === 1 ? '' : 's'} total
          </span>
        </div>
      )}
      {selected ? (
        <DayReport entry={selected} />
      ) : (
        <DayReport entry={{ date: activeDate, analysis: null }} />
      )}
    </div>
  );
}

function InternRow({ row, history, expanded, onToggle, forcedDate }) {
  const dayEntry = forcedDate
    ? history.find((e) => e.date === forcedDate)
    : history[0];
  const analysis = dayEntry && dayEntry.analysis;
  const scoreVal = analysis ? analysis.scores.overall : null;
  const riskFlag = analysis ? analysis.risk_flag : null;
  const count = history ? history.length : 0;

  return (
    <div className={`intern-row ${expanded ? 'expanded' : ''}`}>
      <div className="intern-row-head" onClick={onToggle}>
        <div className="intern-left">
          <div className="avatar small">{initials(row.name)}</div>
          <div>
            <div className="intern-name">{row.name}</div>
            <div className="intern-handle">{row.github ? '@' + row.github : '—'}</div>
          </div>
        </div>
        <div className="intern-right">
          <div className="reports-count">
            <Icon name="fileText" size={13} />
            {count} report{count === 1 ? '' : 's'}
          </div>
          {forcedDate && !dayEntry && (
            <span className="badge status-inactive">no report</span>
          )}
          {scoreVal != null && (
            <span className={`score-chip ${scoreClass(scoreVal)}`}>{scoreVal}/10</span>
          )}
          {riskFlag && (
            <span className={`badge risk-${riskFlag}`}>{riskFlag.replace(/_/g, ' ')}</span>
          )}
          <Icon name={expanded ? 'xCircle' : 'search'} size={16} className="chevron" />
        </div>
      </div>
      {expanded && <InternExpansion history={history} forcedDate={forcedDate} />}
    </div>
  );
}

export default function Reports({ rows, history, search }) {
  const [expandedName, setExpandedName] = useState(null);
  const [globalDate, setGlobalDate] = useState('');

  const allDates = useMemo(() => {
    const set = new Set();
    for (const name of Object.keys(history || {})) {
      for (const entry of history[name]) set.add(entry.date);
    }
    return Array.from(set).sort().reverse();
  }, [history]);

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

  return (
    <section className="view">
      <div className="page-title">
        <Icon name="fileText" size={16} stroke={2} />
        Student Reports
      </div>
      <div className="page-subtitle">
        Pick a date and a student to see that day's AI feedback. Click any row to expand.
      </div>

      <div className="reports-filter-bar">
        <div className="filter">
          <label>
            <Icon name="calendar" size={12} />
            Date
          </label>
          <select value={globalDate} onChange={(e) => setGlobalDate(e.target.value)}>
            <option value="">All dates (latest per student)</option>
            {allDates.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="filter-search-hint">
          <Icon name="search" size={12} />
          Use the top search bar to filter by name
          {search ? <strong> — currently: "{search}"</strong> : null}
        </div>
        <span className="entries-count">
          {filteredRows.length} student{filteredRows.length === 1 ? '' : 's'}
          {globalDate ? ` · ${globalDate}` : ''}
        </span>
      </div>

      {filteredRows.length === 0 ? (
        <div className="empty-state">
          <Icon name="search" size={48} stroke={1.5} />
          <div className="empty-title">No students match the current filter.</div>
        </div>
      ) : (
        <div className="intern-list">
          {filteredRows.map((r) => (
            <InternRow
              key={r.name}
              row={r}
              history={history[r.name] || []}
              expanded={expandedName === r.name}
              onToggle={() => toggle(r.name)}
              forcedDate={globalDate || null}
            />
          ))}
        </div>
      )}
    </section>
  );
}
