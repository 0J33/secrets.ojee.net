// Axioms of Log_A Sec — verbatim from §4.1.2 of the thesis.
//
// Each entry is a closed schema checked over the current finite model.
// A schema "passes" iff every quantified instantiation satisfies its body
// at every index point ⟨h, t⟩. A failing instantiation is reported as a
// concrete witness {h, t, agent(s), prop(s)} so the user can see why.

import { Env, evalTerm } from './evaluator';

// Helpers to build small ASTs in JS without going through the parser.
const A = (name) => ({ type: 'agent', name });
const Pa = (name) => ({ type: 'atom', name });
const B = (a, p) => ({ type: 'B', agent: a, prop: p });
const I = (a, p) => ({ type: 'I', agent: a, prop: p });
const R = (a, p) => ({ type: 'R', agent: a, prop: p });
const NOT = (a) => ({ type: 'not', a });
const AND = (a, b) => ({ type: 'and', a, b });
const OR = (a, b) => ({ type: 'or', a, b });
const IMPL = (a, b) => ({ type: 'impl', a, b });
const IFF = (a, b) => ({ type: 'iff', a, b });
const Mem = (a, g) => ({ type: 'Mem', agent: a, group: g });
const GR = (name) => ({ type: 'group', name });
const SING = (a) => ({ type: 'singleton', agent: a });
const UNION = (a, b) => ({ type: 'groupOp', op: 'union', a, b });
const INTER = (a, b) => ({ type: 'groupOp', op: 'inter', a, b });

