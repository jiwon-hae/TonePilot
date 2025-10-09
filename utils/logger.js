/**
 * Centralized Logging Utility
 * Provides consistent logging across the application with different log levels
 */

class Logger {
  constructor(context = 'TonePilot') {
    this.context = context;
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    this.currentLevel = this.levels.INFO;
    this.enableTimestamps = true;
  }

  /**
   * Set log level
   * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
    }
  }

  /**
   * Format log message with timestamp and context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Array} args - Additional arguments
   * @returns {Array} Formatted log arguments
   */
  formatMessage(level, message, args) {
    const prefix = this.enableTimestamps
      ? `[${new Date().toISOString()}] [${this.context}] [${level}]`
      : `[${this.context}] [${level}]`;

    return [prefix, message, ...args];
  }

  /**
   * Debug level logging
   * @param {string} message - Log message
   * @param  {...any} args - Additional arguments
   */
  debug(message, ...args) {
    if (this.currentLevel <= this.levels.DEBUG) {
      console.log(...this.formatMessage('DEBUG', message, args));
    }
  }

  /**
   * Info level logging with emoji
   * @param {string} emoji - Emoji prefix
   * @param {string} message - Log message
   * @param  {...any} args - Additional arguments
   */
  info(emoji, message, ...args) {
    if (this.currentLevel <= this.levels.INFO) {
      console.log(`${emoji}`, message, ...args);
    }
  }

  /**
   * Warning level logging
   * @param {string} message - Log message
   * @param  {...any} args - Additional arguments
   */
  warn(message, ...args) {
    if (this.currentLevel <= this.levels.WARN) {
      console.warn(...this.formatMessage('WARN', message, args));
    }
  }

  /**
   * Error level logging
   * @param {string} message - Log message
   * @param {Error} error - Error object
   * @param  {...any} args - Additional arguments
   */
  error(message, error = null, ...args) {
    if (this.currentLevel <= this.levels.ERROR) {
      const errorArgs = error ? [...args, error] : args;
      console.error(...this.formatMessage('ERROR', message, errorArgs));
    }
  }

  /**
   * Create child logger with specific context
   * @param {string} childContext - Child context name
   * @returns {Logger} New logger instance
   */
  createChild(childContext) {
    return new Logger(`${this.context}:${childContext}`);
  }

  /**
   * Group related logs
   * @param {string} groupName - Group name
   */
  group(groupName) {
    console.group(groupName);
  }

  /**
   * End log group
   */
  groupEnd() {
    console.groupEnd();
  }

  /**
   * Log with custom emoji (commonly used pattern in codebase)
   * @param {string} emoji - Emoji icon
   * @param {string} message - Message
   * @param  {...any} args - Additional arguments
   */
  log(emoji, message, ...args) {
    this.info(emoji, message, ...args);
  }
}

// Create global logger instance
const logger = new Logger('TonePilot');

// Export both class and instance
if (typeof window !== 'undefined') {
  window.Logger = Logger;
  window.logger = logger;
  console.log('✅ Logger utility exported to window');
} else {
  console.error('❌ Window object not available - Logger not exported');
}
