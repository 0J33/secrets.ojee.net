import React, { useMemo, useState } from 'react';
import Graph from '../components/Graph';
import Timeline from '../components/Timeline';
import ModelEditor from '../components/ModelEditor';
import { Tex } from '../components/Math';
import { checkAllAxioms } from '../engine/axioms';
import { checkAllTheorems } from '../engine/theorems';
import { evaluateSecrets } from '../engine/secrets';
import { parseFormula, formatFormula } from '../engine/parser';
import { Env, evalTerm, evalAtAll } from '../engine/evaluator';
import { ensureAssignments } from '../engine/model';
import { SCENARIOS } from '../data/scenarios';

export default function Simulator({ model, setModel }) {
  const [history, setHistory] = useState(model.histories[0]?.id || 'h0');
  const [time, setTime] = useState(model.timepoints[0] ?? 0);
  const [focusProp, setFocusProp] = useState(model.propositions[0] || null);

  const [phi, setPhi] = useState(model.propositions[0] || '');
  const [kGroup, setKGroup] = useState(model.groups[0]?.name || '');
  const [nGroup, setNGroup] = useState(model.groups[1]?.name || model.groups[0]?.name || '');

  const [formulaSrc, setFormulaSrc] = useState('B(alice, p) -> R(alice, p)');
  const [formulaResult, setFormulaResult] = useState(null);

  // Re-fill assignment tables whenever something structural changes.
  const safeModel = useMemo(() => {
    const m = JSON.parse(JSON.stringify(model));
    ensureAssignments(m);
    return m;
  }, [model]);

  const axiomReport = useMemo(() => checkAllAxioms(safeModel), [safeModel]);
  const theoremReport = useMemo(() => checkAllTheorems(safeModel), [safeModel]);
  const secretEval = useMemo(() => {
    if (!phi || !kGroup || !nGroup) return null;
    try { return evaluateSecrets(safeModel, phi, kGroup, nGroup, history, time); }
    catch (e) { return { error: e.message }; }
  }, [safeModel, phi, kGroup, nGroup, history, time]);

  const evalFormula = () => {
    try {
      const ast = parseFormula(formulaSrc);
      const env = new Env(safeModel, history, time);
      const v = evalTerm(ast, env);
      const all = evalAtAll(ast, safeModel);
      setFormulaResult({ ast, value: v, pretty: formatFormula(ast), all });
    } catch (e) {
      setFormulaResult({ error: e.message });
    }
  };

  const loadScenario = (id) => {
    const s = SCENARIOS.find((x) => x.id === id);
    if (!s) return;
    const m = s.build();
    setModel(m);
    setHistory(m.histories[0].id);
    setTime(m.timepoints[0]);
    setFocusProp(m.propositions[0] || null);
    setPhi(m.propositions[0] || '');
    setKGroup(m.groups[0]?.name || '');
    setNGroup(m.groups[1]?.name || m.groups[0]?.name || '');
  };

  const addTimepoint = () => {
    const m = JSON.parse(JSON.stringify(safeModel));
    const last = Math.max(...m.timepoints);
    m.timepoints.push(last + 1);
    ensureAssignments(m);
    setModel(m);
  };
  const addHistory = () => {
    const m = JSON.parse(JSON.stringify(safeModel));
    const id = `h${m.histories.length}`;
    const branchTime = time;
    m.histories.push({ id, parent: { historyId: history, branchTime } });
    ensureAssignments(m);
    // pre-branch values copy from parent
    for (const kind of ['B', 'I', 'R']) {
      for (const t of m.timepoints) {
        if (t < branchTime) {
          for (const a of m.agents) for (const p of m.propositions) {
            m.assignments[kind][id][t][a][p] = m.assignments[kind][history][t][a][p];
          }
        }
      }
    }
    for (const t of m.timepoints) {
      if (t < branchTime) {
        for (const p of m.propositions) {
          m.holds[id][t][p] = m.holds[history][t][p];
        }
      }
    }
    setModel(m);
    setHistory(id);
  };

  const toggleK = () => {
    const m = { ...safeModel, enableK: !safeModel.enableK };
    setModel(m);
  };

  return (
    <div className="page">
      {/* Scenario picker / global controls */}
      <div className="section-bar">
        <span className="sec-num">§ 0</span>
        <h1 style={{ marginRight: 24 }}>Workbench</h1>
        <span className="tag-mono faint">scenario:</span>
        {SCENARIOS.map((s) => (
          <button key={s.id} className="btn sm ghost" onClick={() => loadScenario(s.id)}>
            {s.name}
          </button>
        ))}
        <div className="spacer" />
        <label className="toggle">
          <input type="checkbox" checked={safeModel.enableK} onChange={toggleK} />
          K axiom (B1) enabled
        </label>
      </div>

      <div className="workbench">
        {/* LEFT — model editor */}
        <ModelEditor
          model={safeModel}
          setModel={setModel}
          history={history}
          time={time}
          focusProp={focusProp}
          setFocusProp={setFocusProp}
        />

        {/* CENTER — graph + timeline + formula eval */}
        <div className="col" style={{ gap: 16 }}>
          <Graph
            model={safeModel}
            history={history}
            time={time}
            proposition={focusProp}
          />

          <Timeline
            model={safeModel}
            history={history}
            time={time}
            onSelect={(h, t) => { setHistory(h); setTime(t); }}
            onAddHistory={addHistory}
            onAddTimepoint={addTimepoint}
          />

          {/* Formula evaluator */}
          <div className="panel">
            <div className="panel-head">
              <span>Formula evaluator</span>
              <span className="tag-mono faint">enter a Log<sub>A</sub>Sec term</span>
            </div>
            <div className="panel-body col">
              <div className="row">
                <input
                  style={{ flex: 1, fontSize: 13 }}
                  value={formulaSrc}
                  onChange={(e) => setFormulaSrc(e.target.value)}
                  placeholder="e.g. B(alice, p) -> R(alice, p)"
                />
                <button className="btn" onClick={evalFormula}>evaluate</button>
              </div>
              <div className="tag-mono faint">
                operators: ¬ ~ ! · ∧ /\ & · ∨ \/ | · → -&gt; · ↔ &lt;-&gt; · □ box · ◇ diamond · ⧆ pastbox · ∀ forall x:S. · ∃ exists x:S. · ⊔ ⊓
              </div>
              {formulaResult && formulaResult.error && (
                <div className="formula-box" style={{ color: 'var(--bad)' }}>
                  parse error: {formulaResult.error}
                </div>
              )}
              {formulaResult && !formulaResult.error && (
                <>
                  <div className="formula-box">
                    <div className="label">parsed</div>
                    <div>{formulaResult.pretty}</div>
                  </div>
                  <div className="formula-box">
                    <div className="label">value @ h={history}, t={time}</div>
                    <div style={{ fontSize: 16 }}>{formulaResult.value ? '⊤  true' : '⊥  false'}</div>
                  </div>
                  <div className="formula-box">
                    <div className="label">value at every index point</div>
                    <table>
                      <thead>
                        <tr><th>history</th><th>t</th><th>⟦ϕ⟧</th></tr>
                      </thead>
                      <tbody>
                        {formulaResult.all.map((row, i) => (
                          <tr key={i}>
                            <td>{row.h}</td>
                            <td>{row.t}</td>
                            <td>{row.value == null ? '—' : row.value ? '⊤' : '⊥'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — secret inspector + axiom/theorem report */}
        <div className="right-rail col" style={{ gap: 16 }}>
          {/* Secret inspector */}
          <div className="panel">
            <div className="panel-head">
              <span>Secret inspector</span>
              <span className="tag-mono">§2.2.3</span>
            </div>
            <div className="panel-body col">
              <div className="row">
                <span className="tag-mono">ϕ</span>
                <select value={phi} onChange={(e) => setPhi(e.target.value)}>
                  {safeModel.propositions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="row">
                <span className="tag-mono">K (keepers)</span>
                <select value={kGroup} onChange={(e) => setKGroup(e.target.value)}>
                  {safeModel.groups.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
                </select>
              </div>
              <div className="row">
                <span className="tag-mono">N (nescients)</span>
                <select value={nGroup} onChange={(e) => setNGroup(e.target.value)}>
                  {safeModel.groups.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
                </select>
              </div>
              {secretEval && !secretEval.error && (
                <div>
                  {secretEval.types.map((t) => (
                    <div key={t.id} className={'secret-card ' + (t.holds ? 'holds' : 'fails')}>
                      <div className="secret-card-head">
                        <span>
                          <span className="secret-card-id">{t.id}</span>
                          <span className="serif-it muted" style={{ marginLeft: 8 }}>{t.summary}</span>
                        </span>
                        <span className={'pip ' + (t.holds ? 'pass' : 'fail')}>{t.holds ? 'HOLDS' : 'FAILS'}</span>
                      </div>
                      {t.clauses && t.clauses.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {t.clauses.map((c, i) => (
                            c.parts
                              ? c.parts.map((p, j) => (
                                  <div key={`${i}-${j}`} className="clause">
                                    <span className={'mark ' + (p.value ? 'ok' : 'no')}>{p.value ? '✓' : '✗'}</span>
                                    <span>{p.label} (k={c.keeper})</span>
                                  </div>
                                ))
                              : (
                                <div key={i} className="clause">
                                  <span className={'mark ' + (c.value ? 'ok' : 'no')}>{c.value ? '✓' : '✗'}</span>
                                  <span>{c.label}</span>
                                </div>
                              )
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {secretEval && secretEval.error && (
                <div className="formula-box" style={{ color: 'var(--bad)' }}>{secretEval.error}</div>
              )}
            </div>
          </div>

          {/* Axiom report */}
          <div className="panel">
            <div className="panel-head">
              <span>Axiom report</span>
              <span className="tag-mono">{axiomReport.filter((r) => r.result.status === 'pass').length}/{axiomReport.length} pass</span>
            </div>
            <div className="panel-body" style={{ maxHeight: 340, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr><th>id</th><th>schema</th><th className="right">status</th></tr>
                </thead>
                <tbody>
                  {axiomReport.map(({ axiom, result }) => (
                    <tr key={axiom.id}>
                      <td>{axiom.id}</td>
                      <td><Tex src={axiom.latex} /></td>
                      <td className="right">
                        {result.status === 'pass' && <span className="pip pass">✓</span>}
                        {result.status === 'fail' && (
                          <span className="pip fail" title={JSON.stringify(result.counterexamples)}>✗ × {result.counterexamples.length}</span>
                        )}
                        {result.status === 'disabled' && <span className="pip disabled">off</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Theorem report */}
          <div className="panel">
            <div className="panel-head">
              <span>Theorem report</span>
              <span className="tag-mono">{theoremReport.filter((r) => r.result.status === 'pass').length}/{theoremReport.length}</span>
            </div>
            <div className="panel-body" style={{ maxHeight: 340, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr><th>id</th><th>statement</th><th className="right">status</th></tr>
                </thead>
                <tbody>
                  {theoremReport.map(({ theorem, result }) => (
                    <tr key={theorem.id}>
                      <td>{theorem.id}</td>
                      <td><Tex src={theorem.latex} /></td>
                      <td className="right">
                        {result.status === 'pass' && <span className="pip pass">✓</span>}
                        {result.status === 'fail' && <span className="pip fail">✗</span>}
                        {result.proofBroken && <span className="pip warn" title="Proof depends on B1 (K), which is disabled">⚠ proof</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
