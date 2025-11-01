/**
 * Semantic Routing Classes - Converted to Window Globals
 * This file provides PromptService and SemanticRouter classes for Chrome extension use
 */

// SemanticRouter - Routes user input to appropriate intents
class SemanticRouter {
  constructor(classifierPrompt = null, useAIRouting = true) {
    // Initialize AI classifier for intelligent routing
    try {
      this.classifier = classifierPrompt || (window.PromptService ? new window.PromptService("You are an intent classifier.") : null);
    } catch (error) {
      console.warn('⚠️ SemanticRouter: Could not initialize PromptService classifier:', error);
      this.classifier = null;
    }
    this.threshold = 0.55;
    this.useAIRouting = useAIRouting && this.classifier !== null;

    console.log(`✅ SemanticRouter initialized with ${this.useAIRouting ? 'AI-based' : 'pattern-based'} routing`);

    // Fast patterns for action classification
    // IMPORTANT: Order matters! More specific patterns first, generic ones last
    this.patterns = {
      // Most specific: Translation (check first to avoid being overridden by generic keywords)
      // Requires either: target language OR demonstrative reference ("this", "that", "the text")
      translate: /\b(translate\s+(this|that|the\s+(text|content|message|email|document))|translation\s+to\s+|translat(e|ing)\s+to\s+(english|spanish|french|german|italian|portuguese|russian|japanese|korean|chinese|arabic|hindi|dutch|polish|turkish|vietnamese|thai|indonesian|swedish|danish|finnish|norwegian|czech|hungarian|romanian|ukrainian|greek|hebrew)|to\s+(english|spanish|french|german|italian|portuguese|russian|japanese|korean|chinese|arabic|hindi|dutch|polish|turkish|vietnamese|thai|indonesian|swedish|danish|finnish|norwegian|czech|hungarian|romanian|ukrainian|greek|hebrew))\b/i,

      // Specific: Summarization
      summarize: /\b(summarize|summary|tldr|tl;dr|key\s*points|brief|overview|abstract|condensed?|digest|sum\s*up)\b/i,

      // Specific: Content writing (draft new content, can use selection as reference)
      // Includes response/reply patterns that indicate NEW content creation
      write: /\b(draft|compose|create\s+(a\s+|an\s+)?(email|letter|post|blog|message|content|response|reply)|write\s+(a\s+|an\s+|me\s+(a\s+|an\s+)?)?(email|letter|post|blog|message|response|reply)|cover\s*letter|outreach\s*(email|message)|(respond|reply|answer)\s+(to|about)|based\s+on|using\s+(this|the)|with\s+reference\s+to)\b/i,

      // Specific: Proofreading (only specific keywords, removed generic "fix" and "correct")
      proofread: /\b(proofread|check\s+(grammar|spelling)|grammar\s+check|spell\s+check|typos?|punctuation\s+(error|check))\b/i,

      // Generic: Rewriting (modifying existing text directly)
      // "make this..." is a strong indicator of rewrite
      rewrite: /\b(make\s+(this|it|the\s+(text|content|message|email))\s+|change\s+(this|it)\s+|improve\s+(this|it)|revise|rewrite|rephrase|paraphrase|re-write|re-phrase|polish|refine|adjust|modify|more\s+(formal|casual|professional|friendly|diplomatic))\b/i,
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

  async route(input, options = {}) {
    console.log('🎯 SemanticRouter.route() called with input:', input);
    console.log('🎯 Routing options:', options);
    console.log('🎯 SemanticRouter state:', {
      hasClassifier: !!this.classifier,
      useAIRouting: this.useAIRouting,
      classifierType: this.classifier ? typeof this.classifier : 'undefined'
    });
    const query = (input || "").trim().toLowerCase();
    console.log('🎯 Normalized query:', query);

    const hasSelectedText = options.hasSelectedText || false;
    const selectedText = options.selectedText || '';
    const planMode = options.planMode || false;

    // Try AI-based routing first if enabled
    if (this.useAIRouting) {
      try {
        const aiResult = await this.routeWithAI(input, hasSelectedText, selectedText, planMode);
        if (aiResult) {
          console.log('🤖 Using AI-based routing result:', aiResult);
          return aiResult;
        }
      } catch (error) {
        console.warn('⚠️ AI routing failed, falling back to pattern matching:', error);
      }
    }

    // Fallback to pattern-based routing
    return await this.routeWithPatterns(query, hasSelectedText, planMode);
  }

  /**
   * Route using AI-based classification
   * @param {string} input - User input
   * @param {boolean} hasSelectedText - Whether user has text selected
   * @param {string} selectedText - The selected text (optional)
   * @param {boolean} planMode - Whether Plan mode is active
   * @returns {Promise<Object|null>} Routing result or null if failed
   */
  async routeWithAI(input, hasSelectedText = false, selectedText = '', planMode = false) {
    console.log('🤖 routeWithAI called:', { hasClassifier: !!this.classifier, planMode });

    if (!this.classifier) {
      console.warn('⚠️ No classifier available for AI routing');
      return null;
    }

    const contextInfo = hasSelectedText
      ? `\n\nContext: User has selected text${selectedText ? `: "${selectedText.substring(0, 100)}..."` : ''}`
      : '\n\nContext: User has NO selected text';

    const reasoningRequest = planMode
      ? '\n\nCRITICAL: You MUST include a "reasoning" field. Write a single brief sentence (8-12 words) explaining what the user wants to accomplish. Start with "User wants to" or "User is asking to".'
      : '';

    const responseFormat = planMode
      ? `{
  "intent": "write",
  "outputType": "email",
  "tones": ["professional"],
  "confidence": 0.95,
  "reasoning": "User wants to draft a professional response email"
}`
      : `{
  "intent": "the main intent",
  "outputType": "detected output type or null",
  "tones": ["tone1", "tone2"],
  "confidence": 0.0-1.0
}`;

    console.log('🤖 AI routing with planMode:', planMode, 'reasoningRequest:', reasoningRequest ? 'YES' : 'NO');

    const prompt = `Analyze the following user request and classify it into one of these intents:
- proofread: Check grammar, spelling, and punctuation of SELECTED text
- summarize: Create a summary or extract key points from SELECTED text
- write: Draft NEW content (can use selected text as REFERENCE/CONTEXT)
- rewrite: Modify or rephrase the SELECTED text itself
- translate: Translate SELECTED text to another language

CRITICAL DISTINCTION when selected text exists:
- "write" = Create NEW content, using selection as reference/context
  Examples: "write a response to this", "draft a reply to this email", "create a cover letter based on this job posting"
- "rewrite" = Modify the SELECTED text itself
  Examples: "make this more formal", "rephrase this", "improve this", "polish this"

Key indicators for "write" (even with selection):
- "write/draft/create/compose [something] to/for/about/based on [this/the selection]"
- "respond to", "reply to", "answer"
- "generate", "produce new"

Key indicators for "rewrite" (requires selection):
- "make this...", "change this...", "improve this..."
- "rephrase", "reword", "rewrite"
- "more formal/casual/professional"
- Direct modification verbs without creating something new

Also identify:
- Output type (email, letter, post, document, list, script, summary, response, announcement, tutorial)
- Tone/style (formal, casual, persuasive, urgent, diplomatic, confident, empathetic)

User request: "${input}"${contextInfo}${reasoningRequest}

Respond in this exact JSON format:
${responseFormat}`;

    try {
      const response = await this.classifier.send(prompt);
      console.log('🤖 AI classifier raw response:', response);

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('⚠️ Could not find JSON in AI response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('🤖 Parsed AI response:', {
        hasReasoning: !!parsed.reasoning,
        reasoning: parsed.reasoning,
        intent: parsed.intent
      });

      // Validate response
      if (!parsed.intent || !['proofread', 'summarize', 'write', 'rewrite', 'translate'].includes(parsed.intent)) {
        console.warn('⚠️ Invalid intent from AI:', parsed.intent);
        return null;
      }

      const result = {
        intent: parsed.intent,
        outputType: parsed.outputType || null,
        tones: Array.isArray(parsed.tones) ? parsed.tones : [],
        score: parsed.confidence || 0.85,
        via: "ai-classifier",
        reasoning: parsed.reasoning || null
      };

      console.log('🤖 Final AI routing result:', {
        hasReasoning: !!result.reasoning,
        reasoning: result.reasoning
      });

      return result;
    } catch (error) {
      console.error('❌ AI routing error:', error);
      return null;
    }
  }

  /**
   * Toggle AI-based routing on/off
   * @param {boolean} enabled - Whether to use AI routing
   */
  setAIRouting(enabled) {
    this.useAIRouting = enabled && this.classifier !== null;
    console.log(`🔧 AI routing ${this.useAIRouting ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if AI routing is available and enabled
   * @returns {boolean}
   */
  isAIRoutingEnabled() {
    return this.useAIRouting;
  }

  /**
   * Route using pattern-based matching (fast fallback)
   * @param {string} query - Normalized query string
   * @param {boolean} hasSelectedText - Whether user has text selected
   * @param {boolean} planMode - Whether Plan mode is active (for reasoning generation)
   * @returns {Object} Routing result
   */
  async routeWithPatterns(query, hasSelectedText = false, planMode = false) {
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

    // Smart fallback based on context
    if (!matchedIntent) {
      // Check if query suggests using selection as reference vs modifying it
      const isReferencePattern = /\b(for|about|regarding|concerning|on|to|in\s+response)\b/i;
      const isModificationPattern = /\b(this|it|the\s+(text|content|message))\b/i;

      let defaultIntent;
      if (hasSelectedText) {
        // With selection: check if user wants to use it as reference or modify it
        if (isReferencePattern.test(query)) {
          defaultIntent = 'write'; // "help me with something for this" = write using selection as reference
        } else if (isModificationPattern.test(query)) {
          defaultIntent = 'rewrite'; // "help me with this" = modify the selection
        } else {
          defaultIntent = 'write'; // Ambiguous, default to write (safer assumption)
        }
      } else {
        defaultIntent = 'write'; // No selection = create new content
      }

      console.log(`ℹ️ No intent pattern matched, using smart fallback: ${defaultIntent} (hasSelectedText: ${hasSelectedText}, query pattern hints: ${isReferencePattern.test(query) ? 'reference' : isModificationPattern.test(query) ? 'modification' : 'ambiguous'})`);
      matchedIntent = defaultIntent;
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

    // Generate reasoning in Plan mode using AI
    let reasoning = null;
    if (planMode && this.classifier) {
      try {
        const intentDescriptions = {
          'proofread': 'check grammar and spelling',
          'summarize': 'create a summary',
          'rewrite': 'modify and improve the text',
          'write': 'create new content',
          'translate': 'translate to another language'
        };
        const action = intentDescriptions[matchedIntent] || 'process the text';
        const reasoningPrompt = `Generate a single brief sentence (8-12 words) explaining what the user wants to do.

User wants to: ${action}
Output format: ${matchedOutputType || 'text'}
Tone: ${matchedTones.join(', ') || 'neutral'}

CRITICAL: Respond with ONLY ONE sentence. No quotes, no extra text. Start with "User wants to" or "User is asking to".`;

        const response = await this.classifier.send(reasoningPrompt);
        reasoning = response.trim().replace(/^["']|["']$/g, ''); // Remove quotes
        console.log('💡 Generated reasoning for pattern-based routing:', reasoning);
      } catch (error) {
        console.warn('⚠️ Failed to generate reasoning for pattern routing:', error);
        reasoning = null;
      }
    }

    // matchedIntent is already set above (either from pattern match or smart fallback)
    return {
      intent: matchedIntent,
      outputType: matchedOutputType,
      tones: matchedTones,
      score: matchedIntent ? 0.9 : 0.7,
      via: matchedIntent ? "patterns" : "context-fallback",
      reasoning: reasoning  // Generated by AI in Plan mode, null otherwise
    };
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
   * Note: Chrome Writer API only supports 'plain-text' and 'markdown'
   */
  deriveFormatFromOutputType(outputType) {
    switch (outputType) {
      case 'list':
      case 'tutorial':
        return 'markdown'; // Use markdown for structured content
      default:
        return 'plain-text'; // Default to plain-text for all other types
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