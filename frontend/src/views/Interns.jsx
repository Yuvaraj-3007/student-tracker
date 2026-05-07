import React, { useMemo, useState } from 'react';
import { scoreClass } from '../hooks/useData.js';
import { StatusBadge, ScoreChip } from '../components/Badge.jsx';
import Icon from '../components/Icon.jsx';

const RISK_LABELS = {
  none: 'No concerns',
  low_effort: 'Low activity',
  possible_copy: 'Possibly copied work',
  incomplete_work: 'Unfinished work'
};

const RISK_OPTIONS = ['', 'none', 'low_effort', 'possible_copy', 'incomplete_work'];
const RISK_OPTION_LABELS = {
  '': 'All',
  none: 'No concerns',
  low_effort: 'Low activity',
  possible_copy: 'Possibly copied work',
  incomplete_work: 'Unfinished work'
};
const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Worked today' },
  { value: 'inactive', label: 'No work logged' }
];

export default function Interns({ rows, search }) {
  const [risk, setRisk] = useState('');
  const [status, setStatus] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [localName, setLocalName] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const effectiveName = (search || localName || '').trim().toLowerCase();

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (effectiveName) {
        const hit =
          r.name.toLowerCase().includes(effectiveName) ||
          (r.github || '').toLowerCase().includes(effectiveName);
        if (!hit) return false;
      }
      if (risk && r.risk !== risk) return false;
      if (status === 'active' && !r.isActive) return false;
      if (status === 'inactive' && r.isActive) return false;
      if (minScore > 0 && (r.score == null || r.score < minScore)) return false;
      return true;
    });
  }, [rows, effectiveName, risk, status, minScore]);

  const sorted = useMemo(() => {
    const factor = sortDir === 'asc' ? 1 : -1;
    return filtered.slice().sort((a, b) => {
      let x = a[sortKey];
      let y = b[sortKey];
      if (sortKey === 'status') {
        x = a.isActive ? 1 : 0;
        y = b.isActive ? 1 : 0;
      }
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === 'string') return x.localeCompare(y) * factor;
      return (x - y) * factor;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const clearFilters = () => {
    setRisk('');
    setStatus('');
    setMinScore(0);
    setLocalName('');
  };

  return (
    <section className="view">
      <div className="page-title">
        <Icon name="users" size={16} stroke={2} />
        Team View
      </div>
      <div className="page-subtitle">
        Browse and filter interns by today's performance.
      </div>

      <div className="filters">
        <div className="filter">
          <label htmlFor="f-name">Name</label>
          <input
            id="f-name"
            type="text"
            placeholder="Type a name..."
            value={search || localName}
            onChange={(e) => setLocalName(e.target.value)}
          />
        </div>
        <div className="filter">
          <label htmlFor="f-risk">Review Status</label>
          <select id="f-risk" value={risk} onChange={(e) => setRisk(e.target.value)}>
            {RISK_OPTIONS.map((r) => (
              <option key={r || 'all'} value={r}>
                {RISK_OPTION_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="filter">
          <label htmlFor="f-status">Activity</label>
          <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter">
          <label htmlFor="f-score">Minimum performance: {minScore}/10</label>
          <input
            id="f-score"
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </div>
        <button className="clear-btn" onClick={clearFilters}>
          Clear filters
        </button>
        <span className="results-count">
          Showing {sorted.length} intern{sorted.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {[
                ['name', 'Name'],
                ['status', 'Activity'],
                ['commits', 'Work Today'],
                ['score', 'Score'],
                ['risk', 'Status']
              ].map(([key, label]) => (
                <th key={key} onClick={() => handleSort(key)}>
                  {label}
                  <span className="sort-indicator">
                    {sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '▲▼'}
                  </span>
                </th>
              ))}
              <th>Project</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className="empty-state">
                    <Icon name="search" size={48} stroke={1.5} />
                    <div className="empty-title">No interns match your filters.</div>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr key={r.name} className={r.isActive ? '' : 'inactive'}>
                  <td>{r.name}</td>
                  <td>
                    <StatusBadge active={r.isActive} />
                  </td>
                  <td>{r.commits}</td>
                  <td>
                    <ScoreChip score={r.score} cls={scoreClass(r.score)} />
                  </td>
                  <td>
                    {r.risk ? (
                      <span className={`badge risk-${r.risk}`}>
                        {RISK_LABELS[r.risk] || r.risk}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {r.repo ? (
                      <a
                        className="link"
                        href={r.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {r.repo.replace('https://github.com/', '')}
                        <Icon name="externalLink" size={11} />
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
