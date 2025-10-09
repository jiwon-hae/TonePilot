/**
 * Centralized Error Handling Utility
 * Provides custom error types and consistent error handling patterns
 */

/**
 * Base error class for TonePilot
 */
class TonePilotError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}

/**
 * Service initialization error
 */
class ServiceInitializationError extends TonePilotError {
  constructor(serviceName, originalError) {
    super(
      `Failed to initialize ${serviceName}`,
      'SERVICE_INIT_ERROR',
      { serviceName, originalError: originalError?.message }
    );
    this.serviceName = serviceName;
    this.originalError = originalError;
  }
}

/**
 * API call error
 */
class APIError extends TonePilotError {
  constructor(apiName, statusCode, message, details = {}) {
    super(
      `API call to ${apiName} failed: ${message}`,
      'API_ERROR',
      { apiName, statusCode, details }
    );
    this.apiName = apiName;
    this.statusCode = statusCode;
  }
}

/**
 * Validation error
 */
class ValidationError extends TonePilotError {
  constructor(field, message, value = null) {
    super(
      `Validation failed for ${field}: ${message}`,
      'VALIDATION_ERROR',
      { field, value }
    );
    this.field = field;
    this.value = value;
  }
}

/**
 * Configuration error
 */
class ConfigurationError extends TonePilotError {
  constructor(configKey, message) {
    super(
      `Configuration error for ${configKey}: ${message}`,
      'CONFIG_ERROR',
      { configKey }
    );
    this.configKey = configKey;
  }
}

/**
 * Service unavailable error
 */
class ServiceUnavailableError extends TonePilotError {
  constructor(serviceName, reason = 'Service not available') {
    super(
      `${serviceName} is unavailable: ${reason}`,
      'SERVICE_UNAVAILABLE',
      { serviceName, reason }
    );
    this.serviceName = serviceName;
  }
}

/**
 * Error handler utility
 */
class ErrorHandler {
  constructor(logger = null) {
    this.logger = logger || window.logger;
    this.errorListeners = [];
  }

  /**
   * Handle error with consistent pattern
   * @param {Error} error - Error to handle
   * @param {Object} context - Additional context
   * @param {boolean} rethrow - Whether to rethrow the error
   */
  handle(error, context = {}, rethrow = false) {
    // Log error
    if (this.logger) {
      this.logger.error('Error occurred', error, context);
    } else {
      console.error('❌ Error occurred:', error, context);
    }

    // Notify listeners
    this.notifyListeners(error, context);

    // Rethrow if requested
    if (rethrow) {
      throw error;
    }

    return null;
  }

  /**
   * Wrap async function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {Object} options - Options for error handling
   * @returns {Function} Wrapped function
   */
  wrapAsync(fn, options = {}) {
    const {
      context = {},
      fallback = null,
      rethrow = false,
      onError = null
    } = options;

    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        if (onError) {
          onError(error, context);
        }

        this.handle(error, context, false);

        if (rethrow) {
          throw error;
        }

        return fallback;
      }
    };
  }

  /**
   * Add error listener
   * @param {Function} listener - Error listener function
   */
  addListener(listener) {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   * @param {Function} listener - Error listener to remove
   */
  removeListener(listener) {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }

  /**
   * Notify all error listeners
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  notifyListeners(error, context) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error, context);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Create user-friendly error message
   * @param {Error} error - Error object
   * @returns {string} User-friendly message
   */
  getUserMessage(error) {
    if (error instanceof ServiceUnavailableError) {
      return `This feature is currently unavailable. Please try again later.`;
    }

    if (error instanceof ValidationError) {
      return `Invalid input: ${error.message}`;
    }

    if (error instanceof APIError) {
      return `Service error: Unable to complete your request. Please try again.`;
    }

    if (error instanceof ConfigurationError) {
      return `Configuration error: Please check your settings.`;
    }

    return 'An unexpected error occurred. Please try again.';
  }
}

// Create global error handler instance
const errorHandler = new ErrorHandler();

// Export classes and instance
if (typeof window !== 'undefined') {
  window.TonePilotError = TonePilotError;
  window.ServiceInitializationError = ServiceInitializationError;
  window.APIError = APIError;
  window.ValidationError = ValidationError;
  window.ConfigurationError = ConfigurationError;
  window.ServiceUnavailableError = ServiceUnavailableError;
  window.ErrorHandler = ErrorHandler;
  window.errorHandler = errorHandler;
  console.log('✅ ErrorHandler utility exported to window');
} else {
  console.error('❌ Window object not available - ErrorHandler not exported');
}
