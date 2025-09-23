/**
 * TonePilot AI Services Manager
 * Manages all AI service interactions and processing
 */

class TonePilotAIServicesManager {
  constructor(stateManager, uiManager) {
    this.stateManager = stateManager;
    this.uiManager = uiManager;
    this.aiSetupService = null;
    this.writerService = null;
    this.semanticRouter = null;
    this.proofreaderService = null;
    this.rewriterService = null;
    this.summarizerService = null;
    this.promptService = null;
  }

  /**
   * Initialize all AI services
   */
  async initializeServices() {
    try {
      this.aiSetupService = new window.AISetupService();
      this.semanticRouter = new window.SemanticRouter();
      this.proofreaderService = new window.ProofreaderService();
      this.writerService = new window.WriterService();
      this.rewriterService = new window.RewriterService();
      this.summarizerService = new window.SummarizerService();
      this.promptService = new window.PromptService();

      // Debug: Check if services were created successfully
      console.log('Service initialization status:', {
        writerService: !!this.writerService,
        rewriterService: !!this.rewriterService,
        summarizerService: !!this.summarizerService,
        promptService: !!this.promptService
      });

      // Check availability for each service individually with detailed error reporting
      console.log('🔍 Checking service availability...');

      const serviceChecks = [];

      try {
        await this.promptService.checkAvailability();
        console.log('✅ PromptService service availability check completed');
      } catch (error) {
        console.error('❌ PromptService service availability check failed:', error);
        serviceChecks.push({ service: 'promptService', error: error.message });
      }

      try {
        await this.proofreaderService.checkAvailability();
        console.log('✅ Proofreader service availability check completed');
      } catch (error) {
        console.error('❌ Proofreader service availability check failed:', error);
        serviceChecks.push({ service: 'proofreader', error: error.message });
      }

      try {
        await this.rewriterService.checkAvailability();
        console.log('✅ Rewriter service availability check completed');
      } catch (error) {
        console.error('❌ Rewriter service availability check failed:', error);
        serviceChecks.push({ service: 'rewriter', error: error.message });
      }

      try {
        await this.summarizerService.checkAvailability();
        console.log('✅ Summarizer service availability check completed');
      } catch (error) {
        console.error('❌ Summarizer service availability check failed:', error);
        serviceChecks.push({ service: 'summarizer', error: error.message });
      }

      try {
        await this.writerService.checkAvailability();
        console.log('✅ Writer service availability check completed');
      } catch (error) {
        console.error('❌ Writer service availability check failed:', error);
        serviceChecks.push({ service: 'writer', error: error.message });
      }

      // Log detailed service availability status
      const serviceStatus = {
        proofreader: this.proofreaderService.isAvailable,
        writer: this.writerService.isAvailable,
        rewriter: this.rewriterService.isAvailable,
        summarizer: this.summarizerService.isAvailable,
        prompt: this.promptService.isAvailable
      };

      console.log('📊 Service availability status:', serviceStatus);

      // Check if any services are unavailable
      const unavailableServices = Object.entries(serviceStatus)
        .filter(([service, available]) => !available)
        .map(([service]) => service);

      if (unavailableServices.length > 0) {
        console.warn('⚠️ Some services are unavailable:', unavailableServices);

        // Log detailed error but don't throw since we have fallbacks
        if (unavailableServices.length === 3) {
          const errorDetails = serviceChecks.map(check => `${check.service}: ${check.error}`).join('; ');
          console.warn(`⚠️ Chrome AI APIs not available for all services, will use fallbacks. Details: ${errorDetails}`);
        }
      }

      // Generate and display status report
      const statusReport = await this.aiSetupService.generateStatusReport();
      this.updateAIStatusDisplay(statusReport);

      console.log('✅ AI services initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ AI services initialization failed:', error);
      // Don't show error UI box - let the extension continue with fallbacks
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
          result = await this.handleSummarize(textToProcess, selectionData?.platform, selectionData?.context);
          break;
        case 'rewrite':
          result = await this.handleRewrite(textToProcess, inputText, selectionData?.platform, selectionData?.context);
          break;
        case 'write':
          result = await this.handleWrite(inputText, selectionData?.text, selectionData?.platform);
          break;
        default:
          result = await this.handleRewrite(textToProcess, inputText, selectionData?.platform, selectionData?.context);
          break;
      }

      // Loading will be replaced by showResults, no need to explicitly hide
      return {
        ...result,
        intent: routing.intent,
        via: routing.via,
        score: routing.score
      };

    } catch (error) {
      // Stop loading animation and show error in the result content area
      this.uiManager.stopLoadingAnimation();
      if (this.uiManager.elements.resultContent) {
        this.uiManager.elements.resultContent.innerHTML = `
          <div class="error">
            <span>Processing failed: ${error.message}</span>
          </div>
        `;
      }
      console.error('❌ Text processing failed:', error);
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

    if (!this.proofreaderService.isAvailable) {
      console.warn('⚠️ Proofreader service not available, using fallback');
      // Fallback to language model if proofreader not available
      return await this.handleRewrite(text, 'Please proofread and correct any errors in this text');
    }

    try {
      const result = await this.proofreaderService.proofread(text);
      return {
        primary: result.corrected,
        original: result.original,
        type: 'proofread',
        service: 'proofreader'
      };
    } catch (error) {
      console.error('❌ Proofreader service failed, using fallback:', error);
      return await this.handleRewrite(text, 'Please proofread and correct any errors in this text');
    }
  }

