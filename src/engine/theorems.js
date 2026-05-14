// Theorems T1–T7 of Log_A Sec — exact proofs reproduced from §4.1.4.
// Each entry carries:
//   - latex statement
//   - the ordered proof lines (with axiom/theorem citation)
//   - dependsOn: which axioms the proof references (used to show what
//     breaks when B1 is dropped — §4.1.5)
//
// The actual semantic check runs the same machinery as axioms.js — we
// quantify the statement over the model and look for counterexamples.

import { Env, evalTerm } from './evaluator';

const A = (name) => ({ type: 'agent', name });
const B = (a, p) => ({ type: 'B', agent: a, prop: p });
const R = (a, p) => ({ type: 'R', agent: a, prop: p });
const NOT = (a) => ({ type: 'not', a });
const AND = (a, b) => ({ type: 'and', a, b });
const IMPL = (a, b) => ({ type: 'impl', a, b });
const IFF = (a, b) => ({ type: 'iff', a, b });
const Pa = (name) => ({ type: 'atom', name });

export const THEOREMS = [
  {
    id: 'T1',
    latex: 'R(a, p \\wedge q) \\rightarrow R(a, p) \\wedge R(a, q)',
    proof: [
      { line: 1, formula: 'R(a, p \\wedge q)', cite: 'assumption' },
      { line: 2, formula: 'p \\wedge q \\rightarrow p', cite: 'tautology' },
      { line: 3, formula: 'R(a, p)', cite: '[2, R3]' },
      { line: 4, formula: 'p \\wedge q \\rightarrow q', cite: 'tautology' },
      { line: 5, formula: 'R(a, q)', cite: '[4, R3]' },
      { line: 6, formula: 'R(a, p) \\wedge R(a, q)', cite: '[3, 5]' },
      { line: 7, formula: 'R(a, p \\wedge q) \\rightarrow R(a, p) \\wedge R(a, q)', cite: '[1, 6]' },
    ],
    dependsOn: ['R3'],
    quantify: ['a:A', 'p:P', 'q:P'],
    build: ({ a, p, q }) => IMPL(R(a, AND(p, q)), AND(R(a, p), R(a, q))),
  },
  {
    id: 'T2',
    latex: 'B(a, p) \\rightarrow R(a, p)',
    proof: [
      { line: 1, formula: 'B(a, p)', cite: 'assumption' },
      { line: 2, formula: 'B(a, \\top \\rightarrow p)', cite: 'tautology' },
      { line: 3, formula: 'B(a, \\top)', cite: '[B5]' },
      { line: 4, formula: '\\neg B(a, \\neg \\top)', cite: '[3, B2]' },
      { line: 5, formula: 'B(a, \\top \\rightarrow p) \\wedge \\neg B(a, \\neg \\top)', cite: '[2, 4]' },
      { line: 6, formula: 'R(a, \\top) \\rightarrow R(a, p)', cite: '[5, BR1]' },
      { line: 7, formula: 'R(a, \\top)', cite: '[R1]' },
      { line: 8, formula: 'R(a, p)', cite: '[6, 7]' },
      { line: 9, formula: 'B(a, p) \\rightarrow R(a, p)', cite: '[1, 8]' },
    ],
    dependsOn: ['B5', 'B2', 'BR1', 'R1'],
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(B(a, p), R(a, p)),
  },
  {
    id: 'T3',
    latex: 'R(a, p) \\leftrightarrow R(a, R(a, p))',
    proof: [
      { line: 1, formula: 'R(a, p)', cite: 'assumption' },
      { line: 2, formula: 'R(a, p) \\rightarrow B(a, R(a, p))', cite: '[BR2]' },
      { line: 3, formula: 'B(a, R(a, p))', cite: '[1, 2]' },
      { line: 4, formula: 'R(a, R(a, p))', cite: '[3, T2]' },
      { line: 5, formula: 'R(a, p) \\rightarrow R(a, R(a, p))', cite: '[1, 4]' },
      { line: 6, formula: 'R(a, R(a, p))', cite: 'assumption' },
      { line: 7, formula: 'R(a, p)', cite: '[6, R4]' },
      { line: 8, formula: 'R(a, R(a, p)) \\rightarrow R(a, p)', cite: '[6, 7]' },
    ],
    dependsOn: ['BR2', 'T2', 'R4'],
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IFF(R(a, p), R(a, R(a, p))),
  },
  {
    id: 'T4',
    latex: 'B(a, p) \\rightarrow B(a, R(a, p))',
    proof: [
      { line: 1, formula: 'B(a, p)', cite: 'assumption' },
      { line: 2, formula: 'B(a, B(a, p))', cite: '[1, B3]' },
      { line: 3, formula: 'B(a, B(a, p) \\rightarrow R(a, p))', cite: '[B5, T2]' },
      { line: 4, formula: 'B(a, R(a, p))', cite: '[2, 3, B1]' },
      { line: 5, formula: 'B(a, p) \\rightarrow B(a, R(a, p))', cite: '[1, 4]' },
    ],
    dependsOn: ['B3', 'B5', 'T2', 'B1'], // ← breaks when B1 is removed
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(B(a, p), B(a, R(a, p))),
    breaksWithoutK: true,
  },
  {
    id: 'T5',
    latex: 'B(a, R(a, p)) \\rightarrow R(a, p)',
    proof: [
      { line: 1, formula: 'B(a, R(a, p))', cite: 'assumption' },
      { line: 2, formula: 'R(a, R(a, p))', cite: '[1, T2]' },
      { line: 3, formula: 'R(a, p)', cite: '[2, T3]' },
      { line: 4, formula: 'B(a, R(a, p)) \\rightarrow R(a, p)', cite: '[1, 3]' },
    ],
    dependsOn: ['T2', 'T3'],
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(B(a, R(a, p)), R(a, p)),
  },
  {
    id: 'T6',
    latex: 'B(a, \\neg R(a, p)) \\rightarrow \\neg R(a, p)',
    proof: [
      { line: 1, formula: 'B(a, \\neg R(a, p))', cite: 'assumption' },
      { line: 2, formula: '\\neg B(a, R(a, p))', cite: '[1, B2]' },
      { line: 3, formula: '\\neg R(a, p)', cite: '[2, BR2]' },
      { line: 4, formula: 'B(a, \\neg R(a, p)) \\rightarrow \\neg R(a, p)', cite: '[1, 3]' },
    ],
    dependsOn: ['B2', 'BR2'],
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(B(a, NOT(R(a, p))), NOT(R(a, p))),
  },
  {
    id: 'T7',
    latex: 'R(a, B(a, p)) \\rightarrow B(a, R(a, p))',
    proof: [
      { line: 1, formula: 'R(a, B(a, p))', cite: 'assumption' },
      { line: 2, formula: 'B(a, p) \\rightarrow R(a, p)', cite: '[T2]' },
      { line: 3, formula: 'R(a, R(a, p))', cite: '[1, 2, R3]' },
      { line: 4, formula: 'R(a, p)', cite: '[3, T3]' },
      { line: 5, formula: 'B(a, R(a, p))', cite: '[4, BR2]' },
      { line: 6, formula: 'R(a, B(a, p)) \\rightarrow B(a, R(a, p))', cite: '[1, 5]' },
    ],
    dependsOn: ['T2', 'R3', 'T3', 'BR2'],
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(R(a, B(a, p)), B(a, R(a, p))),
  },
];

