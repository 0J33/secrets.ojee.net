// Pre-built scenarios illustrating the framework.
//
// Each scenario returns a complete model ready to load.

import { ensureAssignments } from '../engine/model';

function fill(m) {
  ensureAssignments(m);
  return m;
}

function setBIR(m, kind, h, t, agent, prop, val) {
  m.assignments[kind][h][t][agent][prop] = val;
}

// ── 1. ALICE keeps "affair" from BOB ─────────────────────────────────
// Single history. Alice believes, intends to keep, and does not believe
// Bob has been told. Bob has not been told. All six S_i should hold.
export function scenarioAliceBobSecret() {
  const m = {
    name: "Alice's Secret",
    description: "Alice keeps a single secret (affair) from Bob over a 4-step history. All S₀–S₅ should hold throughout.",
    agents: ['alice', 'bob'],
    propositions: ['affair'],
    groups: [
      { name: 'K', members: ['alice'] },
      { name: 'N', members: ['bob'] },
    ],
    timepoints: [0, 1, 2, 3],
    histories: [{ id: 'h0', parent: null }],
    assignments: { B: {}, I: {}, R: {} },
    holds: {},
    enableK: true,
    secrecyCondition: null,
  };
  fill(m);
  for (const t of m.timepoints) {
    setBIR(m, 'B', 'h0', t, 'alice', 'affair', true);
    setBIR(m, 'I', 'h0', t, 'alice', 'affair', true);
    setBIR(m, 'R', 'h0', t, 'bob', 'affair', false);
    m.holds['h0'][t]['affair'] = true;
  }
  return m;
}

// ── 2. Revelation collapses S₃ → S₁ ──────────────────────────────────
// Two histories branching at t=2:  h0 (kept), h1 (leaked to Bob).
// Along h1, R(bob, affair) becomes true at t≥2. Watch S₁ flip off in
// h1 while S₃ may still hold for a moment if Alice doesn't yet know.
export function scenarioRevelationCollapse() {
  const m = {
    name: 'Revelation Collapse (S₃ → S₁)',
    description: 'A revelation event branches a leaked future. Visit h1 at t≥2 to see S₁ fail while S₃ may still hold briefly (Alice has not yet updated her belief).',
    agents: ['alice', 'bob', 'carol'],
    propositions: ['p'],
    groups: [
      { name: 'K', members: ['alice', 'carol'] },
      { name: 'N', members: ['bob'] },
    ],
    timepoints: [0, 1, 2, 3, 4],
    histories: [
      { id: 'h0', parent: null },
      { id: 'h1', parent: { historyId: 'h0', branchTime: 2 } },
    ],
    assignments: { B: {}, I: {}, R: {} },
    holds: {},
    enableK: true,
    secrecyCondition: null,
  };
  fill(m);
  for (const h of ['h0', 'h1']) {
    for (const t of m.timepoints) {
      m.holds[h][t]['p'] = true;
      for (const k of ['alice', 'carol']) {
        setBIR(m, 'B', h, t, k, 'p', true);
        setBIR(m, 'I', h, t, k, 'p', true);
        // mutual-awareness assignments for S₂/S₄/S₅
        setBIR(m, 'B', h, t, k, 'p', true);
      }
      setBIR(m, 'R', h, t, 'bob', 'p', false);
    }
  }
  // In h1, the revelation happens at t=2 onwards.
  for (const t of [2, 3, 4]) {
    setBIR(m, 'R', 'h1', t, 'bob', 'p', true);
  }
  // …and Alice & Carol *learn* about the leak at t=3 (one tick later).
  for (const t of [3, 4]) {
    setBIR(m, 'B', 'h1', t, 'alice', 'p', false);
    setBIR(m, 'B', 'h1', t, 'carol', 'p', false);
  }
  return m;
}

// ── 3. Group dynamics (union, intersection) ──────────────────────────
export function scenarioGroupDynamics() {
  const m = {
    name: 'Group Dynamics',
    description: 'Three secret-keeping circles with overlapping membership. Exercises G1–G3 via the union/intersection of groups Inner ⊔ Outer and Inner ⊓ Council.',
    agents: ['alice', 'bob', 'carol', 'dan', 'eve'],
    propositions: ['code', 'plan'],
    groups: [
      { name: 'Inner',   members: ['alice', 'bob'] },
      { name: 'Outer',   members: ['carol', 'dan'] },
      { name: 'Council', members: ['alice', 'carol'] },
      { name: 'N',       members: ['eve'] },
    ],
    timepoints: [0, 1, 2],
    histories: [{ id: 'h0', parent: null }],
    assignments: { B: {}, I: {}, R: {} },
    holds: {},
    enableK: true,
    secrecyCondition: null,
  };
  fill(m);
  for (const t of m.timepoints) {
    for (const k of ['alice', 'bob', 'carol', 'dan']) {
      for (const p of ['code', 'plan']) {
        setBIR(m, 'B', 'h0', t, k, p, true);
        setBIR(m, 'I', 'h0', t, k, p, true);
      }
    }
    m.holds['h0'][t]['code'] = true;
    m.holds['h0'][t]['plan'] = true;
  }
  return m;
}

// ── 4. Bounded rationality (B1 off — §4.1.5) ─────────────────────────
export function scenarioBoundedRationality() {
  const m = scenarioAliceBobSecret();
  m.name = 'Bounded Rationality (¬ K)';
  m.description = "Same as Alice's Secret, but the K axiom B1 is removed (§4.1.5). T4 (B(a,p) → B(a, R(a,p))) loses its proof.";
  m.enableK = false;
  return m;
}

export const SCENARIOS = [
  { id: 'alice', name: "Alice's Secret", build: scenarioAliceBobSecret },
  { id: 'reveal', name: 'Revelation Collapse', build: scenarioRevelationCollapse },
  { id: 'groups', name: 'Group Dynamics', build: scenarioGroupDynamics },
  { id: 'bounded', name: 'Bounded Rationality', build: scenarioBoundedRationality },
];
