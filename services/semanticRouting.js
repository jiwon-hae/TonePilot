/**
 * Semantic Routing Classes - Converted to Window Globals
 * This file provides PromptService and SemanticRouter classes for Chrome extension use
 */

// SemanticRouter - Routes user input to appropriate intents
class SemanticRouter {
  constructor(classifierPrompt = null) {
    this.classifier = classifierPrompt || new PromptService("You are an intent classifier.");
    this.threshold = 0.55;

    // Fast patterns for action classification
    this.patterns = {
      proofread: /\b(proofread|grammar|spelling|typo|punctuation|correct|fix)\b/i,
      rewrite: /\b(revise|rewrite|rephrase|improve|clarity|concise|tone|formal|casual|polish|enhance|refine)\b/i,
      write: /\b(draft|write|compose|create|email|cover\s*letter|blog|message|outreach|letter)\b/i,
      summarize: /\b(summarize|summary|tldr|key\s*points|brief|overview|abstract|condensed?|digest)\b/i,
      translate: /\b(translate|translation|convert|to\s+(english|spanish|french|german|italian|portuguese|russian|japanese|korean|chinese|arabic|hindi|dutch|polish|turkish|vietnamese|thai|indonesian|swedish|danish|finnish|norwegian|czech|hungarian|romanian|ukrainian|greek|hebrew))\b/i,
    };

    // Output type patterns for format/style detection
    this.outputTypePatterns = {
      email: /\b(email|e-mail|message|send|reach out|contact|outreach|cold\s*email|follow.up|inquiry)\b/i,
      letter: /\b(cover\s*letter|application\s*letter|formal\s*letter|business\s*letter|recommendation\s*letter)\b/i,
      post: /\b(blog\s*post|social\s*media|post|article|content|linkedin\s*post|twitter|facebook)\b/i,
      document: /\b(document|report|proposal|memo|brief|whitepaper|analysis|study|paper)\b/i,
      list: /\b(list|bullet\s*points|checklist|steps|items|enumerat|numbered|points)\b/i,
      script: /\b(script|dialogue|conversation|interview|presentation|speech|talk|pitch)\b/i,
      summary: /\b(summary|overview|brief|abstract|condensed|digest|tldr|key\s*points)\b/i,
      response: /\b(response|reply|answer|feedback|comment|review|critique)\b/i,
      announcement: /\b(announcement|press\s*release|notice|alert|update|news|launch)\b/i,
      tutorial: /\b(tutorial|guide|how.to|instructions|walkthrough|step.by.step|explanation)\b/i
    };

    // Tone/style patterns
    this.tonePatterns = {
      formal: /\b(formal|professional|business|corporate|official|polite|respectful)\b/i,
      casual: /\b(casual|informal|friendly|relaxed|conversational|laid.back)\b/i,
      persuasive: /\b(persuasive|convincing|compelling|sales|marketing|pitch)\b/i,
      urgent: /\b(urgent|immediate|asap|quickly|rush|time.sensitive|priority)\b/i,
      diplomatic: /\b(diplomatic|tactful|careful|sensitive|polite|considerate)\b/i,
      confident: /\b(confident|assertive|strong|direct|bold|decisive)\b/i,
      empathetic: /\b(empathetic|understanding|compassionate|supportive|warm|caring)\b/i
    };
  }

  async route(input) {
    const query = (input || "").trim().toLowerCase();

    let matchedIntent = null;
    let matchedOutputType = null;
    let matchedTones = [];

    // Fast pattern matching for intent
    for (const [intent, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(query)) {
        console.log(`🎯 Matched intent pattern for ${intent}:`, pattern);
        matchedIntent = intent;
        break;
      }
    }

    // Detect output type
    for (const [outputType, pattern] of Object.entries(this.outputTypePatterns)) {
      if (pattern.test(query)) {
        console.log(`📝 Matched output type: ${outputType}`);
        matchedOutputType = outputType;
        break;
      }
    }

    // Detect tone/style (can have multiple)
    for (const [tone, pattern] of Object.entries(this.tonePatterns)) {
      if (pattern.test(query)) {
        console.log(`🎨 Matched tone: ${tone}`);
        matchedTones.push(tone);
      }
    }

    // Use matched intent or fallback to 'rewrite'
    const intent = matchedIntent || 'rewrite';

    const routingResult = {
      intent,
      outputType: matchedOutputType,
      tones: matchedTones,
      score: matchedIntent ? 0.9 : 0.7,
      via: matchedIntent ? "patterns" : "fallback"
    };

    console.log('🎯 Complete routing result:', routingResult);
    return routingResult;
  }

  normalize(input, routingResult) {
    const text = (input || "").trim();
    const intent = routingResult.intent || 'rewrite';
    const outputType = routingResult.outputType;
    const tones = routingResult.tones || [];

    const baseResult = {
      type: intent,
      text,
      outputType,
      tones,
      originalQuery: input
    };

    switch (intent) {
      case "proofread":
        return { ...baseResult, type: "proofread" };
      case "rewrite":
        return { ...baseResult, type: "rewrite", goal: this.deriveGoalFromOutputType(outputType, tones) };
      case "write":
        return {
          ...baseResult,
          type: "write",
          instructions: text,
          format: this.deriveFormatFromOutputType(outputType)
        };
      case "summarize":
        return {
          ...baseResult,
          type: "summarize",
          summaryType: outputType === 'list' ? 'key-points' : 'paragraph',
          length: tones.includes('urgent') ? 'short' : 'medium'
        };
      case "translate":
        return { ...baseResult, type: "translate" };
      default:
        return { ...baseResult, type: "prompt" };
    }
  }

  /**
   * Derive rewrite goal from detected output type and tones
   */
  deriveGoalFromOutputType(outputType, tones = []) {
    if (!outputType) return null;

    const toneModifier = tones.length > 0 ? ` in a ${tones.join(', ')} tone` : '';

    switch (outputType) {
      case 'email':
        return `Rewrite as a professional email${toneModifier}`;
      case 'letter':
        return `Rewrite as a formal letter${toneModifier}`;
      case 'post':
        return `Rewrite as engaging social media content${toneModifier}`;
      case 'document':
        return `Rewrite as a structured document${toneModifier}`;
      case 'list':
        return `Rewrite as a clear, organized list${toneModifier}`;
      case 'summary':
        return `Rewrite as a concise summary${toneModifier}`;
      default:
        return toneModifier ? `Rewrite${toneModifier}` : null;
    }
  }

  /**
   * Derive format instructions from output type
   */
  deriveFormatFromOutputType(outputType) {
    switch (outputType) {
      case 'email':
        return 'email';
      case 'letter':
        return 'formal-letter';
      case 'post':
        return 'social-post';
      case 'document':
        return 'document';
      case 'list':
        return 'bulleted-list';
      case 'script':
        return 'dialogue';
      case 'tutorial':
        return 'step-by-step';
      default:
        return 'plain-text';
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