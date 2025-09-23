/**
 * Semantic Routing Classes - Converted to Window Globals
 * This file provides PromptService and SemanticRouter classes for Chrome extension use
 */

// SemanticRouter - Routes user input to appropriate intents
class SemanticRouter {
  constructor(classifierPrompt = null) {
    this.classifier = classifierPrompt || new PromptService("You are an intent classifier.");
    this.threshold = 0.55;

    // Fast patterns for classification
    this.patterns = {
      proofread: /\b(proofread|grammar|spelling|typo|punctuation|correct|fix)\b/i,
      rewrite: /\b(revise|rewrite|rephrase|improve|clarity|concise|tone|formal|casual|polish|enhance|refine)\b/i,
      write: /\b(draft|write|compose|create|email|cover\s*letter|blog|message|outreach|letter)\b/i,
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

  normalize(input, intent) {
    const text = (input || "").trim();

    switch (intent) {
      case "proofread":
        return { type: "proofread", text };
      case "rewrite":
        return { type: "rewrite", text, goal: null };
      case "write":
        return { type: "write", instructions: text };
      case "summarize":
        return { type: "summarize", text, summaryType: "key-points", length: "medium" };
      default:
        return { type: "prompt", text };
    }
  }
}

// Export to window globals
if (typeof window !== 'undefined') {
  window.SemanticRouter = SemanticRouter;

  console.log('✅ Semantic routing classes exported to window');
  console.log('SemanticRouter type:', typeof window.SemanticRouter);
} else {
  console.error('❌ Window object not available - classes not exported');
}