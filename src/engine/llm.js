// Thin, provider-agnostic LLM backend.
//
// Default target is a local Ollama instance (native /api/chat) reached
// same-origin so the CRA dev proxy (package.json "proxy") forwards it to
// localhost:11434 with no CORS setup. Set a full baseUrl to talk to any
// OpenAI-compatible / Ollama endpoint directly.
//
// Nothing here runs until the user starts a simulation, so no VRAM is
// touched at import time.

const DEFAULT_BASE = ''; // '' → same-origin → dev proxy → localhost:11434

export function ollamaBase(baseUrl) {
  // Normalise: '' (proxy), or 'http://host:port', or '.../api' → strip trailing /api.
  let b = (baseUrl ?? DEFAULT_BASE).trim().replace(/\/+$/, '');
  b = b.replace(/\/api$/, '');
  return b;
}

// List installed models. Returns [] on any failure (offline / no Ollama).
export async function listModels(baseUrl, signal) {
  const base = ollamaBase(baseUrl);
  try {
    const res = await fetch(`${base}/api/tags`, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || [])
      .map((m) => ({ name: m.name, size: m.size, params: m.details?.parameter_size }))
      .sort((a, b) => (a.size || 0) - (b.size || 0)); // smallest first (VRAM-friendly default)
  } catch {
    return [];
  }
}

// One structured chat completion. `schema` is a JSON Schema object passed to
// Ollama's `format` for constrained decoding. Returns the parsed object.
export async function chatJSON({ baseUrl, model, system, user, schema, temperature = 0.7, numCtx = 4096, signal }) {
  const base = ollamaBase(baseUrl);
  const body = {
    model,
    stream: false,
    format: schema,
    options: { temperature, num_ctx: numCtx },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`LLM ${res.status}: ${txt.slice(0, 200) || res.statusText}`);
  }
  const data = await res.json();
  const content = data?.message?.content ?? '';
  return parseLoose(content);
}

// Models occasionally wrap JSON in prose or code fences despite constrained
// decoding; recover the first balanced object.
function parseLoose(text) {
  if (typeof text !== 'string') return text;
  const t = text.trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch { /* fall through */ }
  }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(t.slice(start, end + 1)); } catch { /* fall through */ }
  }
  throw new Error('could not parse model output as JSON');
}
