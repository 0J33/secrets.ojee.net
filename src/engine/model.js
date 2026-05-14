// Log_A Sec model: a finite instance of the structure ⟨D, 𝔄, b, i, r, h, <⟩.
//
// Faithful to §4.1.1 of the thesis:
//   D is partitioned into: P (propositions), A (agents), G (groups),
//     H (histories), T (time points), S (states).
//   𝔄 = ⟨P, +, ·, −, ⊥, ⊤⟩ is a Boolean algebra.
//   b, i, r : A × P × H × T → P     (belief / intention / revelation)
//   h : P × T × H → P                (holding function)
//   < : T × T → P                    (linear order)
//
// In a finite simulator the Boolean algebra P is realised as P({0,1}^|atoms|).
// We hold atomic propositions as elementary atoms and combine them with
// Boolean operations. The valuations of b(a,ϕ,h,t) etc. are themselves
// stored as truth values at each index point ⟨h,t⟩.

export const TRUE = 'T';
export const FALSE = 'F';

export function newModel() {
  return {
    agents: ['alice', 'bob', 'carol'],
    propositions: ['p', 'q'],
    groups: [
      { name: 'K', members: ['alice'] },
      { name: 'N', members: ['bob'] },
    ],
    timepoints: [0, 1, 2, 3],
    histories: [
      { id: 'h0', parent: null },
    ],
    // assignments[kind][history][time][agent][prop] = bool
    // kind ∈ {'B', 'I', 'R'}
    assignments: {
      B: {},
      I: {},
      R: {},
    },
    // holds[history][time][prop] = bool   (atomic proposition truth at index)
    holds: {},
    // optional secrecy-condition reference (atomic prop name)
    secrecyCondition: null,
    // axiom toggle: when false, B1 (the K axiom) is dropped from the system
    // (paper §4.1.5 — Implications of Removing Logical Omniscience).
    enableK: true,
  };
}

// Initialise empty assignment tables for any new agent/prop/history/time.
export function ensureAssignments(m) {
  const empty = () => false;
  for (const kind of ['B', 'I', 'R']) {
    m.assignments[kind] = m.assignments[kind] || {};
    for (const h of m.histories) {
      m.assignments[kind][h.id] = m.assignments[kind][h.id] || {};
      for (const t of m.timepoints) {
        m.assignments[kind][h.id][t] = m.assignments[kind][h.id][t] || {};
        for (const a of m.agents) {
          m.assignments[kind][h.id][t][a] = m.assignments[kind][h.id][t][a] || {};
          for (const p of m.propositions) {
            if (m.assignments[kind][h.id][t][a][p] === undefined) {
              m.assignments[kind][h.id][t][a][p] = empty();
            }
          }
        }
      }
    }
  }
  m.holds = m.holds || {};
  for (const h of m.histories) {
    m.holds[h.id] = m.holds[h.id] || {};
    for (const t of m.timepoints) {
      m.holds[h.id][t] = m.holds[h.id][t] || {};
      for (const p of m.propositions) {
        if (m.holds[h.id][t][p] === undefined) {
          m.holds[h.id][t][p] = false;
        }
      }
    }
  }
  return m;
}

// VEL: every history shares the time domain T (§2.3, §4.1). The branch
// structure is encoded by the parent pointer: history h₂ "branches off"
// history h₁ at branchTime — for t < branchTime the two histories agree.
// For t ≥ branchTime, h₂ may diverge.
export function ancestorAt(m, hid, t) {
  let cur = m.histories.find((h) => h.id === hid);
  while (cur && cur.parent && t < cur.parent.branchTime) {
    const parentId = cur.parent.historyId;
    cur = m.histories.find((h) => h.id === parentId);
  }
  return cur ? cur.id : hid;
}

// Strict past confluence (⧆ϕ): ϕ holds in all strict predecessors of ⟨h,t⟩.
// We interpret this as: ϕ holds at every index ⟨h',t'⟩ with t' < t and
// h' the ancestor of h at t'.
export function strictPast(m) {
  const out = [];
  for (const h of m.histories) {
    for (const t of m.timepoints) {
      const past = [];
      for (const t2 of m.timepoints) {
        if (t2 < t) past.push({ h: ancestorAt(m, h.id, t2), t: t2 });
      }
      out.push({ h: h.id, t, past });
    }
  }
  return out;
}

// Group operations (G1–G3 of §4.1.2).
export function groupMembers(m, gname) {
  // Allow nested expressions: [a], g1 ⊔ g2, g1 ⊓ g2 are parsed in evaluator;
  // here we just resolve a literal group name to its declared members.
  const g = m.groups.find((g) => g.name === gname);
  return g ? new Set(g.members) : new Set();
}

export function groupUnion(setA, setB) {
  return new Set([...setA, ...setB]);
}

export function groupIntersection(setA, setB) {
  return new Set([...setA].filter((x) => setB.has(x)));
}

// Convenience: list every index point (history, time) of the model.
export function allIndices(m) {
  const out = [];
  for (const h of m.histories) {
    for (const t of m.timepoints) out.push({ h: h.id, t });
  }
  return out;
}
