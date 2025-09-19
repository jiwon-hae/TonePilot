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
      console.log('🔍 PromptService: Checking LanguageModel availability...');
      console.log('🔍 LanguageModel exists:', Boolean(self.LanguageModel));

      if (!self.LanguageModel) {
        const errorDetails = {
          LanguageModel: Boolean(self.LanguageModel),
          userAgent: navigator.userAgent,
          location: window.location.href,
          chromeVersion: navigator.userAgentData?.brands?.find(b => b.brand === 'Google Chrome')?.version
        };
        console.error('❌ PromptService: LanguageModel not available. Debug info:', errorDetails);
        throw new Error(`LanguageModel not available. Debug info: ${JSON.stringify(errorDetails)}`);
      }

      console.log('🔍 PromptService: Checking availability...');
      try {
        const availability = await LanguageModel.availability();
        console.log('📋 PromptService: LanguageModel availability:', availability);

        if (availability === 'unavailable') {
          throw new Error(`Language model unavailable. Status: ${availability}`);
        }
      } catch (availError) {
        console.error('❌ PromptService: Availability check failed:', availError);
        throw new Error(`Language model availability check failed: ${availError.message}`);
      }

      console.log('🔍 PromptService: Creating session...');
      this.session = await LanguageModel.create({
        initialPrompts: [{ role: "system", content: this.system }],
      });
      console.log('✅ PromptService: Session created successfully');
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

  normalize(input, intent) {
    const text = (input || "").trim();

    switch (intent) {
      case "proofread":
        return { type: "proofread", text };
      case "revise":
        return { type: "revise", text, goal: null };
      case "draft":
        return { type: "draft", instructions: text };
      case "summarize":
        return { type: "summarize", text, summaryType: "key-points", length: "medium" };
      default:
        return { type: "other", text };
    }
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