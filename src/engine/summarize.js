// Shared read-out of a finished run: the six secrecy grades per tick, and a
// one-line outcome. Used by the run index, the replay stage and the local
// runner, so a recording and a fresh run are always summarised the same way.

import { evaluateSecrets } from './secrets';

const IDS = ['S₀', 'S₁', 'S₂', 'S₃', 'S₄', 'S₅'];

// matrix[t] = { t, holds: [6 booleans] }
export function secrecyMatrix(model) {
  const phi = model?.propositions?.[0];
  if (!phi) return [];
  return (model.timepoints || []).map((t) => {
    try {
      const r = evaluateSecrets(model, phi, 'K', 'N', 'h0', t);
      return { t, holds: r.types.map((x) => !!x.holds) };
    } catch {
      return { t, holds: [] };
    }
  });
}

export function runOutcome(model) {
  const leaks = [...new Set((model.events || []).filter((e) => e.leaked).map((e) => e.t))]
    .sort((a, b) => a - b);
  if (leaks.length) {
    return { kind: 'leaked', tick: leaks[0], label: `leaked at t=${leaks[0]}` };
  }
  const m = secrecyMatrix(model);
  const held = m.length > 0 && m.every((row) => row.holds.length === IDS.length && row.holds.every(Boolean));
  if (held) return { kind: 'held', label: 'secret held' };
  return { kind: 'degraded', label: 'secrecy degraded' };
}

export { IDS };