  /**
   * Handle summarization request
   * @param {string} text - Text to summarize
   * @param {string} platform - Platform identifier for context-aware summarization
   * @param {Object} context - Additional context from platform (author, engagement, etc.)
   * @returns {Object} Summary results
   */
  async handleSummarize(text, platform, context) {
    console.log('📋 Summarizing text...');
    console.log('Platform:', platform);
    console.log('Context:', context);

    if (!this.summarizerService.isAvailable) {
      console.warn('⚠️ Summarizer service not available, using fallback');
      // Fallback to language model with platform context
      const platformAwarePrompt = this.generateSummarizationPrompt(platform, context);
      return await this.handleRewrite(text, platformAwarePrompt);
    }

    try {
      // Initialize summarizer with platform context if needed
      await this.summarizerService.initialize({
        type: 'key-points',
        length: 'medium',
        platform: platform,
        context: context
      });

      const result = await this.summarizerService.summarize(text, {
        type: 'key-points',
        length: 'medium'
      });

      return {
        primary: result.summary,
        original: text,
        type: 'summarize',
        service: 'summarizer',
        platform: platform,
        context: context
      };
    } catch (error) {
      console.error('❌ Summarizer service failed, using fallback:', error);
      const platformAwarePrompt = this.generateSummarizationPrompt(platform, context);
      return await this.handleRewrite(text, platformAwarePrompt);
    }
  }

