import React, { useEffect, useState } from 'react';
import Simulator from './views/Simulator';
import Live from './views/Live';
import Paper from './views/Paper';
import Reference from './views/Reference';
import Guide from './views/Guide';
import Notes from './views/Notes';
import { SCENARIOS } from './data/scenarios';
import { ensureAssignments } from './engine/model';

const VIEWS = [
  { id: 'sim',   num: '§ I',   label: 'Workbench' },
  { id: 'live',  num: '§ II',  label: 'Live' },
  { id: 'paper', num: '§ III', label: 'Paper' },
  { id: 'ref',   num: '§ IV',  label: 'Reference' },
  { id: 'guide', num: '§ V',   label: 'Guide' },
  { id: 'notes', num: '§ VI',  label: 'Notes' },
];

export default function App() {
  const [view, setView] = useState(() => window.location.hash.replace(/^#\/?/, '') || 'sim');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('secrets.theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light';
  });
  const [model, setModel] = useState(() => {
    const m = SCENARIOS[0].build();
    ensureAssignments(m);
    return m;
  });

  useEffect(() => {
    const onHash = () => setView(window.location.hash.replace(/^#\/?/, '') || 'sim');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('secrets.theme', theme);
  }, [theme]);

  const go = (id) => { window.location.hash = '#/' + id; setView(id); };
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <>
      <header className="masthead">
        <div className="masthead-title">
          Log<span className="sub-a">A</span>Sec
        </div>
        <div className="serif-it muted" style={{ fontSize: 14 }}>
          a simulator for the Algebraic Logic of Secrets
        </div>
        <div className="masthead-meta">
          <div className="vol">VOL. I  ·  NO. 1</div>
          <div>Omar Gamal Eldin (2025)</div>
        </div>
      </header>

      <nav className="topnav">
        {VIEWS.map((v) => (
          <button key={v.id}
                  className={'topnav-item' + (view === v.id ? ' active' : '')}
                  onClick={() => go(v.id)}>
            <span className="num">{v.num}</span>{v.label}
          </button>
        ))}
        <div className="topnav-spacer" />
        <div className="topnav-right">
          <span className="topnav-stat">|D|: {model.agents.length + model.propositions.length + model.groups.length + model.timepoints.length + model.histories.length}</span>
          <span className="topnav-stat">·</span>
          <span className="topnav-stat">K-axiom: {model.enableK ? 'on' : 'off'}</span>
          <span className="topnav-stat">·</span>
          <button className="btn sm ghost theme-toggle" onClick={toggleTheme}
                  title={theme === 'dark' ? 'switch to light' : 'switch to dark'}>
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6"/>
                <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <line x1="12" y1="2.5" x2="12" y2="5"/>
                  <line x1="12" y1="19" x2="12" y2="21.5"/>
                  <line x1="2.5" y1="12" x2="5" y2="12"/>
                  <line x1="19" y1="12" x2="21.5" y2="12"/>
                  <line x1="5.3" y1="5.3" x2="7" y2="7"/>
                  <line x1="17" y1="17" x2="18.7" y2="18.7"/>
                  <line x1="5.3" y1="18.7" x2="7" y2="17"/>
                  <line x1="17" y1="7" x2="18.7" y2="5.3"/>
                </g>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
                      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              </svg>
            )}
            <span>{theme === 'dark' ? 'light' : 'dark'}</span>
          </button>
        </div>
      </nav>

      <main>
        {view === 'sim'   && <Simulator model={model} setModel={setModel} />}
        {view === 'live'  && <Live />}
        {view === 'paper' && <Paper />}
        {view === 'ref'   && <Reference />}
        {view === 'guide' && <Guide />}
        {view === 'notes' && <Notes />}
      </main>

      <footer className="footer">
        <span>Log<sub>A</sub>Sec simulator — Omar Gamal Eldin, <em>Algebraic Logic of Secrets</em> (GUC, 2025)</span>
        <a href="https://ojee.net" target="_blank" rel="noreferrer">ojee.net</a>
      </footer>
    </>
  );
}
