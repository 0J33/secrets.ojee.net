import React, { useEffect, useRef } from 'react';
import katex from 'katex';

export function Tex({ src, block = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(src, ref.current, { displayMode: block, throwOnError: false, strict: false });
    } catch (e) {
      ref.current.innerText = src;
    }
  }, [src, block]);
  return <span ref={ref} className={block ? 'katex-block' : 'katex-inline'} />;
}

export function TexBlock({ src }) { return <div className="formula-box"><Tex src={src} block /></div>; }
