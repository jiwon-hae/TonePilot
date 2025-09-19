/**
 * Semantic Routing Classes - Converted to Window Globals
 * This file provides PromptService and SemanticRouter classes for Chrome extension use
 */

// PromptService - Handles Chrome Built-in AI interactions
class PromptService {
  constructor(systemPrompt = "You are a precise and concise assistant.") {
    this.session = null;
    this.system = systemPrompt;
  }

  async ensure() {
    if (!this.session) {
      const api = window?.ai?.languageModel;
      if (!api) {
        throw new Error("Chrome Built-in AI not available. Please enable it in chrome://flags");
      }
      this.session = await api.create({
        initialPrompts: [{ role: "system", content: this.system }],
      });
    }
    return this.session;
  }

  async init(initialPrompt) {
    this.system = initialPrompt;
    this.session = null;
    await this.ensure();
  }

  async send(input) {
    const s = await this.ensure();
    const res = await s?.prompt(input);
    const out = res?.output ?? res?.output_text ?? "";
    return String(out).trim();
  }
}

// SemanticRouter - Routes user input to appropriate intents
class SemanticRouter {
  constructor(classifierPrompt = null) {
    this.classifier = classifierPrompt || new PromptService("You are an intent classifier.");
    this.threshold = 0.55;

    // Fast patterns for classification
    this.patterns = {
      proofread: /\b(proofread|grammar|spelling|typo|punctuation|correct|fix)\b/i,
      revise: /\b(revise|rewrite|rephrase|improve|clarity|concise|tone|formal|casual|polish|enhance|refine)\b/i,
      draft: /\b(draft|write|compose|create|email|cover\s*letter|blog|message|outreach|letter)\b/i,
      summarize: /\b(summarize|summary|tldr|key\s*points|brief|overview|abstract|condensed?|digest)\b/i,
    };
  }

  async route(input) {
    const query = (input || "").trim().toLowerCase();

    // Fast pattern matching first
    for (const [intent, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(query)) {
        console.log(`🎯 Matched pattern for ${intent}:`, pattern);
        return {
          intent,
          score: 0.9,
          via: "patterns"
        };
      }
    }

    // Fallback to 'revise' for unmatched queries
    console.log('🔄 No pattern match, defaulting to revise');
    return {
      intent: 'revise',
      score: 0.7,
      via: 'fallback'
    };
  }
}

// Export to window globals
if (typeof window !== 'undefined') {
  window.PromptService = PromptService;
  window.SemanticRouter = SemanticRouter;

  console.log('✅ Semantic routing classes exported to window');
  console.log('PromptService type:', typeof window.PromptService);
  console.log('SemanticRouter type:', typeof window.SemanticRouter);
} else {
  console.error('❌ Window object not available - classes not exported');
}