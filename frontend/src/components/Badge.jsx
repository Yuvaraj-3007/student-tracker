import React from 'react';

const RISK_LABELS = {
  none: 'All Good',
  low_effort: 'Low Activity',
  possible_copy: 'Needs Review',
  incomplete_work: 'Work Incomplete'
};

export function RiskBadge({ flag }) {
  if (!flag) return <>—</>;
  return <span className={`badge risk-${flag}`}>{RISK_LABELS[flag] || flag.replace(/_/g, ' ')}</span>;
}

export function StatusBadge({ active }) {
  return (
    <span className={`badge ${active ? 'status-active' : 'status-inactive'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function ScoreChip({ score, cls }) {
  if (score == null) return <span className="score-chip gray">No score</span>;
  const desc = score >= 8 ? 'Excellent' : score >= 5 ? 'Good' : 'Needs Work';
  return <span className={`score-chip ${cls}`}>{score}/10 · {desc}</span>;
}
