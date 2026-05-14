// Recursive-descent parser for Log_A Sec formulas.
//
// Surface syntax (close to §4.1.1 with ASCII shortcuts):
//
//   ϕ ::=  ⊤ | ⊥ | atom | ¬ ϕ | ϕ ∧ ϕ | ϕ ∨ ϕ | ϕ → ϕ | ϕ ↔ ϕ
//        | B(a, ϕ) | I(a, ϕ) | R(a, ϕ)
//        | HoldsAt(ϕ, t) | t1 ≺ t2
//        | □ ϕ | ◇ ϕ | ⧆ ϕ
//        | Mem(a, g)
//        | ∀x:S. ϕ   |   ∃x:S. ϕ
//
//   group ::=  G | [a] | g ⊔ g | g ⊓ g
//
// ASCII fallbacks accepted:
//   T, F           for ⊤, ⊥
//   ~, !           for ¬
//   /\, &&, &      for ∧
//   \/, ||, |      for ∨
//   ->, =>         for →
//   <->, <=>       for ↔
//   [], box, []    for □
//   <>, <>         for ◇
//   *box           for ⧆
//   forall, exists for ∀, ∃
//   <              for ≺
//   U              for ⊔
//   ^              for ⊓

const KEYWORDS = new Set([
  'B', 'I', 'R', 'HoldsAt', 'Mem',
  'forall', 'exists', 'box', 'diamond', 'pastbox',
  'top', 'bot', 'T', 'F',
]);

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '(' || c === ')' || c === ',' || c === '[' || c === ']' || c === '.' || c === ':') {
      tokens.push({ kind: c, value: c }); i++; continue;
    }
    if (src.startsWith('<->', i) || src.startsWith('<=>', i)) {
      tokens.push({ kind: 'iff', value: '<->' }); i += 3; continue;
    }
    if (src.startsWith('->', i) || src.startsWith('=>', i) || src.startsWith('→', i)) {
      tokens.push({ kind: 'impl', value: '->' }); i += (src[i] === '→' ? 1 : 2); continue;
    }
    if (src.startsWith('↔', i)) { tokens.push({ kind: 'iff', value: '<->' }); i++; continue; }
    if (src.startsWith('/\\', i) || src.startsWith('∧', i) || src.startsWith('&&', i)) {
      tokens.push({ kind: 'and', value: '/\\' }); i += (src[i] === '∧' ? 1 : 2); continue;
    }
    if (src[i] === '&') { tokens.push({ kind: 'and', value: '&' }); i++; continue; }
    if (src.startsWith('\\/', i) || src.startsWith('∨', i) || src.startsWith('||', i)) {
      tokens.push({ kind: 'or', value: '\\/' }); i += (src[i] === '∨' ? 1 : 2); continue;
    }
    if (src[i] === '|') { tokens.push({ kind: 'or', value: '|' }); i++; continue; }
    if (src[i] === '~' || src[i] === '!' || src.startsWith('¬', i)) {
      tokens.push({ kind: 'not', value: '~' }); i++; continue;
    }
    if (src.startsWith('⊤', i)) { tokens.push({ kind: 'top', value: 'T' }); i++; continue; }
    if (src.startsWith('⊥', i)) { tokens.push({ kind: 'bot', value: 'F' }); i++; continue; }
    if (src.startsWith('□', i)) { tokens.push({ kind: 'box', value: 'box' }); i++; continue; }
    if (src.startsWith('◇', i)) { tokens.push({ kind: 'diamond', value: 'diamond' }); i++; continue; }
    if (src.startsWith('⧆', i)) { tokens.push({ kind: 'pastbox', value: 'pastbox' }); i++; continue; }
    if (src.startsWith('≺', i) || src[i] === '<') { tokens.push({ kind: 'lt', value: '<' }); i++; continue; }
    if (src.startsWith('⊔', i)) { tokens.push({ kind: 'gunion', value: '⊔' }); i++; continue; }
    if (src.startsWith('⊓', i)) { tokens.push({ kind: 'ginter', value: '⊓' }); i++; continue; }
    if (src.startsWith('∀', i)) { tokens.push({ kind: 'forall', value: '∀' }); i++; continue; }
    if (src.startsWith('∃', i)) { tokens.push({ kind: 'exists', value: '∃' }); i++; continue; }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const w = src.slice(i, j);
      if (KEYWORDS.has(w)) tokens.push({ kind: w, value: w });
      else tokens.push({ kind: 'ident', value: w });
      i = j; continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9]/.test(src[j])) j++;
      tokens.push({ kind: 'num', value: parseInt(src.slice(i, j), 10) });
      i = j; continue;
    }
    throw new Error(`Unexpected character at ${i}: '${c}'`);
  }
  tokens.push({ kind: 'eof', value: '' });
  return tokens;
}