  /**
   * Handle rewrite request
   * @param {string} text - Text to rewrite
   * @param {string} instructions - Rewrite instructions
   * @param {string} platform - Platform identifier for context-aware rewriting
   * @param {Object} context - Additional context from platform
   * @returns {Object} Rewrite results
   */
  async handleRewrite(text, instructions, platform, context) {
    console.log('✏️ Rewriting text...');
    console.log('Platform:', platform);
    console.log('Context:', context);

    // Determine tone from instructions
    const tone = this.extractToneFromInstructions(instructions);

    if (!this.rewriterService.isAvailable) {
      console.warn('⚠️ Rewriter service not available, using language model fallback');
      // Fallback to language model via PromptService with platform context
      try {
        const promptService = new window.PromptService();
        let prompt = instructions;

        // Add platform-specific context
        if (platform) {
          const platformContext = this.generateRewritePrompt(instructions, platform, context);
          prompt = platformContext;
        }

        prompt += `\n\nText to process: "${text}"`;
        const result = await promptService.send(prompt);
        return {
          primary: result,
          original: text,
          type: 'rewrite',
          service: 'languageModel',
          tone: tone,
          platform: platform
        };
      } catch (error) {
        throw new Error(`Language model fallback failed: ${error.message}`);
      }
    }

    try {
      // Initialize rewriter with platform context if needed
      await this.rewriterService.initialize({
        tone: tone,
        format: 'as-is',
        length: 'as-is',
        platform: platform,
        context: context
      });

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
        tone: tone,
        platform: platform,
        context: context
      };
    } catch (error) {
      console.error('❌ Rewriter service failed, using language model fallback:', error);
      try {
        const promptService = new window.PromptService();
        let prompt = instructions;

        // Add platform-specific context
        if (platform) {
          const platformContext = this.generateRewritePrompt(instructions, platform, context);
          prompt = platformContext;
        }

        prompt += `\n\nText to process: "${text}"`;
        const result = await promptService.send(prompt);
        return {
          primary: result,
          original: text,
          type: 'rewrite',
          service: 'languageModel',
          tone: tone,
          platform: platform
        };
      } catch (fallbackError) {
        throw new Error(`Both rewriter and language model failed: ${error.message}; ${fallbackError.message}`);
      }
    }
  }

  /**
   * Handle write request using Chrome's Writer API
   * @param {string} query - User query/prompt from textarea
   * @param {string} context - Selected text to use as context
   * @param {string} platform - Platform identifier for context-aware writing
   * @returns {Object} Write results
   */
  async handleWrite(query, context, platform) {
    console.log('✏️ Writing text...');
    console.log('Query:', query);
    console.log('Context:', context);
    console.log('Platform:', platform);

    // Determine tone from query
    const tone = this.extractToneFromQuery(query);

    // Check if writer service exists and is available
    if (!this.writerService || !this.writerService.isAvailable) {
      console.warn('⚠️ Writer service not available, using language model fallback');
      // Fallback to language model via PromptService
      try {
        const promptService = new window.PromptService();
        let prompt = query;

        // Add platform-specific context
        if (platform) {
          const platformContext = this.generatePlatformContext(platform);
          prompt = `${platformContext}\n\n${query}`;
        }

        // Add context if provided
        if (context && context.trim()) {
          prompt = `${prompt}\n\nContext to consider: "${context}"`;
        }

        const result = await promptService.send(prompt);
        return {
          primary: result,
          original: query,
          context: context || '',
          type: 'write',
          service: 'languageModel',
          tone: tone
        };
      } catch (error) {
        throw new Error(`Language model fallback failed: ${error.message}`);
      }
    }

    try {
      // Initialize writer service if needed
      await this.writerService.initialize({
        tone: tone,
        format: 'plain-text',
        length: 'medium',
        platform: platform
      });

      // Use Writer API
      const result = await this.writerService.write(query, context, {
        context: context || undefined
      });

      return {
        primary: result.output,
        original: query,
        context: context || '',
        type: 'write',
        service: 'writer',
        tone: tone,
        metadata: result.metadata
      };
    } catch (error) {
      console.error('❌ Writer service failed, using language model fallback:', error);
      try {
        const promptService = new window.PromptService();
        let prompt = query;

        // Add platform-specific context
        if (platform) {
          const platformContext = this.generatePlatformContext(platform);
          prompt = `${platformContext}\n\n${query}`;
        }

        // Add context if provided
        if (context && context.trim()) {
          prompt = `${prompt}\n\nContext to consider: "${context}"`;
        }

        const result = await promptService.send(prompt);
        return {
          primary: result,
          original: query,
          context: context || '',
          type: 'write',
          service: 'languageModel',
          tone: tone
        };
      } catch (fallbackError) {
        throw new Error(`Both writer and language model failed: ${error.message}; ${fallbackError.message}`);
      }
    }
  }

  /**
   * Extract tone preference from instructions (for rewriter)
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
   * Extract tone preference from query (for writer)
   * @param {string} query - User query
   * @returns {string} Tone setting for Writer API
   */
  extractToneFromQuery(query) {
    const lower = query.toLowerCase();

    if (lower.includes('formal') || lower.includes('professional') || lower.includes('business')) {
      return 'formal';
    } else if (lower.includes('casual') || lower.includes('friendly') || lower.includes('informal')) {
      return 'casual';
    }

    return 'neutral';
  }

  /**
   * Generate platform-specific context for prompts
   * @param {string} platform - Platform identifier ('linkedin', 'gmail', etc.)
   * @returns {string} Platform-appropriate context string
   */
  generatePlatformContext(platform) {
    switch (platform) {
      case 'linkedin':
        return 'You are writing professional content for LinkedIn. Consider the business networking context, professional tone expectations, and LinkedIn\'s audience of working professionals. Content should be engaging, industry-relevant, and appropriate for professional networking.';

      case 'gmail':
        return 'You are composing email content. Consider email etiquette, appropriate salutations and closings, clear subject matter, and professional communication standards.';

      case 'twitter':
        return 'You are creating content for Twitter/X. Keep in mind character limits, hashtag usage, engaging and concise language, and the fast-paced social media environment.';

      case 'facebook':
        return 'You are writing content for Facebook. Consider the social networking context, friend and family audience, casual yet respectful tone, and community engagement.';

      default:
        return 'You are writing general web content. Maintain clarity, appropriate tone for the context, and effective communication principles.';
    }
  }

  /**
   * Generate platform-aware summarization prompt for fallback scenarios
   * @param {string} platform - Platform identifier
   * @param {Object} context - Additional context from platform
   * @returns {string} Platform-appropriate summarization prompt
   */
  generateSummarizationPrompt(platform, context) {
    let prompt = 'Please summarize this text with key points';

    if (platform === 'linkedin' && context?.author) {
      prompt = `Please summarize this LinkedIn post by ${context.author.name}${context.author.title ? ` (${context.author.title})` : ''}. Focus on business insights, professional networking value, and key takeaways for working professionals.`;
      if (context.engagement) {
        prompt += ` This post has ${context.engagement.likes || 0} likes and ${context.engagement.comments || 0} comments, indicating high engagement.`;
      }
    } else if (platform === 'gmail') {
      prompt = 'Please summarize this email content. Focus on key action items, important decisions, deadlines, and main communication points that require attention or follow-up.';
    } else if (platform === 'twitter') {
      prompt = 'Please summarize this Twitter/X content. Focus on the main message, trending topics, viral elements, and key discussion points in a concise format.';
    } else if (platform === 'facebook') {
      prompt = 'Please summarize this Facebook content. Focus on personal updates, community discussions, event information, and social connections.';
    } else if (platform) {
      prompt = `Please summarize this ${platform} content with key points, focusing on the main ideas and actionable insights.`;
    }

    return prompt;
  }

  /**
   * Generate platform-aware rewrite prompt for fallback scenarios
   * @param {string} instructions - Original rewrite instructions
   * @param {string} platform - Platform identifier
   * @param {Object} context - Additional context from platform
   * @returns {string} Platform-appropriate rewrite prompt
   */
  generateRewritePrompt(instructions, platform, context) {
    let prompt = instructions;

    if (platform === 'linkedin' && context?.author) {
      prompt = `You are rewriting professional content for LinkedIn. The original content is by ${context.author.name}${context.author.title ? ` (${context.author.title})` : ''}. Maintain business networking appropriateness, professional tone, and industry relevance. `;
      if (context.engagement) {
        prompt += `This content has professional engagement (${context.engagement.likes || 0} likes, ${context.engagement.comments || 0} comments). `;
      }
      prompt += `Instructions: ${instructions}`;
    } else if (platform === 'gmail') {
      prompt = `You are rewriting email content. Maintain appropriate email etiquette, professional communication standards, and clear messaging suitable for business correspondence. Instructions: ${instructions}`;
    } else if (platform === 'twitter') {
      prompt = `You are rewriting content for Twitter/X. Consider character limits, social media engagement patterns, hashtag usage, and concise communication style. Instructions: ${instructions}`;
    } else if (platform === 'facebook') {
      prompt = `You are rewriting content for Facebook. Maintain casual but respectful tone appropriate for social networking, community engagement, and personal connections. Instructions: ${instructions}`;
    } else if (platform) {
      prompt = `You are rewriting ${platform} content. Maintain clarity, appropriate tone for the context, and effective communication principles. Instructions: ${instructions}`;
    }

    return prompt;
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
      writerService : Boolean(this.writerService),
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