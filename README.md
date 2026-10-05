# secrets.ojee.net

Interactive simulator and visualizer for the **Algebraic Logic of Secrets**
(`Log_A Sec`), based on the bachelor thesis of the same name by
Omar Gamal Eldin (German University in Cairo, 2025).

## What this is

A model checker and term evaluator for the formal system developed in §4.1 of
the thesis. Every axiom (B1–G3), theorem (T1–T7) and secrecy type (S₀–S₅) is
implemented as a checkable predicate over a finite VEL model
⟨D, 𝔄, b, i, r, h, &lt;⟩.

The simulator is entirely client-side — no backend required. Two surfaces sit
on top of that engine:

- **§ I Workbench** — edit a model by hand (agents, propositions, groups,
  B/I/R at each ⟨h, t⟩) and watch the axiom, theorem and secrecy reports.
- **§ II Runs** — replay recorded conversations a language model actually had,
  one turn at a time, with every decision written into the model and graded.
  The deployed site cannot call a model of its own, so runs are recorded on
  one machine and shipped with the page (see below).
- **§ III–VI** — the thesis PDF, a reference card, the guide, a scratch pad.

`src/views/Guide.js` is the plain-language manual: what the symbols mean, how
to use both surfaces, and why three theorems are red on every model.

## Recording runs

`scripts/record.js` drives `src/engine/agent-runner.js` against a local
Ollama, grades the result — axioms, theorems, secrecy per turn, plus sanity
checks on the transcript (no dropped model calls, belief/revelation/knowledge
agree with each other, a reveal can only reach someone in the room) — and
writes `src/data/runs/<id>.json` only if every check passes.

```sh
OLLAMA_ORIGINS=* ollama serve      # if it isn't already running
node scripts/record.js             # every config in RUNS
node scripts/record.js heist-solid # just one
node scripts/record.js --verify    # re-check the recordings on disk
```

New recordings appear in § II on the next build; `src/data/recordings.js` is
the curated index (title + blurb) that orders them in the table.

Two failures are structural to this engine rather than to a particular run, and
verification accepts them wherever they are expected:

- **T2 / T4 / T7** all amount to `B(a, p) → R(a, p)`. Keepers believe φ from
  turn 0 without ever being told, so the implication is false on every model —
  the four built-in scenarios fail the same three.
- **R4** collapses to "if anyone has been told, everyone has" as soon as any
  R is set, so it fails on exactly the runs where a leak happened.

## Stack

- React 18 + Create React App
- KaTeX for math rendering
- Pure JS engine (no dependencies)

## Local development

```sh
npm install
npm start
# → http://localhost:3000  (the dev proxy forwards /api to localhost:11434)
```

## Production build

```sh
CI=true npm run build
# → ./build  (static site, deploy anywhere)
```

## Deployment

Deploy is a push to `main` — Cloudflare Pages builds from the repo and serves
<https://secrets.ojee.net>.