function enumerate(model, sort) {
  if (sort === 'A') return model.agents.map((n) => A(n));
  if (sort === 'P') return model.propositions.map((n) => Pa(n));
  if (sort === 'G') return model.groups.map((g) => ({ type: 'group', name: g.name }));
  if (sort === 'T') return model.timepoints.map((t) => ({ type: 'time', value: t }));
  throw new Error(`cannot enumerate ${sort}`);
}

function nameOf(node) {
  if (node.type === 'agent') return node.name;
  if (node.type === 'atom') return node.name;
  if (node.type === 'group') return node.name;
  if (node.type === 'time') return String(node.value);
  return '?';
}

export function checkTheorem(th, model) {
  // If T4 and B1 disabled — note the proof breaks. We still check semantically;
  // the user can see whether the formula happens to hold despite the missing
  // proof.
  const quantSorts = (th.quantify || []).map((q) => q.split(':'));
  const counterexamples = [];

  const rec = (depth, nodeBindings, nameBindings) => {
    if (counterexamples.length >= 3) return;
    if (depth === quantSorts.length) {
      const node = th.build(nodeBindings, model);
      for (const h of model.histories) {
        for (const t of model.timepoints) {
          const env = new Env(model, h.id, t);
          let value;
          try { value = evalTerm(node, env); } catch (e) { value = false; }
          if (!value) {
            counterexamples.push({ bindings: { ...nameBindings }, h: h.id, t });
            if (counterexamples.length >= 3) return;
          }
        }
      }
      return;
    }
    const [varName, sort] = quantSorts[depth];
    const dom = enumerate(model, sort);
    for (const d of dom) {
      rec(depth + 1, { ...nodeBindings, [varName]: d }, { ...nameBindings, [varName]: nameOf(d) });
      if (counterexamples.length >= 3) return;
    }
  };
  rec(0, {}, {});
  return {
    id: th.id,
    status: counterexamples.length === 0 ? 'pass' : 'fail',
    counterexamples,
    proofBroken: th.breaksWithoutK && model.enableK === false,
  };
}

export function checkAllTheorems(model) {
  return THEOREMS.map((th) => ({ theorem: th, result: checkTheorem(th, model) }));
}
