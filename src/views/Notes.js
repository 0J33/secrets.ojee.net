import React, { useEffect, useState } from 'react';

const KEY = 'logasec.notes.v1';

export default function Notes() {
  const [text, setText] = useState(() => localStorage.getItem(KEY) || '');
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const handle = setTimeout(() => {
      localStorage.setItem(KEY, text);
      setSaved(true);
    }, 400);
    return () => clearTimeout(handle);
  }, [text]);

  const clear = () => {
    if (window.confirm('Clear all notes? This cannot be undone.')) {
      setText('');
      localStorage.removeItem(KEY);
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logasec-notes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="sec-num">§ Notes</span>
        <h1>Marginalia</h1>
        <span className="serif-it muted" style={{ marginLeft: 8 }}>
          your scratch pad — saved to this browser
        </span>
        <div className="spacer" />
        <span className={'tag-mono ' + (saved ? 'faint' : '')}>{saved ? 'saved' : 'editing…'}</span>
        <button className="btn sm ghost" onClick={download}>download .txt</button>
        <button className="btn sm ghost" onClick={clear}>clear</button>
      </div>

      <textarea
        className="notes-textarea"
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(false); }}
        placeholder="Write your annotations here. — Anything you'd jot in a paper margin: open questions, counterexamples to try, candidate axioms, references to chase."
      />

      <p className="muted tiny" style={{ marginTop: 12 }}>
        Notes are stored in your browser’s <code>localStorage</code> under the key
        <code style={{ marginLeft: 4 }}>{KEY}</code>. They never leave this device.
      </p>
    </div>
  );
}
