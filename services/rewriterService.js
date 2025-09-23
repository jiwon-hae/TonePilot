/**
 * Chrome Rewriter Service
 * Provides AI-powered text rewriting using Chrome's Built-in Rewriter API
 */

class RewriterService {
  constructor() {
    this.rewriter = null;
    this.isAvailable = false;
    this.isInitialized = false;
    this.currentConfig = null;
  }

  /**
   * Check if Chrome Rewriter API is available
   * @returns {Promise<boolean>} True if API is available
   */
  async checkAvailability() {
    try {
      if (typeof self.Rewriter === 'undefined') {
        console.warn('Chrome Rewriter API not available. Requires Chrome 137+ with AI features enabled.');
        return false;
      }

      const availability = await Rewriter.availability();
      this.isAvailable = availability !== 'unavailable';

      if (!this.isAvailable) {
        console.warn('Chrome Rewriter not available:', availability);
      }

      return this.isAvailable;
    } catch (error) {
      console.error('Error checking Rewriter availability:', error);
      return false;
    }
  }

  /**
   * Initialize the rewriter session
   * @param {Object} config - Rewriter configuration
   * @param {string} config.tone - Tone: 'more-formal', 'as-is', 'more-casual'
   * @param {string} config.format - Format: 'as-is', 'markdown', 'plain-text'
   * @param {string} config.length - Length: 'shorter', 'as-is', 'longer'
   * @param {string} config.sharedContext - Optional shared context for multiple rewrites
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize(config = {}) {
    const defaultConfig = {
      tone: 'as-is',
      format: 'as-is',
      length: 'as-is',
      sharedContext: this.generatePlatformContext(config.platform, config.context)
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Check if we need to reinitialize with new config
    if (this.isInitialized && this.rewriter &&
        JSON.stringify(this.currentConfig) === JSON.stringify(finalConfig)) {
      return true;
    }

    if (!(await this.checkAvailability())) {
      throw new Error('Chrome Rewriter API not available');
    }

    try {
      // Destroy existing session if config changed
      if (this.rewriter && this.currentConfig) {
        this.destroy();
      }

      const createOptions = {
        tone: finalConfig.tone,
        format: finalConfig.format,
        length: finalConfig.length,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`Rewriter download progress: ${Math.round(e.loaded * 100)}%`);
          });
        }
      };

      // Only add sharedContext if it's not empty
      if (finalConfig.sharedContext) {
        createOptions.sharedContext = finalConfig.sharedContext;
      }

      this.rewriter = await Rewriter.create(createOptions);

      this.currentConfig = finalConfig;
      this.isInitialized = true;
      console.log('✅ Chrome Rewriter initialized successfully with config:', finalConfig);
      return true;
    } catch (error) {
      console.error('Failed to initialize Chrome Rewriter:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Rewrite text using Chrome's AI
   * @param {string} text - Text to rewrite
   * @param {Object} options - Rewriting options
   * @param {string} options.context - Additional context for this specific rewrite
   * @param {string} options.tone - Override tone for this request
   * @param {string} options.format - Override format for this request
   * @param {string} options.length - Override length for this request
   * @returns {Promise<{rewritten: string, original: string, metadata: Object}>}
   */
  async rewrite(text, options = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for rewriting');
    }

    // Initialize with custom config if overrides provided
    const configOverrides = {};
    if (options.tone && options.tone !== this.currentConfig?.tone) {
      configOverrides.tone = options.tone;
    }
    if (options.format && options.format !== this.currentConfig?.format) {
      configOverrides.format = options.format;
    }
    if (options.length && options.length !== this.currentConfig?.length) {
      configOverrides.length = options.length;
    }

