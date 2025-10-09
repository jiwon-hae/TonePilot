/**
 * Prompt Normalization Service
 * Transforms user prompts into analytical questions and generates follow-up steps for Plan mode
 */

class PromptNormalizationService {
  constructor() {
    this.promptService = null;
    this.transformationPatterns = [
      {
        pattern: /help me (write|create|draft|compose) (.*)/i,
        template: (match) => `What is needed to ${match[1]} ${match[2]} and what does the user need?`
      },
      {
        pattern: /(write|create|draft|compose) (.*) (to|for) (.*)/i,
        template: (match) => `What is needed to ${match[1]} ${match[2]} ${match[3]} ${match[4]} and what information is required?`
      },
      {
        pattern: /(draft|write|create) (.*)/i,
        template: (match) => `What is needed to ${match[1]} ${match[2]} and what context is necessary?`
      }
    ];
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (!this.promptService) {
      this.promptService = new window.PromptService();
    }
    console.log('✅ PromptNormalizationService initialized');
  }

  /**
   * Normalize user prompt into analytical question
   * @param {string} userInput - Original user input
   * @param {Object} routing - Routing information (intent, outputType, tones)
   * @returns {Promise<string>} Normalized prompt
   */
  async normalizePrompt(userInput, routing = {}) {
    try {
      console.log('📋 Normalizing prompt:', userInput);

      // Ensure prompt service is initialized
      if (!this.promptService) {
        await this.initialize();
      }

      // Try pattern-based normalization first for common cases
      const patternResult = this.tryPatternBasedNormalization(userInput);
      if (patternResult) {
        console.log('✅ Pattern-based normalization:', patternResult);
        return patternResult;
      }

      // Fall back to AI-based normalization for complex cases
      const aiNormalized = await this.aiBasedNormalization(userInput, routing);
      console.log('✅ AI-based normalization:', aiNormalized);
      return aiNormalized;

    } catch (error) {
      console.error('❌ Prompt normalization failed:', error);
      // Return original input if normalization fails
      return userInput;
    }
  }

  /**
   * Try pattern-based normalization using regex patterns
   * @param {string} userInput - User input to normalize
   * @returns {string|null} Normalized prompt or null if no pattern matches
   */
  tryPatternBasedNormalization(userInput) {
    const lowercaseInput = userInput.toLowerCase();

    for (const { pattern, template } of this.transformationPatterns) {
      const match = lowercaseInput.match(pattern);
      if (match) {
        return template(match);
      }
    }

    return null;
  }

  /**
   * AI-based normalization for complex prompts
   * @param {string} userInput - User input to normalize
   * @param {Object} routing - Routing information
   * @returns {Promise<string>} Normalized prompt
   */
  async aiBasedNormalization(userInput, routing) {
    const normalizationPrompt = this.buildNormalizationPrompt(userInput, routing);
    const normalized = await this.promptService.send(normalizationPrompt);
    return normalized.trim();
  }

  /**
   * Build normalization prompt for AI
   * @param {string} userInput - User input
   * @param {Object} routing - Routing information
   * @returns {string} Prompt for AI normalization
   */
  buildNormalizationPrompt(userInput, routing) {
    return `Transform the following user request into an analytical question that identifies what information is needed and what the user needs to accomplish the task.

USER REQUEST: "${userInput}"
INTENT: ${routing.intent || 'unknown'}
${routing.outputType ? `OUTPUT TYPE: ${routing.outputType}` : ''}

Transform the request following these patterns:
- If user says "help me write X to Y" → "What is needed to write X to Y and what does the user need?"
- If user says "create X for Y" → "What is needed to create X for Y and what information is required?"
- If user says "draft X" → "What is needed to draft X and what context is necessary?"
- If user says "summarize X" → "What information should be extracted from X and how should it be organized?"
- If user asks a question → Rephrase to identify what research or analysis is needed

Return ONLY the normalized question, without explanations or preamble.`;
  }

  /**
   * Generate follow-up steps based on normalized prompt and context
   * @param {string} normalizedPrompt - The normalized analytical question
   * @param {string} searchContext - Web search results context
   * @param {Object} routing - Routing information
   * @returns {Promise<string>} Follow-up steps as numbered list
   */
  async generateFollowUpSteps(normalizedPrompt, searchContext = '', routing = {}) {
    try {
      console.log('📝 Generating follow-up steps');

      // Ensure prompt service is initialized
      if (!this.promptService) {
        await this.initialize();
      }

      const stepsPrompt = this.buildFollowUpStepsPrompt(normalizedPrompt, searchContext, routing);
      const steps = await this.promptService.send(stepsPrompt);

      console.log('✅ Follow-up steps generated');
      return steps.trim();

    } catch (error) {
      console.error('❌ Follow-up steps generation failed:', error);
      return '';
    }
  }

  /**
   * Build prompt for generating follow-up steps
   * @param {string} normalizedPrompt - Normalized question
   * @param {string} searchContext - Search context
   * @param {Object} routing - Routing information
   * @returns {string} Prompt for generating steps
   */
  buildFollowUpStepsPrompt(normalizedPrompt, searchContext, routing) {
    return `Based on the following question and available context, generate a clear list of follow-up steps or required information needed to accomplish this task.

QUESTION: ${normalizedPrompt}

${searchContext ? `WEB CONTEXT:\n${searchContext}\n` : ''}

INTENT: ${routing.intent || 'unknown'}
${routing.outputType ? `OUTPUT TYPE: ${routing.outputType}` : ''}
${routing.tones?.length > 0 ? `TONES: ${routing.tones.join(', ')}` : ''}

Generate 3-5 specific, actionable steps or questions that need to be addressed. Format as a numbered list.
Be concise and specific. Focus on:
1. What information is needed
2. What research should be done
3. What preparations are necessary
4. What decisions need to be made
5. What key considerations should be kept in mind

Return ONLY the numbered list of steps, nothing else.`;
  }

  /**
   * Normalize prompt and generate steps in one call
   * @param {string} userInput - Original user input
   * @param {Object} routing - Routing information
   * @param {string} searchContext - Web search context
   * @returns {Promise<Object>} Object with normalizedPrompt and followUpSteps
   */
  async normalizeAndGenerateSteps(userInput, routing = {}, searchContext = '') {
    try {
      console.log('🔄 Normalizing prompt and generating steps');

      // Normalize the prompt
      const normalizedPrompt = await this.normalizePrompt(userInput, routing);

      // Generate follow-up steps
      const followUpSteps = await this.generateFollowUpSteps(normalizedPrompt, searchContext, routing);

      return {
        normalizedPrompt,
        followUpSteps
      };

    } catch (error) {
      console.error('❌ Normalization and step generation failed:', error);
      return {
        normalizedPrompt: userInput,
        followUpSteps: ''
      };
    }
  }

  /**
   * Add custom transformation pattern
   * @param {RegExp} pattern - Regex pattern to match
   * @param {Function} template - Template function that takes match array and returns normalized string
   */
  addTransformationPattern(pattern, template) {
    this.transformationPatterns.push({ pattern, template });
    console.log('✅ Custom transformation pattern added');
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      isInitialized: !!this.promptService,
      patternCount: this.transformationPatterns.length
    };
  }
}

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.PromptNormalizationService = PromptNormalizationService;
  console.log('✅ PromptNormalizationService exported to window');
} else {
  console.error('❌ Window object not available - PromptNormalizationService not exported');
}
