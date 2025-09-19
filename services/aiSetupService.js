/**
 * Chrome AI Setup Service
 * Handles verification and setup of Chrome's Built-in AI APIs
 */

class AISetupService {
  constructor() {
    this.isSetup = false;
    this.availability = {
      languageModel: 'checking',
      rewriter: 'checking',
      summarizer: 'checking',
      proofreader: 'checking'
    };
    this.userActivationRequired = true;
  }

  /**
   * Check system requirements for Chrome AI APIs
   * @returns {Object} Requirements check results
   */
  checkRequirements() {
    const results = {
      chromeVersion: this.checkChromeVersion(),
      platform: this.checkPlatform(),
      userAgent: navigator.userAgent,
      isSecureContext: window.isSecureContext,
      recommendations: []
    };

    // Add recommendations based on checks
    if (!results.chromeVersion.supported) {
      results.recommendations.push('Update Chrome to version 121+ to use AI features');
    }

    if (!results.platform.supported) {
      results.recommendations.push('Chrome AI APIs require Windows 10+, macOS 13+, Linux, or ChromeOS');
    }

    if (!results.isSecureContext) {
      results.recommendations.push('AI APIs require HTTPS or localhost');
    }

    return results;
  }

  /**
   * Check Chrome version compatibility
   * @returns {Object} Version check results
   */
  checkChromeVersion() {
    const userAgent = navigator.userAgent;
    const chromeMatch = userAgent.match(/Chrome\/(\d+)/);

    if (!chromeMatch) {
      return { supported: false, version: null, reason: 'Chrome browser required' };
    }

    const version = parseInt(chromeMatch[1]);
    const minVersion = 121; // Minimum version for AI APIs

    return {
      supported: version >= minVersion,
      version: version,
      minRequired: minVersion,
      reason: version < minVersion ? `Chrome ${minVersion}+ required, found ${version}` : null
    };
  }

  /**
   * Check platform compatibility
   * @returns {Object} Platform check results
   */
  checkPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    // Check for supported platforms
    const isWindows = platform.includes('win') || userAgent.includes('windows');
    const isMac = platform.includes('mac') || userAgent.includes('mac');
    const isLinux = platform.includes('linux') && !userAgent.includes('android');
    const isChromeOS = userAgent.includes('cros');
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    const supported = (isWindows || isMac || isLinux || isChromeOS) && !isMobile;

