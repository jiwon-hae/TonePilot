class WriterService {
    constructor() {
        this.writer = null;
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
            if (typeof self.Writer === 'undefined') {
                console.warn('Chrome Writer API not available. Requires Chrome 138+ with AI features enabled.');
                return false;
            }

            const availability = await Writer.availability();
            this.isAvailable = availability !== 'unavailable';

            if (!this.isAvailable) {
                console.warn('Chrome Writer not available:', availability);
            }

            return this.isAvailable;
        } catch (error) {
            console.error('Error checking Writer availability:', error);
            return false;
        }
    }

    /**
     * Initialize the writer session
     * @param {Object} config - Writer configuration
     * @param {string} config.tone - Writing tone: 'formal', 'neutral', 'casual'
     * @param {string} config.format - Output format: 'markdown', 'plain-text'
     * @param {string} config.length - Writer length: 'short', 'medium', 'long'
     * @param {string} config.sharedContext - Optional shared context
     * @returns {Promise<boolean>} True if initialization successful
     */
    async initialize(config = {}) {
        const defaultConfig = {
            tone: 'casual',
            format: 'plain-text',
            length: 'medium',
            sharedContext: 'This is an email to acquaintances about an upcoming event.'
        };

        const finalConfig = { ...defaultConfig, ...config };

        // Check if we need to reinitialize with new config
        if (this.isInitialized && this.writer &&
            JSON.stringify(this.currentConfig) === JSON.stringify(finalConfig)) {
            return true;
        }

        if (!(await this.checkAvailability())) {
            throw new Error('Chrome Writer API not available');
        }

        try {
            // Destroy existing session if config changed
            if (this.writer && this.currentConfig) {
                this.destroy();
            }

            this.writer = await Writer.create({
                tone: finalConfig.tone,
                format: finalConfig.format,
                length: finalConfig.length,
                sharedContext: finalConfig.sharedContext,
                monitor(m) {
                    m.addEventListener('downloadprogress', (e) => {
                        console.log(`Writer download progress: ${Math.round(e.loaded * 100)}%`);
                    });
                }
            });

            this.currentConfig = finalConfig;
            this.isInitialized = true;
            console.log('✅ Chrome Writer initialized successfully with config:', finalConfig);
            return true;
        } catch (error) {
            console.error('Failed to initialize Chrome Writer:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    /**
   * Write text using Chrome's AI
   * @param {string} query - Query prompt to write
   * @param {string} context - Context provided for writing
   * @param {Object} options - Writer options
   * @param {string} options.context - Additional context for the writer
   * @param {string} options.tone - Override tone for this request ('formal', 'neutral', 'casual')
   * @param {string} options.length - Override length for this request ('short', 'medium', 'long')
   * @returns {Promise<{original: string, output: string, metadata: Object}>}
   */
    async write(query, context, options = {}) {
        if (!query || typeof query !== 'string') {
            throw new Error('Invalid query input for writing');
        }

        // Initialize with custom config if tone/length overrides provided
        const configOverrides = {};
        if (options.tone && options.tone !== this.currentConfig?.tone) {
            configOverrides.tone = options.tone;
        }
        if (options.length && options.length !== this.currentConfig?.length) {
            configOverrides.length = options.length;
        }

        if (Object.keys(configOverrides).length > 0) {
            await this.initialize({ ...this.currentConfig, ...configOverrides });
        } else if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.writer) {
            throw new Error('Writer not initialized');
        }

        try {
            const writeOptions = {};
            if (options.context || context) {
                writeOptions.context = options.context || context;
            }

            const output = await this.writer.write(query, writeOptions);

            return {
                original: query,
                output: output || '',
                metadata: {
                    tone: this.currentConfig.tone,
                    format: this.currentConfig.format,
                    length: this.currentConfig.length,
                    contextProvided: !!(options.context || context),
                    originalLength: query.length,
                    outputLength: output?.length || 0,
                    expansionRatio: query.length > 0 ? ((output?.length || 0) / query.length) : 0,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Writer failed:', error);
            throw new Error(`Writer failed: ${error.message}`);
        }
    }

    /**
     * Destroy the writer session to free resources
     */
    destroy() {
        if (this.writer) {
            this.writer.destroy();
            this.writer = null;
            this.isInitialized = false;
            this.currentConfig = null;
            console.log('✅ Writer session destroyed');
        }
    }
}

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
    window.WriterService = WriterService;
    console.log('✅ WriterService exported to window');
}

// Export to window globals
if (typeof window !== 'undefined') {
    window.WriterService = WriterService;
    console.log('✅ WriterService exported to window');
} else {
    console.error('❌ Window object not available - WriterService not exported');
}