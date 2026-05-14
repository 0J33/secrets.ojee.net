// Secrecy types S₀ … S₅, transcribed from §2.2.3 of the thesis and expressed
// faithfully in terms of B, I, R and Mem.
//
// Quoting the paper (§2.2.3):
//
//   Secret₀  : every keeper believes ϕ, intends to keep it, and does not
//              believe it has been revealed to any nescient.
//   Secret₁  : the secretum ϕ is not actually revealed to the nescients.
//   Secret₂  : every secret keeper is aware that they are keeping a secret.
//   Secret₃  : the keepers believe ϕ has not been revealed to the nescients.
//   Secret₄  : keepers are aware of the identity of all other keepers.
//   Secret₅  : every keeper believes all keepers believe the secrecy.
//
// S₁ – S₅ each imply S₀ and are checked over the current ⟨h, t⟩.
//
// Given a tuple (ϕ, K, N) we evaluate each S_i as a propositional term and
// report which hold. We also produce per-clause traces so the user can see
// why a given S_i passes or fails.

import { Env, evalTerm } from './evaluator';

const A = (name) => ({ type: 'agent', name });
const Pa = (name) => ({ type: 'atom', name });
const B = (a, p) => ({ type: 'B', agent: a, prop: p });
const I = (a, p) => ({ type: 'I', agent: a, prop: p });
const R = (a, p) => ({ type: 'R', agent: a, prop: p });
const NOT = (a) => ({ type: 'not', a });
const AND = (a, b) => ({ type: 'and', a, b });

function bigAnd(parts) {
  if (parts.length === 0) return { type: 'top' };
  return parts.reduce((acc, t) => (acc ? AND(acc, t) : t));
}

export function evaluateSecrets(model, phiName, kGroupName, nGroupName, h, t) {
  const phi = Pa(phiName);
  const K = (model.groups.find((g) => g.name === kGroupName)?.members) || [];
  const N = (model.groups.find((g) => g.name === nGroupName)?.members) || [];

  const env = new Env(model, h, t);

  // ── S₀ ───────────────────────────────────────────────────────────────
  // ∀ k ∈ K : B(k, ϕ) ∧ I(k, ¬ ⋁_{n ∈ N} R(n, ϕ)) ∧ ¬ B(k, ⋁_{n ∈ N} R(n, ϕ))
  const revealedToNescient = N.length
    ? N.map((n) => R(A(n), phi)).reduce((acc, t) => (acc ? { type: 'or', a: acc, b: t } : t))
    : { type: 'bot' };

  const s0Clauses = K.map((k) => ({
    keeper: k,
    parts: [
      { label: `B(${k}, ${phiName})`, value: evalTerm(B(A(k), phi), env) },
      { label: `I(${k}, ¬reveal)`, value: evalTerm(I(A(k), NOT(revealedToNescient)), env) },
      { label: `¬B(${k}, reveal)`, value: !evalTerm(B(A(k), revealedToNescient), env) },
    ],
  }));
  const s0 = s0Clauses.every((c) => c.parts.every((p) => p.value));

  // ── S₁ ───────────────────────────────────────────────────────────────
  // No nescient has actually been revealed ϕ.   ¬⋁_{n∈N} R(n, ϕ)
  const s1Parts = N.map((n) => ({
    label: `¬R(${n}, ${phiName})`,
    value: !evalTerm(R(A(n), phi), env),
  }));
  const s1 = s1Parts.every((p) => p.value) && s0;

  // ── S₂ ───────────────────────────────────────────────────────────────
  // Each keeper believes itself a keeper of the secret (encoded: B(k, B(k, ϕ))).
  const s2Parts = K.map((k) => ({
    label: `B(${k}, B(${k}, ${phiName}))`,
    value: evalTerm(B(A(k), B(A(k), phi)), env),
  }));
  const s2 = s2Parts.every((p) => p.value) && s0;

  // ── S₃ ───────────────────────────────────────────────────────────────
  // Keepers believe the secretum has not been revealed to nescients.
  const s3Parts = K.map((k) => ({
    label: `B(${k}, ¬⋁ R(N, ${phiName}))`,
    value: evalTerm(B(A(k), NOT(revealedToNescient)), env),
  }));
  const s3 = s3Parts.every((p) => p.value) && s0;

  // ── S₄ ───────────────────────────────────────────────────────────────
  // Each keeper is aware of the identity of every other keeper.
  const s4Parts = [];
  for (const k of K) {
    for (const k2 of K) {
      if (k === k2) continue;
      s4Parts.push({
        label: `B(${k}, B(${k2}, ${phiName}))`,
        value: evalTerm(B(A(k), B(A(k2), phi)), env),
      });
    }
  }
  const s4 = s4Parts.every((p) => p.value) && s0;

  // ── S₅ ───────────────────────────────────────────────────────────────
  // Every keeper believes all keepers believe the secrecy.
  // Encoded as: ∀ k ∈ K. B(k, ⋀_{k'∈K} B(k', ϕ))
  const innerConj = bigAnd(K.map((k2) => B(A(k2), phi)));
  const s5Parts = K.map((k) => ({
    label: `B(${k}, ⋀ B(K, ${phiName}))`,
    value: evalTerm(B(A(k), innerConj), env),
  }));
  const s5 = s5Parts.every((p) => p.value) && s0;

  return {
    phiName, kGroupName, nGroupName, h, t,
    keepers: K, nescients: N,
    types: [
      { id: 'S₀', holds: s0, clauses: s0Clauses, summary: 'baseline: belief + intention + no-belief-of-reveal' },
      { id: 'S₁', holds: s1, clauses: s1Parts, summary: 'actually unrevealed' },
      { id: 'S₂', holds: s2, clauses: s2Parts, summary: 'keepers aware of being keepers' },
      { id: 'S₃', holds: s3, clauses: s3Parts, summary: 'keepers believe unrevealed' },
      { id: 'S₄', holds: s4, clauses: s4Parts, summary: 'mutual awareness among keepers' },
      { id: 'S₅', holds: s5, clauses: s5Parts, summary: 'common belief among keepers' },
    ],
  };
}