    if (Object.keys(configOverrides).length > 0) {
      await this.initialize({ ...this.currentConfig, ...configOverrides });
    } else if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.rewriter) {
      throw new Error('Rewriter not initialized');
    }

    try {
      const rewriteOptions = {};
      if (options.context) {
        rewriteOptions.context = options.context;
      }

      const rewrittenText = await this.rewriter.rewrite(text, rewriteOptions);

      return {
        original: text,
        rewritten: rewrittenText || text,
        hasChanges: rewrittenText !== text,
        metadata: {
          tone: this.currentConfig.tone,
          format: this.currentConfig.format,
          length: this.currentConfig.length,
          contextProvided: !!options.context,
          originalLength: text.length,
          rewrittenLength: rewrittenText?.length || 0,
          lengthChange: ((rewrittenText?.length || 0) - text.length),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Rewriting failed:', error);
      throw new Error(`Rewriting failed: ${error.message}`);
    }
  }

  /**
   * Rewrite text with streaming output
   * @param {string} text - Text to rewrite
   * @param {Object} options - Rewriting options
   * @param {Function} onChunk - Callback for each chunk
   * @returns {Promise<string>} Complete rewritten text
   */
  async rewriteStreaming(text, options = {}, onChunk = null) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for streaming rewriting');
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.rewriter) {
      throw new Error('Rewriter not initialized');
    }

    try {
      const rewriteOptions = {};
      if (options.context) {
        rewriteOptions.context = options.context;
      }

      const stream = this.rewriter.rewriteStreaming(text, rewriteOptions);
      let fullRewrite = '';

      for await (const chunk of stream) {
        fullRewrite += chunk;
        if (onChunk && typeof onChunk === 'function') {
          onChunk(chunk, fullRewrite);
        }
      }

      return fullRewrite;
    } catch (error) {
      console.error('Streaming rewriting failed:', error);
      throw new Error(`Streaming rewriting failed: ${error.message}`);
    }
  }

  /**
   * Get available tone options
   * @returns {Array<string>} Available tone options
   */
  getToneOptions() {
    return ['more-formal', 'as-is', 'more-casual'];
  }

  /**
   * Get available format options
   * @returns {Array<string>} Available format options
   */
  getFormatOptions() {
    return ['as-is', 'markdown', 'plain-text'];
  }

  /**
   * Get available length options
   * @returns {Array<string>} Available length options
   */
  getLengthOptions() {
    return ['shorter', 'as-is', 'longer'];
  }

  /**
   * Create rewriter with specific preset configurations
   * @param {string} preset - Preset name: 'formal', 'casual', 'concise', 'detailed'
   * @param {string} sharedContext - Optional shared context
   */
  async initializeWithPreset(preset, sharedContext = '') {
    const presets = {
      'formal': { tone: 'more-formal', format: 'as-is', length: 'as-is' },
      'casual': { tone: 'more-casual', format: 'as-is', length: 'as-is' },
      'concise': { tone: 'as-is', format: 'as-is', length: 'shorter' },
      'detailed': { tone: 'as-is', format: 'as-is', length: 'longer' },
      'professional': { tone: 'more-formal', format: 'markdown', length: 'as-is' },
      'friendly': { tone: 'more-casual', format: 'plain-text', length: 'as-is' }
    };

    const config = presets[preset] || presets['formal'];
    config.sharedContext = sharedContext;

    return await this.initialize(config);
  }

  /**
   * Generate platform-specific shared context for Rewriter API
   * @param {string} platform - Platform identifier ('linkedin', 'gmail', etc.)
   * @param {Object} context - Additional context from platform
   * @returns {string} Platform-appropriate context string
   */
  generatePlatformContext(platform, context) {
    let baseContext = '';

    switch (platform) {
      case 'linkedin':
        baseContext = 'You are rewriting professional content for LinkedIn. Maintain business networking appropriateness, professional tone, and industry relevance. Content should be engaging for working professionals. ';
        if (context?.author?.name) {
          baseContext += `Original content is by ${context.author.name}`;
          if (context.author.title) {
            baseContext += `, ${context.author.title}`;
          }
          baseContext += '. ';
        }
        if (context?.engagement) {
          baseContext += `This content has professional engagement (${context.engagement.likes || 0} likes, ${context.engagement.comments || 0} comments). `;
        }
        break;

      case 'gmail':
        baseContext = 'You are rewriting email content. Maintain appropriate email etiquette, professional communication standards, and clear messaging suitable for business correspondence. ';
        break;

      case 'twitter':
        baseContext = 'You are rewriting content for Twitter/X. Consider character limits, social media engagement patterns, hashtag usage, and concise communication style. ';
        break;

      case 'facebook':
        baseContext = 'You are rewriting content for Facebook. Maintain casual but respectful tone appropriate for social networking, community engagement, and personal connections. ';
        break;

      default:
        baseContext = 'You are rewriting web content. Maintain clarity, appropriate tone for the context, and effective communication principles. ';
        break;
    }

    return baseContext + 'Preserve the core message while improving clarity, engagement, and appropriateness for the platform.';
  }

  /**
   * Destroy the rewriter session
   */
  destroy() {
    if (this.rewriter) {
      try {
        this.rewriter.destroy();
      } catch (error) {
        console.warn('Error destroying rewriter:', error);
      }
    }

    this.rewriter = null;
    this.isInitialized = false;
    this.currentConfig = null;
    console.log('Rewriter session destroyed');
  }

  /**
   * Get service status
   * @returns {Object} Current status information
   */
  getStatus() {
    return {
      available: this.isAvailable,
      initialized: this.isInitialized,
      ready: this.isInitialized && this.rewriter !== null,
      currentConfig: this.currentConfig
    };
  }
}

// Export to window globals for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.RewriterService = RewriterService;
  console.log('✅ RewriterService exported to window');
} else {
  console.error('❌ Window object not available - RewriterService not exported');
}