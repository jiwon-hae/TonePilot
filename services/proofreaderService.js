/**
 * Chrome Proofreader Service
 * Provides AI-powered proofreading using Chrome's Built-in Proofreader API
 */

class ProofreaderService {
  constructor() {
    this.proofreader = null;
    this.isAvailable = false;
    this.isInitialized = false;
  }

  /**
   * Check if Chrome Proofreader API is available
   * @returns {boolean} True if API is available
   */
  async checkAvailability() {
    try {
      if (typeof self.Proofreader === 'undefined') {
        console.warn('Chrome Proofreader API not available. Requires Chrome 141+ with AI features enabled.');
        return false;
      }

      const availability = await Proofreader.availability();
      this.isAvailable = availability !== 'unavailable';

      if (!this.isAvailable) {
        console.warn('Chrome Proofreader not available:', availability);
      }

      return this.isAvailable;
    } catch (error) {
      console.error('Error checking Proofreader availability:', error);
      return false;
    }
  }

  /**
   * Initialize the proofreader session
   * @param {string[]} languages - Expected input languages (e.g., ['en'])
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize(languages = ['en']) {
    if (this.isInitialized && this.proofreader) {
      return true;
    }

    if (!(await this.checkAvailability())) {
      throw new Error('Chrome Proofreader API not available');
    }

    try {
      this.proofreader = await Proofreader.create({
        expectedInputLanguages: languages,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`Proofreader download progress: ${Math.round(e.loaded * 100)}%`);
          });
        }
      });

      this.isInitialized = true;
      console.log('✅ Chrome Proofreader initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Chrome Proofreader:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Proofread text using Chrome's AI
   * @param {string} text - Text to proofread
   * @returns {Promise<{corrected: string, corrections: Array, original: string}>}
   */
  async proofread(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for proofreading');
    }

    // Initialize if not already done
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.proofreader) {
      throw new Error('Proofreader not initialized');
    }

    try {
      const result = await this.proofreader.proofread(text);

      return {
        original: text,
        corrected: result.correction || text,
        corrections: result.corrections || [],
        hasChanges: result.correction !== text,
        metadata: {
          correctionCount: result.corrections?.length || 0,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Proofreading failed:', error);
      throw new Error(`Proofreading failed: ${error.message}`);
    }
  }

  /**
   * Get detailed information about corrections
   * @param {Array} corrections - Corrections array from proofread result
   * @returns {Array} Formatted correction details
   */
  formatCorrections(corrections) {
    if (!Array.isArray(corrections)) return [];

    return corrections.map((correction, index) => ({
      id: index,
      startIndex: correction.startIndex,
      endIndex: correction.endIndex,
      originalText: correction.originalText || '',
      correctedText: correction.correctedText || '',
      errorType: correction.errorType || 'unknown',
      suggestion: correction.suggestion || ''
    }));
  }

  /**
   * Destroy the proofreader session
   */
  destroy() {
    if (this.proofreader) {
      try {
        this.proofreader.destroy();
      } catch (error) {
        console.warn('Error destroying proofreader:', error);
      }
    }

    this.proofreader = null;
    this.isInitialized = false;
    console.log('Proofreader session destroyed');
  }

  /**
   * Get service status
   * @returns {Object} Current status information
   */
  getStatus() {
    return {
      available: this.isAvailable,
      initialized: this.isInitialized,
      ready: this.isInitialized && this.proofreader !== null
    };
  }
}

// Export to window globals for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.ProofreaderService = ProofreaderService;
  console.log('✅ ProofreaderService exported to window');
} else {
  console.error('❌ Window object not available - ProofreaderService not exported');
}