import React, { useState } from 'react';

const CHAPTERS = [
  { id: 'abstract', label: 'Abstract', page: 7 },
  { id: 'intro',    label: '1 · Introduction', page: 11 },
  { id: 'theory',   label: '2 · The Theory of Secrets', page: 13 },
  { id: 'algebraic',label: '3 · Algebraic Logic', page: 19 },
  { id: 'logasec',  label: '4 · Algebraic Logic of Secrets', page: 29 },
  { id: 'concl',    label: '5 · Conclusion & Future Work', page: 41 },
  { id: 'app',      label: 'Appendix A · Propositional & Modal Logic', page: 44 },
  { id: 'bib',      label: 'Bibliography', page: 48 },
];

const RESEARCHGATE = 'https://www.researchgate.net/publication/395107374_Algebraic_Logic_of_Secrets';

export default function Paper() {
  const [page, setPage] = useState(1);
  // Re-mount the iframe whenever the page changes — Chrome's built-in PDF
  // viewer ignores fragment changes when the URL is otherwise identical, so
  // forcing a fresh mount is the most reliable way to jump.
  const src = `/paper.pdf#page=${page}&zoom=page-width`;

  return (
    <div className="page">
      <div className="section-bar">
        <span className="sec-num">§ Paper</span>
        <h1>Algebraic Logic of Secrets</h1>
        <span className="serif-it muted" style={{ marginLeft: 8 }}>
          Omar Gamal Eldin · German University in Cairo · 29 May 2025
        </span>
        <div className="spacer" />
        <a className="btn ghost sm" href={RESEARCHGATE} target="_blank" rel="noreferrer">ResearchGate</a>
        <a className="btn ghost sm" href="/paper.pdf" target="_blank" rel="noreferrer">open PDF</a>
        <a className="btn ghost sm" href="/paper.pdf" download>download</a>
      </div>

      <div className="row" style={{ gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {CHAPTERS.map((c) => (
          <button key={c.id}
                  className={'btn sm ' + (c.page === page ? 'active' : 'ghost')}
                  onClick={() => setPage(c.page)}>
            {c.label}
          </button>
        ))}
      </div>

      <iframe
        key={page}
        className="pdf-frame"
        title="Algebraic Logic of Secrets (PDF)"
        src={src}
      />
    </div>
  );
}
