// § II — Runs: recorded LLM conversations, graded turn by turn, plus the
// local runner that produces them.
//
// The deployed site is a static file with no backend, so it cannot call a
// model: the recordings below are baked into the bundle and replay here.
// With a local Ollama behind the dev proxy (npm start), the same page also
// generates new runs — and can save/load them as the same JSON shape.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import AgentStage from '../components/AgentStage';
import SecrecyStrip from '../components/SecrecyStrip';
import Transcript from '../components/Transcript';
import { RECORDINGS } from '../data/recordings';
import { RUNNER_SCENARIOS, findRunnerScenario } from '../data/runner-scenarios';
import { runSimulation } from '../engine/agent-runner';
import { checkAllAxioms } from '../engine/axioms';
import { checkAllTheorems } from '../engine/theorems';
import { listModels } from '../engine/llm';
import { evaluateSecrets } from '../engine/secrets';
import { secrecyMatrix, runOutcome, IDS } from '../engine/summarize';

const fmtSize = (b) => (b ? `${(b / 1e9).toFixed(1)}G` : '');

function MiniStrip({ matrix }) {
  if (!matrix.length) return <span className="tag-mono faint">—</span>;
  const cols = matrix.map((r) => r.holds.length);
  const width = Math.max(...cols, 1);
  return (
    <div className="strip mini"
         style={{ gridTemplateColumns: `repeat(${width}, 9px)` }}
         title={matrix.map((r) => `t${r.t}: ${IDS.filter((_, i) => r.holds[i]).join(' ') || 'none'}`).join('\n')}>
      {IDS.map((id, ri) => (
        <React.Fragment key={id}>
          {matrix.map((row) => (
            <span key={`${id}-${row.t}`}
                  className={'mc ' + (row.holds[ri] ? 'y' : row.holds[ri] === false ? 'n' : 'void')} />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function Outcome({ outcome }) {
  if (!outcome) return null;
  return (
    <span className={'pip ' + (outcome.kind === 'held' ? 'pass' : 'fail')}>
      {outcome.kind === 'held' && <Icon name="check" size={11} />}
      {outcome.kind !== 'held' && <Icon name="cross" size={11} />}
      {outcome.label}
    </span>
  );
}

export default function Runs() {
  // ── the run being replayed ──────────────────────────────────────────
  const [selected, setSelected] = useState(RECORDINGS[0]?.id || null);
  const [loadedRun, setLoadedRun] = useState(null);
  const [liveRun, setLiveRun] = useState(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  // ── local runner state ──────────────────────────────────────────────
  const [scenarioId, setScenarioId] = useState(RUNNER_SCENARIOS[0].id);
  const spec = useMemo(() => findRunnerScenario(scenarioId), [scenarioId]);
  const [baseUrl, setBaseUrl] = useState('');
  const [models, setModels] = useState([]);
  const [model, setModelName] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const abortRef = useRef(null);
  const fileRef = useRef(null);

  const pool = useMemo(
    () => [...RECORDINGS, loadedRun, liveRun].filter(Boolean),
    [loadedRun, liveRun],
  );
  const active = pool.find((r) => r.id === selected) || RECORDINGS[0] || null;
  const model_ = active?.model || null;
  const T = model_?.timepoints?.length || 0;

  const outcome = useMemo(() => (model_ ? runOutcome(model_) : null), [model_]);

  // Per-run read-outs, computed once per pool — the index re-renders on every
  // playhead tick, and regrading all six runs each time would be wasteful.
  const poolStats = useMemo(() => {
    const m = new Map();
    for (const r of pool) m.set(r.id, { matrix: secrecyMatrix(r.model), outcome: runOutcome(r.model) });
    return m;
  }, [pool]);

  // Discover installed models — empty on the deployed site (no backend).
  useEffect(() => {
    let alive = true;
    listModels(baseUrl).then((ms) => {
      if (!alive) return;
      setModels(ms);
      setModelName((cur) => cur || ms[0]?.name || '');
    });
    return () => { alive = false; };
  }, [baseUrl]);

  // New run selected → back to the first turn.
  useEffect(() => { setTime(0); setPlaying(false); }, [selected]);

  // Autoplay, one turn every 1.4s, stopping on the last.
  useEffect(() => {
    if (!playing) return undefined;
    if (time >= T - 1) { setPlaying(false); return undefined; }
    const id = setTimeout(() => setTime((t) => Math.min(T - 1, t + 1)), 1400);
    return () => clearTimeout(id);
  }, [playing, time, T]);

  const secretEval = useMemo(() => {
    if (!model_ || !T) return null;
    try {
      return evaluateSecrets(model_, model_.propositions[0], 'K', 'N', 'h0', Math.min(time, T - 1));
    } catch (e) { return { error: e.message }; }
  }, [model_, time, T]);

  const hasBackend = models.length > 0;

  const run = async () => {
    setStatus('running');
    setError(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const m = await runSimulation(
        spec,
        { baseUrl, model, temperature, signal: ctrl.signal },
        {
          onTickStart: (t) => { setProgress(`turn ${t + 1}/${spec.ticks}…`); },
          onAgentResult: (t, a) => setProgress(`t${t + 1}: ${a} decided`),
        },
      );
      const ax = checkAllAxioms(m);
      const th = checkAllTheorems(m);
      const graded = (rs) => `${rs.filter((r) => r.result.status !== 'fail').length}/${rs.length}`;
      const rec = {
        id: 'live',
        title: `${spec.name} — recorded just now`,
        blurb: spec.description,
        meta: {
          scenario: spec.id, scenarioName: spec.name, phi: spec.phi,
          model: model || 'local model', temperature, ticks: spec.ticks,
          recorded: new Date().toISOString().slice(0, 10),
          outcome: runOutcome(m).label, note: 'recorded in this browser session',
          engine: { axioms: graded(ax), theorems: graded(th) },
          live: true,
        },
        model: m,
      };
      setLiveRun(rec);
      setSelected('live');
      setStatus('done');
      setProgress('done');
    } catch (e) {
      if (e.name === 'AbortError') { setStatus('idle'); setProgress('stopped'); }
      else { setStatus('error'); setError(e.message); }
    } finally {
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const download = () => {
    if (!active) return;
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${active.id || 'run'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const load = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rec = JSON.parse(reader.result);
        if (!rec.model || !rec.model.timepoints) throw new Error('no model inside');
        const wrap = {
          id: rec.id || 'loaded',
          title: rec.title || f.name.replace(/\.json$/i, ''),
          blurb: rec.blurb || rec.meta?.note || 'loaded from a file',
          meta: rec.meta || { scenarioName: '—', model: '—', temperature: 0, recorded: '—' },
          model: rec.model,
        };
        setLoadedRun(wrap);
        setSelected(wrap.id);
      } catch (err) { setError('not a run file: ' + err.message); }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  return (
    <div className="page">
      <div className="section-bar">
        <span className="sec-num">§ II</span>
        <h1 style={{ marginRight: 16 }}>Runs</h1>
        <span className="serif-it muted">real conversations, graded turn by turn</span>
        <div className="spacer" />
        <a className="btn ghost sm" href="#/guide">
          <Icon name="book" size={13} /> how this works
        </a>
      </div>

      <div className="run-intro">
        <p>
          Each run is a conversation an actual language model had — one turn at a time, playing the
          keepers and the outsider — with every decision written down as a fact in the model. The six
          grades beside each row are computed by the same engine that backs the Workbench: pick a
          run, press play, and watch what happens to a secret when somebody talks.
        </p>
      </div>

      {/* ── Recorded runs ─────────────────────────────────────────────── */}
      <div className="panel run-index">
        <div className="panel-head">
          <span>Recorded runs</span>
          <span className="tag-mono faint">
            {RECORDINGS.length} baked into this page · recorded locally with Ollama
          </span>
        </div>
        <div className="table-scroll">
          <table className="run-table">
            <thead>
              <tr>
                <th>run</th>
                <th>scenario</th>
                <th>model</th>
                <th>secrecy · S₀–S₅ × turn</th>
                <th className="right">outcome</th>
              </tr>
            </thead>
            <tbody>
              {pool.map((r) => {
                const sel = active?.id === r.id;
                return (
                  <tr key={r.id} className={sel ? 'sel' : ''}
                      onClick={() => setSelected(r.id)}>
                    <td data-label="run">
                      <button type="button" className="run-title" onClick={(ev) => { ev.stopPropagation(); setSelected(r.id); }}>
                        {r.title}
                      </button>
                      <div className="run-blurb">{r.blurb}</div>
                    </td>
                    <td className="nowrap" data-label="scenario">{r.meta.scenarioName}</td>
                    <td className="nowrap tag-mono" data-label="model">
                      {r.meta.model}
                      <span className="faint"> · {r.meta.temperature}</span>
                    </td>
                    <td data-label="secrecy S₀–S₅ × turn"><MiniStrip matrix={poolStats.get(r.id)?.matrix || []} /></td>
                    <td className="right nowrap" data-label="outcome"><Outcome outcome={poolStats.get(r.id)?.outcome} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="panel-foot">
          <span className="tag-mono faint">
            <span className="mc-demo"><span className="mc y" /> all six grades hold
            <span className="mc n" /> that grade has fallen</span> · rows S₀–S₅, columns are turns
          </span>
          <div className="spacer" />
          <button className="btn sm ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={12} /> open run file
          </button>
          <button className="btn sm ghost" onClick={download} disabled={!active}>
            <Icon name="download" size={12} /> save run
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={load} />
        </div>
      </div>

      {/* ── Replay ────────────────────────────────────────────────────── */}
      {active && (
        <>
          <div className="run-caption">
            <h2>{active.title}</h2>
            <p>{active.blurb}</p>
            <div className="run-facts">
              <span>{active.meta.scenarioName}</span>
              <span>{active.meta.model} · temp {active.meta.temperature}</span>
              <span>recorded {active.meta.recorded}</span>
              <span>{active.meta.ticks} turns · {model_.agents.length} agents</span>
              <span title="Axioms and theorems evaluated on this model. T2, T4 and T7 read B(a,φ) → R(a,φ), which is false on any model where somebody believes φ from the start — the Workbench's own scenarios fail the same three.">
                axioms {active.meta.engine?.axioms || '—'} · theorems {active.meta.engine?.theorems || '—'}
              </span>
            </div>
          </div>

          <div className="panel playhead">
            <div className="panel-body live-playhead">
              <button className="btn sm" onClick={() => setPlaying((p) => !p)} disabled={T < 2}
                      title={playing ? 'pause' : 'play the run'}>
                <Icon name={playing ? 'pause' : 'play'} size={12} />
              </button>
              <button className="btn sm ghost" onClick={() => setTime(0)} disabled={time === 0}
                      title="first turn">
                <Icon name="prev" size={12} />
              </button>
              <input type="range" min="0" max={Math.max(0, T - 1)} step="1" value={Math.min(time, Math.max(0, T - 1))}
                     onChange={(e) => { setPlaying(false); setTime(parseInt(e.target.value, 10)); }}
                     style={{ flex: 1 }} aria-label="turn" />
              <button className="btn sm ghost" onClick={() => setTime(T - 1)} disabled={time >= T - 1}
                      title="last turn">
                <Icon name="next" size={12} />
              </button>
              <span className="tag-mono">t={Math.min(time, Math.max(0, T - 1))} / {Math.max(0, T - 1)}</span>
            </div>
          </div>

          <div className="live-grid">
            <div className="col" style={{ gap: 16 }}>
              <AgentStage model={model_} time={Math.min(time, Math.max(0, T - 1))} />
              <SecrecyStrip model={model_} time={Math.min(time, Math.max(0, T - 1))} onSeek={(t) => { setPlaying(false); setTime(t); }} />
              {outcome && (
                <div className="run-verdict">
                  <Outcome outcome={outcome} />
                  <span className="muted serif-it">
                    {outcome.kind === 'held'
                      ? 'not one of the six grades ever falls — the secret survives every turn'
                      : `all six grades fall together at the leak: S₁–S₅ each include S₀, so a revealed secret fails them all at once`}
                  </span>
                </div>
              )}
            </div>
            <div className="col" style={{ gap: 16 }}>
              {secretEval && !secretEval.error && (
                <div className="panel">
                  <div className="panel-head">
                    <span>Secret inspector · t={Math.min(time, Math.max(0, T - 1))}</span>
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
              <Transcript model={model_} time={Math.min(time, Math.max(0, T - 1))}
                          onSeek={(t) => { setPlaying(false); setTime(t); }} />
            </div>
          </div>
        </>
      )}

      {!active && (
        <div className="panel">
          <div className="panel-body center muted">
            No recordings yet. They are generated on one machine and baked into the build —
            see <a href="#/guide">the guide</a> for how to make your own.
          </div>
        </div>
      )}

      {/* ── Local runner ──────────────────────────────────────────────── */}
      <div className="panel local-runner">
        <div className="panel-head">
          <span>Record a new run</span>
          <span className="tag-mono faint">
            {hasBackend ? `${models.length} local model(s) detected` : 'needs a local model'}
          </span>
        </div>
        <div className="panel-body">
          {!hasBackend ? (
            <div className="local-note">
              <p>
                This site is a static file with no server behind it, so it cannot reach a model of
                its own — the runs above were generated on one machine with{' '}
                <a href="https://ollama.com" target="_blank" rel="noreferrer">Ollama</a> and shipped
                with the page. Nothing is missing: replay, scrubbing and every grade work here.
              </p>
              <p>To record your own, run it locally:</p>
              <pre>{`git clone https://github.com/0J33/secrets.ojee.net
cd secrets.ojee.net && npm install
OLLAMA_ORIGINS=* ollama serve   # already running? skip this
npm start                        # dev server, proxies to :11434
node scripts/record.js           # or press "run" here`}</pre>
              <p className="muted">
                The dev server proxies <code>/api</code> to your Ollama, so no CORS setup is needed;
                <code style={{ marginLeft: 4 }}>scripts/record.js</code> records and verifies runs in
                bulk and writes them to <code style={{ marginLeft: 4 }}>src/data/runs/</code>.
              </p>
            </div>
          ) : (
            <>
              <div className="live-controls">
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
              <div className="live-controls" style={{ marginTop: 10 }}>
                <label className="live-field">
                  <span>model</span>
                  <select value={model} onChange={(e) => setModelName(e.target.value)} disabled={status === 'running'}>
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
                  <input style={{ width: 170 }} value={baseUrl} placeholder="(dev proxy → :11434)"
                         disabled={status === 'running'}
                         onChange={(e) => setBaseUrl(e.target.value)} />
                </label>
                <div className="spacer" />
                {status !== 'running'
                  ? <button className="btn" onClick={run}><Icon name="play" size={12} /> run {spec.agents.length}×{spec.ticks}</button>
                  : <button className="btn" onClick={stop}><Icon name="stop" size={12} /> stop</button>}
              </div>
              <div className="live-status">
                {status === 'running' && <span className="tag-mono">{progress}</span>}
                {status === 'done' && <span className="tag-mono good"><Icon name="check" size={12} /> recorded — it is in the table above</span>}
                {status === 'error' && (
                  <span className="tag-mono bad">
                    <Icon name="cross" size={12} /> {error} — is Ollama running?
                  </span>
                )}
                {status === 'idle' && (
                  <span className="tag-mono faint">
                    each turn is one small call per agent; {spec.agents.length} agents × {spec.ticks} turns
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
