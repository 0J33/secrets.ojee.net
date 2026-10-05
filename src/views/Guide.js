import React from 'react';
import { Tex } from '../components/Math';

const SECTIONS = [
  ['what', 'What this is'],
  ['tour', 'How to use it'],
  ['words', 'The words you need'],
  ['grades', 'The six secrecy grades, in English'],
  ['how', 'How it works underneath'],
  ['reports', 'Reading the reports'],
  ['syntax', 'Formula syntax'],
  ['faithful', 'What “faithful to the paper” means'],
  ['limits', 'What it does not do'],
  ['example', 'Worked example — Alice keeps a secret'],
  ['incomplete', 'Where the paper is incomplete'],
];

const go = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function Guide() {
  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <div className="section-bar">
        <span className="sec-num">§ Guide</span>
        <h1>Reader’s &amp; user’s guide</h1>
        <span className="serif-it muted" style={{ marginLeft: 8 }}>
          no prior logic required
        </span>
      </div>

      <div className="paper-block">

      <p className="guide-lede">
        This site checks claims about <em>secrets</em>: who knows one, who intends to keep it, who
        has been told, and whether it is still intact at a given moment. You describe a small world,
        and the site answers — mechanically, the same way every time — whether the rules you care
        about hold in that world.
      </p>

      <ul className="guide-toc">
        {SECTIONS.map(([id, label], i) => (
          <li key={id}>
            <button type="button" onClick={() => go(id)}>
              <span className="n">{i + 1}</span>{label}
            </button>
          </li>
        ))}
      </ul>

      {/* ── 1 ─────────────────────────────────────────────────────── */}
      <h2 id="what"><span className="sec-num">1</span> What this is</h2>
      <p>
        A <strong>model checker</strong> for <em>Log<sub>A</sub>Sec</em>, the Algebraic Logic of
        Secrets developed in Omar Gamal Eldin’s bachelor thesis (German University in Cairo, 2025).
        The thesis is here in § III; you do not need to have read it. Everything it states in
        symbols, this site states as tables you can click.
      </p>
      <p>Three things to do here:</p>
      <ul style={{ marginLeft: 24 }}>
        <li>
          <strong>§ I Workbench</strong> — build a world by hand (agents, a secret, who believes
          what) and read off which axioms, theorems and secrecy grades hold in it.
        </li>
        <li>
          <strong>§ II Runs</strong> — watch conversations a language model actually had, one turn
          at a time, with every decision converted into facts and graded by the same engine.
        </li>
        <li>
          <strong>§ III–VI</strong> — the thesis PDF, a reference card of every symbol and rule the
          engine uses, this guide, and a scratch pad.
        </li>
      </ul>

      {/* ── 2 ─────────────────────────────────────────────────────── */}
      <h2 id="tour"><span className="sec-num">2</span> How to use it</h2>

      <h3>The Workbench</h3>
      <ol className="guide-steps">
        <li>Pick one of the four scenarios in the bar at the top — they are pre-built worlds.</li>
        <li>
          <strong>Left column:</strong> the world itself. Agents, propositions, groups, and the
          grid of <code>B</code> / <code>I</code> / <code>R</code> values for the currently
          selected point in time. Click any cell to flip it.
        </li>
        <li>
          <strong>Centre:</strong> a diagram of who believes what, a branching timeline, and a
          formula box. Click any point ⟨h, t⟩ on the timeline to move there — the whole page
          follows your position.
        </li>
        <li>
          <strong>Right column:</strong> the verdicts. The <em>secret inspector</em> shows which of
          the six secrecy grades hold right now and which clause failed; below it, the axiom and
          theorem reports.
        </li>
        <li>
          <strong>Branch:</strong> “+ branch history” forks an alternative future from the current
          turn, drawn like a git branch. Values before the fork are shared; after it they can
          diverge.
        </li>
        <li>
          <strong>Formula box:</strong> type any term in the language —{' '}
          <code>B(alice, p) -&gt; R(alice, p)</code> — and evaluate it at the current point and at
          every point in the model.
        </li>
        <li>
          The <strong>K axiom (B1)</strong> switch drops logical omniscience from the system
          (thesis §4.1.5). Toggle it and watch theorem T4’s <em>proof</em> get marked as broken.
        </li>
      </ol>

      <h3>The Runs</h3>
      <ol className="guide-steps">
        <li>
          The table lists every recorded run: who played, with which model, and — in the middle —
          a six-by-<em>n</em> grid of the secrecy grades, one column per turn.
        </li>
        <li>Select a row, then press <span className="tag-mono">▶</span> or drag the slider.</li>
        <li>
          Watch three things at once: the agent diagram (a filled dot means <em>knows the
          secret</em>, a red arrow is a leak), the six-lane secrecy strip, and the transcript of
          what was said.
        </li>
        <li>
          Compare runs. One ends all green — nobody ever broke. Another goes green, green, green,
          then <em>hatched red everywhere</em> on the turn somebody talked: the grades are a
          ladder, and a revealed secret fails every rung.
        </li>
        <li>
          “save run” exports the run as a JSON file; “open run file” loads one back — that is how
          runs are shared, since this page has no server.
        </li>
      </ol>

      {/* ── 3 ─────────────────────────────────────────────────────── */}
      <h2 id="words"><span className="sec-num">3</span> The words you need</h2>
      <p>
        Six symbols carry the whole system. If you can read this table, you can read everything
        else on the site.
      </p>
      <table className="zebra plain-table">
        <thead><tr><th style={{ width: '18%' }}>term</th><th>plain English</th></tr></thead>
        <tbody>
          <tr>
            <td>φ <span className="muted">(the secretum)</span></td>
            <td>The secret itself, written as a statement: “Alice is having an affair”, “the vault code is 7-3-9”.</td>
          </tr>
          <tr>
            <td>B(a, φ)</td>
            <td>“a believes φ.” In the runs, believing the secret is the same as knowing it.</td>
          </tr>
          <tr>
            <td>I(a, φ)</td>
            <td>“a intends φ.” For secrecy that reads: <em>a</em> means to keep φ from the outsiders.</td>
          </tr>
          <tr>
            <td>R(a, φ)</td>
            <td>“φ has been revealed to a” — somebody actually told them. Believing it and having
              been told are different facts, and the logic keeps them apart.</td>
          </tr>
          <tr>
            <td>K / N</td>
            <td>K is the group of <em>keepers</em> (who know), N the group of <em>nescients</em>
              (who must not find out).</td>
          </tr>
          <tr>
            <td>⟨h, t⟩</td>
            <td>An <em>index point</em>: turn <em>t</em> on future <em>h</em>. Histories are the
              branches — every branch shares the same turns, and each point has exactly one past.</td>
          </tr>
          <tr>
            <td>model</td>
            <td>The whole world: every fact, at every point, on every branch. What you edit in the
              Workbench; what a run produces.</td>
          </tr>
          <tr>
            <td>axiom / theorem</td>
            <td>A rule (axiom) or a result derived from rules (theorem) that must hold everywhere
              in the model. The engine checks all 22 axioms and all 7 theorems on every point of
              your model.</td>
          </tr>
          <tr>
            <td>model checking</td>
            <td>Asking “is this rule true in <em>this</em> world?” — the opposite of a theorem
              prover, which asks whether it is true in <em>every</em> world.</td>
          </tr>
        </tbody>
      </table>

      {/* ── 4 ─────────────────────────────────────────────────────── */}
      <h2 id="grades"><span className="sec-num">4</span> The six secrecy grades, in English</h2>
      <p>
        The paper grades a secret from S₀ to S₅ (§2.2.3). Think of them as rungs on a ladder: the
        higher the rung, the more of the group is on the same page about the secret being safe.
        Every rung above S₀ <em>includes</em> S₀, so once the secret is out they all fail together.
      </p>
      <table className="zebra plain-table">
        <thead>
          <tr><th style={{ width: '10%' }}>grade</th><th style={{ width: '34%' }}>in plain English</th><th>it fails when…</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>S₀</td>
            <td>The secret is intact: every keeper believes it, means to keep it, and does not
              think it has been told.</td>
            <td>an outsider is revealed φ, or a keeper stops believing φ.</td>
          </tr>
          <tr>
            <td>S₁</td>
            <td>Nobody has actually been told. The objective fact, no opinions involved.</td>
            <td>the first disclosure happens — that is the whole point of S₁.</td>
          </tr>
          <tr>
            <td>S₂</td>
            <td>Every keeper knows they are a keeper — nobody is in on it by accident.</td>
            <td>a keeper does not register that they are holding a secret.</td>
          </tr>
          <tr>
            <td>S₃</td>
            <td>The keepers believe it has not been told.</td>
            <td>the leak happens (and here the keepers’ belief tracks the fact, so S₃ falls with S₁).</td>
          </tr>
          <tr>
            <td>S₄</td>
            <td>Each keeper knows who the other keepers are.</td>
            <td>a keeper cannot account for the rest of the circle.</td>
          </tr>
          <tr>
            <td>S₅</td>
            <td>Common belief: every keeper believes every keeper believes it is safe.</td>
            <td>the circle loses that shared understanding — the first crack in any conspiracy.</td>
          </tr>
        </tbody>
      </table>
      <div className="note">
        <p>
          <strong>Why the strip is all green and then all red.</strong> The grades are evaluated as
          a ladder, so a public leak inside the group drops all six on the same turn — you are
          watching a cliff, not six independent dials. A run that never leaks stays green
          throughout; that is the picture of a secret that held.
        </p>
      </div>

      {/* ── 5 ─────────────────────────────────────────────────────── */}
      <h2 id="how"><span className="sec-num">5</span> How it works underneath</h2>
      <p>Three moving parts, and only one of them is clever:</p>

      <div className="guide-cols">
        <div>
          <h4>1 · The world is a table</h4>
          <p>
            For every index point ⟨h, t⟩ the model stores four columns of truth values: is φ true,
            does each agent believe it, do they intend to keep it, has it been revealed to them.
            That is the entire model. Nothing else is stored — every other claim is computed.
          </p>
        </div>
        <div>
          <h4>2 · The rules are formulas</h4>
          <p>
            The 22 axioms, 7 theorems and 6 secrecy grades are formulas over that table, evaluated
            point by point. No guessing, no sampling: the same table always produces the same
            verdicts, which is why two people opening the same run see the same result.
          </p>
        </div>
        <div>
          <h4>3 · The talk is the model’s (Runs only)</h4>
          <p>
            On a run, each agent is a language model with a persona, present in specific rooms each
            turn. It picks one action — stay silent, ask, deflect, hint, or reveal — and the runner
            writes that action into the table: a reveal to someone present sets R for them from that
            turn onward, B tracks who knows, I who means to keep it. Then part 2 grades it.
          </p>
        </div>
      </div>

      <p style={{ marginTop: 14 }}>
        So the language model writes the story and the engine keeps score. If the model says
        something silly, you will see it in the transcript — but the grades never become fiction.
        Runs are recorded on one machine with{' '}
        <a href="https://ollama.com" target="_blank" rel="noreferrer">Ollama</a> and shipped with
        the page, because this site has no server to call a model from.
      </p>

      {/* ── 6 ─────────────────────────────────────────────────────── */}
      <h2 id="reports"><span className="sec-num">6</span> Reading the reports</h2>
      <p>
        A green pip means the rule held at <em>every</em> point of the model. A red pip carries a
        counterexample — hover it to see the point ⟨h, t⟩ and the agents where it first failed.
      </p>
      <div className="note">
        <p>
          <strong>Why T2, T4 and T7 are red on everything.</strong> All three amount to
          <em> “if an agent believes φ, then φ has been revealed to them.”</em> Keepers believe the
          secret from turn 0 without ever being told — they are its source — so the implication is
          false on every model here, including the four built-in scenarios. It marks a real
          distinction in the language (“knows it” vs “was told it”), not a broken setup. Axioms
          still show 22/22: the failing instance of the bridge rule BR1 sits outside the
          quantifier range the checker enumerates.
        </p>
        <p>
          <strong>Why R4 goes red after a leak.</strong> R4 is read here as “if anyone has been
          told, everyone has”, so a run where exactly one outsider learned the secret fails it.
          Both behaviours are consequences of how the thesis’s rules are evaluated on a finite
          table, and both are visible in the paper’s own scenarios.
        </p>
        <p>
          <strong>The “proof” pip</strong> on T4 means the published derivation cites the K axiom
          (B1). Turn B1 off in the Workbench and the proof is marked broken even if the formula
          still happens to hold — that is thesis §4.1.5, bounded rationality.
        </p>
      </div>

      {/* ── 7 ─────────────────────────────────────────────────────── */}
      <h2 id="syntax"><span className="sec-num">7</span> Formula syntax</h2>
      <p>The evaluator accepts Unicode and ASCII forms interchangeably.</p>
      <table className="zebra">
        <thead><tr><th>operator</th><th>unicode</th><th>ascii</th><th>example</th></tr></thead>
        <tbody>
          <tr><td>negation</td><td>¬</td><td><code>~</code> or <code>!</code></td><td><code>~B(alice, p)</code></td></tr>
          <tr><td>conjunction</td><td>∧</td><td><code>/\</code> or <code>&amp;&amp;</code></td><td><code>B(a, p) /\ B(a, q)</code></td></tr>
          <tr><td>disjunction</td><td>∨</td><td><code>\/</code> or <code>||</code></td><td><code>p \/ q</code></td></tr>
          <tr><td>implication</td><td>→</td><td><code>-&gt;</code> or <code>=&gt;</code></td><td><code>B(alice, p) -&gt; R(alice, p)</code></td></tr>
          <tr><td>biconditional</td><td>↔</td><td><code>&lt;-&gt;</code></td><td><code>R(a, p) &lt;-&gt; R(a, R(a, p))</code></td></tr>
          <tr><td>belief / intention / revelation</td><td colSpan={2}><code>B(a, ϕ)</code> · <code>I(a, ϕ)</code> · <code>R(a, ϕ)</code></td><td /></tr>
          <tr><td>group membership</td><td colSpan={2}><code>Mem(a, G)</code></td><td><code>Mem(alice, K)</code></td></tr>
          <tr><td>holds-at</td><td colSpan={2}><code>HoldsAt(ϕ, t)</code></td><td><code>HoldsAt(p, 2)</code></td></tr>
          <tr><td>strict past</td><td>⧆</td><td><code>pastbox</code></td><td><code>pastbox B(alice, p)</code></td></tr>
          <tr><td>necessity / possibility</td><td>□ / ◇</td><td><code>box</code> / <code>diamond</code></td><td><code>box (B(a, p) -&gt; R(a, p))</code></td></tr>
          <tr><td>group operations</td><td>⊔ ⊓</td><td colSpan={2}>built into Mem(·, ·)</td></tr>
          <tr><td>quantifiers</td><td>∀ ∃</td><td><code>forall</code> / <code>exists</code></td><td><code>forall a:A. (B(a, p) -&gt; R(a, p))</code></td></tr>
        </tbody>
      </table>

      {/* ── 8 ─────────────────────────────────────────────────────── */}
      <h2 id="faithful"><span className="sec-num">8</span> What “faithful to the paper” means here</h2>
      <p>
        The simulator implements exactly the language of §4.1.1, the axiom system of §4.1.2 and the
        theorems of §4.1.3, with proofs reproduced line-by-line from §4.1.4. The secret types in
        §2.2.3 are expressed in <em>Log<sub>A</sub>Sec</em> terms — something the paper itself does
        not do (the paper defines them in FOML at Chapter 2 and does not reformulate them inside
        Log<sub>A</sub>Sec). Stripping that one step out makes the simulator a direct extension of
        the paper rather than a departure from it.
      </p>
      <p>
        Time is implemented as the VEL branching-time structure of §2.3: histories share the time
        domain, each index point ⟨h, t⟩ has a unique past, and multiple alternative futures may
        diverge from a branch. The ⧆ operator (strict past confluence) and the modal □/◇ operators
        are implemented accordingly.
      </p>

      {/* ── 9 ─────────────────────────────────────────────────────── */}
      <h2 id="limits"><span className="sec-num">9</span> What this simulator does <em>not</em> do</h2>
      <ul style={{ marginLeft: 24 }}>
        <li>
          <strong>It is not a theorem prover.</strong> The Theorem report shows whether a schema
          <em>semantically holds</em> on the current finite model. The line-by-line proofs from
          §4.1.4 are rendered as text in the Reference tab, but they are not re-derived from the
          axioms by the engine.
        </li>
        <li>
          <strong>Event-update rules are not built in.</strong> The paper does not axiomatise how
          an event modifies B / I / R; you can simulate change manually by editing the assignment
          table at each time point, but no rule fires automatically. (In a <em>run</em>, the
          runner does this translation from the models’ chosen actions.)
        </li>
        <li>
          <strong>Quantifier domains are finite.</strong> Universal quantification is interpreted
          as a finite conjunction over the agents, propositions, groups, or time points declared
          in the current model.
        </li>
        <li>
          <strong>The deployed site cannot generate new runs.</strong> It is a static file with no
          backend; recording a run needs a local model — see § II for the two-line recipe.
        </li>
      </ul>

      {/* ── 10 ────────────────────────────────────────────────────── */}
      <h2 id="example"><span className="sec-num">10</span> Worked example — Alice keeps a secret</h2>
      <p>
        Load the “Alice’s Secret” scenario in the Workbench. The model has two agents (Alice, Bob),
        one proposition (<em>affair</em>), two groups (K = {'{alice}'}, N = {'{bob}'}), and four
        time points along a single history.
      </p>
      <p>The interesting facts at every ⟨h, t⟩ are:</p>
      <div className="formula-box">
        <Tex src="B(\text{alice}, \text{affair}) \;\wedge\; I(\text{alice}, \text{affair}) \;\wedge\; \neg R(\text{bob}, \text{affair})" block />
      </div>
      <p>
        Open the Secret inspector with ϕ = affair, K = K, N = N: all six S<sub>i</sub> evaluate to
        ⊤. In the Theorem report, T2/T4/T7 are red for the reason in §6 — Alice believes φ and was
        never told it. Toggle the K-axiom off: T4’s <em>proof</em> in § IV is now marked as broken,
        because line 4 of the derivation cites B1.
      </p>
      <p>
        Now branch a new history at t=2 and flip R(bob, affair) to ⊤ along the new branch. S₁ drops
        to ⊥. Then, at t=3 along the branched history, flip Alice’s B(alice, affair) to ⊥ (she has
        learned of the leak): S₀ falls with it.
      </p>
      <p>
        The same story without any clicking: § II has runs of this exact shape — pick one and watch
        the strip go from six green lanes to six hatched ones on the turn someone talked.
      </p>

      {/* ── 11 ────────────────────────────────────────────────────── */}
      <h2 id="incomplete"><span className="sec-num">11</span> Where the paper is incomplete</h2>
      <p className="muted">
        Three places where the simulator extends what the paper makes explicit:
      </p>
      <ul style={{ marginLeft: 24 }}>
        <li>
          The secret types S<sub>i</sub> are encoded inside Log<sub>A</sub>Sec terms, not as the
          FOML predicate <em>Secret</em>(ϕ, K, N, C, t) of §2.2.1 — the paper never reformulates
          secrecy inside the algebraic language.
        </li>
        <li>
          The interpretation of B / I / R on compound propositions follows KD45/KD distributivity
          (the K-style closure of attitudes). The paper assumes but does not pin down the
          recursive interpretation of nested attitudes; we make it explicit.
        </li>
        <li>
          The branching VEL semantics is implemented operationally; the paper carries it as
          scaffolding but does not let it interact with the axiom system, so the temporal
          modalities are an extension on the simulator side too.
        </li>
      </ul>
      </div>
    </div>
  );
}
