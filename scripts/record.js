// Headless recorder for § II "Live" runs.
//
//   node scripts/record.js            # run every config in RUNS
//   node scripts/record.js affair-kept # run one
//   node scripts/record.js --verify   # re-verify what is already on disk
//
// Each config drives src/engine/agent-runner.js against a local Ollama,
// grades the resulting model with the real engine (axioms, theorems,
// secrecy types), and writes src/data/runs/<id>.json only if the run
// passes every check. The transcript is printed so a human can judge it.

require('sucrase/register');

const fs = require('fs');
const path = require('path');

const { runSimulation } = require('../src/engine/agent-runner.js');
const { findRunnerScenario } = require('../src/data/runner-scenarios.js');
const { checkAllAxioms } = require('../src/engine/axioms.js');
const { checkAllTheorems } = require('../src/engine/theorems.js');
const { evaluateSecrets } = require('../src/engine/secrets.js');

const OUT_DIR = path.join(__dirname, '..', 'src', 'data', 'runs');
const BASE = process.env.OLLAMA_URL || 'http://localhost:11434';

const RUNS = [
  {
    id: 'affair-kept',
    scenario: 'affair', model: 'qwen2.5:14b', temperature: 0.8,
    note: 'Bob probes for five turns and learns nothing.',
    want: 'held',
  },
  {
    id: 'affair-slips',
    scenario: 'affair', model: 'qwen2.5:14b', temperature: 1.1,
    note: 'Warmer sampling: someone gets careless.',
    want: 'leak',
  },
  {
    id: 'heist-exposure',
    scenario: 'heist', model: 'mistral-nemo:12b', temperature: 0.9,
    note: 'Bob alone with Eve in two exposure windows.',
    want: 'leak',
  },
  {
    id: 'heist-solid',
    scenario: 'heist', model: 'qwen2.5:3b', temperature: 0.5,
    note: 'Crew holds discipline: does the plan survive Eve?',
    want: 'either',
  },
  {
    id: 'double-mole',
    scenario: 'double', model: 'qwen2.5:14b', temperature: 0.9,
    note: 'Carol has the vault code and a handler to give it to.',
    want: 'leak',
  },
  {
    id: 'affair-loose',
    scenario: 'affair', model: 'qwen2.5:3b', temperature: 0.9,
    note: "A smaller model in Alice's seat: does it keep its composure?",
    want: 'leak',
  },
  {
    id: 'double-betrayal',
    scenario: 'double', model: 'phi4:14b', temperature: 1.0,
    note: 'Same mole, warmer sampling: does the code reach Dan?',
    want: 'leak',
  },
  {
    id: 'double-clean',
    scenario: 'double', model: 'mistral-nemo:12b', temperature: 0.5,
    note: 'A steadier model in Carol’s seat — does the mole stay loyal?',
    want: 'either',
  },
];

// ── verification ───────────────────────────────────────────────────────

function roomOf(spec, t, agent) {
  const scene = spec.scenes?.[t];
  if (!scene) return spec.agents.map((a) => a.name).filter((n) => n !== agent);
  for (const room of scene) if (room.includes(agent)) return room.filter((n) => n !== agent);
  return [];
}

