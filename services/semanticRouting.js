/**
 * Semantic Routing Classes - Converted to Window Globals
 * This file provides PromptService and SemanticRouter classes for Chrome extension use
 */

// SemanticRouter - Routes user input to appropriate intents
class SemanticRouter {
  constructor(classifierPrompt = null) {
    // Note: classifier is not currently used in route() method (uses pattern matching instead)
    try {
      this.classifier = classifierPrompt || (window.PromptService ? new window.PromptService("You are an intent classifier.") : null);
    } catch (error) {
      console.warn('⚠️ SemanticRouter: Could not initialize PromptService classifier:', error);
      this.classifier = null;
    }
    this.threshold = 0.55;

    console.log('✅ SemanticRouter initialized with pattern-based routing');

    // Fast patterns for action classification
    // IMPORTANT: Order matters! More specific patterns first, generic ones last
    this.patterns = {
      // Most specific: Translation (check first to avoid being overridden by generic keywords)
      // Requires either: target language OR demonstrative reference ("this", "that", "the text")
      translate: /\b(translate\s+(this|that|the\s+(text|content|message|email|document))|translation\s+to\s+|translat(e|ing)\s+to\s+(english|spanish|french|german|italian|portuguese|russian|japanese|korean|chinese|arabic|hindi|dutch|polish|turkish|vietnamese|thai|indonesian|swedish|danish|finnish|norwegian|czech|hungarian|romanian|ukrainian|greek|hebrew)|to\s+(english|spanish|french|german|italian|portuguese|russian|japanese|korean|chinese|arabic|hindi|dutch|polish|turkish|vietnamese|thai|indonesian|swedish|danish|finnish|norwegian|czech|hungarian|romanian|ukrainian|greek|hebrew))\b/i,

      // Specific: Summarization
      summarize: /\b(summarize|summary|tldr|tl;dr|key\s*points|brief|overview|abstract|condensed?|digest|sum\s*up)\b/i,

      // Specific: Content writing (draft new content)
      write: /\b(draft|compose|create\s+(a\s+|an\s+)?(email|letter|post|blog|message|content)|write\s+(a\s+|an\s+|me\s+(a\s+|an\s+)?)?(email|letter|post|blog|message)|cover\s*letter|outreach\s*(email|message))\b/i,

      // Specific: Proofreading (only specific keywords, removed generic "fix" and "correct")
      proofread: /\b(proofread|check\s+(grammar|spelling)|grammar\s+check|spell\s+check|typos?|punctuation\s+(error|check))\b/i,

      // Generic: Rewriting (most general, checked last. Removed overly generic keywords)
      rewrite: /\b(revise|rewrite|rephrase|paraphrase|re-write|re-phrase|polish|refine|adjust|modify)\b/i,
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

    // Tone/style patterns (more specific to avoid false matches)
    this.tonePatterns = {
      formal: /\b(more\s+formal|make.*formal|formal\s+(tone|style)|professional\s+(tone|style)|business\s+(tone|style)|corporate|official)\b/i,
      casual: /\b(more\s+casual|make.*casual|casual\s+(tone|style)|informal\s+(tone|style)|friendly\s+(tone|style)|conversational|laid.back)\b/i,
      persuasive: /\b(persuasive|convincing|compelling|sales\s+(tone|pitch)|marketing|pitch)\b/i,
      urgent: /\b(urgent|immediate|asap|as\s+soon\s+as\s+possible|quickly|rush|time.sensitive|high\s+priority)\b/i,
      diplomatic: /\b(diplomatic|tactful|carefully|sensitive|considerate)\b/i,
      confident: /\b(confident|assertive|strong\s+(tone|voice)|direct|bold|decisive)\b/i,
      empathetic: /\b(empathetic|understanding|compassionate|supportive|warm|caring)\b/i
    };
  }

  async route(input) {
    console.log('🎯 SemanticRouter.route() called with input:', input);
    const query = (input || "").trim().toLowerCase();
    console.log('🎯 Normalized query:', query);

    let matchedIntent = null;
    let matchedOutputType = null;
    let matchedTones = [];

    // Fast pattern matching for intent
    for (const [intent, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(query)) {
        console.log(`✅ Matched intent: "${intent}" with pattern:`, pattern);
        matchedIntent = intent;
        break;
      }
    }

    if (!matchedIntent) {
      console.log('ℹ️ No intent pattern matched, will use fallback: rewrite');
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