// AXIOM CATALOGUE — id, name, latex, body builder
export const AXIOMS = [
  {
    id: 'B1',
    name: 'Distribution (K)',
    group: 'Belief (KD45)',
    latex: 'B(a,p) \\wedge B(a, p \\rightarrow q) \\rightarrow B(a, q)',
    quantify: ['a:A', 'p:P', 'q:P'],
    build: ({ a, p, q }) =>
      IMPL(AND(B(a, p), B(a, IMPL(p, q))), B(a, q)),
    togglable: true, // §4.1.5 — Log_A Sec − {B1} models bounded rationality
  },
  {
    id: 'B2',
    name: 'Consistency (D)',
    group: 'Belief (KD45)',
    latex: 'B(a,p) \\rightarrow \\neg B(a, \\neg p)',
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(B(a, p), NOT(B(a, NOT(p)))),
  },
  {
    id: 'B3',
    name: 'Positive introspection (4)',
    group: 'Belief (KD45)',
    latex: 'B(a,p) \\rightarrow B(a, B(a,p))',
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(B(a, p), B(a, B(a, p))),
  },
  {
    id: 'B4',
    name: 'Negative introspection (5)',
    group: 'Belief (KD45)',
    latex: '\\neg B(a,p) \\rightarrow B(a, \\neg B(a,p))',
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(NOT(B(a, p)), B(a, NOT(B(a, p)))),
  },
  {
    id: 'B5',
    name: 'Necessitation',
    group: 'Belief (KD45)',
    latex: '\\vdash p \\Rightarrow B(a, p)',
    quantify: ['a:A'],
    // necessitation is a rule, not a schema; we approximate by checking
    // every "obvious tautology" (⊤) is believed.
    build: ({ a }) => B(a, { type: 'top' }),
  },
  {
    id: 'I1',
    name: 'Intention distribution',
    group: 'Intention (KD)',
    latex: 'I(a,p) \\wedge I(a, p \\rightarrow q) \\rightarrow I(a, q)',
    quantify: ['a:A', 'p:P', 'q:P'],
    build: ({ a, p, q }) => IMPL(AND(I(a, p), I(a, IMPL(p, q))), I(a, q)),
  },
  {
    id: 'I2',
    name: 'Intention consistency',
    group: 'Intention (KD)',
    latex: 'I(a,p) \\rightarrow \\neg I(a, \\neg p)',
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(I(a, p), NOT(I(a, NOT(p)))),
  },
  {
    id: 'I3',
    name: 'Intention necessitation',
    group: 'Intention (KD)',
    latex: '\\vdash p \\Rightarrow I(a, p)',
    quantify: ['a:A'],
    build: ({ a }) => I(a, { type: 'top' }),
  },
  {
    id: 'IB1',
    name: 'Awareness of non-intention',
    group: 'Belief–Intention Bridge',
    latex: '\\neg I(a,p) \\rightarrow B(a, \\neg I(a,p))',
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(NOT(I(a, p)), B(a, NOT(I(a, p)))),
  },
  {
    id: 'IB2',
    name: 'Faithfulness of non-intention',
    group: 'Belief–Intention Bridge',
    latex: 'B(a, \\neg I(a,p)) \\rightarrow \\neg I(a,p)',
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(B(a, NOT(I(a, p))), NOT(I(a, p))),
  },
  {
    id: 'IB3',
    name: 'Awareness of intention',
    group: 'Belief–Intention Bridge',
    latex: 'I(a,p) \\rightarrow B(a, I(a,p))',
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(I(a, p), B(a, I(a, p))),
  },
  {
    id: 'IB4',
    name: 'Faithfulness of intention',
    group: 'Belief–Intention Bridge',
    latex: 'B(a, I(a,p)) \\rightarrow I(a,p)',
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(B(a, I(a, p)), I(a, p)),
  },
  {
    id: 'IB5',
    name: 'Intention–belief consistency',
    group: 'Belief–Intention Bridge',
    latex: 'I(a,p) \\rightarrow \\neg B(a, \\neg p)',
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(I(a, p), NOT(B(a, NOT(p)))),
  },
  {
    id: 'R1',
    name: 'Tautology revelation',
    group: 'Revelation',
    latex: '\\vdash p \\Rightarrow R(a, p)',
    quantify: ['a:A'],
    build: ({ a }) => R(a, { type: 'top' }),
  },
  {
    id: 'R2',
    name: 'Non-revelation of falsity',
    group: 'Revelation',
    latex: '\\vdash p \\Rightarrow \\neg R(a, \\neg p)',
    quantify: ['a:A'],
    build: ({ a }) => NOT(R(a, NOT({ type: 'top' }))),
  },
  {
    id: 'R3',
    name: 'Revelation closure under implication',
    group: 'Revelation',
    latex: '\\vdash p \\to q \\Rightarrow R(a,p) \\to R(a,q)',
    // approximation: for atomic p, q with p → q a model-validity at ⟨h,t⟩.
    quantify: ['a:A', 'p:P', 'q:P'],
    build: ({ a, p, q }) =>
      IMPL(IMPL(p, q), IMPL(R(a, p), R(a, q))),
  },
  {
    id: 'R4',
    name: 'Revelation collapse',
    group: 'Revelation',
    latex: 'R(a, \\exists b\\, R(b, p)) \\rightarrow R(a, p)',
    quantify: ['a:A', 'p:P'],
    // existential over b approximated as disjunction over all agents
    build: ({ a, p }, model) => {
      const disj = model.agents
        .map((bname) => R(A(bname), p))
        .reduce((acc, t) => (acc ? OR(acc, t) : t), null);
      return IMPL(R(a, disj || { type: 'bot' }), R(a, p));
    },
  },
  {
    id: 'BR1',
    name: 'Belief → revelation closure',
    group: 'Belief–Revelation Bridge',
    latex: '[B(a, p \\to q) \\wedge \\neg B(a, \\neg p)] \\to [R(a,p) \\to R(a,q)]',
    quantify: ['a:A', 'p:P', 'q:P'],
    build: ({ a, p, q }) =>
      IMPL(
        AND(B(a, IMPL(p, q)), NOT(B(a, NOT(p)))),
        IMPL(R(a, p), R(a, q)),
      ),
  },
  {
    id: 'BR2',
    name: 'Revelation introspection',
    group: 'Belief–Revelation Bridge',
    latex: 'R(a, p) \\rightarrow B(a, R(a, p))',
    quantify: ['a:A', 'p:P'],
    build: ({ a, p }) => IMPL(R(a, p), B(a, R(a, p))),
  },
  {
    id: 'G1',
    name: 'Singleton membership',
    group: 'Group',
    latex: 'Mem(a, [b]) \\leftrightarrow (a = b)',
    quantify: ['a:A', 'b:A'],
    build: ({ a, b }) => IFF(Mem(a, SING(b)), { type: a.name === b.name ? 'top' : 'bot' }),
  },
  {
    id: 'G2',
    name: 'Union membership',
    group: 'Group',
    latex: 'Mem(a, G_1 \\sqcup G_2) \\leftrightarrow Mem(a, G_1) \\vee Mem(a, G_2)',
    quantify: ['a:A', 'G1:G', 'G2:G'],
    build: ({ a, G1, G2 }) =>
      IFF(Mem(a, UNION(GR(G1), GR(G2))), OR(Mem(a, GR(G1)), Mem(a, GR(G2)))),
  },
  {
    id: 'G3',
    name: 'Intersection membership',
    group: 'Group',
    latex: 'Mem(a, G_1 \\sqcap G_2) \\leftrightarrow Mem(a, G_1) \\wedge Mem(a, G_2)',
    quantify: ['a:A', 'G1:G', 'G2:G'],
    build: ({ a, G1, G2 }) =>
      IFF(Mem(a, INTER(GR(G1), GR(G2))), AND(Mem(a, GR(G1)), Mem(a, GR(G2)))),
  },
];

