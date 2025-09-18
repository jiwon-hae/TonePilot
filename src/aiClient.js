class AIClient {
  constructor() {
    this.isReady = false;
    this.capabilities = {
      languageModel: null,
      rewriter: null,
      writer: null,
      summarizer: null
    };
    this.session = null;
    this.rewriterSessions = new Map();
  }

  async initialize() {
    try {
      if (!('ai' in window)) {
        throw new Error('Chrome Built-in AI not available');
      }

      await this.checkCapabilities();
      await this.initializePrimarySession();

      this.isReady = true;
      return true;
    } catch (error) {
      console.error('AI Client initialization failed:', error);
      return false;
    }
  }

  async checkCapabilities() {
    try {
      if (window.ai?.languageModel) {
        this.capabilities.languageModel = await window.ai.languageModel.capabilities();
      }
      if (window.ai?.rewriter) {
        this.capabilities.rewriter = await window.ai.rewriter.capabilities();
      }
      if (window.ai?.writer) {
        this.capabilities.writer = await window.ai.writer.capabilities();
      }
      if (window.ai?.summarizer) {
        this.capabilities.summarizer = await window.ai.summarizer.capabilities();
      }
    } catch (error) {
      console.warn('Some AI capabilities not available:', error);
    }
  }

  async initializePrimarySession() {
    if (this.capabilities.languageModel?.available === 'readily') {
      try {
        this.session = await window.ai.languageModel.create({
          temperature: 0.3,
          topK: 3
        });
      } catch (error) {
        console.warn('Primary session creation failed:', error);
      }
    }
  }

  async createRewriteSession(preset) {
    const sessionKey = `${preset.name}_${preset.constraints.formality || 'neutral'}`;

    if (this.rewriterSessions.has(sessionKey)) {
      return this.rewriterSessions.get(sessionKey);
    }

    try {
      let session;
      if (this.capabilities.rewriter?.available === 'readily') {
        session = await window.ai.rewriter.create({
          temperature: 0.3,
          topK: 3
        });
      } else if (this.capabilities.languageModel?.available === 'readily') {
        session = await window.ai.languageModel.create({
          temperature: 0.3,
          topK: 3,
          systemPrompt: this.buildSystemPrompt(preset)
        });
      } else {
        throw new Error('No suitable AI model available');
      }

      this.rewriterSessions.set(sessionKey, session);
      return session;
    } catch (error) {
      console.error('Failed to create rewrite session:', error);
      throw error;
    }
  }

  buildSystemPrompt(preset) {
    return `You are a professional writing assistant. ${preset.systemPrompt}
    Always maintain the original meaning while adapting the tone and style as requested.
    Keep responses concise and natural.`;
  }

  async rewriteText(originalText, preset, context = {}) {
    if (!this.isReady) {
      throw new Error('AI Client not initialized');
    }

    if (originalText.length > 4000) {
      throw new Error('Text too long. Maximum 4000 characters supported.');
    }

    try {
      const session = await this.createRewriteSession(preset);
      let rewriteResult;

      if (this.capabilities.rewriter?.available === 'readily') {
        const rewritePrompt = this.buildRewritePrompt(originalText, preset, context);
        rewriteResult = await session.rewrite(originalText, {
          context: rewritePrompt.context,
          tone: preset.constraints.formality || 'neutral',
          length: this.mapLength(preset.constraints.sentenceMax || preset.constraints.wordLimit),
          format: preset.constraints.structure ? 'structured' : 'text'
        });
      } else {
        const prompt = this.buildRewritePrompt(originalText, preset, context);
        const fullPrompt = `${prompt.context}\n\nText to rewrite: "${originalText}"`;
        rewriteResult = await session.prompt(fullPrompt);
      }

      const alternatives = await this.generateAlternatives(originalText, preset, context, 2);

      return {
        primary: rewriteResult,
        alternatives: alternatives,
        metadata: {
          originalLength: originalText.length,
          newLength: rewriteResult.length,
          preset: preset.name,
          timestamp: Date.now()
        }
      };

    } catch (error) {
      console.error('Rewrite failed:', error);
      if (error.message.includes('Model not available')) {
        throw new Error('AI model is currently downloading. Please try again in a moment.');
      }
      throw error;
    }
  }

  async generateAlternatives(originalText, preset, context, count = 2) {
    const alternatives = [];

    try {
      for (let i = 0; i < count; i++) {
        let session;
        let alternative;

        if (this.capabilities.rewriter?.available === 'readily') {
          session = await window.ai.rewriter.create({
            temperature: 0.5 + (i * 0.2),
            topK: 5
          });
          alternative = await session.rewrite(originalText, {
            context: this.buildRewritePrompt(originalText, preset, context).context,
            tone: preset.constraints.formality || 'neutral'
          });
        } else if (this.capabilities.languageModel?.available === 'readily') {
          session = await window.ai.languageModel.create({
            temperature: 0.5 + (i * 0.2),
            topK: 5,
            systemPrompt: this.buildSystemPrompt(preset)
          });
          const prompt = this.buildRewritePrompt(originalText, preset, context);
          const fullPrompt = `${prompt.context}\n\nText to rewrite: "${originalText}"`;
          alternative = await session.prompt(fullPrompt);
        }

        if (alternative) {
          alternatives.push(alternative);
        }

        if (session?.destroy) {
          session.destroy();
        }
      }
    } catch (error) {
      console.warn('Alternative generation failed:', error);
    }

    return alternatives;
  }

  async summarizeText(text, options = {}) {
    if (!this.capabilities.summarizer?.available === 'readily') {
      throw new Error('Summarization not available');
    }

    if (text.length > 4000) {
      throw new Error('Text too long for summarization. Maximum 4000 characters.');
    }

    try {
      const summarizer = await window.ai.summarizer.create({
        type: options.type || 'key-points',
        format: options.format || 'markdown',
        length: options.length || 'medium'
      });

      const result = await summarizer.summarize(text);
      summarizer.destroy();

      return result;
    } catch (error) {
      console.error('Summarization failed:', error);
      throw error;
    }
  }

  async generateSubjectLine(text) {
    if (!this.session && !this.capabilities.writer?.available) {
      return null;
    }

    try {
      let result;
      if (this.capabilities.writer?.available === 'readily') {
        const writer = await window.ai.writer.create();
        result = await writer.write(
          `Generate a concise email subject line for: ${text.substring(0, 200)}...`
        );
        writer.destroy();
      } else if (this.session) {
        result = await this.session.prompt(
          `Generate a concise email subject line for the following text: "${text.substring(0, 200)}..."`
        );
      }
      return result;
    } catch (error) {
      console.warn('Subject generation failed:', error);
      return null;
    }
  }

  buildRewritePrompt(text, preset, context) {
    let promptContext = preset.systemPrompt;
    
    if (context.domainContext) {
      promptContext += ` Writing context: ${context.domainContext}.`;
    }
    
    if (preset.constraints.structure) {
      promptContext += ` Required structure: ${preset.constraints.structure}.`;
    }
    
    if (preset.constraints.avoid) {
      promptContext += ` Avoid: ${preset.constraints.avoid.join(', ')}.`;
    }
    
    return {
      context: promptContext,
      constraints: preset.constraints
    };
  }

  mapLength(constraint) {
    if (!constraint) return 'medium';
    
    if (typeof constraint === 'number') {
      if (constraint <= 2) return 'short';
      if (constraint <= 50) return 'medium';
      return 'long';
    }
    
    return 'medium';
  }

  getStatus() {
    return {
      isReady: this.isReady,
      capabilities: Object.keys(this.capabilities).filter(key =>
        this.capabilities[key]?.available === 'readily'
      ),
      activeSessions: this.rewriterSessions.size,
      hasMainSession: !!this.session
    };
  }

  reset() {
    if (this.session?.destroy) {
      this.session.destroy();
      this.session = null;
    }

    this.rewriterSessions.forEach(session => {
      if (session?.destroy) {
        session.destroy();
      }
    });
    this.rewriterSessions.clear();
  }

  destroy() {
    this.reset();
    this.isReady = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIClient;
}