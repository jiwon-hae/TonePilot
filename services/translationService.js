/**
 * Translation Service
 * Handles language detection and translation using Chrome's built-in AI APIs
 */

class TranslationService {
  constructor() {
    this.translator = null;
    this.languageDetector = null;
    this.isTranslatorAvailable = false;
    this.isDetectorAvailable = false;
    this.isTranslatorInitialized = false;
    this.isDetectorInitialized = false;
    this.currentConfig = null;
  }

  /**
   * Check if Translation API is available
   * @returns {Promise<boolean>} True if API is available
   */
  async checkTranslatorAvailability() {
    try {
      if (typeof self.Translator === 'undefined') {
        console.warn('Chrome Translator API not available. Requires Chrome 138+ with AI features enabled.');
        return false;
      }

      this.isTranslatorAvailable = true;
      return true;
    } catch (error) {
      console.error('Error checking Translator availability:', error);
      return false;
    }
  }

  /**
   * Check if Language Detection API is available
   * @returns {Promise<boolean>} True if API is available
   */
  async checkDetectorAvailability() {
    try {
      if (typeof self.LanguageDetector === 'undefined') {
        console.warn('Chrome LanguageDetector API not available. Requires Chrome 138+ with AI features enabled.');
        return false;
      }

      this.isDetectorAvailable = true;
      return true;
    } catch (error) {
      console.error('Error checking LanguageDetector availability:', error);
      return false;
    }
  }

  /**
   * Check language pair availability
   * @param {string} sourceLanguage - Source language code (BCP 47)
   * @param {string} targetLanguage - Target language code (BCP 47)
   * @returns {Promise<string>} Availability status
   */
  async checkLanguagePairAvailability(sourceLanguage, targetLanguage) {
    try {
      if (!this.isTranslatorAvailable) {
        return 'no';
      }

      const capabilities = await Translator.availability({
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage
      });

      return capabilities;
    } catch (error) {
      console.error('Error checking language pair availability:', error);
      return 'no';
    }
  }

  /**
   * Initialize language detector
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initializeDetector() {
    if (this.isDetectorInitialized && this.languageDetector) {
      return true;
    }

    if (!(await this.checkDetectorAvailability())) {
      throw new Error('LanguageDetector API not available');
    }

    try {
      this.languageDetector = await LanguageDetector.create({
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`Language detector download progress: ${Math.round(e.loaded * 100)}%`);
          });
        }
      });

      this.isDetectorInitialized = true;
      console.log(' Language detector initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize language detector:', error);
      this.isDetectorInitialized = false;
      throw error;
    }
  }

  /**
   * Detect language from text
   * @param {string} text - Text to analyze
   * @returns {Promise<Array>} Array of {language, confidence} objects
   */
  async detectLanguage(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid text input for language detection');
    }

    if (!this.isDetectorInitialized) {
      await this.initializeDetector();
    }

    if (!this.languageDetector) {
      throw new Error('Language detector not initialized');
    }

