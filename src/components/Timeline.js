// Branching VEL timeline. Histories are rows; time points are columns.
// Cells before a history's branch time are rendered as "ancestor" cells.

import React from 'react';

export default function Timeline({ model, history, time, onSelect, onAddHistory, onAddTimepoint }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span>Versatile Event Logic — branching timeline</span>
        <span className="tag-mono">|H|={model.histories.length} · |T|={model.timepoints.length}</span>
      </div>
      <div className="vel-timeline">
        {model.histories.map((h) => (
          <div key={h.id} className="vel-row">
            <div className="vel-row-label">{h.id}</div>
            {model.timepoints.map((t) => {
              const preBranch = h.parent && t < h.parent.branchTime;
              const active = h.id === history && t === time;
              return (
                <div
                  key={t}
                  className={'vel-cell' + (active ? ' active' : '') + (preBranch ? ' pre-branch' : '')}
                  onClick={() => onSelect(h.id, t)}
                  title={`history=${h.id}, t=${t}${preBranch ? ' (shared past)' : ''}`}
                >
                  {t}
                </div>
              );
            })}
            {h.parent && (
              <span className="tag-mono faint" style={{ marginLeft: 8 }}>
                branched from {h.parent.historyId} @ t={h.parent.branchTime}
              </span>
            )}
          </div>
        ))}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn sm ghost" onClick={onAddTimepoint}>+ time point</button>
          <button className="btn sm ghost" onClick={onAddHistory}>+ branch history</button>
        </div>
      </div>
    </div>
  );
}
