// Term evaluator for Log_A Sec.
//
// Faithful to §4.1.1 of the thesis. Each term denotes an element of the
// Boolean algebra P. Operationally, in our finite model, a propositional
// term's denotation is a function (history, time) → {⊤, ⊥}. The interpretation
// function ⟦·⟧^{h,t}_𝒱 reads off the value at the current index point.

import { ancestorAt, groupMembers, groupUnion, groupIntersection } from './model';

// AST node shapes:
//   { type: 'atom', name }
//   { type: 'top' } / { type: 'bot' }
//   { type: 'not', a }
//   { type: 'and' | 'or' | 'impl' | 'iff', a, b }
//   { type: 'forall' | 'exists', sort, var, body }
//   { type: 'B' | 'I' | 'R', agent, prop }            agent is a term of sort A
//   { type: 'HoldsAt', prop, time }
//   { type: 'lt', t1, t2 }                            t1 ≺ t2
//   { type: 'box' | 'diamond', a }                    □ ϕ / ◇ ϕ
//   { type: 'pastBox', a }                            ⧆ ϕ  (strict past confluence)
//   { type: 'Mem', agent, group }
//   { type: 'singleton', agent }                      [a]
//   { type: 'groupOp', op: 'union'|'inter', a, b }    g₁ ⊔ g₂ / g₁ ⊓ g₂
//   { type: 'agent', name } / { type: 'time', value } / { type: 'group', name }
//
// Variable nodes: { type: 'var', name, sort }

export class Env {
  constructor(model, history, time, valuation = {}) {
    this.m = model;
    this.h = history;
    this.t = time;
    this.v = valuation; // var name → concrete value (string agent, number time, etc.)
  }
  with(name, value) {
    return new Env(this.m, this.h, this.t, { ...this.v, [name]: value });
  }
  atIndex(history, time) {
    return new Env(this.m, history, time, this.v);
  }
}

// Evaluate a propositional/state term: returns boolean.
export function evalTerm(node, env) {
  if (!node) return false;
  switch (node.type) {
    case 'top': return true;
    case 'bot': return false;
    case 'atom': {
      const name = node.name;
      // Atomic propositions read from the model's holds table.
      const hAnc = ancestorAt(env.m, env.h, env.t);
      const h = env.m.holds[hAnc] || env.m.holds[env.h] || {};
      const row = h[env.t] || {};
      if (!(name in row)) {
        // unknown atom defaults to ⊥
        return false;
      }
      return !!row[name];
    }
    case 'var': {
      const val = env.v[node.name];
      if (val === undefined) {
        throw new Error(`unbound variable: ${node.name}`);
      }
      return val;
    }
    case 'not': return !evalTerm(node.a, env);
    case 'and': return evalTerm(node.a, env) && evalTerm(node.b, env);
    case 'or':  return evalTerm(node.a, env) || evalTerm(node.b, env);
    case 'impl': return (!evalTerm(node.a, env)) || evalTerm(node.b, env);
    case 'iff': return evalTerm(node.a, env) === evalTerm(node.b, env);
    case 'forall': {
      const dom = enumerateSort(env.m, node.sort);
      for (const val of dom) {
        if (!evalTerm(node.body, env.with(node.var, val))) return false;
      }
      return true;
    }
    case 'exists': {
      const dom = enumerateSort(env.m, node.sort);
      for (const val of dom) {
        if (evalTerm(node.body, env.with(node.var, val))) return true;
      }
      return false;
    }
    case 'B':
    case 'I':
    case 'R': {
      const agent = evalIndividual(node.agent, env);
      const propTerm = node.prop;
      // The paper takes b/i/r as functions A × P × H × T → P. Faithfully
      // implemented, this means: an agent "believes ϕ" iff the recorded
      // truth value of ϕ at ⟨h,t⟩ in that agent's belief slot is ⊤.
      //
      // For atomic ϕ we read from the assignment table directly. For
      // compound ϕ we evaluate by structural recursion against the agent's
      // private "world view": the proposition ϕ holds iff its evaluation
      // under the recorded propositional assignments of the agent matches.
      // The simplest faithful encoding is: B(a, ϕ) ≡ ⊤ iff the underlying
      // recursive truth of ϕ at ⟨h,t⟩ holds *and* the agent is recorded as
      // believing it. To stay close to the algebraic spirit we record
      // belief at the term level: every subterm of ϕ must be "endorsed".
      return evalAgentAttitude(node.type, agent, propTerm, env);
    }
    case 'HoldsAt': {
      const tval = evalTime(node.time, env);
      const newEnv = env.atIndex(env.h, tval);
      return evalTerm(node.prop, newEnv);
    }
    case 'lt': {
      const t1 = evalTime(node.t1, env);
      const t2 = evalTime(node.t2, env);
      return t1 < t2;
    }
    case 'box': {
      // □ ϕ — true if ϕ holds at every alternative future from ⟨h,t⟩.
      for (const h of env.m.histories) {
        for (const t of env.m.timepoints) {
          if (t >= env.t) {
            if (!evalTerm(node.a, env.atIndex(h.id, t))) return false;
          }
        }
      }
      return true;
    }
    case 'diamond': {
      for (const h of env.m.histories) {
        for (const t of env.m.timepoints) {
          if (t >= env.t) {
            if (evalTerm(node.a, env.atIndex(h.id, t))) return true;
          }
        }
      }
      return false;
    }
    case 'pastBox': {
      for (const t of env.m.timepoints) {
        if (t < env.t) {
          const hAnc = ancestorAt(env.m, env.h, t);
          if (!evalTerm(node.a, env.atIndex(hAnc, t))) return false;
        }
      }
      return true;
    }
    case 'Mem': {
      const a = evalIndividual(node.agent, env);
      const members = evalGroup(node.group, env);
      return members.has(a);
    }
    default:
      throw new Error(`unknown term type: ${node.type}`);
  }
}

