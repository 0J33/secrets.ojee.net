import React from 'react';
import { Tex } from '../components/Math';

export default function Guide() {
  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <div className="section-bar">
        <span className="sec-num">§ Guide</span>
        <h1>Reader’s & user’s guide</h1>
      </div>

      <div className="paper-block">

      <h2><span className="sec-num">1</span> What this simulator is</h2>
      <p>
        This is a model checker and term evaluator for <em>Log<sub>A</sub>Sec</em>, the
        Algebraic Logic of Secrets developed in the bachelor thesis of the same name
        (Omar Gamal Eldin, GUC, 2025).
      </p>
      <p>
        The engine is faithful to §4.1 of the paper. Each axiom (B1–G3), each theorem
        (T1–T7) and each secrecy type (S₀–S₅) is implemented as a checkable predicate
        over a finite VEL model ⟨D, 𝔄, b, i, r, h, &lt;⟩.
      </p>

      <h2><span className="sec-num">2</span> Quick start</h2>
      <ol style={{ marginLeft: 24 }}>
        <li>Pick a scenario from the row of buttons at the top of the Simulator tab.</li>
        <li>Click an index point ⟨h, t⟩ in the timeline to navigate.</li>
        <li>Watch the Axiom and Theorem reports update on the right — any failing schema is
            flagged with a counterexample.</li>
        <li>In the Secret inspector, pick ϕ, K and N and read off which S<sub>i</sub> hold.</li>
        <li>Open the Formula evaluator at the bottom of the centre column to type your own
            Log<sub>A</sub>Sec term and evaluate it across every index point.</li>
        <li>Toggle the K-axiom switch in the header to see §4.1.5 in action: T4’s proof breaks.</li>
      </ol>

      <h2><span className="sec-num">3</span> Formula syntax</h2>
      <p>The evaluator accepts Unicode and ASCII forms interchangeably.</p>
      <table className="zebra">
        <thead><tr><th>operator</th><th>unicode</th><th>ascii</th><th>example</th></tr></thead>
        <tbody>
          <tr><td>negation</td><td>¬</td><td><code>~</code> or <code>!</code></td><td><code>~B(alice, p)</code></td></tr>
          <tr><td>conjunction</td><td>∧</td><td><code>/\\</code> or <code>&amp;&amp;</code></td><td><code>B(a, p) /\ B(a, q)</code></td></tr>
          <tr><td>disjunction</td><td>∨</td><td><code>\\/</code> or <code>||</code></td><td><code>p \/ q</code></td></tr>
          <tr><td>implication</td><td>→</td><td><code>-&gt;</code> or <code>=&gt;</code></td><td><code>B(alice, p) -&gt; R(alice, p)</code></td></tr>
          <tr><td>biconditional</td><td>↔</td><td><code>&lt;-&gt;</code></td><td><code>R(a, p) &lt;-&gt; R(a, R(a, p))</code></td></tr>
          <tr><td>belief / intention / revelation</td><td colSpan={2}><code>B(a, ϕ)</code> · <code>I(a, ϕ)</code> · <code>R(a, ϕ)</code></td><td/></tr>
          <tr><td>group membership</td><td colSpan={2}><code>Mem(a, G)</code></td><td><code>Mem(alice, K)</code></td></tr>
          <tr><td>holds-at</td><td colSpan={2}><code>HoldsAt(ϕ, t)</code></td><td><code>HoldsAt(p, 2)</code></td></tr>
          <tr><td>strict past</td><td>⧆</td><td><code>pastbox</code></td><td><code>pastbox B(alice, p)</code></td></tr>
          <tr><td>necessity / possibility</td><td>□ / ◇</td><td><code>box</code> / <code>diamond</code></td><td><code>box (B(a, p) -&gt; R(a, p))</code></td></tr>
          <tr><td>group operations</td><td>⊔ ⊓</td><td colSpan={2}>built into Mem(·, ·)</td></tr>
          <tr><td>quantifiers</td><td>∀ ∃</td><td><code>forall</code> / <code>exists</code></td><td><code>forall a:A. (B(a, p) -&gt; R(a, p))</code></td></tr>
        </tbody>
      </table>

      <h2><span className="sec-num">4</span> What “faithful to the paper” means here</h2>
      <p>
        The simulator implements exactly the language of §4.1.1, the axiom system of
        §4.1.2 and the theorems of §4.1.3, with proofs reproduced line-by-line from
        §4.1.4. The secret types in §2.2.3 are expressed in <em>Log<sub>A</sub>Sec</em>
        terms — something the paper itself does not do (the paper defines them in
        FOML at Chapter 2 and does not reformulate them inside Log<sub>A</sub>Sec).
        Stripping that one step out makes the simulator a direct extension of the
        paper rather than a departure from it.
      </p>
      <p>
        Time is implemented as the VEL branching-time structure of §2.3: histories
        share the time domain, each index point ⟨h, t⟩ has a unique past, and
        multiple alternative futures may diverge from a branch. The ⧆ operator
        (strict past confluence) and the modal □/◇ operators are implemented
        accordingly.
      </p>

      <h2><span className="sec-num">5</span> What this simulator does <em>not</em> do</h2>
      <ul style={{ marginLeft: 24 }}>
        <li>
          <strong>It is not a theorem prover.</strong> The Theorem report shows whether a
          schema <em>semantically holds</em> on the current finite model. The
          line-by-line proofs from §4.1.4 are rendered as text in the Reference tab, but
          they are not re-derived from the axioms by the engine.
        </li>
        <li>
          <strong>Event-update rules are not built in.</strong> The paper does not
          axiomatise how an event modifies B / I / R; you can simulate change manually
          by editing the assignment table at each time point, but no rule fires
          automatically.
        </li>
        <li>
          <strong>Quantifier domains are finite.</strong> Universal quantification is
          interpreted as a finite conjunction over the agents, propositions, groups, or
          time points declared in the current model.
        </li>
      </ul>

      <h2><span className="sec-num">6</span> Worked example — Alice keeps a secret</h2>
      <p>
        Load the “Alice’s Secret” scenario. The model has two agents (Alice, Bob),
        one proposition (<em>affair</em>), two groups (K = {'{alice}'}, N = {'{bob}'}),
        and four time points along a single history.
      </p>
      <p>The interesting facts at every (h, t) =:</p>
      <div className="formula-box">
        <Tex src="B(\text{alice}, \text{affair}) \;\wedge\; I(\text{alice}, \text{affair}) \;\wedge\; \neg R(\text{bob}, \text{affair})" block />
      </div>
      <p>
        Open the Secret inspector with ϕ = affair, K = K, N = N. All six S<sub>i</sub>
        evaluate to ⊤. Toggle the K-axiom off in the header — T4 stays semantically
        true on this trivially-introspective model, but its <em>proof</em> (in the
        Reference tab) is now marked as broken because line 4 of the derivation cites
        B1.
      </p>
      <p>
        Now branch a new history at t=2 and flip R(bob, affair) to ⊤ along the new
        branch. Watch S₁ drop to ⊥. Then, at t=3 along the branched history, flip
        Alice’s B(alice, affair) to ⊥ (she has learned of the leak): S₀ now falls
        with it.
      </p>

      <h2><span className="sec-num">7</span> Where the paper is incomplete</h2>
      <p className="muted">
        Three places where the simulator extends what the paper makes explicit:
      </p>
      <ul style={{ marginLeft: 24 }}>
        <li>
          The secret types S<sub>i</sub> are encoded inside Log<sub>A</sub>Sec terms,
          not as the FOML predicate <em>Secret</em>(ϕ, K, N, C, t) of §2.2.1 — the
          paper never reformulates secrecy inside the algebraic language.
        </li>
        <li>
          The interpretation of B / I / R on compound propositions follows
          KD45/KD distributivity (the K-style closure of attitudes). The paper
          assumes but does not pin down the recursive interpretation of nested
          attitudes; we make it explicit.
        </li>
        <li>
          The branching VEL semantics is implemented operationally; the paper
          carries it as scaffolding but does not let it interact with the axiom
          system, so the temporal modalities are an extension on the simulator
          side too.
        </li>
      </ul>
      </div>
    </div>
  );
}
