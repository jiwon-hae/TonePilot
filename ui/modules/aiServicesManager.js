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
    this.translationService = null;
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
      this.translationService = new window.TranslationService();

      // Debug: Check if services were created successfully
      console.log('Service initialization status:', {
        writerService: !!this.writerService,
        rewriterService: !!this.rewriterService,
        summarizerService: !!this.summarizerService,
        promptService: !!this.promptService,
        translationService: !!this.translationService
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

      try {
        await this.translationService.checkTranslatorAvailability();
        await this.translationService.checkDetectorAvailability();
        console.log('✅ Translation service availability check completed');
      } catch (error) {
        console.error('❌ Translation service availability check failed:', error);
        serviceChecks.push({ service: 'translation', error: error.message });
      }

      // Log detailed service availability status
      const serviceStatus = {
        proofreader: this.proofreaderService.isAvailable,
        writer: this.writerService.isAvailable,
        rewriter: this.rewriterService.isAvailable,
        summarizer: this.summarizerService.isAvailable,
        prompt: this.promptService.isAvailable,
        translator: this.translationService.isTranslatorAvailable,
        languageDetector: this.translationService.isDetectorAvailable
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
   * @param {string} conversationContext - Relevant conversation history context
   * @returns {Object} Processing results
   */
  async processText(inputText, selectionData, conversationContext = '') {
    try {
      this.uiManager.hideError();

      // Clear any previous steps
      this.stateManager.clearProcessingSteps();

      // Check if translate mode is active
      const translateMode = this.stateManager.getTranslateMode();
      const targetLanguage = this.stateManager.getTargetLanguage();

      console.log('🔍 Translation mode check:', {
        translateMode: translateMode,
        targetLanguage: targetLanguage,
        stateManagerState: this.stateManager.state.translateMode
      });

      // Get text to process (either selection or input)
      const textToProcess = selectionData?.text || inputText;
      if (!textToProcess?.trim()) {
        throw new Error('No text to process');
      }

      // Step 1: Analyzing request
      this.stateManager.addProcessingStep('Analyzing your request');

      // Route the input to determine intent
      const routing = await this.semanticRouter.route(inputText);
      console.log('🎯 Routing result:', routing);

      // Mark step as complete
      this.stateManager.updateLastStepStatus('complete');

      // Process based on intent
      let result;

      // Step 2: Processing with appropriate service
      const intentLabels = {
        'proofread': 'Proofreading text',
        'summarize': 'Summarizing content',
        'rewrite': 'Rewriting text',
        'write': 'Generating content',
        'translate': 'Translating text'
      };
      const stepLabel = intentLabels[routing.intent] || 'Processing text';
      this.stateManager.addProcessingStep(stepLabel);

      switch (routing.intent) {
        case 'proofread':
          result = await this.handleProofread(textToProcess, routing, conversationContext);
          break;
        case 'summarize':
          result = await this.handleSummarize(textToProcess, selectionData?.platform, selectionData?.context, routing, conversationContext);
          break;
        case 'rewrite':
          result = await this.handleRewrite(textToProcess, inputText, selectionData?.platform, selectionData?.context, routing, conversationContext);
          break;
        case 'write':
          result = await this.handleWrite(inputText, selectionData?.text, selectionData?.platform, routing, conversationContext);
          break;
        case 'translate':
          // Extract target language from input, fallback to settings
          const extractedLanguage = this.extractTargetLanguage(inputText);
          const translationTarget = extractedLanguage || targetLanguage;
          console.log('🌐 Translation request:', {
            extractedFromInput: extractedLanguage,
            fromSettings: targetLanguage,
            using: translationTarget
          });
          result = await this.handleTranslation(textToProcess, translationTarget, conversationContext);
          break;
        default:
          result = await this.handleRewrite(textToProcess, inputText, selectionData?.platform, selectionData?.context, routing, conversationContext);
          break;
      }

      // Mark processing step as complete
      this.stateManager.updateLastStepStatus('complete');

      // Apply translation if translate mode is active (but skip if intent was already translate)
      console.log('🔍 Checking translation condition:', {
        translateMode: translateMode,
        resultPrimary: result?.primary,
        resultExists: !!result,
        routingIntent: routing.intent,
        conditionMet: translateMode && result?.primary && routing.intent !== 'translate',
        targetLanguage: targetLanguage
      });

      if (translateMode && result?.primary && routing.intent !== 'translate') {
        // Step 3: Applying translation
        this.stateManager.addProcessingStep(`Translating to ${targetLanguage}`);
        console.log('🌐 Translate mode active, translating result to:', targetLanguage);
        result = await this.applyTranslationToResult(result, targetLanguage);
        this.stateManager.updateLastStepStatus('complete');
        console.log('✅ Translation completed, result:', result);
      } else {
        console.log('⏭️ Skipping translation:', {
          reason: !translateMode ? 'translateMode is false' :
                  !result?.primary ? 'result.primary is missing' :
                  routing.intent === 'translate' ? 'intent was already translate' : 'unknown'
        });
      }

      // Prepare final result
      const finalResult = {
        ...result,
        intent: routing.intent,
        outputType: routing.outputType,
        tones: routing.tones,
        via: routing.via,
        score: routing.score
      };

      console.log('🎯 Final result object:', {
        hasAlt1: !!finalResult.alt1,
        hasAlt2: !!finalResult.alt2,
        keys: Object.keys(finalResult)
      });

      // Loading will be replaced by showResults, no need to explicitly hide
      return finalResult;

    } catch (error) {
      // Error will be handled by the conversation item that called this method
      console.error('❌ Text processing failed:', error);
      throw error;
    }
  }

  /**
   * Handle proofreading request
   * @param {string} text - Text to proofread
   * @returns {Object} Proofread results
   */
  async handleProofread(text, routing = null, conversationContext = '') {
    console.log('📝 Proofreading text...');
    if (conversationContext) {
      console.log('📚 Using conversation context for proofreading');
    }

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
  async handleSummarize(text, platform, context, routing = null, conversationContext = '') {
    console.log('📋 Summarizing text...');
    if (conversationContext) {
      console.log('📚 Using conversation context for summarization');
    }
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
  async handleRewrite(text, instructions, platform, context, routing = null, conversationContext = '') {
    console.log('✏️ Rewriting text...');
    if (conversationContext) {
      console.log('📚 Using conversation context for rewriting');
    }
    console.log('Platform:', platform);
    console.log('Context:', context);
    console.log('📝 Routing info:', routing);

    // Determine tone from instructions (enhanced with routing info)
    const tone = routing?.tones?.length > 0 ? routing.tones[0] : this.extractToneFromInstructions(instructions);
    const outputType = routing?.outputType;

    console.log('🎨 Detected tone:', tone, 'Output type:', outputType);

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

        // Add conversation context if available
        if (conversationContext) {
          prompt = `${conversationContext}\n\n${prompt}\n\nConsider the conversation history above when rewriting.`;
        }

        // Add document context if relevant (resume, email templates, etc.)
        const documentContext = await this.getDocumentContext(instructions);
        if (documentContext) {
          prompt = `${prompt}${documentContext}`;
        }

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
  async handleWrite(query, context, platform, routing = null, conversationContext = '') {
    console.log('✏️ Writing text...');
    if (conversationContext) {
      console.log('📚 Using conversation context for writing');
    }
    console.log('Query:', query);
    console.log('Context:', context);
    console.log('Platform:', platform);
    console.log('📝 Routing info:', routing);

    // Determine tone from query (enhanced with routing info)
    const tone = routing?.tones?.length > 0 ? routing.tones[0] : this.extractToneFromQuery(query);
    const outputType = routing?.outputType;

    console.log('🎨 Detected tone:', tone, 'Output type:', outputType);

    // Check if writer service exists and is available
    if (!this.writerService || !this.writerService.isAvailable) {
      console.warn('⚠️ Writer service not available, using language model fallback');
      // Fallback to language model via PromptService
      try {
        const promptService = new window.PromptService();
        let prompt = query;

        // Add conversation context if available
        if (conversationContext) {
          prompt = `${conversationContext}\n\n${prompt}\n\nConsider the conversation history above when formulating your response.`;
        }

        // Add output type instructions
        if (outputType) {
          const typeInstructions = this.generateOutputTypeInstructions(outputType, tone);
          prompt = `${typeInstructions}\n\n${query}`;
        }

        // Add platform-specific context
        if (platform) {
          const platformContext = this.generatePlatformContext(platform);
          prompt = `${platformContext}\n\n${prompt}`;
        }

        // Add context if provided
        if (context && context.trim()) {
          prompt = `${prompt}\n\nContext to consider: "${context}"`;
        }

        // Add document context if relevant (resume, email templates, etc.)
        const documentContext = await this.getDocumentContext(query);
        if (documentContext) {
          prompt = `${prompt}${documentContext}`;
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
      const format = outputType ? this.deriveFormatFromOutputType(outputType) : 'plain-text';
      await this.writerService.initialize({
        tone: tone,
        format: format,
        length: 'medium',
        platform: platform
      });

      // Build enhanced context with document data
      let enhancedContext = context;

      // Add document data if relevant (resume, email templates, etc.)
      const documentContext = await this.getDocumentContext(query);
      if (documentContext) {
        enhancedContext = enhancedContext ? `${enhancedContext}${documentContext}` : documentContext.trim();
      }

      // Use Writer API
      const result = await this.writerService.write(query, enhancedContext, {
        context: enhancedContext || undefined
      });

      return {
        primary: result.output,
        original: query,
        context: enhancedContext || '',
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

        // Add document context if relevant (resume, email templates, etc.)
        const documentContext = await this.getDocumentContext(query);
        if (documentContext) {
          prompt = `${prompt}${documentContext}`;
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
   * Handle translation request
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code
   * @returns {Object} Translation results
   */
  async handleTranslation(text, targetLanguage, conversationContext = '') {
    console.log('🌐 Translating text...');
    if (conversationContext) {
      console.log('📚 Using conversation context for translation');
    }
    console.log('Text:', text);
    console.log('Target language:', targetLanguage);

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for translation');
    }

    if (!targetLanguage) {
      throw new Error('No target language specified. Please specify a target language (e.g., "translate to Spanish")');
    }

    if (!this.translationService.isTranslatorAvailable) {
      console.warn('⚠️ Translation service not available, using language model fallback');
      // Fallback to language model
      try {
        const promptService = new window.PromptService();
        const prompt = `Translate the following text to ${this.getLanguageName(targetLanguage)}:\n\n"${text}"`;
        const result = await promptService.send(prompt);

        // Validate result
        if (!result || result.trim().length === 0) {
          throw new Error('Language model returned empty translation');
        }

        const translationResult = {
          primary: result,
          original: text,
          type: 'translate',
          service: 'languageModel',
          targetLanguage: targetLanguage
        };
        console.log('🔄 Translation result (languageModel):', translationResult);
        return translationResult;
      } catch (error) {
        throw new Error(`Language model translation fallback failed: ${error.message}`);
      }
    }

    try {
      const result = await this.translationService.translate(text, {
        targetLanguage: targetLanguage
      });

      const translationResult = {
        primary: result.translated,
        original: result.original,
        type: 'translate',
        service: 'translator',
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        confidence: result.confidence,
        metadata: result.metadata
      };
      console.log('🔄 Translation result (translator):', translationResult);

      // Validate result has content
      if (!translationResult.primary || translationResult.primary.trim().length === 0) {
        throw new Error('Translation returned empty result');
      }

      return translationResult;
    } catch (error) {
      console.error('❌ Translation service failed, using language model fallback:', error);
      try {
        const promptService = new window.PromptService();
        const prompt = `Translate the following text to ${this.getLanguageName(targetLanguage)}:\n\n"${text}"`;
        const result = await promptService.send(prompt);

        // Validate result
        if (!result || result.trim().length === 0) {
          throw new Error('Language model returned empty translation');
        }

        return {
          primary: result,
          original: text,
          type: 'translate',
          service: 'languageModel',
          targetLanguage: targetLanguage
        };
      } catch (fallbackError) {
        throw new Error(`Both translation and language model failed: ${error.message}; ${fallbackError.message}`);
      }
    }
  }

  /**
   * Apply translation to a result object
   * @param {Object} result - Result object from any service
   * @param {string} targetLanguage - Target language code
   * @returns {Object} Result with translated primary content
   */
  async applyTranslationToResult(result, targetLanguage) {
    console.log('🎯 applyTranslationToResult called with:', {
      result: result,
      targetLanguage: targetLanguage,
      resultPrimary: result?.primary
    });

    try {
      const textToTranslate = result.primary;

      if (!textToTranslate || typeof textToTranslate !== 'string') {
        console.warn('⚠️ No valid text to translate in result:', {
          textToTranslate: textToTranslate,
          type: typeof textToTranslate,
          result: result
        });
        return result;
      }

      console.log('🔄 Translating result:', textToTranslate);

      // Use translation service to translate the result
      const translationResult = await this.handleTranslation(textToTranslate, targetLanguage);

      // Return modified result with translated primary content
      return {
        ...result,
        primary: translationResult.primary,
        originalPrimary: textToTranslate, // Keep original for reference
        translatedFrom: translationResult.sourceLanguage,
        translatedTo: translationResult.targetLanguage,
        translationConfidence: translationResult.confidence,
        wasTranslated: true
      };
    } catch (error) {
      console.error('❌ Failed to translate result:', error);
      // Return original result if translation fails
      return {
        ...result,
        translationError: error.message
      };
    }
  }

  /**
   * Extract target language from user input
   * @param {string} input - User input text
   * @returns {string|null} Language code or null if not found
   */
  extractTargetLanguage(input) {
    const text = input.toLowerCase();

    const languagePatterns = {
      'en': /\b(to\s+)?english\b/i,
      'es': /\b(to\s+)?spanish\b/i,
      'fr': /\b(to\s+)?french\b/i,
      'de': /\b(to\s+)?german\b/i,
      'it': /\b(to\s+)?italian\b/i,
      'pt': /\b(to\s+)?portuguese\b/i,
      'ru': /\b(to\s+)?russian\b/i,
      'ja': /\b(to\s+)?japanese\b/i,
      'ko': /\b(to\s+)?korean\b/i,
      'zh': /\b(to\s+)?(chinese|mandarin|simplified\s+chinese)\b/i,
      'zh-TW': /\b(to\s+)?(traditional\s+chinese|taiwanese)\b/i,
      'ar': /\b(to\s+)?arabic\b/i,
      'hi': /\b(to\s+)?hindi\b/i,
      'nl': /\b(to\s+)?dutch\b/i,
      'pl': /\b(to\s+)?polish\b/i,
      'tr': /\b(to\s+)?turkish\b/i,
      'vi': /\b(to\s+)?vietnamese\b/i,
      'th': /\b(to\s+)?thai\b/i,
      'id': /\b(to\s+)?indonesian\b/i,
      'sv': /\b(to\s+)?swedish\b/i,
      'da': /\b(to\s+)?danish\b/i,
      'fi': /\b(to\s+)?finnish\b/i,
      'no': /\b(to\s+)?norwegian\b/i,
      'cs': /\b(to\s+)?czech\b/i,
      'hu': /\b(to\s+)?hungarian\b/i,
      'ro': /\b(to\s+)?romanian\b/i,
      'uk': /\b(to\s+)?ukrainian\b/i,
      'el': /\b(to\s+)?greek\b/i,
      'he': /\b(to\s+)?hebrew\b/i
    };

    for (const [code, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(text)) {
        console.log(`🎯 Detected target language: ${code} from input:`, input);
        return code;
      }
    }

    console.log('⚠️ No target language detected in input, using settings default');
    return null;
  }

  /**
   * Get language name from language code
   * @param {string} code - Language code (e.g., 'es', 'fr')
   * @returns {string} Language name
   */
  getLanguageName(code) {
    const languageMap = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'pl': 'Polish',
      'tr': 'Turkish',
      'vi': 'Vietnamese',
      'th': 'Thai',
      'id': 'Indonesian',
      'sv': 'Swedish',
      'da': 'Danish',
      'fi': 'Finnish',
      'no': 'Norwegian',
      'cs': 'Czech',
      'hu': 'Hungarian',
      'ro': 'Romanian',
      'uk': 'Ukrainian',
      'el': 'Greek',
      'he': 'Hebrew'
    };
    return languageMap[code] || code;
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
   * Generate output type specific instructions for AI prompts
   * @param {string} outputType - Detected output type (email, letter, etc.)
   * @param {string} tone - Detected tone (formal, casual, etc.)
   * @returns {string} Instructions for the AI
   */
  generateOutputTypeInstructions(outputType, tone = null) {
    const toneModifier = tone ? ` in a ${tone} tone` : '';

    switch (outputType) {
      case 'email':
        return `Write a professional email${toneModifier}. Include a clear subject line, proper greeting, well-structured body, and appropriate closing.`;

      case 'letter':
        return `Write a formal letter${toneModifier}. Include proper letterhead format, date, recipient address, formal salutation, structured paragraphs, and professional closing.`;

      case 'post':
        return `Create engaging social media content${toneModifier}. Make it attention-grabbing, shareable, and appropriate for the platform.`;

      case 'document':
        return `Create a well-structured document${toneModifier}. Use clear headings, organized paragraphs, and professional formatting.`;

      case 'list':
        return `Create a clear, organized list${toneModifier}. Use bullet points or numbers, keep items concise, and ensure logical order.`;

      case 'script':
        return `Write a dialogue or script${toneModifier}. Include speaker names, natural conversation flow, and appropriate stage directions if needed.`;

      case 'summary':
        return `Create a concise summary${toneModifier}. Focus on key points, eliminate unnecessary details, and maintain clarity.`;

      case 'response':
        return `Write a thoughtful response${toneModifier}. Address the main points, provide relevant information, and maintain appropriate formality.`;

      case 'announcement':
        return `Create a clear announcement${toneModifier}. Include key details, call-to-action if needed, and ensure important information is prominent.`;

      case 'tutorial':
        return `Write a step-by-step guide${toneModifier}. Use numbered steps, clear instructions, and include helpful tips or warnings where appropriate.`;

      default:
        return tone ? `Write content${toneModifier}.` : '';
    }
  }

  /**
   * Derive format from output type for writer service
   * @param {string} outputType - Detected output type
   * @returns {string} Format for writer service
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

  /**
   * Check if resume context is relevant for the given query
   * @param {string} query - User query text
   * @returns {boolean} Whether resume context should be included
   */
  isResumeContextRelevant(query) {
    const text = query.toLowerCase();
    const resumeKeywords = [
      'cover letter', 'application', 'apply', 'job', 'position', 'role',
      'career', 'professional', 'experience', 'qualifications',
      'skills', 'background', 'resume', 'cv', 'portfolio'
    ];

    return resumeKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if email template context is relevant for the given query
   * @param {string} query - User query text
   * @returns {boolean} Whether email template context should be included
   */
  isEmailContextRelevant(query) {
    const text = query.toLowerCase();
    const emailKeywords = [
      'email', 'cold email', 'outreach', 'networking', 'contact',
      'reach out', 'send', 'write to', 'message', 'follow up',
      'introduction', 'connect', 'inquiry', 'pitch'
    ];

    return emailKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Get document context for AI processing (resume, email templates, etc.)
   * @param {string} query - User query to determine what context to include
   * @returns {Promise<string|null>} Document context or null if not available
   */
  async getDocumentContext(query) {
    try {
      const includeResume = this.isResumeContextRelevant(query);
      const includeEmail = this.isEmailContextRelevant(query);

      if (!includeResume && !includeEmail) {
        return null;
      }

      let context = '';

      if (includeResume || includeEmail) {
        // Use the full context which includes resume, email subject, and template
        const documentContext = await window.DocumentService.buildColdEmailContext();
        if (documentContext) {
          console.log('📄 Including document context in AI processing');
          context = `\n\n--- Personal Context ---\n${documentContext}`;
        }
      }

      return context || null;
    } catch (error) {
      console.error('Failed to get document context:', error);
      return null;
    }
  }

  /**
   * Get resume context for AI processing (legacy method - use getDocumentContext instead)
   * @returns {Promise<string|null>} Resume context or null if not available
   */
  async getResumeContext() {
    try {
      const resumeContext = await window.DocumentService.buildColdEmailContext();
      if (resumeContext) {
        console.log('📄 Including resume context in AI processing');
        return `\n\n--- Personal Context ---\n${resumeContext}`;
      }
      return null;
    } catch (error) {
      console.error('Failed to get resume context:', error);
      return null;
    }
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