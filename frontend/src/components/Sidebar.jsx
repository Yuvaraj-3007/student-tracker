import React from 'react';
import Icon from './Icon.jsx';

const NAV = [
  { id: 'overview', icon: 'dashboard', label: 'Overview' },
  { id: 'interns', icon: 'users', label: 'Interns' },
  { id: 'reports', icon: 'fileText', label: 'Reports' },
  { id: 'repos', icon: 'folder', label: 'Repositories' }
];

export default function Sidebar({ current, onChange, mode }) {
  const modeUpper = (mode || 'mock').toUpperCase();
  const modeClass = mode === 'real' ? 'real' : 'mock';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <Icon name="moon" size={20} stroke={2} />
        </div>
        <div className="brand-text">
          <h1>NIGHTWATCH</h1>
          <div className="tagline">Intern EOD Agent</div>
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
        <div>System mode</div>
        <div className={`mode-pill ${modeClass}`}>
          <Icon name="server" size={11} stroke={2.25} />
          {modeUpper}
        </div>
      </div>
    </aside>
  );
}
