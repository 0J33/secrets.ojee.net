// Animated agent stage for the live simulator.
//
// Nodes = agents, coloured by role (keeper / outsider). A filled marker means
// the agent KNOWS φ at the current tick — so you watch knowledge spread. Group
// membership is drawn as soft hulls. When a disclosure fires at the current
// tick, an animated edge pulses from speaker to listener(s): red if it leaked
// φ to an outsider, amber for a risky hint.

import React, { useMemo } from 'react';

const W = 720;
const H = 460;
const NODE_R = 24;
const HULL_PAD = 18;

function hull(pts) {
  if (pts.length === 1) {
    const p = pts[0], r = NODE_R + HULL_PAD;
    return { kind: 'rect', x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r, lx: p.x, ly: p.y - r - 6 };
  }
  if (pts.length === 2) {
    const minX = Math.min(pts[0].x, pts[1].x) - NODE_R - HULL_PAD;
    const maxX = Math.max(pts[0].x, pts[1].x) + NODE_R + HULL_PAD;
    const minY = Math.min(pts[0].y, pts[1].y) - NODE_R - HULL_PAD;
    const maxY = Math.max(pts[0].y, pts[1].y) + NODE_R + HULL_PAD;
    return { kind: 'rect', x: minX, y: minY, w: maxX - minX, h: maxY - minY, lx: (minX + maxX) / 2, ly: minY - 6 };
  }
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const exp = pts.map((p) => {
    const dx = p.x - cx, dy = p.y - cy, len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * (NODE_R + HULL_PAD), y: p.y + (dy / len) * (NODE_R + HULL_PAD) };
  }).map((p) => ({ ...p, ang: Math.atan2(p.y - cy, p.x - cx) })).sort((a, b) => a.ang - b.ang);
  const d = exp.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
  return { kind: 'path', d, lx: cx, ly: Math.min(...exp.map((p) => p.y)) - 6 };
}

export default function AgentStage({ model, time }) {
  const positions = useMemo(() => {
    const pos = {};
    const n = model.agents.length || 1;
    const cx = W / 2, cy = H / 2 - 10, rad = Math.min(150, 60 + n * 22);
    model.agents.forEach((a, i) => {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      pos[a] = { x: cx + rad * Math.cos(ang), y: cy + rad * Math.sin(ang) };
    });
    return pos;
  }, [model.agents]);

  const roles = model.roles || {};
  const knownAt = model.knownAt || {};
  const knows = (a) => a in knownAt && knownAt[a] <= time;

  // Only hull the semantic circles (K / N and any named subgroups).
  const hulls = (model.groups || []).map((g, gi) => {
    const pts = g.members.map((mn) => positions[mn]).filter(Boolean);
    if (!pts.length) return null;
    return { ...hull(pts), name: g.name, gi, role: g.name === 'K' ? 'keeper' : g.name === 'N' ? 'nescient' : 'other' };
  }).filter(Boolean);

  const leaks = (model.events || []).filter((e) => e.t === time);

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Agents · Groups · Leakage</span>
        <span className="tag-mono">t={time} · φ={model.propositions[0]}</span>
      </div>
      <svg className="graph-svg stage-svg" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <marker id="leakhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>

        {hulls.map((hl) => (
          <g key={hl.name} className={`stage-hull ${hl.role}`}>
            {hl.kind === 'rect'
              ? <rect x={hl.x} y={hl.y} width={hl.w} height={hl.h} rx="10" />
              : <path d={hl.d} />}
            <text x={hl.lx} y={hl.ly} textAnchor="middle" className="stage-hull-label">{hl.name}</text>
          </g>
        ))}

        {/* Leak / hint edges for this tick */}
        {leaks.flatMap((e, ei) => {
          const from = positions[e.from];
          const tos = (e.to || []).filter((n) => n !== e.from);
          return tos.map((toName, ti) => {
            const to = positions[toName];
            if (!from || !to) return null;
            const leaked = e.leaked && roles[toName] === 'nescient';
            const cls = e.type === 'reveal' && leaked ? 'leak' : 'hint';
            const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy) || 1;
            const ux = dx / len, uy = dy / len, trim = NODE_R + 4;
            return (
              <line key={`${ei}-${ti}`} className={`stage-edge ${cls}`}
                    x1={from.x + ux * trim} y1={from.y + uy * trim}
                    x2={to.x - ux * trim} y2={to.y - uy * trim}
                    markerEnd="url(#leakhead)" />
            );
          });
        })}

        {/* Agent nodes */}
        {model.agents.map((a) => {
          const p = positions[a];
          const role = roles[a] || 'nescient';
          const k = knows(a);
          return (
            <g key={a} className={`stage-node ${role} ${k ? 'knows' : 'blind'}`} transform={`translate(${p.x},${p.y})`}>
              <circle r={NODE_R} />
              <text textAnchor="middle" dy="4" className="stage-name">{a}</text>
              <text textAnchor="middle" dy={NODE_R + 15} className="stage-tag">
                {role === 'keeper' ? 'keeper' : k ? 'knows φ' : 'outsider'}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="graph-legend">
        <span><span className="swatch dot keeper" />keeper</span>
        <span><span className="swatch dot nescient" />outsider</span>
        <span><span className="swatch dot knows" />knows φ</span>
        <span><span className="swatch" style={{ background: 'var(--bad)' }} />leak</span>
        <span><span className="swatch" style={{ background: 'var(--warn)' }} />hint</span>
      </div>
    </div>
  );
}
