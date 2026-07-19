// Transcript rail: the agents' natural-language turns, each annotated with the
// discrete facts the runner extracted from it (action → target, belief,
// intention, and whether it leaked φ). Ties the emergent behaviour to the
// formal state it produced. The current tick is highlighted.

import React from 'react';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const ACTION_CLASS = {
  reveal: 'reveal', hint: 'hint', ask: 'ask', deflect: 'deflect', stay_silent: 'silent',
};

export default function Transcript({ model, time, onSeek }) {
  const rows = model.transcript || [];
  return (
    <div className="panel">
      <div className="panel-head">
        <span>Transcript · extracted facts</span>
        <span className="tag-mono">{rows.length} turns</span>
      </div>
      <div className="panel-body transcript-body">
        {rows.length === 0 && <div className="tag-mono faint">run a simulation to populate the transcript.</div>}
        {rows.map((r, i) => (
          <div key={i}
               className={'ts-turn' + (r.t === time ? ' now' : '') + (r.t > time ? ' future' : '')}
               onClick={() => onSeek?.(r.t)}>
            <div className="ts-head">
              <span className="ts-t">t{r.t}</span>
              <span className="ts-agent">{cap(r.agent)}</span>
              <span className={'ts-action ' + (ACTION_CLASS[r.action] || 'silent')}>{r.action}</span>
              {r.action !== 'stay_silent' && r.target !== 'none' && (
                <span className="ts-target">→ {cap(r.target)}</span>
              )}
              {r.failed && <span className="ts-action silent" title="model call failed; no-op used">⚠</span>}
            </div>
            {r.utterance && <div className="ts-utter">"{r.utterance}"</div>}
            <div className="ts-facts">
              <span className={'ts-chip ' + (r.believesSecret ? 'on' : 'off')}>B(φ) {r.believesSecret ? '⊤' : '⊥'}</span>
              <span className={'ts-chip ' + (r.intendsToKeep ? 'on' : 'off')}>I(keep) {r.intendsToKeep ? '⊤' : '⊥'}</span>
              {r.action === 'reveal' && <span className="ts-chip leak">discloses φ</span>}
              {r.action === 'hint' && <span className="ts-chip risk">hint</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
