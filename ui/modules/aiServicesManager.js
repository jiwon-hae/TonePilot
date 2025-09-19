/**
 * TonePilot AI Services Manager
 * Manages all AI service interactions and processing
 */

class TonePilotAIServicesManager {
  constructor(stateManager, uiManager) {
    this.stateManager = stateManager;
    this.uiManager = uiManager;
    this.aiSetupService = null;
    this.semanticRouter = null;
    this.proofreaderService = null;
    this.rewriterService = null;
    this.summarizerService = null;
  }

  /**
   * Initialize all AI services
   */
  async initializeServices() {
    try {
      this.aiSetupService = new window.AISetupService();
      this.semanticRouter = new window.SemanticRouter();
      this.proofreaderService = new window.ProofreaderService();
      this.rewriterService = new window.RewriterService();
      this.summarizerService = new window.SummarizerService();

      // Generate and display status report
      const statusReport = await this.aiSetupService.generateStatusReport();
      this.updateAIStatusDisplay(statusReport);

      console.log('✅ AI services initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ AI services initialization failed:', error);
      this.uiManager.showError('AI services initialization failed');
      return false;
    }
  }

  /**
   * Process text input through semantic routing and AI services
   * @param {string} inputText - Text to process
   * @param {Object} selectionData - Selected text data
   * @returns {Object} Processing results
   */
  async processText(inputText, selectionData) {
    try {
      this.uiManager.showLoading();
      this.uiManager.hideError();

      // Route the input to determine intent
      const routing = await this.semanticRouter.route(inputText);
      console.log('🎯 Routing result:', routing);

      // Get text to process (either selection or input)
      const textToProcess = selectionData?.text || inputText;
      if (!textToProcess?.trim()) {
        throw new Error('No text to process');
      }

      // Process based on intent
      let result;
      switch (routing.intent) {
        case 'proofread':
          result = await this.handleProofread(textToProcess);
          break;
        case 'summarize':
          result = await this.handleSummarize(textToProcess);
          break;
        case 'revise':
        case 'draft':
        default:
          result = await this.handleRewrite(textToProcess, inputText);
          break;
      }

      this.uiManager.hideLoading();
      return {
        ...result,
        intent: routing.intent,
        via: routing.via,
        score: routing.score
      };

    } catch (error) {
      this.uiManager.hideLoading();
      console.error('❌ Text processing failed:', error);
      this.uiManager.showError(`Processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle proofreading request
   * @param {string} text - Text to proofread
   * @returns {Object} Proofread results
   */
  async handleProofread(text) {
    console.log('📝 Proofreading text...');
    const result = await this.proofreaderService.proofread(text);

    return {
      primary: result.corrected,
      original: result.original,
      type: 'proofread',
      service: 'proofreader'
    };
  }

  /**
   * Handle summarization request
   * @param {string} text - Text to summarize
   * @returns {Object} Summary results
   */
  async handleSummarize(text) {
    console.log('📋 Summarizing text...');
    const result = await this.summarizerService.summarize(text, {
      type: 'key-points',
      length: 'medium'
    });

    return {
      primary: result.summary,
      original: text,
      type: 'summarize',
      service: 'summarizer'
    };
  }

  /**
   * Handle rewrite request
   * @param {string} text - Text to rewrite
   * @param {string} instructions - Rewrite instructions
   * @returns {Object} Rewrite results
   */
  async handleRewrite(text, instructions) {
    console.log('✏️ Rewriting text...');

    // Determine tone from instructions
    const tone = this.extractToneFromInstructions(instructions);

    const result = await this.rewriterService.rewrite(text, {
      tone: tone,
      format: 'as-is',
      length: 'as-is'
    });

    return {
      primary: result.rewritten,
      original: result.original,
      type: 'rewrite',
      service: 'rewriter',
      tone: tone
    };
  }

  /**
   * Extract tone preference from instructions
   * @param {string} instructions - User instructions
   * @returns {string} Tone setting
   */
  extractToneFromInstructions(instructions) {
    const lower = instructions.toLowerCase();

    if (lower.includes('formal') || lower.includes('professional')) {
      return 'more-formal';
    } else if (lower.includes('casual') || lower.includes('friendly') || lower.includes('informal')) {
      return 'more-casual';
    }

    return 'as-is';
  }

  /**
   * Update AI status display in UI
   * @param {Object} statusReport - AI services status
   */
  updateAIStatusDisplay(statusReport) {
    if (!statusReport) return;

    const { summary, apiStatuses } = statusReport;

    // Update main status
    if (summary.allAvailable) {
      this.uiManager.updateStatus('ready', 'AI Ready');
    } else if (summary.someAvailable) {
      this.uiManager.updateStatus('warning', 'Partial AI');
    } else {
      this.uiManager.updateStatus('error', 'AI Unavailable');
    }

    // Log detailed status
    console.log('🤖 AI Services Status:', {
      languageModel: apiStatuses.languageModel?.available ? '✅' : '❌',
      rewriter: apiStatuses.rewriter?.available ? '✅' : '❌',
      summarizer: apiStatuses.summarizer?.available ? '✅' : '❌',
      proofreader: apiStatuses.proofreader?.available ? '✅' : '❌'
    });
  }

  /**
   * Check if AI services are ready
   * @returns {boolean} True if services are initialized
   */
  isReady() {
    return Boolean(
      this.aiSetupService &&
      this.semanticRouter &&
      this.proofreaderService &&
      this.rewriterService &&
      this.summarizerService
    );
  }

  /**
   * Get service status for debugging
   * @returns {Object} Service status information
   */
  getServiceStatus() {
    return {
      aiSetupService: Boolean(this.aiSetupService),
      semanticRouter: Boolean(this.semanticRouter),
      proofreaderService: Boolean(this.proofreaderService),
      rewriterService: Boolean(this.rewriterService),
      summarizerService: Boolean(this.summarizerService),
      ready: this.isReady()
    };
  }
}

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.TonePilotAIServicesManager = TonePilotAIServicesManager;
  console.log('✅ TonePilotAIServicesManager exported to window');
}