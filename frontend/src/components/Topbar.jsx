import React from 'react';
import Icon from './Icon.jsx';

const TITLES = {
  overview: 'Today at a Glance',
  interns: 'Intern Directory',
  reports: 'Daily Feedback',
  repos: 'GitHub Projects',
  settings: 'Settings'
};

export default function Topbar({ current, search, onSearch, date, onSearchSubmit }) {
  return (
    <header className="topbar">
      <div className="title">{TITLES[current] || ''}</div>
      <div className="search">
        <span className="search-icon">
          <Icon name="search" size={15} />
        </span>
        <input
          type="text"
          value={search}
          placeholder="Search by intern name..."
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearchSubmit();
          }}
        />
      </div>
      <div className="date-pill">
        <Icon name="calendar" size={13} />
        {date || '—'}
      </div>
      <button className="refresh-btn" onClick={() => window.location.reload()}>
        <Icon name="refresh" size={13} stroke={2.25} />
        Refresh
      </button>
    </header>
  );
}
