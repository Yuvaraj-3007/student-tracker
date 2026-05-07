import React from 'react';
import Icon from './Icon.jsx';

const NAV = [
  { id: 'overview', icon: 'dashboard', label: "Today's Summary" },
  { id: 'reports', icon: 'fileText', label: 'Progress Reports' },
  { id: 'interns', icon: 'users', label: 'Team View' },
  { id: 'repos', icon: 'folder', label: 'Projects' }
];

export default function Sidebar({ current, onChange, mode }) {
  const modeClass = mode === 'real' ? 'real' : 'mock';
  const modeLabel = mode === 'real' ? 'Live' : 'Sample';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <Icon name="moon" size={20} stroke={2} />
        </div>
        <div className="brand-text">
          <h1>NIGHTWATCH</h1>
          <div className="tagline">Daily Intern Progress</div>
        </div>
      </div>

      <div className="nav-group">
        <div className="nav-group-label">Main</div>
        {NAV.map((n) => (
          <div
            key={n.id}
            className={`nav-item ${current === n.id ? 'active' : ''}`}
            onClick={() => onChange(n.id)}
          >
            <Icon name={n.icon} size={17} />
            <span className="label">{n.label}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div>Data source</div>
        <div className={`mode-pill ${modeClass}`}>
          <Icon name="server" size={11} stroke={2.25} />
          {modeLabel}
        </div>
      </div>
    </aside>
  );
}
