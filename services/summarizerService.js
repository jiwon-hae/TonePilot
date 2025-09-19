/**
 * Chrome Summarizer Service
 * Provides AI-powered summarization using Chrome's Built-in Summarizer API
 */

class SummarizerService {
  constructor() {
    this.summarizer = null;
    this.isAvailable = false;
    this.isInitialized = false;
    this.currentConfig = null;
  }

  /**
   * Check if Chrome Summarizer API is available
   * @returns {Promise<boolean>} True if API is available
   */
  async checkAvailability() {
    try {
      if (typeof self.Summarizer === 'undefined') {
        console.warn('Chrome Summarizer API not available. Requires Chrome 138+ with AI features enabled.');
        return false;
      }

      const availability = await Summarizer.availability();
      this.isAvailable = availability !== 'unavailable';

      if (!this.isAvailable) {
        console.warn('Chrome Summarizer not available:', availability);
      }

      return this.isAvailable;
    } catch (error) {
      console.error('Error checking Summarizer availability:', error);
      return false;
    }
  }

  /**
   * Initialize the summarizer session
   * @param {Object} config - Summarizer configuration
   * @param {string} config.type - Summary type: 'key-points', 'tldr', 'teaser', 'headline'
   * @param {string} config.format - Output format: 'markdown', 'plain-text'
   * @param {string} config.length - Summary length: 'short', 'medium', 'long'
   * @param {string} config.sharedContext - Optional shared context
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize(config = {}) {
    const defaultConfig = {
      type: 'key-points',
      format: 'markdown',
      length: 'medium',
      sharedContext: ''
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Check if we need to reinitialize with new config
    if (this.isInitialized && this.summarizer &&
        JSON.stringify(this.currentConfig) === JSON.stringify(finalConfig)) {
      return true;
    }

    if (!(await this.checkAvailability())) {
      throw new Error('Chrome Summarizer API not available');
    }

    try {
      // Destroy existing session if config changed
      if (this.summarizer && this.currentConfig) {
        this.destroy();
      }

      this.summarizer = await Summarizer.create({
        type: finalConfig.type,
        format: finalConfig.format,
        length: finalConfig.length,
        sharedContext: finalConfig.sharedContext,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`Summarizer download progress: ${Math.round(e.loaded * 100)}%`);
          });
        }
      });

      this.currentConfig = finalConfig;
      this.isInitialized = true;
      console.log('✅ Chrome Summarizer initialized successfully with config:', finalConfig);
      return true;
    } catch (error) {
      console.error('Failed to initialize Chrome Summarizer:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Summarize text using Chrome's AI
   * @param {string} text - Text to summarize
   * @param {Object} options - Summarization options
   * @param {string} options.context - Additional context for the summary
   * @param {string} options.type - Override summary type for this request
   * @param {string} options.length - Override length for this request
   * @returns {Promise<{summary: string, original: string, metadata: Object}>}
   */
  async summarize(text, options = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for summarization');
    }

    // Initialize with custom config if type/length overrides provided
    const configOverrides = {};
    if (options.type && options.type !== this.currentConfig?.type) {
      configOverrides.type = options.type;
    }
    if (options.length && options.length !== this.currentConfig?.length) {
      configOverrides.length = options.length;
    }

    if (Object.keys(configOverrides).length > 0) {
      await this.initialize({ ...this.currentConfig, ...configOverrides });
    } else if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.summarizer) {
      throw new Error('Summarizer not initialized');
    }

    try {
      const summarizeOptions = {};
      if (options.context) {
        summarizeOptions.context = options.context;
      }

      const summary = await this.summarizer.summarize(text, summarizeOptions);

      return {
        original: text,
        summary: summary || '',
        metadata: {
          type: this.currentConfig.type,
          format: this.currentConfig.format,
          length: this.currentConfig.length,
          contextProvided: !!options.context,
          originalLength: text.length,
          summaryLength: summary?.length || 0,
          compressionRatio: text.length > 0 ? ((summary?.length || 0) / text.length) : 0,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Summarization failed:', error);
      throw new Error(`Summarization failed: ${error.message}`);
    }
  }

  /**
   * Summarize text with streaming output
   * @param {string} text - Text to summarize
   * @param {Object} options - Summarization options
   * @param {Function} onChunk - Callback for each chunk
   * @returns {Promise<string>} Complete summary
   */
  async summarizeStreaming(text, options = {}, onChunk = null) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for streaming summarization');
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.summarizer) {
      throw new Error('Summarizer not initialized');
    }

    try {
      const summarizeOptions = {};
      if (options.context) {
        summarizeOptions.context = options.context;
      }

      const stream = this.summarizer.summarizeStreaming(text, summarizeOptions);
      let fullSummary = '';

      for await (const chunk of stream) {
        fullSummary += chunk;
        if (onChunk && typeof onChunk === 'function') {
          onChunk(chunk, fullSummary);
        }
      }

      return fullSummary;
    } catch (error) {
      console.error('Streaming summarization failed:', error);
      throw new Error(`Streaming summarization failed: ${error.message}`);
    }
  }

  /**
   * Get available summary types
   * @returns {Array<string>} Available summary types
   */
  getSummaryTypes() {
    return ['key-points', 'tldr', 'teaser', 'headline'];
  }

  /**
   * Get available summary lengths
   * @returns {Array<string>} Available summary lengths
   */
  getSummaryLengths() {
    return ['short', 'medium', 'long'];
  }

  /**
   * Get available output formats
   * @returns {Array<string>} Available output formats
   */
  getOutputFormats() {
    return ['markdown', 'plain-text'];
  }

  /**
   * Destroy the summarizer session
   */
  destroy() {
    if (this.summarizer) {
      try {
        this.summarizer.destroy();
      } catch (error) {
        console.warn('Error destroying summarizer:', error);
      }
    }

    this.summarizer = null;
    this.isInitialized = false;
    this.currentConfig = null;
    console.log('Summarizer session destroyed');
  }

  /**
   * Get service status
   * @returns {Object} Current status information
   */
  getStatus() {
    return {
      available: this.isAvailable,
      initialized: this.isInitialized,
      ready: this.isInitialized && this.summarizer !== null,
      currentConfig: this.currentConfig
    };
  }
}

// Export to window globals for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.SummarizerService = SummarizerService;
  console.log('✅ SummarizerService exported to window');
} else {
  console.error('❌ Window object not available - SummarizerService not exported');
}