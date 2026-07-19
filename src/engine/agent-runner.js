// Drive a Log_A Sec model from real LLM agents.
//
// LLMs generate the *trace*; the symbolic engine (secrets.js / axioms /
// theorems) stays the judge. Each tick, every agent decides an action from
// its persona + private knowledge + what it has heard so far. We resolve
// those actions into revelation / belief / intention facts and write them
// into the exact assignment tables ensureAssignments() fills — so the output
// is a drop-in `scenarios.js`-shaped model, plus a transcript and leak-event
// log the visualiser consumes.

import { ensureAssignments } from './model';
import { chatJSON } from './llm';

// Structured-output contract for one agent-turn.
const DECISION_SCHEMA = {
  type: 'object',
  properties: {
    believesSecret: { type: 'boolean' },  // believes φ is true and still intact
    intendsToKeep:  { type: 'boolean' },  // intends to keep φ from outsiders
    action: { type: 'string', enum: ['stay_silent', 'ask', 'deflect', 'hint', 'reveal'] },
    target: { type: 'string' },           // an agent present, or "everyone" / "none"
    utterance: { type: 'string' },
    reasoning: { type: 'string' },
  },
  required: ['believesSecret', 'intendsToKeep', 'action', 'target', 'utterance', 'reasoning'],
};

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Which agents share a room with `me` at tick t (default: everyone together).
function roommates(spec, t, me) {
  const scene = spec.scenes?.[t];
  if (!scene) return spec.agents.map((a) => a.name).filter((n) => n !== me);
  for (const room of scene) {
    if (room.includes(me)) return room.filter((n) => n !== me);
  }
  return []; // not present anywhere this tick
}

function buildSystem(spec, agent, knowsPhi) {
  const keepers = spec.agents.filter((a) => a.role === 'keeper').map((a) => cap(a.name));
  const outsiders = spec.agents.filter((a) => a.role === 'nescient').map((a) => cap(a.name));
  let role;
  if (agent.role === 'keeper') {
    role = `You are a KEEPER of φ: you know φ and want to keep it from the outsiders.`;
  } else if (knowsPhi) {
    role = `You began as an OUTSIDER but you have since LEARNED φ. You may spread it, trade it, or sit on it.`;
  } else {
    role = `You are an OUTSIDER: you do NOT know φ. You are curious and may probe the others to find it out.`;
  }
  return [
    `You are ${cap(agent.name)}, a person in a social simulation about secrecy.`,
    agent.persona,
    ``,
    `The secret φ is: "${spec.phi.label}".`,
    role,
    `Keepers: ${keepers.join(', ') || '(none)'}. Outsiders: ${outsiders.join(', ') || '(none)'}.`,
    ``,
    `Each turn choose exactly ONE action and report your inner state honestly:`,
    `  stay_silent — say nothing of consequence`,
    `  ask — probe someone for information`,
    `  deflect — steer away from φ`,
    `  hint — dangerously allude to φ without stating it outright`,
    `  reveal — actually disclose φ to someone present`,
    `Only choose "reveal" if you truly intend to disclose φ this turn. Set "target" to a person present, or "everyone".`,
    `Respond ONLY with JSON matching the schema. Keep "utterance" to one or two sentences.`,
  ].join('\n');
}

function buildUser(t, present, heard) {
  const lines = [`Turn t=${t}.`];
  lines.push(present.length ? `Present with you: ${present.map(cap).join(', ')}.` : `You are alone this turn.`);
  if (heard.length) {
    lines.push(`Recently you heard:`);
    for (const h of heard.slice(-6)) lines.push(`  ${cap(h.from)}: "${h.utterance}"`);
  }
  lines.push(`What do you do?`);
  return lines.join('\n');
}

// Fallback decision if a model call fails/aborts mid-run — a safe no-op.
function noop(agent, knowsPhi) {
  return {
    believesSecret: agent.role === 'keeper' || knowsPhi,
    intendsToKeep: agent.role === 'keeper',
    action: 'stay_silent', target: 'none', utterance: '', reasoning: '(no response)',
    _failed: true,
  };
}

export function buildModelShell(spec) {
  const agents = spec.agents.map((a) => a.name);
  const keepers = spec.agents.filter((a) => a.role === 'keeper').map((a) => a.name);
  const nescients = spec.agents.filter((a) => a.role === 'nescient').map((a) => a.name);
  const groups = [
    { name: 'K', members: keepers },
    { name: 'N', members: nescients },
    ...(spec.groups || []),
  ];
  const m = {
    name: spec.name,
    description: spec.description,
    agents,
    propositions: [spec.phi.name],
    groups,
    timepoints: Array.from({ length: spec.ticks }, (_, i) => i),
    histories: [{ id: 'h0', parent: null }],
    assignments: { B: {}, I: {}, R: {} },
    holds: {},
    enableK: true,
    secrecyCondition: spec.phi.name,
    // extras (ignored by the engine, read by the visualiser):
    roles: Object.fromEntries(spec.agents.map((a) => [a.name, a.role])),
    transcript: [],
    events: [],
    knownAt: {},   // agent → first tick it knew φ
    meta: { phiLabel: spec.phi.label },
  };
  ensureAssignments(m);
  return m;
}