    return {
      supported,
      platform: {
        windows: isWindows,
        mac: isMac,
        linux: isLinux,
        chromeOS: isChromeOS,
        mobile: isMobile
      },
      reason: !supported ? 'Unsupported platform - requires Windows 10+, macOS 13+, Linux, or ChromeOS (not mobile)' : null
    };
  }

  /**
   * Check availability of all AI APIs
   * @returns {Promise<Object>} Availability status for each API
   */
  async checkAllAPIsAvailability() {
    const checks = {
      languageModel: this.checkLanguageModelAvailability(),
      rewriter: this.checkRewriterAvailability(),
      summarizer: this.checkSummarizerAvailability(),
      proofreader: this.checkProofreaderAvailability()
    };

    // Wait for all checks to complete
    const results = {};
    for (const [api, checkPromise] of Object.entries(checks)) {
      try {
        results[api] = await checkPromise;
      } catch (error) {
        results[api] = {
          available: false,
          status: 'error',
          error: error.message
        };
      }
    }

    this.availability = results;
    return results;
  }

  /**
   * Check Language Model API availability
   * @returns {Promise<Object>} Availability status
   */
  async checkLanguageModelAvailability() {
    try {
      if (!window.ai?.languageModel) {
        return {
          available: false,
          status: 'unavailable',
          reason: 'Language Model API not found. Enable chrome://flags/#prompt-api-for-gemini-nano'
        };
      }

      const status = await window.ai.languageModel.availability();
      return {
        available: status === 'available',
        status: status,
        reason: status !== 'available' ? `Status: ${status}` : null
      };
    } catch (error) {
      return {
        available: false,
        status: 'error',
        reason: error.message
      };
    }
  }

  /**
   * Check Rewriter API availability
   * @returns {Promise<Object>} Availability status
   */
  async checkRewriterAvailability() {
    try {
      if (!window.ai?.rewriter) {
        return {
          available: false,
          status: 'unavailable',
          reason: 'Rewriter API not found. Requires Chrome 137+ with flags enabled'
        };
      }

      const status = await window.ai.rewriter.availability();
      return {
        available: status === 'available',
        status: status,
        reason: status !== 'available' ? `Status: ${status}` : null
      };
    } catch (error) {
      return {
        available: false,
        status: 'error',
        reason: error.message
      };
    }
  }

  /**
   * Check Summarizer API availability
   * @returns {Promise<Object>} Availability status
   */
  async checkSummarizerAvailability() {
    try {
      if (!window.ai?.summarizer) {
        return {
          available: false,
          status: 'unavailable',
          reason: 'Summarizer API not found. Requires Chrome 138+ with flags enabled'
        };
      }

      const status = await window.ai.summarizer.availability();
      return {
        available: status === 'available',
        status: status,
        reason: status !== 'available' ? `Status: ${status}` : null
      };
    } catch (error) {
      return {
        available: false,
        status: 'error',
        reason: error.message
      };
    }
  }

  /**
   * Check Proofreader API availability
   * @returns {Promise<Object>} Availability status
   */
  async checkProofreaderAvailability() {
    try {
      if (!window.ai?.proofreader) {
        return {
          available: false,
          status: 'unavailable',
          reason: 'Proofreader API not found. Requires Chrome 141+ with flags enabled'
        };
      }

      const status = await window.ai.proofreader.availability();
      return {
        available: status === 'available',
        status: status,
        reason: status !== 'available' ? `Status: ${status}` : null
      };
    } catch (error) {
      return {
        available: false,
        status: 'error',
        reason: error.message
      };
    }
  }

  /**
   * Check if user activation is available
   * @returns {boolean} True if user has activated
   */
  checkUserActivation() {
    if (navigator.userActivation) {
      return navigator.userActivation.isActive;
    }
    // Fallback for older browsers
    return true;
  }

  /**
   * Get setup instructions for enabling Chrome AI
   * @returns {Object} Setup instructions
   */
  getSetupInstructions() {
    return {
      flags: [
        {
          name: 'Prompt API for Gemini Nano',
          url: 'chrome://flags/#prompt-api-for-gemini-nano',
          description: 'Enable the core Language Model API'
        },
        {
          name: 'Optimization Guide On Device Model',
          url: 'chrome://flags/#optimization-guide-on-device-model',
          description: 'Enable on-device AI model execution'
        }
      ],
      steps: [
        'Open Chrome and navigate to chrome://flags',
        'Search for "prompt-api-for-gemini-nano"',
        'Set the flag to "Enabled"',
        'Search for "optimization-guide-on-device-model"',
        'Set the flag to "Enabled"',
        'Restart Chrome',
        'Ensure you have 22+ GB free storage',
        'Wait for model download (may take time)'
      ],
      requirements: [
        'Chrome 121+ for Language Model',
        'Chrome 137+ for Rewriter API',
        'Chrome 138+ for Summarizer API',
        'Chrome 141+ for Proofreader API',
        '22+ GB free storage space',
        '4+ GB VRAM',
        'Unmetered internet connection',
        'Windows 10+, macOS 13+, Linux, or ChromeOS'
      ]
    };
  }

  /**
   * Generate a comprehensive status report
   * @returns {Promise<Object>} Complete status report
   */
  async generateStatusReport() {
    const requirements = this.checkRequirements();
    const apiAvailability = await this.checkAllAPIsAvailability();
    const userActivation = this.checkUserActivation();
    const instructions = this.getSetupInstructions();

    return {
      timestamp: new Date().toISOString(),
      requirements,
      apiAvailability,
      userActivation,
      instructions,
      summary: {
        systemCompatible: requirements.chromeVersion.supported && requirements.platform.supported,
        apisReady: Object.values(apiAvailability).every(api => api.available),
        userReady: userActivation,
        overallReady: requirements.chromeVersion.supported &&
                     requirements.platform.supported &&
                     Object.values(apiAvailability).some(api => api.available) &&
                     userActivation
      }
    };
  }
}

// Export to window globals for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.AISetupService = AISetupService;
  console.log('✅ AISetupService exported to window');
} else {
  console.error('❌ Window object not available - AISetupService not exported');
}