class Parser {
  constructor(tokens) { this.t = tokens; this.p = 0; }
  peek(o = 0) { return this.t[this.p + o]; }
  eat(kind) {
    const tok = this.t[this.p];
    if (tok.kind !== kind) throw new Error(`expected ${kind} but got ${tok.kind} (${tok.value})`);
    this.p++; return tok;
  }
  match(...kinds) { return kinds.includes(this.t[this.p].kind); }

  parse() {
    const f = this.formula();
    if (this.t[this.p].kind !== 'eof') throw new Error(`extra input at token ${this.p}: ${this.t[this.p].value}`);
    return f;
  }

  // ϕ ::= ψ ( ↔ ψ )?
  formula() {
    let a = this.implFormula();
    while (this.match('iff')) {
      this.eat('iff');
      const b = this.implFormula();
      a = { type: 'iff', a, b };
    }
    return a;
  }
  implFormula() {
    let a = this.orFormula();
    if (this.match('impl')) {
      this.eat('impl');
      const b = this.implFormula(); // right associative
      a = { type: 'impl', a, b };
    }
    return a;
  }
  orFormula() {
    let a = this.andFormula();
    while (this.match('or')) {
      this.eat('or');
      const b = this.andFormula();
      a = { type: 'or', a, b };
    }
    return a;
  }
  andFormula() {
    let a = this.unaryFormula();
    while (this.match('and')) {
      this.eat('and');
      const b = this.unaryFormula();
      a = { type: 'and', a, b };
    }
    return a;
  }
  unaryFormula() {
    if (this.match('not')) { this.eat('not'); return { type: 'not', a: this.unaryFormula() }; }
    if (this.match('box')) { this.eat('box'); return { type: 'box', a: this.unaryFormula() }; }
    if (this.match('diamond')) { this.eat('diamond'); return { type: 'diamond', a: this.unaryFormula() }; }
    if (this.match('pastbox')) { this.eat('pastbox'); return { type: 'pastBox', a: this.unaryFormula() }; }
    if (this.match('forall')) {
      this.eat('forall');
      const v = this.eat('ident').value;
      this.eat(':');
      const s = this.eat('ident').value;
      this.eat('.');
      const body = this.unaryFormula();
      return { type: 'forall', var: v, sort: s, body };
    }
    if (this.match('exists')) {
      this.eat('exists');
      const v = this.eat('ident').value;
      this.eat(':');
      const s = this.eat('ident').value;
      this.eat('.');
      const body = this.unaryFormula();
      return { type: 'exists', var: v, sort: s, body };
    }
    return this.atom();
  }