    try {
      const results = await this.languageDetector.detect(text);

      console.log('= Language detection results:', results);

      return results.map(result => ({
        language: result.detectedLanguage,
        confidence: result.confidence
      }));
    } catch (error) {
      console.error('Language detection failed:', error);
      throw new Error(`Language detection failed: ${error.message}`);
    }
  }

  /**
   * Get most likely language from text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Most likely language with language code and confidence
   */
  async detectPrimaryLanguage(text) {
    const results = await this.detectLanguage(text);

    if (!results || results.length === 0) {
      return { language: 'unknown', confidence: 0 };
    }

    return results[0];
  }

  /**
   * Initialize translator with language pair
   * @param {Object} config - Translator configuration
   * @param {string} config.sourceLanguage - Source language code (BCP 47)
   * @param {string} config.targetLanguage - Target language code (BCP 47)
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initializeTranslator(config = {}) {
    if (!config.sourceLanguage || !config.targetLanguage) {
      throw new Error('Source and target languages are required');
    }

    const finalConfig = {
      sourceLanguage: config.sourceLanguage,
      targetLanguage: config.targetLanguage
    };

    // Check if we need to reinitialize with new config
    if (this.isTranslatorInitialized && this.translator &&
        JSON.stringify(this.currentConfig) === JSON.stringify(finalConfig)) {
      return true;
    }

    if (!(await this.checkTranslatorAvailability())) {
      throw new Error('Translator API not available');
    }

    // Check language pair availability
    const pairAvailability = await this.checkLanguagePairAvailability(
      finalConfig.sourceLanguage,
      finalConfig.targetLanguage
    );

    if (pairAvailability === 'no') {
      throw new Error(`Translation from ${finalConfig.sourceLanguage} to ${finalConfig.targetLanguage} is not supported`);
    }

    try {
      // Destroy existing translator if config changed
      if (this.translator && this.currentConfig) {
        this.destroyTranslator();
      }

      this.translator = await Translator.create({
        sourceLanguage: finalConfig.sourceLanguage,
        targetLanguage: finalConfig.targetLanguage
      });

      this.currentConfig = finalConfig;
      this.isTranslatorInitialized = true;
      console.log(' Translator initialized successfully:', finalConfig);
      return true;
    } catch (error) {
      console.error('Failed to initialize translator:', error);
      this.isTranslatorInitialized = false;
      throw error;
    }
  }

  /**
   * Translate text
   * @param {string} text - Text to translate
   * @param {Object} options - Translation options
   * @param {string} options.sourceLanguage - Source language (optional, will auto-detect if not provided)
   * @param {string} options.targetLanguage - Target language (required)
   * @returns {Promise<Object>} Translation result with original, translated text, languages, and confidence
   */
  async translate(text, options = {}) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid text input for translation');
    }

    if (!options.targetLanguage) {
      throw new Error('Target language is required');
    }

    let sourceLanguage = options.sourceLanguage;
    let detectionConfidence = 1.0;

    // Auto-detect source language if not provided
    if (!sourceLanguage) {
      console.log('=Auto-detecting source language...');
      const detected = await this.detectPrimaryLanguage(text);
      sourceLanguage = detected.language;
      detectionConfidence = detected.confidence;
      console.log(`< Detected language: ${sourceLanguage} (confidence: ${detectionConfidence})`);
    }

    if (options.targetLanguage === sourceLanguage) {
        return text;
    }

    // Initialize translator with language pair
    await this.initializeTranslator({
      sourceLanguage: sourceLanguage,
      targetLanguage: options.targetLanguage
    });

    if (!this.translator) {
      throw new Error('Translator not initialized');
    }

    try {
      const translatedText = await this.translator.translate(text);

      return {
        original: text,
        translated: translatedText,
        sourceLanguage: sourceLanguage,
        targetLanguage: options.targetLanguage,
        confidence: detectionConfidence,
        metadata: {
          originalLength: text.length,
          translatedLength: translatedText.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Translation failed:', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Translate text with streaming for longer content
   * @param {string} text - Text to translate
   * @param {Object} options - Translation options
   * @param {string} options.sourceLanguage - Source language (optional)
   * @param {string} options.targetLanguage - Target language (required)
   * @param {Function} options.onChunk - Callback for each chunk
   * @returns {Promise<Object>} Translation result with original, translated text, and languages
   */
  async translateStreaming(text, options = {}) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid text input for translation');
    }

    if (!options.targetLanguage) {
      throw new Error('Target language is required');
    }

    let sourceLanguage = options.sourceLanguage;

    // Auto-detect source language if not provided
    if (!sourceLanguage) {
      const detected = await this.detectPrimaryLanguage(text);
      sourceLanguage = detected.language;
    }

    // Initialize translator with language pair
    await this.initializeTranslator({
      sourceLanguage: sourceLanguage,
      targetLanguage: options.targetLanguage
    });

    if (!this.translator) {
      throw new Error('Translator not initialized');
    }

    try {
      let translatedText = '';
      const stream = this.translator.translateStreaming(text);

      for await (const chunk of stream) {
        translatedText = chunk;
        if (options.onChunk && typeof options.onChunk === 'function') {
          options.onChunk(chunk);
        }
      }

      return {
        original: text,
        translated: translatedText,
        sourceLanguage: sourceLanguage,
        targetLanguage: options.targetLanguage
      };
    } catch (error) {
      console.error('Streaming translation failed:', error);
      throw new Error(`Streaming translation failed: ${error.message}`);
    }
  }

  /**
   * Destroy translator instance
   */
  destroyTranslator() {
    if (this.translator) {
      try {
        this.translator.destroy();
      } catch (error) {
        console.warn('Error destroying translator:', error);
      }
    }
    this.translator = null;
    this.isTranslatorInitialized = false;
    this.currentConfig = null;
    console.log(' Translator instance destroyed');
  }

  /**
   * Destroy language detector instance
   */
  destroyDetector() {
    if (this.languageDetector) {
      try {
        this.languageDetector.destroy();
      } catch (error) {
        console.warn('Error destroying language detector:', error);
      }
    }
    this.languageDetector = null;
    this.isDetectorInitialized = false;
    console.log(' Language detector instance destroyed');
  }

  /**
   * Destroy all instances
   */
  destroy() {
    this.destroyTranslator();
    this.destroyDetector();
  }

  /**
   * Get service status
   * @returns {Object} Current status information
   */
  getStatus() {
    return {
      translatorAvailable: this.isTranslatorAvailable,
      translatorInitialized: this.isTranslatorInitialized,
      detectorAvailable: this.isDetectorAvailable,
      detectorInitialized: this.isDetectorInitialized,
      currentConfig: this.currentConfig
    };
  }
}

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.TranslationService = TranslationService;
  console.log(' TranslationService exported to window');
} else {
  console.error('L Window object not available - TranslationService not exported');
}