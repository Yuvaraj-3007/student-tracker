import React from 'react';
import Icon from '../components/Icon.jsx';

export default function Settings({ mode, runAt, date, fileName, configuredCount }) {
  const items = [
    ['Codename', 'moon', 'NIGHTWATCH'],
    ['Mode', 'server', (mode || 'mock').toUpperCase()],
    ['Last Run', 'clock', runAt || '(no run yet)'],
    ['Report Date', 'calendar', date || '—'],
    ['Log File', 'fileText', fileName ? `logs/${fileName}` : '—'],
    ['Configured Interns', 'users', String(configuredCount || 0)],
    ['Cron', 'clock', '0 20 * * *  (Asia/Kolkata, 8 PM IST)'],
    ['Teacher Format', 'award', 'Enabled (step-by-step feedback)']
  ];

  return (
    <section className="view">
      <div className="page-title">
        <Icon name="settings" size={16} stroke={2} />
        Settings
      </div>
      <div className="page-subtitle">
        Runtime configuration at the time of the last dashboard build.
      </div>
      <div className="section settings-list">
        <dl>
          {items.map(([k, iconName, v]) => (
            <React.Fragment key={k}>
              <dt>
                <Icon name={iconName} size={12} />
                {k}
              </dt>
              <dd>{v}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    </section>
  );
}
