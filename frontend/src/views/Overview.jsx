import React from 'react';
import { scoreClass } from '../hooks/useData.js';
import { RiskBadge } from '../components/Badge.jsx';
import Icon from '../components/Icon.jsx';

export default function Overview({ rows }) {
  const total = rows.length;
  const active = rows.filter((r) => r.isActive).length;
  const scores = rows.filter((r) => r.score != null).map((r) => r.score);
  const avg = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : 0;
  const risks = rows.filter((r) => r.risk && r.risk !== 'none');

  const kpis = [
    { label: 'Total Interns', value: total, sub: 'Configured', cls: 'purple', icon: 'users' },
    {
      label: 'Active Today',
      value: active,
      sub: `${total - active} inactive`,
      cls: 'good',
      icon: 'checkCircle'
    },
    {
      label: 'Avg Score',
      value: `${avg}/10`,
      sub: `${scores.length} scored`,
      cls: scoreClass(avg),
      icon: 'trendingUp'
    },
    {
      label: 'Risk Alerts',
      value: risks.length,
      sub: risks.length > 0 ? 'Needs attention' : 'All clear',
      cls: risks.length > 0 ? 'bad' : 'good',
      icon: 'alertTriangle'
    }
  ];

  const activeScored = rows
    .filter((r) => r.isActive && r.score != null)
    .sort((a, b) => b.score - a.score);

  return (
    <section className="view">
      <div className="page-title">
        <Icon name="dashboard" size={16} stroke={2} />
        Overview
      </div>
      <div className="page-subtitle">
        Snapshot of today's intern activity and AI-generated feedback.
      </div>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className={`kpi ${k.cls}`}>
            <div className="kpi-head">
              <div className="label">{k.label}</div>
              <div className={`kpi-icon ${k.cls === 'purple' ? 'purple' : k.cls}`}>
                <Icon name={k.icon} size={17} stroke={2} />
              </div>
            </div>
            <div className="value">{k.value}</div>
            <div className="sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="section">
        <h2>
          <Icon name="trendingUp" size={15} />
          Score Distribution
        </h2>
        {activeScored.length === 0 ? (
          <div className="empty-state">
            <Icon name="inbox" size={48} stroke={1.5} />
            <div className="empty-title">No scored interns yet.</div>
          </div>
        ) : (
          <div className="score-bars">
            {activeScored.map((r) => (
              <div key={r.name} className="score-bar">
                <div>{r.name}</div>
                <div className="bar-wrap">
                  <div
                    className={`bar-fill ${scoreClass(r.score)}`}
                    style={{ width: `${r.score * 10}%` }}
                  />
                </div>
                <div className="bar-value">{r.score}/10</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h2>
          <Icon name="alertTriangle" size={15} />
          Risk Alerts
        </h2>
        {risks.length === 0 ? (
          <div className="empty-state">
            <Icon name="checkCircle" size={48} stroke={1.5} />
            <div className="empty-title">No risk flags today — all clear.</div>
          </div>
        ) : (
          risks.map((r) => (
            <div key={r.name} className="risk-row">
              <div>
                <strong>{r.name}</strong>
                <span className="summary-text">
                  {r.summary ? r.summary.slice(0, 80) : ''}
                </span>
              </div>
              <RiskBadge flag={r.risk} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
