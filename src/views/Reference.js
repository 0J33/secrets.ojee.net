// Static reference card: axioms, theorems with proofs, secret types,
// symbol glossary. Pulls the same data the engine uses, so it stays in
// lockstep with the paper.

import React from 'react';
import { Tex } from '../components/Math';
import { AXIOMS } from '../engine/axioms';
import { THEOREMS } from '../engine/theorems';

const LogAB = <>Log<sub>A</sub>B</>;
const sigma = (s) => <>σ<sub>{s}</sub></>;

const REFS = [
  { n: 1,  cite: 'Bennett, Galton — A unifying semantics for time and events. Artificial Intelligence, 2004.' },
  { n: 2,  cite: 'Blackburn, de Rijke, Venema — Modal Logic. Cambridge University Press, 2001.' },
  { n: 3,  cite: 'Bolander — Self-Reference and Paradox. SEP, 2024.' },
  { n: 4,  cite: 'Fagin, Halpern, Moses, Vardi — Reasoning About Knowledge. MIT Press, 1995.' },
  { n: 5,  cite: 'Garson — Modal Logic. SEP, 2024.' },
  { n: 6,  cite: 'Halmos — The basic concepts of algebraic logic. JSL 23(2), 1958.' },
  { n: 7,  cite: 'Halpern, O’Neill — On the logic of secrecy. J. Computer Security 12(2), 2004.' },
  { n: 8,  cite: 'Hawke, Özgün, Berto — The fundamental problem of logical omniscience. JPL 49(4), 2020.' },
  { n: 9,  cite: <>Ismail — {LogAB}: a first-order non-paradoxical algebraic logic of belief. IGPL 20(5), 2012.</> },
  { n: 10, cite: 'Ismail — Stability in a commonsense ontology of states. COMMONSENSE 2013.' },
  { n: 11, cite: 'Ismail, Shafie — A commonsense theory of secrets. IOS Press FOIS, 2020.' },
  { n: 12, cite: 'Kowalski, Sergot — A logic-based calculus of events. New Generation Computing 4(1), 1986.' },
  { n: 13, cite: 'Meyer, van der Hoek — Epistemic Logic for AI and Computer Science. Cambridge, 2004.' },
];

const SYMBOLS = [
  { sym: '⊤ / ⊥', meaning: 'top / bottom of Boolean algebra P' },
  { sym: sigma('P'), meaning: 'sort of propositional (atemporal-state) terms' },
  { sym: sigma('A'), meaning: 'sort of individual / agent terms' },
  { sym: sigma('G'), meaning: 'sort of group terms' },
  { sym: sigma('T'), meaning: 'sort of time-point terms' },
  { sym: sigma('S'), meaning: 'sort of state terms (general)' },
  { sym: 'B(a, ϕ)', meaning: 'agent a believes proposition ϕ' },
  { sym: 'I(a, ϕ)', meaning: 'agent a intends ϕ' },
  { sym: 'R(a, ϕ)', meaning: 'ϕ has been revealed to a' },
  { sym: 'Mem(a, G)', meaning: 'a is a member of group G' },
  { sym: '[a]', meaning: 'singleton group containing only agent a' },
  { sym: '⊔ / ⊓', meaning: 'group union / intersection' },
  { sym: 'HoldsAt(ϕ, t)', meaning: 'ϕ holds at time t (along the active history)' },
  { sym: '⧆ ϕ', meaning: 'strict past confluence — ϕ holds in every strict predecessor of ⟨h,t⟩' },
  { sym: '□ ϕ / ◇ ϕ', meaning: 'modal necessity / possibility' },
  { sym: 't₁ ≺ t₂', meaning: 'temporal ordering predicate' },
];

const SECRETS = [
  { id: 'S₀', body: 'Every keeper believes ϕ, intends to keep it, and does not believe N has been told.' },
  { id: 'S₁', body: 'ϕ has not actually been revealed to any nescient.' },
  { id: 'S₂', body: 'Every keeper is consciously aware they are keeping a secret.' },
  { id: 'S₃', body: 'Keepers believe ϕ has not been revealed to any nescient.' },
  { id: 'S₄', body: 'Each keeper is aware of the identity of every other keeper.' },
  { id: 'S₅', body: 'Common belief: every keeper believes every keeper believes ϕ.' },
];

export default function Reference() {
  return (
    <div className="page">
      <div className="section-bar">
        <span className="sec-num">§ Ref</span>
        <h1>Reference card</h1>
        <span className="serif-it muted" style={{ marginLeft: 8 }}>
          everything the engine uses, in one place.
        </span>
      </div>

      <div className="paper-block">

      <h2><span className="sec-num">A</span> Symbol glossary</h2>
      <table className="zebra">
        <thead><tr><th style={{ width: '22%' }}>symbol</th><th>meaning</th></tr></thead>
        <tbody>
          {SYMBOLS.map((s) => (
            <tr key={s.sym}><td>{s.sym}</td><td>{s.meaning}</td></tr>
          ))}
        </tbody>
      </table>

      <h2><span className="sec-num">B</span> Axioms (§4.1.2)</h2>
      {['Belief (KD45)', 'Intention (KD)', 'Belief–Intention Bridge', 'Revelation', 'Belief–Revelation Bridge', 'Group'].map((grp) => (
        <div key={grp}>
          <h3>{grp}</h3>
          <table className="zebra">
            <thead>
              <tr><th style={{ width: 50 }}>id</th><th>statement</th><th style={{ width: 200 }}>name</th></tr>
            </thead>
            <tbody>
              {AXIOMS.filter((a) => a.group === grp).map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.id}</strong></td>
                  <td><Tex src={a.latex} /></td>
                  <td className="serif-it">{a.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <h2><span className="sec-num">C</span> Theorems (§4.1.3 – §4.1.4)</h2>
      {THEOREMS.map((th) => (
        <div key={th.id} style={{ marginBottom: 16 }}>
          <h3>{th.id}. <Tex src={th.latex} /></h3>
          <div className="tag-mono faint">
            depends on: {th.dependsOn.join(', ')}{th.breaksWithoutK ? ' — proof breaks if B1 is removed (§4.1.5)' : ''}
          </div>
          <div className="proof">
            {th.proof.map((line) => (
              <div key={line.line} className="proof-line">
                <span className="ln">{line.line}.</span>
                <span><Tex src={line.formula} /></span>
                <span className="cite">{line.cite}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <h2><span className="sec-num">D</span> Types of secrets (§2.2.3)</h2>
      <dl className="deflist">
        {SECRETS.map((s) => (
          <React.Fragment key={s.id}>
            <dt>{s.id}</dt>
            <dd>{s.body}</dd>
          </React.Fragment>
        ))}
      </dl>
      <p className="muted serif-it tiny">
        S₂ and S₃ hold iff a secret exists and every keeper believes ϕ has not been revealed (S₁).
        S₂ follows from S₅. S₄ implies S₅. If the secrecy condition explicitly states non-revelation
        to N, S is equivalent to S₃ (paper §2.2.3).
      </p>

      <h2><span className="sec-num">E</span> Bibliography</h2>
      <ol style={{ marginLeft: 24, fontFamily: 'var(--serif)' }}>
        {REFS.map((r) => (
          <li key={r.n} style={{ marginBottom: 4 }}>
            <span className="tag-mono" style={{ marginRight: 6 }}>[{r.n}]</span>
            {r.cite}
          </li>
        ))}
      </ol>
      </div>
    </div>
  );
}
