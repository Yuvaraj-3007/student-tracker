import React from 'react';

export function RiskBadge({ flag }) {
  if (!flag) return <>—</>;
  const label = flag.replace(/_/g, ' ');
  return <span className={`badge risk-${flag}`}>{label}</span>;
}

export function StatusBadge({ active }) {
  return (
    <span className={`badge ${active ? 'status-active' : 'status-inactive'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function ScoreChip({ score, cls }) {
  if (score == null) return <>—</>;
  return <span className={`score-chip ${cls}`}>{score}/10</span>;
}