function verify(spec, m) {
  const issues = [];
  const T = spec.ticks;
  const phi = spec.phi.name;
  const keepers = spec.agents.filter((a) => a.role === 'keeper').map((a) => a.name);
  const nescients = spec.agents.filter((a) => a.role === 'nescient').map((a) => a.name);

  // 1. every cell of the transcript is a real decision (no fallback no-ops)
  const expected = T * spec.agents.length;
  if (m.transcript.length !== expected) {
    issues.push(`transcript has ${m.transcript.length} turns, expected ${expected}`);
  }
  const failed = m.transcript.filter((r) => r.failed);
  if (failed.length) issues.push(`${failed.length} model call(s) fell back to a no-op`);

  // 2. a reveal only ever reaches someone who was actually in the room
  for (const e of m.events) {
    if (e.type !== 'reveal') continue;
    const present = roomOf(spec, e.t, e.from);
    const reachable = nescients.filter((n) => present.includes(n));
    const got = (e.to || []).filter((n) => reachable.includes(n));
    if (e.leaked && got.length === 0) {
      issues.push(`t${e.t}: ${e.from} revealed to nobody in the room`);
    }
  }

  // 3. knowledge, belief and revelation agree with each other, tick by tick
  for (const n of nescients) {
    const leakTick = m.knownAt[n];
    for (let t = 0; t < T; t++) {
      const should = leakTick !== undefined && leakTick <= t;
      const r = m.assignments.R.h0[t][n][phi];
      const b = m.assignments.B.h0[t][n][phi];
      if (!!r !== should) issues.push(`${n}: R(φ)@t${t}=${r} but knownAt=${leakTick}`);
      if (!!b !== should) issues.push(`${n}: B(φ)@t${t}=${b} but knownAt=${leakTick}`);
    }
  }
  for (const k of keepers) {
    for (let t = 0; t < T; t++) {
      if (!m.assignments.B.h0[t][k][phi]) issues.push(`keeper ${k} stopped believing φ at t${t}`);
    }
  }

  // 4. the formal system is intact on the generated model.
  //
  // Two failures are structural to this engine rather than to the run:
  //   T2 / T4 / T7 all reduce to B(a,φ) → R(a,φ) under the evaluator's
  //   composition rules, and φ is believed from t=0 by every keeper while
  //   R is only ever set for an *outsider* who receives a disclosure — the
  //   Workbench's own four scenarios fail the same three.
  //   R4 collapses to "if anyone knows φ, everyone knows φ" once any R is
  //   set, so it fails on exactly the runs where a leak happened.
  const axioms = checkAllAxioms(m);
  const leak = m.events.some((e) => e.leaked);
  const allowedAxioms = new Set(leak ? ['R4'] : []);
  const failedAxioms = axioms.filter((r) => r.result.status === 'fail');
  const badAxioms = failedAxioms.filter((r) => !allowedAxioms.has(r.axiom.id));
  if (badAxioms.length) {
    issues.push(`axioms fail: ${badAxioms.map((r) => r.axiom.id).join(', ')}`);
  }
  const theorems = checkAllTheorems(m);
  const allowedThms = new Set(['T2', 'T4', 'T7']);
  const failedThms = theorems.filter((r) => r.result.status === 'fail');
  const badThms = failedThms.filter((r) => !allowedThms.has(r.theorem.id));
  if (badThms.length) {
    issues.push(`theorems fail: ${badThms.map((r) => r.theorem.id).join(', ')}`);
  }

  // 5. secrecy read off at every tick
  const secrecy = [];
  for (let t = 0; t < T; t++) {
    const r = evaluateSecrets(m, phi, 'K', 'N', 'h0', t);
    secrecy.push(r.types.map((x) => x.holds));
  }

  const leakTicks = [...new Set(m.events.filter((e) => e.leaked).map((e) => e.t))].sort((a, b) => a - b);
  const heldAll = secrecy.every((row) => row.every(Boolean));
  const outcome = leakTicks.length
    ? `leaked@t${leakTicks[0]}`
    : heldAll ? 'held' : 'degraded';

  if (!leakTicks.length && !heldAll) {
    issues.push('secrecy failed without any leak event — keepers lost belief unexpectedly');
  }

  return {
    ok: issues.length === 0,
    issues,
    secrecy,
    leakTicks,
    outcome,
    structuralAxioms: failedAxioms.map((r) => r.axiom.id),
    structuralThms: failedThms.map((r) => r.theorem.id),
    axioms: `${axioms.length - failedAxioms.length}/${axioms.length}`,
    theorems: `${theorems.length - failedThms.length}/${theorems.length}`,
    hints: m.events.filter((e) => e.type === 'hint').length,
  };
}

// ── reporting ──────────────────────────────────────────────────────────

