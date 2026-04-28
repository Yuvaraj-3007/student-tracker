import React, { useMemo, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Overview from './views/Overview.jsx';
import Interns from './views/Interns.jsx';
import Reports from './views/Reports.jsx';
import Repos from './views/Repos.jsx';
import { useData, mergeRows } from './hooks/useData.js';

export default function App() {
  const { data, loading, error } = useData();
  const [view, setView] = useState('overview');
  const [search, setSearch] = useState('');

  const payload = data || {};
  const log = payload.log || null;
  const students = payload.students || [];
  const history = payload.history || {};
  const results = (log && log.data && log.data.results) || [];
  const mode = (log && log.data && log.data.mode) || 'mock';
  const date = log ? (log.fileName || '').replace('.json', '') : '—';

  const rows = useMemo(() => mergeRows(results, students), [results, students]);

  const onSearchSubmit = () => {};

  const onSearchChange = (value) => setSearch(value);

  return (
    <div className="app">
      <Sidebar current={view} onChange={setView} mode={mode} />
      <div className="main">
        <Topbar
          current={view}
          search={search}
          onSearch={onSearchChange}
          onSearchSubmit={onSearchSubmit}
          date={date}
        />
        <main className="content">
          {loading && <div className="empty-state">Loading dashboard data…</div>}
          {error && !loading && (
            <div className="empty-state">
              <div className="icon">⚠️</div>
              <div>Could not load <code>data.json</code>: {error}</div>
              <div style={{ marginTop: 10 }}>
                Run <code>npm run dashboard:data</code> from the repo root first.
              </div>
            </div>
          )}
          {!loading && !error && (
            <>
              {view === 'overview' && <Overview rows={rows} />}
              {view === 'interns' && <Interns rows={rows} search={search} />}
              {view === 'reports' && <Reports rows={rows} history={history} search={search} />}
              {view === 'repos' && <Repos rows={rows} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