// Run the whole simulation. `callbacks` lets the UI stream progress:
//   onTickStart(t), onAgentResult(t, agentName, decision), onTickEnd(t, model), onDone(model)
export async function runSimulation(spec, opts = {}, callbacks = {}) {
  const { baseUrl = '', model: llmModel, temperature = 0.7, signal } = opts;
  const H = 'h0';
  const m = buildModelShell(spec);
  const phi = spec.phi.name;

  const knows = new Set(spec.agents.filter((a) => a.role === 'keeper' || a.knowsPhi).map((a) => a.name));
  for (const a of knows) m.knownAt[a] = 0;
  const heardBy = Object.fromEntries(spec.agents.map((a) => [a.name, []])); // observation logs

  for (let t = 0; t < spec.ticks; t++) {
    callbacks.onTickStart?.(t);

    // φ objectively holds throughout (it is a real secret).
    m.holds[H][t][phi] = true;

    // Snapshot the pre-tick knowledge so all agents act simultaneously.
    const presentOf = {};
    for (const a of spec.agents) presentOf[a.name] = roommates(spec, t, a.name);

    const decisions = {};
    for (const agent of spec.agents) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
      const knowsPhi = knows.has(agent.name);
      let decision;
      try {
        decision = await chatJSON({
          baseUrl, model: llmModel, temperature, signal,
          system: buildSystem(spec, agent, knowsPhi),
          user: buildUser(t, presentOf[agent.name], heardBy[agent.name]),
          schema: DECISION_SCHEMA,
        });
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        decision = noop(agent, knowsPhi);
        decision.reasoning = `(error: ${e.message})`;
      }
      decisions[agent.name] = decision;
      callbacks.onAgentResult?.(t, agent.name, decision);
    }

    // ── Resolve decisions into engine facts ────────────────────────────
    // Disclosure: a reveal reaches every outsider sharing the room. Hints
    // build tension (logged) but do not collapse secrecy.
    const utterancesThisTick = [];
    for (const agent of spec.agents) {
      const d = decisions[agent.name];
      const present = presentOf[agent.name];
      if (d.utterance) utterancesThisTick.push({ from: agent.name, to: present, utterance: d.utterance });

      m.transcript.push({
        t, agent: agent.name, action: d.action,
        target: (d.target || 'none').toLowerCase(),
        utterance: d.utterance || '', reasoning: d.reasoning || '',
        believesSecret: !!d.believesSecret, intendsToKeep: !!d.intendsToKeep,
        failed: !!d._failed,
      });

      if (d.action === 'reveal' || d.action === 'hint') {
        // Targets = named present agent(s) or everyone present.
        const tgt = (d.target || '').toLowerCase();
        let recipients = present;
        if (tgt && tgt !== 'everyone' && tgt !== 'all' && tgt !== 'none') {
          recipients = present.filter((n) => n === tgt);
          if (recipients.length === 0) recipients = present; // model named someone absent
        }
        const nescientTargets = recipients.filter((n) => m.roles[n] === 'nescient');
        if (d.action === 'reveal') {
          for (const n of nescientTargets) {
            for (let tt = t; tt < spec.ticks; tt++) m.assignments.R[H][tt][n][phi] = true;
            if (!(n in m.knownAt)) m.knownAt[n] = t;
            knows.add(n); // a leaked outsider can now gossip onward
          }
        }
        if (nescientTargets.length || d.action === 'hint') {
          m.events.push({
            t, type: d.action, from: agent.name,
            to: recipients, leaked: d.action === 'reveal' && nescientTargets.length > 0,
          });
        }
      }
    }

    // Belief & intention tables, written AFTER disclosure so newly-leaked
    // outsiders count as knowing φ this tick. B(a,φ) tracks belief in the
    // secret *content* — i.e. knowledge of φ — not the model's mood; the
    // agent's self-reported nervousness lives in the transcript instead.
    // Intention is per-tick (a keeper who reveals stops intending to keep).
    for (const agent of spec.agents) {
      const name = agent.name;
      m.assignments.B[H][t][name][phi] = knows.has(name);
      m.assignments.I[H][t][name][phi] = !!decisions[name].intendsToKeep;
    }

    // Everyone in a room hears what was said there this tick (fed next tick).
    for (const u of utterancesThisTick) {
      for (const listener of u.to) {
        heardBy[listener]?.push({ from: u.from, utterance: u.utterance });
      }
    }

    callbacks.onTickEnd?.(t, m);
  }

  callbacks.onDone?.(m);
  return m;
}

export { DECISION_SCHEMA };
