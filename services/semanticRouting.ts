// src/services/semanticRouting.ts
import { PromptService } from "./promptService";
import { ClassifierService } from "./classifierService";

export type Intent = "proofread" | "revise" | "draft" | "other";

export interface Classification {
  intent: Intent;
  score: number;
  via: "rules" | "keywords" | "llm" | "fallback" | "llm-unavailable" | "llm-failed";
  details?: Record<string, any>;
}

export type Normalized =
  | { type: "proofread"; text: string }
  | { type: "revise"; text: string; goal: string | null }
  | { type: "draft"; instructions: string }
  | { type: "other"; text: string };

export interface RouterOptions {
  threshold?: number;
  enableLLMFallback?: boolean;
}

const DEFAULTS: Required<RouterOptions> = {
  threshold: 0.55,
  enableLLMFallback: true,
};

// Fast patterns
const PATTERNS: Record<Exclude<Intent, "other">, RegExp> = {
  proofread: /\b(proofread|grammar|spelling|typo|punctuation|correct)\b/i,
  revise: /\b(revise|rewrite|rephrase|improve|clarity|concise|tone|formal|casual|polish)\b/i,
  draft: /\b(draft|write|compose|email|cover\s*letter|blog|message|outreach)\b/i,
};

const FALLBACK_SCORES = { proofread: 0.9, revise: 0.8, draft: 0.9 };

export interface Handlers {
  proofread: (p: Extract<Normalized, { type: "proofread" }>) => Promise<string>;
  revise: (p: Extract<Normalized, { type: "revise" }>) => Promise<string>;
  draft: (p: Extract<Normalized, { type: "draft" }>) => Promise<string>;
  other?: (p: Extract<Normalized, { type: "other" }>) => Promise<string>;
}

export class SemanticRouter {
  private classifier: ClassifierService;

  constructor(
    // reuse your PromptService twice:
    // 1) as a classifier with a classifier system prompt
    // 2) your task handlers can share another PromptService (different system prompt)
    private classifierPrompt = new PromptService(
      "You are an intent classifier. Only output minified JSON."
    )
  ) {
    this.classifier = new ClassifierService(classifierPrompt);
  }

  /** Public: classify with rules, then optional LLM fallback via your PromptService */
  async classify(input: string, opts: RouterOptions = {}): Promise<Classification> {
    const cfg = { ...DEFAULTS, ...opts };
    const rules = this.classifyByRules(input);
    if (rules.intent !== "other" && rules.score >= cfg.threshold) return rules;

    if (!cfg.enableLLMFallback) return rules.intent === "other" ? { ...rules, via: "fallback" } : rules;

    // LLM fallback via PromptService
    try {
      const { intent, confidence } = await this.classifier.classify(input);
      return { intent, score: confidence, via: "llm" };
    } catch {
      return { intent: "other", score: 0, via: "llm-unavailable" };
    }
  }

  /** Route + execute using provided handlers (which can use another PromptService) */
  async routeAndExecute(
    userInput: string,
    handlers: Handlers,
    opts: RouterOptions = {}
  ): Promise<{ intent: Intent; output: string; via: Classification["via"]; score: number }> {
    const cls = await this.classify(userInput, opts);
    const payload = this.normalize(userInput, cls.intent);

    let output = "";
    switch (payload.type) {
      case "proofread":
        output = await handlers.proofread(payload);
        break;
      case "revise":
        output = await handlers.revise(payload);
        break;
      case "draft":
        output = await handlers.draft(payload);
        break;
      default:
        output = (await handlers.other?.(payload)) ?? "No handler for this request.";
    }
    return { intent: cls.intent, output, via: cls.via, score: cls.score };
  }

  // ---------- internals ----------

  private classifyByRules(input: string): Classification {
    const text = input.trim();
    // precise regex
    for (const key of Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]) {
      if (PATTERNS[key].test(text)) {
        return { intent: key, score: 0.9, via: "rules" };
      }
    }
    // simple score
    const scores: Record<Intent, number> = { proofread: 0, revise: 0, draft: 0, other: 0 };
    (Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]).forEach((k) => {
      if (PATTERNS[k].test(text)) scores[k] = FALLBACK_SCORES[k];
    });

    let best: Intent = "other";
    let bestScore = 0;
    (["proofread", "revise", "draft"] as const).forEach((k) => {
      if (scores[k] > bestScore) {
        best = k;
        bestScore = scores[k];
      }
    });

    return { intent: best, score: bestScore, via: best === "other" ? "fallback" : "keywords", details: scores };
  }

  private normalize(input: string, intent: Intent): Normalized {
    const text = input.trim();
    switch (intent) {
      case "proofread":
        return { type: "proofread", text };
      case "revise": {
        const goal = (text.match(/\b(to|for)\s+(concise|clarity|formal|casual|short|long|professional)\b/i)?.[2] || null)?.toLowerCase() ?? null;
        return { type: "revise", text, goal };
      }
      case "draft":
        return { type: "draft", instructions: text };
      default:
        return { type: "other", text };
    }
  }
}