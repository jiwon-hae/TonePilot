// semanticRouter.js
// In-browser semantic intent router using TFJS + Universal Sentence Encoder
// Usage:
//   await initSemanticRouter();                 // once at startup
//   const r = await routeIntent("Revise this to be concise");
//   -> { intent: "revise", score: 0.79, averages: {...} }

let _useModel = null;
let _exampleEmbeds = null;
let _intentIndex = null;

const EXAMPLES = {
  proofread: [
    "Proofread this text for grammar and spelling.",
    "Check grammar and fix typos.",
    "Correct punctuation and spelling mistakes."
  ],
  revise: [
    "Revise this to be more formal.",
    "Rewrite for clarity and concision.",
    "Improve tone to be professional."
  ],
  draft: [
    "Draft an email to a recruiter.",
    "Write a short blog introduction.",
    "Compose a message based on these notes."
  ],
};

// heuristic fallback keywords if similarity is too low
const FALLBACK = {
  proofread: /\b(proofread|grammar|spelling|typo|correct)\b/i,
  revise: /\b(revise|rewrite|improve|clarity|concise|tone|formal|casual)\b/i,
  draft: /\b(draft|write|compose|create|email|cover letter|blog|message)\b/i,
};

// classification threshold — tweak for your UX
const THRESHOLD = 0.65;

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

export async function initSemanticRouter({ useCdn = true } = {}) {
  if (_useModel) return;

  // Load TFJS + USE (either from CDN or assume already loaded by bundler)
  if (useCdn) {
    if (!window.tf) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.9.0/dist/tf.min.js";
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    if (!window.use) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/universal-sentence-encoder@1.4.0/dist/universal-sentence-encoder.min.js";
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
  }

  _useModel = await window.use.load();

  // Pre-embed example prompts
  const exampleTexts = [];
  _intentIndex = [];
  for (const [intent, arr] of Object.entries(EXAMPLES)) {
    for (const t of arr) {
      exampleTexts.push(t);
      _intentIndex.push(intent);
    }
  }
  _exampleEmbeds = await _useModel.embed(exampleTexts);

  // warm-up a tiny embedding to make first real call snappy
  await _useModel.embed(["warm up"]);
}

export async function routeIntent(input) {
  if (!_useModel || !_exampleEmbeds) {
    throw new Error("Router not initialized. Call initSemanticRouter() first.");
  }
  const inEmb = await _useModel.embed([input]);
  const inVec = (await inEmb.array())[0];
  const exVecs = await _exampleEmbeds.array();

  const scores = { proofread: [], revise: [], draft: [] };
  for (let i = 0; i < exVecs.length; i++) {
    const intent = _intentIndex[i];
    const sim = cosineSim(inVec, exVecs[i]);
    scores[intent].push(sim);
  }

  // average score per intent
  const averages = {};
  let best = "other";
  let bestScore = 0.0;

  for (const k of Object.keys(scores)) {
    const arr = scores[k];
    const avg = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : -1;
    averages[k] = +avg.toFixed(3);
    if (avg > bestScore) { best = k; bestScore = avg; }
  }

  // below threshold? use light keyword fallback to avoid "other" on obvious cases
  if (bestScore < THRESHOLD) {
    if (FALLBACK.proofread.test(input)) best = "proofread";
    else if (FALLBACK.revise.test(input)) best = "revise";
    else if (FALLBACK.draft.test(input)) best = "draft";
    else best = "other";
  }

  return { intent: best, score: +bestScore.toFixed(3), averages };
}

// Optional helper: extract normalized fields for your handlers
export function normalizeFields(input, intent) {
  switch (intent) {
    case "proofread":
      return { text: input };
    case "revise": {
      const goalMatch = input.match(/\b(for|to)\s+(concise|clarity|formal|casual|short|long|professional)\b/i);
      return { text: input, goal: goalMatch?.[2]?.toLowerCase() };
    }
    case "draft":
      return { instructions: input };
    default:
      return { text: input };
  }
}