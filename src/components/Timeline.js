// Branching VEL timeline rendered git-style: each history is a horizontal
// lane, time runs left-to-right, a branch curve connects child lanes to
// their parent at the branch time. Nodes are clickable.

import React from 'react';

const PAD_L = 64;   // left gutter for history labels
const PAD_T = 28;   // top gutter for time labels
const PAD_R = 16;
const PAD_B = 12;
const COL = 56;     // pixels per time step
const ROW = 38;     // pixels per history lane
const NODE_R = 7;

export default function Timeline({ model, history, time, onSelect, onAddHistory, onAddTimepoint }) {
  const histories = model.histories;
  const timepoints = model.timepoints;
  const laneOf = (hid) => histories.findIndex((h) => h.id === hid);

  // Non-root histories only have nodes from their branchTime onward;
  // before that, the index points belong to their ancestor history.
  const hasNode = (h, t) => !h.parent || t >= h.parent.branchTime;

  const xOf = (t) => PAD_L + timepoints.indexOf(t) * COL;
  const yOfLane = (i) => PAD_T + i * ROW;

  const width  = PAD_L + Math.max(0, timepoints.length - 1) * COL + COL / 2 + PAD_R;
  const height = PAD_T + Math.max(0, histories.length - 1) * ROW + ROW + PAD_B;

  // Branch curves: smooth S-curve from parent lane to child lane at branchTime.
  const branchPaths = histories
    .map((h, idx) => {
      if (!h.parent) return null;
      const pIdx = laneOf(h.parent.historyId);
      if (pIdx < 0) return null;
      const x2 = xOf(h.parent.branchTime);
      const y1 = yOfLane(pIdx);
      const y2 = yOfLane(idx);
      const x1 = x2 - COL * 0.7;
      const cx = x2 - COL * 0.25;
      return { key: `b-${h.id}`, d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}` };
    })
    .filter(Boolean);

  // Lane segments — straight horizontal lines spanning each history's range.
  const laneSegments = histories.map((h, idx) => {
    const startT = h.parent ? h.parent.branchTime : timepoints[0];
    const endT = timepoints[timepoints.length - 1];
    return { hid: h.id, y: yOfLane(idx), x1: xOf(startT), x2: xOf(endT) };
  });

  // Nodes
  const nodes = [];
  for (let i = 0; i < histories.length; i++) {
    const h = histories[i];
    for (const t of timepoints) {
      if (!hasNode(h, t)) continue;
      nodes.push({ hid: h.id, t, x: xOf(t), y: yOfLane(i) });
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Versatile Event Logic — branching timeline</span>
        <span className="tag-mono">|H|={histories.length} · |T|={timepoints.length}</span>
      </div>
      <div className="vel-tree-wrap">
        <svg className="vel-tree" viewBox={`0 0 ${width} ${height}`}
             width={width} height={height}
             preserveAspectRatio="xMinYMin meet">
          {/* Time labels */}
          {timepoints.map((t) => (
            <text key={`tl-${t}`} x={xOf(t)} y={PAD_T - 12} textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace" fontSize="10"
                  fill="var(--ink-faint)">
              t={t}
            </text>
          ))}

          {/* History labels */}
          {histories.map((h, i) => (
            <text key={`hl-${h.id}`} x={PAD_L - 12} y={yOfLane(i) + 4}
                  textAnchor="end"
                  fontFamily="JetBrains Mono, monospace" fontSize="11"
                  fontStyle="italic"
                  fill="var(--ink-soft)">
              {h.id}
            </text>
          ))}

          {/* Lane segments */}
          {laneSegments.map((s) => (
            <line key={`ls-${s.hid}`} x1={s.x1} y1={s.y} x2={s.x2} y2={s.y}
                  stroke="var(--rule)" strokeWidth="1.6" />
          ))}

          {/* Branch curves */}
          {branchPaths.map((b) => (
            <path key={b.key} d={b.d} fill="none"
                  stroke="var(--accent-soft)" strokeWidth="1.6" />
          ))}

          {/* Nodes (clickable) */}
          {nodes.map((n) => {
            const active = n.hid === history && n.t === time;
            return (
              <g key={`${n.hid}-${n.t}`} className="vel-node"
                 transform={`translate(${n.x}, ${n.y})`}
                 onClick={() => onSelect(n.hid, n.t)}>
                <title>{`${n.hid} · t=${n.t}`}</title>
                <circle r={NODE_R + 8} fill="transparent" />
                <circle r={NODE_R} className={'vel-dot' + (active ? ' active' : '')} />
                {active && (
                  <circle r={NODE_R + 3} fill="none"
                          stroke="var(--accent)" strokeWidth="1.4"
                          strokeDasharray="2 2" />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="vel-tree-controls">
        <button className="btn sm ghost" onClick={onAddTimepoint}>+ time point</button>
        <button className="btn sm ghost" onClick={onAddHistory}>+ branch history</button>
        <span className="tag-mono faint" style={{ marginLeft: 'auto' }}>
          click a node to jump to ⟨h, t⟩
        </span>
      </div>
    </div>
  );
}
