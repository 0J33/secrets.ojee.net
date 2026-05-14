# secrets.ojee.net

Interactive simulator and visualizer for the **Algebraic Logic of Secrets**
(`Log_A Sec`), based on the bachelor thesis of the same name by
Omar Gamal Eldin (German University in Cairo, 2025).

## What this is

A model checker and term evaluator for the formal system developed in §4.1 of
the thesis. Every axiom (B1–G3), theorem (T1–T7) and secrecy type (S₀–S₅) is
implemented as a checkable predicate over a finite VEL model
⟨D, 𝔄, b, i, r, h, &lt;⟩.

The simulator is entirely client-side — no backend required.

## Stack

- React 18 + Create React App
- KaTeX for math rendering
- Pure JS engine (no dependencies)

## Local development

```sh
npm install
npm start
# → http://localhost:3000
```

## Production build

```sh
npm run build
# → ./build  (static site, deploy anywhere)
```

## Deployment

Deployed via Cloudflare Pages at <https://secrets.ojee.net>.
