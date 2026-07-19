// § VI — Live simulation. Real (local) LLM agents generate a secrecy trace;
// the symbolic engine grades it. Runs against local Ollama via the dev proxy
// (see package.json "proxy"). Recordings can be saved/loaded so the deployed
// static site replays runs with no backend.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import AgentStage from '../components/AgentStage';
import SecrecyStrip from '../components/SecrecyStrip';
import Transcript from '../components/Transcript';
import { RUNNER_SCENARIOS, findRunnerScenario } from '../data/runner-scenarios';
import { runSimulation, buildModelShell } from '../engine/agent-runner';
import { listModels } from '../engine/llm';
import { evaluateSecrets } from '../engine/secrets';

const fmtSize = (b) => (b ? `${(b / 1e9).toFixed(1)}G` : '');

export default function Live() {
  const [scenarioId, setScenarioId] = useState(RUNNER_SCENARIOS[0].id);
  const spec = useMemo(() => findRunnerScenario(scenarioId), [scenarioId]);

  const [baseUrl, setBaseUrl] = useState(''); // '' → dev proxy → localhost:11434
  const [models, setModels] = useState([]);
  const [model, setModelName] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  const [sim, setSim] = useState(() => buildModelShell(spec)); // current (accumulating) model
  const [time, setTime] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const abortRef = useRef(null);
  const fileRef = useRef(null);

  // Discover installed models (best-effort; empty if Ollama/proxy unreachable).
  useEffect(() => {
    let alive = true;
    listModels(baseUrl).then((ms) => {
      if (!alive) return;
      setModels(ms);
      setModelName((cur) => cur || ms[0]?.name || 'qwen2.5:14b');
    });
    return () => { alive = false; };
  }, [baseUrl]);

  // Reset the stage when the scenario changes (unless a run is in flight).
  useEffect(() => {
    if (status === 'running') return;
    setSim(buildModelShell(spec));
    setTime(0);
    setStatus('idle');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  const run = async () => {
    setStatus('running');
    setError(null);
    setSim(buildModelShell(spec));
    setTime(0);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await runSimulation(spec, { baseUrl, model, temperature, signal: ctrl.signal }, {
        onTickStart: (t) => { setProgress(`tick ${t + 1}/${spec.ticks}…`); setTime(t); },
        onAgentResult: (t, a) => setProgress(`t${t + 1}: ${a} decided`),
        onTickEnd: (t, m) => { setSim({ ...m }); setTime(t); },
        onDone: (m) => { setSim({ ...m }); setStatus('done'); setProgress('done'); setTime(0); },
      });
    } catch (e) {
      if (e.name === 'AbortError') { setStatus('idle'); setProgress('stopped'); }
      else { setStatus('error'); setError(e.message); }
    } finally {
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const download = () => {
    const blob = new Blob([JSON.stringify(sim, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${spec.id}-run.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const load = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const m = JSON.parse(reader.result);
        setSim(m); setTime(0); setStatus('done'); setError(null);
      } catch (err) { setError('bad recording file: ' + err.message); }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  const hasRun = (sim.transcript || []).length > 0;
  const T = sim.timepoints.length;

  const secretEval = useMemo(() => {
    if (!hasRun) return null;
    try { return evaluateSecrets(sim, sim.propositions[0], 'K', 'N', 'h0', time); }
    catch (e) { return { error: e.message }; }
  }, [sim, time, hasRun]);

  return (
    <div className="page">
      <div className="section-bar">
        <span className="sec-num">§ VI</span>
        <h1 style={{ marginRight: 24 }}>Live</h1>
        <span className="tag-mono faint">scenario:</span>
        {RUNNER_SCENARIOS.map((s) => (
          <button key={s.id}
                  className={'btn sm ' + (s.id === scenarioId ? '' : 'ghost')}
                  disabled={status === 'running'}
                  onClick={() => setScenarioId(s.id)}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Backend / run controls */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <span>Local model · Ollama</span>
          <span className="tag-mono faint">{models.length ? `${models.length} installed` : 'no backend detected'}</span>
        </div>
        <div className="panel-body">
          <div className="live-controls">
            <label className="live-field">
              <span>model</span>
              <select value={model} onChange={(e) => setModelName(e.target.value)} disabled={status === 'running'}>
                {models.length === 0 && <option value={model}>{model || 'qwen2.5:14b'}</option>}
                {models.map((m) => (
                  <option key={m.name} value={m.name}>{m.name} {fmtSize(m.size)}</option>
                ))}
              </select>
            </label>
            <label className="live-field">
              <span>temp</span>
              <input type="range" min="0" max="1.2" step="0.1" value={temperature}
                     disabled={status === 'running'}
                     onChange={(e) => setTemperature(parseFloat(e.target.value))} />
              <span className="tag-mono">{temperature.toFixed(1)}</span>
            </label>
            <label className="live-field">
              <span>endpoint</span>
              <input style={{ width: 190 }} value={baseUrl} placeholder="(dev proxy → :11434)"
                     disabled={status === 'running'}
                     onChange={(e) => setBaseUrl(e.target.value)} />
            </label>
            <div className="spacer" />
            {status !== 'running'
              ? <button className="btn" onClick={run}>▶ run {spec.agents.length}×{spec.ticks}</button>
              : <button className="btn" onClick={stop}>■ stop</button>}
            <button className="btn sm ghost" onClick={download} disabled={!hasRun}>save run</button>
            <button className="btn sm ghost" onClick={() => fileRef.current?.click()}>load run</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={load} />
          </div>
          <div className="live-status">
            {status === 'running' && <span className="tag-mono">⏳ {progress}</span>}
            {status === 'done' && <span className="tag-mono good">✓ {hasRun ? 'trace ready — scrub the timeline' : 'done'}</span>}
            {status === 'error' && (
              <span className="tag-mono bad">
                ✗ {error} — is Ollama running? start with{' '}
                <code>OLLAMA_ORIGINS=* ollama serve</code>, or run the app via <code>npm start</code> (proxy).
              </span>
            )}
            {status === 'idle' && !hasRun && <span className="tag-mono faint">pick a scenario and model, then run. Agents act one turn at a time; each turn is one small call per agent.</span>}
          </div>
        </div>
      </div>

      {/* Playhead */}
      {hasRun && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-body live-playhead">
            <button className="btn sm ghost" onClick={() => setTime((t) => Math.max(0, t - 1))} disabled={time === 0}>◀</button>
            <input type="range" min="0" max={T - 1} step="1" value={time}
                   onChange={(e) => setTime(parseInt(e.target.value, 10))} style={{ flex: 1 }} />
            <button className="btn sm ghost" onClick={() => setTime((t) => Math.min(T - 1, t + 1))} disabled={time === T - 1}>▶</button>
            <span className="tag-mono">t={time} / {T - 1}</span>
          </div>
        </div>
      )}

      <div className="live-grid">
        <div className="col" style={{ gap: 16 }}>
          <AgentStage model={sim} time={time} />
          <SecrecyStrip model={sim} time={time} onSeek={setTime} />
        </div>
        <div className="col" style={{ gap: 16 }}>
          {secretEval && !secretEval.error && (
            <div className="panel">
              <div className="panel-head">
                <span>Secret inspector @ t={time}</span>
                <span className="tag-mono">{secretEval.types.filter((x) => x.holds).length}/6 hold</span>
              </div>
              <div className="panel-body">
                {secretEval.types.map((t) => (
                  <div key={t.id} className={'secret-card ' + (t.holds ? 'holds' : 'fails')}>
                    <div className="secret-card-head">
                      <span><span className="secret-card-id">{t.id}</span>
                        <span className="serif-it muted" style={{ marginLeft: 8 }}>{t.summary}</span></span>
                      <span className={'pip ' + (t.holds ? 'pass' : 'fail')}>{t.holds ? 'HOLDS' : 'FAILS'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Transcript model={sim} time={time} onSeek={setTime} />
        </div>
      </div>
    </div>
  );
}
