import React from 'react';
import { scoreClass } from '../hooks/useData.js';
import { StatusBadge, ScoreChip } from '../components/Badge.jsx';
import Icon from '../components/Icon.jsx';

export default function Repos({ rows }) {
  return (
    <section className="view">
      <div className="page-title">
        <Icon name="folder" size={16} stroke={2} />
        Tracked Repositories
      </div>
      <div className="page-subtitle">
        Source of truth for each intern's daily commits.
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <Icon name="folder" size={48} stroke={1.5} />
          <div className="empty-title">No repositories configured.</div>
        </div>
      ) : (
        <div className="repo-grid">
          {rows.map((r) => (
            <div key={r.name} className="repo-card">
              <div className="repo-head">
                <div className="repo-avatar">
                  <Icon name="gitBranch" size={18} stroke={2} />
                </div>
                <div>
                  <h3>{r.name}</h3>
                  <div className="gh-handle">{r.github ? '@' + r.github : '—'}</div>
                </div>
              </div>
              {r.repo && (
                <a href={r.repo} target="_blank" rel="noopener noreferrer">
                  <Icon name="github" size={13} />
                  {r.repo.replace('https://github.com/', '')}
                  <Icon name="externalLink" size={11} />
                </a>
              )}
              <div className="meta-row">
                <StatusBadge active={r.isActive} />
                <ScoreChip score={r.score} cls={scoreClass(r.score)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
