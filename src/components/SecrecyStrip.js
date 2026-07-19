// Six-lane secrecy strip: rows S₀–S₅, columns = ticks. Each cell is graded by
// the real engine (evaluateSecrets) at ⟨h0, t⟩ — green holds, red fails. The
// S₁ collapse at a leak shows as a cliff; the one-tick belief lag shows as a
// stagger between the S₁ and S₃ lanes. Click a column to move the playhead.

import React, { useMemo } from 'react';
import { evaluateSecrets } from '../engine/secrets';

export default function SecrecyStrip({ model, time, onSeek }) {
  const grid = useMemo(() => {
    const phi = model.propositions[0];
    return model.timepoints.map((t) => {
      try {
        const r = evaluateSecrets(model, phi, 'K', 'N', 'h0', t);
        return { t, types: r.types.map((x) => ({ id: x.id, holds: x.holds })) };
      } catch {
        return { t, types: [] };
      }
    });
  }, [model]);

  const ids = ['S₀', 'S₁', 'S₂', 'S₃', 'S₄', 'S₅'];

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Secrecy over time</span>
        <span className="tag-mono">S₀–S₅ · §2.2.3</span>
      </div>
      <div className="panel-body">
        <div className="strip" style={{ gridTemplateColumns: `44px repeat(${grid.length}, 1fr)` }}>
          <div className="strip-corner" />
          {grid.map((c) => (
            <div key={`h${c.t}`} className={'strip-col-head' + (c.t === time ? ' now' : '')}
                 onClick={() => onSeek?.(c.t)}>t{c.t}</div>
          ))}
          {ids.map((id, ri) => (
            <React.Fragment key={id}>
              <div className="strip-row-head">{id}</div>
              {grid.map((c) => {
                const cell = c.types[ri];
                const holds = cell?.holds;
                return (
                  <div key={`${id}-${c.t}`}
                       className={'strip-cell ' + (holds ? 'holds' : 'fails') + (c.t === time ? ' now' : '')}
                       title={`${id} @ t${c.t}: ${holds ? 'holds' : 'fails'}`}
                       onClick={() => onSeek?.(c.t)} />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