  atom() {
    const tok = this.peek();
    if (tok.kind === '(') {
      this.eat('(');
      // Could be a time inequality "(t1 < t2)" or a parenthesised formula.
      // We commit to a formula and let the < operator be handled inline.
      const f = this.formula();
      this.eat(')');
      return f;
    }
    if (tok.kind === 'top' || tok.kind === 'T') { this.eat(tok.kind); return { type: 'top' }; }
    if (tok.kind === 'bot' || tok.kind === 'F') { this.eat(tok.kind); return { type: 'bot' }; }
    if (tok.kind === 'B' || tok.kind === 'I' || tok.kind === 'R') {
      const op = tok.kind;
      this.eat(op);
      this.eat('(');
      const ag = this.individual();
      this.eat(',');
      const prop = this.formula();
      this.eat(')');
      return { type: op, agent: ag, prop };
    }
    if (tok.kind === 'Mem') {
      this.eat('Mem');
      this.eat('(');
      const ag = this.individual();
      this.eat(',');
      const g = this.group();
      this.eat(')');
      return { type: 'Mem', agent: ag, group: g };
    }
    if (tok.kind === 'HoldsAt') {
      this.eat('HoldsAt');
      this.eat('(');
      const p = this.formula();
      this.eat(',');
      const t = this.timeTerm();
      this.eat(')');
      return { type: 'HoldsAt', prop: p, time: t };
    }
    if (tok.kind === 'ident') {
      this.eat('ident');
      return { type: 'atom', name: tok.value };
    }
    throw new Error(`unexpected token: ${tok.kind} (${tok.value})`);
  }

  individual() {
    const t = this.eat('ident');
    return { type: 'agent', name: t.value };
  }

  timeTerm() {
    if (this.match('num')) return { type: 'time', value: this.eat('num').value };
    const t = this.eat('ident');
    return { type: 'var', name: t.value };
  }

  group() {
    let g = this.groupAtom();
    while (this.match('gunion') || this.match('ginter')) {
      const op = this.peek().kind === 'gunion' ? 'union' : 'inter';
      this.eat(this.peek().kind);
      const r = this.groupAtom();
      g = { type: 'groupOp', op, a: g, b: r };
    }
    return g;
  }
  groupAtom() {
    if (this.match('[')) {
      this.eat('[');
      const a = this.individual();
      this.eat(']');
      return { type: 'singleton', agent: a };
    }
    const t = this.eat('ident');
    return { type: 'group', name: t.value };
  }
}

export function parseFormula(src) {
  const tokens = tokenize(src);
  return new Parser(tokens).parse();
}

// Pretty-print AST → unicode surface syntax (for echo / KaTeX bridging).
export function formatFormula(node) {
  switch (node.type) {
    case 'top': return '⊤';
    case 'bot': return '⊥';
    case 'atom': return node.name;
    case 'not': return `¬${formatFormula(node.a)}`;
    case 'and': return `(${formatFormula(node.a)} ∧ ${formatFormula(node.b)})`;
    case 'or':  return `(${formatFormula(node.a)} ∨ ${formatFormula(node.b)})`;
    case 'impl': return `(${formatFormula(node.a)} → ${formatFormula(node.b)})`;
    case 'iff': return `(${formatFormula(node.a)} ↔ ${formatFormula(node.b)})`;
    case 'B': return `B(${formatFormula(node.agent)}, ${formatFormula(node.prop)})`;
    case 'I': return `I(${formatFormula(node.agent)}, ${formatFormula(node.prop)})`;
    case 'R': return `R(${formatFormula(node.agent)}, ${formatFormula(node.prop)})`;
    case 'agent': return node.name;
    case 'box': return `□${formatFormula(node.a)}`;
    case 'diamond': return `◇${formatFormula(node.a)}`;
    case 'pastBox': return `⧆${formatFormula(node.a)}`;
    case 'HoldsAt': return `HoldsAt(${formatFormula(node.prop)}, ${formatFormula(node.time)})`;
    case 'time': return String(node.value);
    case 'var': return node.name;
    case 'Mem': return `Mem(${formatFormula(node.agent)}, ${formatFormula(node.group)})`;
    case 'group': return node.name;
    case 'singleton': return `[${formatFormula(node.agent)}]`;
    case 'groupOp': return `(${formatFormula(node.a)} ${node.op === 'union' ? '⊔' : '⊓'} ${formatFormula(node.b)})`;
    case 'forall': return `∀${node.var}:${node.sort}. ${formatFormula(node.body)}`;
    case 'exists': return `∃${node.var}:${node.sort}. ${formatFormula(node.body)}`;
    default: return `?${node.type}`;
  }
}
