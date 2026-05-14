// Agent / group graph. Nodes = agents. Soft hulls = groups they belong to.
// Edges = directional B / I / R relations for the currently-inspected proposition.

import React, { useMemo } from 'react';
import { ancestorAt } from '../engine/model';

const W = 720;
const H = 460;
const NODE_R = 22;
const HULL_PAD = 16;     // tight wrap around members
const PROP_Y_FRAC = 0.78; // proposition box sits near the bottom

export default function Graph({ model, history, time, proposition }) {
  const layout = useMemo(() => {
    const positions = {};
    const n = model.agents.length || 1;
    const cx = W / 2;
    // Spread agents along an arc above the proposition box.
    if (n === 1) {
      positions[model.agents[0]] = { x: cx, y: 90 };
    } else {
      const arcR = 150;
      const arcCy = 240;
      const startAng = Math.PI * 1.1;  // ~198°
      const endAng   = Math.PI * 1.9;  // ~342°
      model.agents.forEach((a, i) => {
        const t = i / (n - 1);
        const ang = startAng + (endAng - startAng) * t;
        positions[a] = { x: cx + arcR * Math.cos(ang), y: arcCy + arcR * Math.sin(ang) };
      });
    }
    return { positions };
  }, [model.agents]);

  const hAnc = ancestorAt(model, history, time);
  const tab = (kind) => model.assignments?.[kind]?.[hAnc]?.[time] || {};
  const bel = tab('B'), intn = tab('I'), rev = tab('R');

  const edges = [];
  if (proposition) {
    for (const a of model.agents) {
      for (const kind of ['B', 'I', 'R']) {
        const map = kind === 'B' ? bel : kind === 'I' ? intn : rev;
        if (map[a]?.[proposition]) {
          edges.push({ from: a, to: proposition, kind });
        }
      }
    }
  }

  // Group hulls: tight wrap around members.
  const hulls = model.groups.map((g, gi) => {
    const pts = g.members.map((m) => layout.positions[m]).filter(Boolean);
    if (pts.length === 0) return null;
    // For one or two members we draw a rounded rectangle; for ≥3 we expand a
    // convex hull. In all cases the label sits just above the hull's top edge.
    if (pts.length === 1) {
      const p = pts[0];
      const r = NODE_R + HULL_PAD;
      return {
        name: g.name,
        kind: 'rect',
        x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r,
        labelX: p.x, labelY: p.y - r - 6,
        gi,
      };
    }
    if (pts.length === 2) {
      const minX = Math.min(pts[0].x, pts[1].x) - NODE_R - HULL_PAD;
      const maxX = Math.max(pts[0].x, pts[1].x) + NODE_R + HULL_PAD;
      const minY = Math.min(pts[0].y, pts[1].y) - NODE_R - HULL_PAD;
      const maxY = Math.max(pts[0].y, pts[1].y) + NODE_R + HULL_PAD;
      return {
        name: g.name, kind: 'rect',
        x: minX, y: minY, w: maxX - minX, h: maxY - minY,
        labelX: (minX + maxX) / 2, labelY: minY - 6,
        gi,
      };
    }
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const expanded = pts.map((p) => {
      const dx = p.x - cx, dy = p.y - cy;
      const len = Math.hypot(dx, dy) || 1;
      return {
        x: p.x + (dx / len) * (NODE_R + HULL_PAD),
        y: p.y + (dy / len) * (NODE_R + HULL_PAD),
      };
    });
    const sorted = expanded
      .map((p) => ({ ...p, ang: Math.atan2(p.y - cy, p.x - cx) }))
      .sort((a, b) => a.ang - b.ang);
    const path = sorted
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(' ') + ' Z';
    const minY = Math.min(...sorted.map((p) => p.y));
    return {
      name: g.name, kind: 'path', d: path,
      labelX: cx, labelY: minY - 6,
      gi,
    };
  }).filter(Boolean);

  // De-collide group labels: if two labels share an (x, y) neighbourhood,
  // bump the later one upward so they stack.
  const placed = [];
  const collidesWith = (lx, ly) =>
    placed.some((p) => Math.abs(p.x - lx) < 50 && Math.abs(p.y - ly) < 14);
  for (const hl of hulls) {
    let ly = hl.labelY;
    const lx = hl.labelX;
    for (let bumps = 0; bumps < 8 && collidesWith(lx, ly); bumps++) {
      ly -= 16;
    }
    hl.labelY = ly;
    placed.push({ x: lx, y: ly });
  }

  // Proposition node — placed below the agent arc.
  const propPos = proposition ? { x: W / 2, y: H * PROP_Y_FRAC } : null;

  // Stagger edge labels along the line per kind: B at 0.32, I at 0.5, R at 0.68
  // so that on parallel edges from the same agent the three labels don't stack.
  const KIND_T = { B: 0.32, I: 0.5, R: 0.68 };
  const KIND_OFF = { B: -7, I: 0, R: 7 };

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Agents · Groups · Attitudes</span>
        <span className="tag-mono">h={history} · t={time}{proposition ? ` · ϕ=${proposition}` : ''}</span>
      </div>
      <svg className="graph-svg" viewBox={`0 0 ${W} ${H}`}>
        {/* Hulls behind everything */}
        {hulls.map((hl) => (
          <g key={hl.name}>
            {hl.kind === 'rect' && (
              <rect x={hl.x} y={hl.y} width={hl.w} height={hl.h} rx="8" ry="8"
                    className="graph-group" />
            )}
            {hl.kind === 'path' && <path d={hl.d} className="graph-group" />}
            <text x={hl.labelX} y={hl.labelY} textAnchor="middle"
                  fontFamily="EB Garamond, serif" fontStyle="italic"
                  fontWeight="600" fontSize="14" fill="var(--accent)">
              {hl.name}
            </text>
          </g>
        ))}

        {/* Edges from each agent to the proposition node */}
        {propPos && edges.map((e, idx) => {
          const from = layout.positions[e.from];
          const to = propPos;
          const off = KIND_OFF[e.kind];
          const tFrac = KIND_T[e.kind];
          const dx = to.x - from.x, dy = to.y - from.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          // Trim endpoints so the edge doesn't poke into the node circles.
          const trim = NODE_R + 2;
          const ux = dx / len, uy = dy / len;
          const sx = from.x + nx * off + ux * trim;
          const sy = from.y + ny * off + uy * trim;
          const ex = to.x + nx * off - ux * 28;
          const ey = to.y + ny * off - uy * 16;
          const lx = sx + (ex - sx) * tFrac;
          const ly = sy + (ey - sy) * tFrac;
          return (
            <g key={idx}>
              <line x1={sx} y1={sy} x2={ex} y2={ey} className={`graph-edge ${e.kind}`} />
              <text x={lx} y={ly + 2} textAnchor="middle"
                    fontFamily="JetBrains Mono, monospace" fontSize="9"
                    fill="var(--ink-soft)"
                    stroke="var(--paper)" strokeWidth="3"
                    style={{ paintOrder: 'stroke fill' }}>
                {e.kind}
              </text>
            </g>
          );
        })}

        {/* Agent nodes */}
        {model.agents.map((a) => {
          const p = layout.positions[a];
          return (
            <g key={a} className="graph-node" transform={`translate(${p.x}, ${p.y})`}>
              <circle r={NODE_R} />
              <text textAnchor="middle" dy="4">{a}</text>
            </g>
          );
        })}

        {/* Proposition node */}
        {propPos && (() => {
          const label = `ϕ = ${proposition}`;
          const w = Math.max(70, label.length * 7.6 + 20);
          return (
            <g transform={`translate(${propPos.x}, ${propPos.y})`}>
              <rect x={-w / 2} y="-16" width={w} height="32" fill="var(--paper)"
                    stroke="var(--ink)" strokeWidth="1.5" />
              <text textAnchor="middle" dy="5" fontFamily="JetBrains Mono, monospace"
                    fontSize="13" fill="var(--ink)">
                {label}
              </text>
            </g>
          );
        })()}
      </svg>
      <div className="graph-legend">
        <span><span className="swatch" style={{ background: 'var(--edge-B)' }}/>B (belief)</span>
        <span><span className="swatch" style={{ background: 'var(--edge-I)' }}/>I (intention)</span>
        <span><span className="swatch" style={{ background: 'var(--edge-R)' }}/>R (revelation)</span>
        <span><span className="swatch" style={{ background: 'var(--accent-soft)' }}/>group (hull)</span>
      </div>
    </div>
  );
}