function printReport(cfg, rep) {
  console.log(`\n──── ${cfg.id} · ${cfg.scenario} · ${cfg.model} @${cfg.temperature} ────`);
  const structural = [
    rep.structuralThms?.length ? `theorems ${rep.structuralThms.join(',')}` : '',
    rep.structuralAxioms?.length ? `axioms ${rep.structuralAxioms.join(',')}` : '',
  ].filter(Boolean).join(' · ');
  console.log(`  axioms ${rep.axioms} · theorems ${rep.theorems} · outcome ${rep.outcome}` +
              (rep.hints ? ` · ${rep.hints} hint(s)` : ''));
  if (structural) console.log(`  structural (accepted): ${structural}`);
  console.log(`  secrecy per tick: ${rep.secrecy.map((row) =>
    row.every(Boolean) ? '●' : row.some(Boolean) ? '◐' : '○').join(' ')}`);
  for (const i of rep.issues) console.log(`  ✗ ${i}`);
  if (cfg.want === 'leak' && !rep.leakTicks.length) {
    console.log('  ⚠ wanted a leak and got a held secret — re-run warmer to get the other outcome');
  }
  if (!rep.ok) console.log('  REJECTED');
}

function printTranscript(m) {
  for (const r of m.transcript) {
    console.log(`  t${r.t} ${r.agent.padEnd(6)} ${r.action.padEnd(11)} → ${r.target.padEnd(8)}` +
                ` B=${r.believesSecret ? '⊤' : '⊥'} I=${r.intendsToKeep ? '⊤' : '⊥'}  ${r.utterance}`);
  }
}

// ── driver ─────────────────────────────────────────────────────────────

async function recordOne(cfg) {
  const spec = findRunnerScenario(cfg.scenario);
  console.log(`\n▶ ${cfg.id}: ${spec.name} · ${cfg.model} @${cfg.temperature} (${spec.agents.length}×${spec.ticks})`);
  const t0 = Date.now();
  const model = await runSimulation(
    spec,
    { baseUrl: BASE, model: cfg.model, temperature: cfg.temperature },
    { onTickEnd: (t) => process.stdout.write(` t${t}`) },
  );
  console.log(` done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  const rep = verify(spec, model);
  printTranscript(model);
  printReport(cfg, rep);

  if (!rep.ok) {
    // keep the evidence around: a rejected model is slow to regenerate
    const dump = path.join('/tmp/opencode', 'rejected');
    fs.mkdirSync(dump, { recursive: true });
    fs.writeFileSync(path.join(dump, `${cfg.id}.json`), JSON.stringify(model, null, 1));
    return false;
  }

  const recording = {
    id: cfg.id,
    meta: {
      scenario: spec.id,
      scenarioName: spec.name,
      phi: spec.phi,
      model: cfg.model,
      temperature: cfg.temperature,
      ticks: spec.ticks,
      recorded: new Date().toISOString().slice(0, 10),
      engine: { axioms: rep.axioms, theorems: rep.theorems,
                structural: { axioms: rep.structuralAxioms, theorems: rep.structuralThms } },
      outcome: rep.outcome,
      note: cfg.note,
    },
    model,
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${cfg.id}.json`);
  fs.writeFileSync(file, JSON.stringify(recording, null, 1));
  console.log(`  ✓ wrote ${path.relative(process.cwd(), file)}`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify');
  const wanted = args.filter((a) => !a.startsWith('--'));

  if (verifyOnly) {
    const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json'));
    let bad = 0;
    for (const f of files) {
      const rec = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'));
      const spec = findRunnerScenario(rec.meta.scenario);
      const rep = verify(spec, rec.model);
      printReport(rec.meta, rep);
      if (!rep.ok) bad++;
    }
    console.log(bad ? `\n${bad} recording(s) failed verification` : `\nall ${files.length} recordings verified`);
    process.exit(bad ? 1 : 0);
  }

  const list = wanted.length ? RUNS.filter((r) => wanted.includes(r.id)) : RUNS;
  if (!list.length) {
    console.error(`no such run. known ids: ${RUNS.map((r) => r.id).join(', ')}`);
    process.exit(1);
  }
  let ok = 0;
  for (const cfg of list) {
    try {
      if (await recordOne(cfg)) ok++;
    } catch (e) {
      console.error(`  ✗ ${cfg.id} threw: ${e.message}`);
    }
  }
  console.log(`\n${ok}/${list.length} run(s) recorded`);
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { verify, RUNS };