function enumerate(model, sort) {
  if (sort === 'A') return model.agents.map((n) => ({ kind: 'agent', name: n, node: A(n) }));
  if (sort === 'G') return model.groups.map((g) => ({ kind: 'group', name: g.name, node: g.name }));
  if (sort === 'P') return model.propositions.map((n) => ({ kind: 'prop', name: n, node: Pa(n) }));
  if (sort === 'T') return model.timepoints.map((t) => ({ kind: 'time', name: String(t), node: { type: 'time', value: t } }));
  throw new Error(`cannot enumerate sort ${sort}`);
}

export function checkAxiom(ax, model) {
  // B1 is togglable — when disabled it is *not* checked (i.e. omitted from
  // the axiom system per §4.1.5).
  if (ax.togglable && ax.id === 'B1' && model.enableK === false) {
    return { id: ax.id, status: 'disabled', counterexamples: [] };
  }

  const quantSorts = (ax.quantify || []).map((q) => q.split(':'));
  const counterexamples = [];

  const rec = (depth, bindings, nodeBindings) => {
    if (counterexamples.length >= 3) return;
    if (depth === quantSorts.length) {
      const node = ax.build(nodeBindings, model);
      for (const h of model.histories) {
        for (const t of model.timepoints) {
          const env = new Env(model, h.id, t);
          let value;
          try { value = evalTerm(node, env); }
          catch (e) { value = false; }
          if (!value) {
            counterexamples.push({
              bindings: { ...bindings },
              h: h.id, t,
            });
            if (counterexamples.length >= 3) return;
          }
        }
      }
      return;
    }
    const [varName, sort] = quantSorts[depth];
    const dom = enumerate(model, sort);
    for (const d of dom) {
      const nb = { ...nodeBindings, [varName]: d.node };
      const bb = { ...bindings, [varName]: d.name };
      rec(depth + 1, bb, nb);
      if (counterexamples.length >= 3) return;
    }
  };

  rec(0, {}, {});
  return {
    id: ax.id,
    status: counterexamples.length === 0 ? 'pass' : 'fail',
    counterexamples,
  };
}

export function checkAllAxioms(model) {
  return AXIOMS.map((ax) => ({ axiom: ax, result: checkAxiom(ax, model) }));
}
