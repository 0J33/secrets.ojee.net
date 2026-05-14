// Model editor: add/remove agents, propositions, groups; toggle
// B/I/R/holds assignments at the currently-selected (h, t).

import React, { useState } from 'react';
import { ancestorAt } from '../engine/model';

export default function ModelEditor({ model, setModel, history, time, focusProp, setFocusProp }) {
  const [newAgent, setNewAgent] = useState('');
  const [newProp, setNewProp] = useState('');
  const [newGroup, setNewGroup] = useState('');

  const update = (fn) => {
    const m = JSON.parse(JSON.stringify(model));
    fn(m);
    setModel(m);
  };

  const addAgent = () => {
    const name = newAgent.trim();
    if (!name) return;
    update((m) => {
      if (m.agents.includes(name)) return;
      m.agents.push(name);
      for (const kind of ['B', 'I', 'R']) {
        for (const h of m.histories) {
          for (const t of m.timepoints) {
            m.assignments[kind][h.id][t][name] = {};
            for (const p of m.propositions) {
              m.assignments[kind][h.id][t][name][p] = false;
            }
          }
        }
      }
    });
    setNewAgent('');
  };

  const removeAgent = (a) => update((m) => {
    m.agents = m.agents.filter((x) => x !== a);
    m.groups.forEach((g) => { g.members = g.members.filter((x) => x !== a); });
    for (const kind of ['B', 'I', 'R']) {
      for (const h of m.histories) for (const t of m.timepoints) {
        delete m.assignments[kind][h.id][t][a];
      }
    }
  });

  const addProp = () => {
    const name = newProp.trim();
    if (!name) return;
    update((m) => {
      if (m.propositions.includes(name)) return;
      m.propositions.push(name);
      for (const h of m.histories) for (const t of m.timepoints) {
        m.holds[h.id][t][name] = false;
        for (const a of m.agents) {
          for (const kind of ['B', 'I', 'R']) {
            m.assignments[kind][h.id][t][a][name] = false;
          }
        }
      }
    });
    setNewProp('');
  };

  const removeProp = (p) => update((m) => {
    m.propositions = m.propositions.filter((x) => x !== p);
    for (const h of m.histories) for (const t of m.timepoints) {
      delete m.holds[h.id][t][p];
      for (const a of m.agents) for (const kind of ['B', 'I', 'R']) {
        delete m.assignments[kind][h.id][t][a]?.[p];
      }
    }
    if (focusProp === p) setFocusProp(m.propositions[0] || null);
  });

  const addGroup = () => {
    const name = newGroup.trim();
    if (!name) return;
    update((m) => {
      if (m.groups.find((g) => g.name === name)) return;
      m.groups.push({ name, members: [] });
    });
    setNewGroup('');
  };

  const removeGroup = (name) => update((m) => {
    m.groups = m.groups.filter((g) => g.name !== name);
  });

  const toggleMember = (gname, a) => update((m) => {
    const g = m.groups.find((g) => g.name === gname);
    if (!g) return;
    if (g.members.includes(a)) g.members = g.members.filter((x) => x !== a);
    else g.members.push(a);
  });

  const hAnc = ancestorAt(model, history, time);
  const toggleBIR = (kind, agent, prop) => update((m) => {
    const cur = m.assignments[kind][hAnc][time][agent][prop];
    m.assignments[kind][hAnc][time][agent][prop] = !cur;
  });
  const toggleHolds = (prop) => update((m) => {
    m.holds[hAnc][time][prop] = !m.holds[hAnc][time][prop];
  });

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Model editor</span>
        <span className="tag-mono">@h={history}·t={time}</span>
      </div>
      <div className="panel-body col" style={{ gap: 14 }}>
        {/* Agents */}
        <div>
          <div className="kicker">Agents (A)</div>
          <div className="row" style={{ rowGap: 4 }}>
            {model.agents.map((a) => (
              <span key={a} className="tag-mono row" style={{ gap: 2 }}>
                {a}
                <button className="btn sm ghost" onClick={() => removeAgent(a)} title="remove">×</button>
              </span>
            ))}
          </div>
          <div className="row" style={{ marginTop: 4 }}>
            <input value={newAgent} onChange={(e) => setNewAgent(e.target.value)}
                   placeholder="new agent…" style={{ flex: 1 }}/>
            <button className="btn sm" onClick={addAgent}>add</button>
          </div>
        </div>

        {/* Propositions */}
        <div>
          <div className="kicker">Propositions (P · atomic)</div>
          <div className="row">
            {model.propositions.map((p) => (
              <span key={p} className={'tag-mono row ' + (p === focusProp ? '' : 'muted')} style={{ gap: 2 }}>
                <button className={'btn sm ' + (p === focusProp ? 'active' : 'ghost')}
                        onClick={() => setFocusProp(p)}>{p}</button>
                <button className="btn sm ghost" onClick={() => removeProp(p)} title="remove">×</button>
              </span>
            ))}
          </div>
          <div className="row" style={{ marginTop: 4 }}>
            <input value={newProp} onChange={(e) => setNewProp(e.target.value)}
                   placeholder="new proposition…" style={{ flex: 1 }}/>
            <button className="btn sm" onClick={addProp}>add</button>
          </div>
        </div>

        {/* Groups */}
        <div>
          <div className="kicker">Groups (G)</div>
          {model.groups.map((g) => (
            <div key={g.name} style={{ marginBottom: 4 }}>
              <div className="row" style={{ gap: 4 }}>
                <span className="serif-it">{g.name}</span>
                <button className="btn sm ghost" onClick={() => removeGroup(g.name)} title="remove">×</button>
                <span className="tag-mono faint">{g.members.length} member(s)</span>
              </div>
              <div className="row" style={{ gap: 4, marginTop: 2 }}>
                {model.agents.map((a) => (
                  <button key={a}
                          className={'btn sm ' + (g.members.includes(a) ? 'active' : 'ghost')}
                          onClick={() => toggleMember(g.name, a)}>{a}</button>
                ))}
              </div>
            </div>
          ))}
          <div className="row" style={{ marginTop: 4 }}>
            <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)}
                   placeholder="new group…" style={{ flex: 1 }}/>
            <button className="btn sm" onClick={addGroup}>add</button>
          </div>
        </div>

        {/* Assignments grid for focusProp */}
        {focusProp && (
          <div>
            <div className="kicker">B / I / R · Holds for «{focusProp}» @h={history}·t={time}</div>
            <table className="zebra">
              <thead>
                <tr>
                  <th>agent</th>
                  <th className="center">B</th>
                  <th className="center">I</th>
                  <th className="center">R</th>
                </tr>
              </thead>
              <tbody>
                {model.agents.map((a) => (
                  <tr key={a}>
                    <td>{a}</td>
                    {['B', 'I', 'R'].map((kind) => {
                      const v = model.assignments[kind][hAnc][time][a][focusProp];
                      return (
                        <td key={kind} className="center">
                          <div
                            className={'bir-cell ' + (v ? `${kind}-on` : '')}
                            onClick={() => toggleBIR(kind, a, focusProp)}
                            title={`${kind}(${a}, ${focusProp}) = ${v ? '⊤' : '⊥'}`}
                            style={{ display: 'inline-block', cursor: 'pointer' }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row" style={{ marginTop: 6 }}>
              <span className="tag-mono">HoldsAt({focusProp}, t={time}) =</span>
              <button className="btn sm"
                      onClick={() => toggleHolds(focusProp)}>
                {model.holds[hAnc][time][focusProp] ? '⊤ true' : '⊥ false'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
