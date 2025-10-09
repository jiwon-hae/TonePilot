/**
 * Base Service Class
 * Provides common functionality for all services
 * Reduces code duplication and enforces consistent patterns
 */

class BaseService {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.isInitialized = false;
    this.isAvailable = false;
    this.logger = window.logger ? window.logger.createChild(serviceName) : null;
    this.errorHandler = window.errorHandler || null;
    this.initializationPromise = null;
  }

  /**
   * Initialize the service (template method pattern)
   * Override this in subclasses
   * @returns {Promise<void>}
   */
  async initialize() {
    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializeInternal();
    return this.initializationPromise;
  }

  /**
   * Internal initialization logic
   * @private
   */
  async _initializeInternal() {
    try {
      this.log('🔄', `Initializing ${this.serviceName}...`);

      // Call subclass-specific initialization
      await this.onInitialize();

      this.isInitialized = true;
      this.log('✅', `${this.serviceName} initialized successfully`);

    } catch (error) {
      this.handleError(`Initialization failed for ${this.serviceName}`, error, true);
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Hook for subclass-specific initialization logic
   * Override this in subclasses instead of initialize()
   * @protected
   * @returns {Promise<void>}
   */
  async onInitialize() {
    // Default implementation - override in subclasses
  }

  /**
   * Check availability of the service
   * Override this in subclasses
   * @returns {Promise<boolean>}
   */
  async checkAvailability() {
    return true;
  }

  /**
   * Ensure service is initialized before use
   * @protected
   * @throws {ServiceInitializationError} If not initialized
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new window.ServiceInitializationError(
        this.serviceName,
        new Error('Service not initialized. Call initialize() first.')
      );
    }
  }

  /**
   * Ensure service is available before use
   * @protected
   * @throws {ServiceUnavailableError} If not available
   */
  ensureAvailable() {
    if (!this.isAvailable) {
      throw new window.ServiceUnavailableError(
        this.serviceName,
        'Service is not available'
      );
    }
  }

  /**
   * Log message using logger or fallback to console
   * @protected
   * @param {string} emoji - Emoji prefix
   * @param {string} message - Message to log
   * @param  {...any} args - Additional arguments
   */
  log(emoji, message, ...args) {
    if (this.logger) {
      this.logger.log(emoji, message, ...args);
    } else {
      console.log(`${emoji} [${this.serviceName}]`, message, ...args);
    }
  }

  /**
   * Log warning
   * @protected
   * @param {string} message - Warning message
   * @param  {...any} args - Additional arguments
   */
  warn(message, ...args) {
    if (this.logger) {
      this.logger.warn(message, ...args);
    } else {
      console.warn(`⚠️ [${this.serviceName}]`, message, ...args);
    }
  }

  /**
   * Handle error with consistent pattern
   * @protected
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @param {boolean} rethrow - Whether to rethrow
   * @returns {null}
   */
  handleError(message, error, rethrow = false) {
    if (this.errorHandler) {
      return this.errorHandler.handle(
        error,
        { service: this.serviceName, message },
        rethrow
      );
    } else {
      console.error(`❌ [${this.serviceName}]`, message, error);
      if (rethrow) throw error;
      return null;
    }
  }

  /**
   * Wrap async method with error handling
   * @protected
   * @param {Function} fn - Async function to wrap
   * @param {*} fallback - Fallback value on error
   * @returns {Function} Wrapped function
   */
  wrapAsync(fn, fallback = null) {
    if (this.errorHandler) {
      return this.errorHandler.wrapAsync(fn, {
        context: { service: this.serviceName },
        fallback,
        rethrow: false
      });
    }

    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError('Async operation failed', error, false);
        return fallback;
      }
    };
  }

  /**
   * Validate required parameter
   * @protected
   * @param {*} value - Value to validate
   * @param {string} paramName - Parameter name
   * @throws {ValidationError} If validation fails
   */
  validateRequired(value, paramName) {
    if (window.Validator) {
      window.Validator.required(value, paramName);
    } else if (value === null || value === undefined) {
      throw new Error(`${paramName} is required`);
    }
  }

  /**
   * Validate non-empty string
   * @protected
   * @param {string} value - String to validate
   * @param {string} paramName - Parameter name
   * @throws {ValidationError} If validation fails
   */
  validateNonEmptyString(value, paramName) {
    if (window.Validator) {
      window.Validator.nonEmptyString(value, paramName);
    } else if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${paramName} must be a non-empty string`);
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      serviceName: this.serviceName,
      isInitialized: this.isInitialized,
      isAvailable: this.isAvailable
    };
  }

  /**
   * Destroy/cleanup service
   * Override in subclasses if cleanup is needed
   */
  destroy() {
    this.isInitialized = false;
    this.isAvailable = false;
    this.log('🔄', `${this.serviceName} destroyed`);
  }

  /**
   * Retry logic for operations
   * @protected
   * @param {Function} operation - Operation to retry
   * @param {Object} options - Retry options
   * @returns {Promise<*>} Operation result
   */
  async retry(operation, options = {}) {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = true
    } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        const waitTime = backoff ? delay * attempt : delay;
        this.warn(`Attempt ${attempt} failed, retrying in ${waitTime}ms...`);
        await this.sleep(waitTime);
      }
    }
  }

  /**
   * Sleep helper
   * @protected
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export base service
if (typeof window !== 'undefined') {
  window.BaseService = BaseService;
  console.log('✅ BaseService exported to window');
} else {
  console.error('❌ Window object not available - BaseService not exported');
}