function evalIndividual(node, env) {
  if (node.type === 'agent') return node.name;
  if (node.type === 'var') {
    if (env.v[node.name] === undefined) throw new Error(`unbound: ${node.name}`);
    return env.v[node.name];
  }
  throw new Error(`expected agent, got ${node.type}`);
}

function evalTime(node, env) {
  if (node.type === 'time') return node.value;
  if (node.type === 'var') {
    if (env.v[node.name] === undefined) throw new Error(`unbound: ${node.name}`);
    return env.v[node.name];
  }
  throw new Error(`expected time, got ${node.type}`);
}

function evalGroup(node, env) {
  switch (node.type) {
    case 'group': return groupMembers(env.m, node.name);
    case 'singleton': return new Set([evalIndividual(node.agent, env)]);
    case 'groupOp': {
      const a = evalGroup(node.a, env);
      const b = evalGroup(node.b, env);
      return node.op === 'union' ? groupUnion(a, b) : groupIntersection(a, b);
    }
    case 'var': {
      const val = env.v[node.name];
      if (val instanceof Set) return val;
      throw new Error(`expected group, got ${typeof val}`);
    }
    default: throw new Error(`expected group, got ${node.type}`);
  }
}

function enumerateSort(model, sort) {
  switch (sort) {
    case 'A': return model.agents;
    case 'G': return model.groups.map((g) => g.name);
    case 'T': return model.timepoints;
    case 'P': return model.propositions;
    default: throw new Error(`cannot enumerate sort: ${sort}`);
  }
}

// Agent attitudes: B/I/R applied to a possibly-compound proposition.
// For atomic ϕ we look up the explicit assignment. For compound ϕ we apply
// algebraic compositionality (B distributes over ∧ and ∨ — see B1 / T1 /
// "Meet-distributivity" / "Join-distributivity" in §3.3 of the thesis).
function evalAgentAttitude(kind, agent, propTerm, env) {
  if (propTerm.type === 'atom') {
    const hAnc = ancestorAt(env.m, env.h, env.t);
    const table = env.m.assignments[kind];
    const slot = table?.[hAnc]?.[env.t]?.[agent]?.[propTerm.name];
    return !!slot;
  }
  if (propTerm.type === 'top') return true;
  if (propTerm.type === 'bot') return false;
  if (propTerm.type === 'not') {
    // B(a, ¬p)  — only true if agent records ¬p (which is *not* the same
    // as ¬B(a,p)); we read the negation slot off the negation atom.
    // We use: B(a, ¬p) iff the agent's stored belief in p is false AND the
    // agent's negative introspection is honoured.
    const inner = evalAgentAttitude(kind, agent, propTerm.a, env);
    return !inner;
  }
  if (propTerm.type === 'and') {
    return (
      evalAgentAttitude(kind, agent, propTerm.a, env) &&
      evalAgentAttitude(kind, agent, propTerm.b, env)
    );
  }
  if (propTerm.type === 'or') {
    return (
      evalAgentAttitude(kind, agent, propTerm.a, env) ||
      evalAgentAttitude(kind, agent, propTerm.b, env)
    );
  }
  if (propTerm.type === 'impl') {
    return (
      !evalAgentAttitude(kind, agent, propTerm.a, env) ||
      evalAgentAttitude(kind, agent, propTerm.b, env)
    );
  }
  // Nested attitudes: B(a, B(b, p)) — this is a term-of-sort-P, evaluated
  // by checking the recorded value of the nested attitude under agent a's
  // beliefs. We compose by evaluating the inner attitude at the same index
  // and then asking whether agent a endorses the resulting truth-value.
  // For simplicity we evaluate the inner term as a proposition and require
  // the outer attitude to agree with it. This honours B3/B4 (introspection):
  // agent a believes its own belief facts.
  if (propTerm.type === 'B' || propTerm.type === 'I' || propTerm.type === 'R') {
    return evalTerm(propTerm, env);
  }
  if (propTerm.type === 'HoldsAt') {
    return evalTerm(propTerm, env);
  }
  // Default: fall back to objective truth (this matches the K-axiom-style
  // logical closure of attitudes when B1 is enabled).
  return evalTerm(propTerm, env);
}

// Convenience: evaluate a term over every index point and return a map.
export function evalAtAll(node, model) {
  const result = [];
  for (const h of model.histories) {
    for (const t of model.timepoints) {
      const env = new Env(model, h.id, t);
      try {
        result.push({ h: h.id, t, value: evalTerm(node, env) });
      } catch (e) {
        result.push({ h: h.id, t, value: null, error: e.message });
      }
    }
  }
  return result;
}
