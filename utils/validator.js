/**
 * Validation Utility
 * Provides reusable validation functions for inputs and API responses
 */

class Validator {
  /**
   * Validate that value is not null or undefined
   * @param {*} value - Value to check
   * @param {string} fieldName - Field name for error message
   * @throws {ValidationError} If value is null/undefined
   */
  static required(value, fieldName) {
    if (value === null || value === undefined) {
      throw new window.ValidationError(fieldName, 'is required');
    }
    return true;
  }

  /**
   * Validate string is not empty
   * @param {string} value - String to validate
   * @param {string} fieldName - Field name for error message
   * @throws {ValidationError} If string is empty
   */
  static nonEmptyString(value, fieldName) {
    this.required(value, fieldName);
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new window.ValidationError(fieldName, 'must be a non-empty string', value);
    }
    return true;
  }

  /**
   * Validate number is within range
   * @param {number} value - Number to validate
   * @param {string} fieldName - Field name
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @throws {ValidationError} If out of range
   */
  static numberInRange(value, fieldName, min, max) {
    this.required(value, fieldName);
    const num = Number(value);

    if (isNaN(num)) {
      throw new window.ValidationError(fieldName, 'must be a number', value);
    }

    if (num < min || num > max) {
      throw new window.ValidationError(
        fieldName,
        `must be between ${min} and ${max}`,
        value
      );
    }

    return true;
  }

  /**
   * Validate value is one of allowed values
   * @param {*} value - Value to validate
   * @param {string} fieldName - Field name
   * @param {Array} allowedValues - Array of allowed values
   * @throws {ValidationError} If not in allowed values
   */
  static oneOf(value, fieldName, allowedValues) {
    this.required(value, fieldName);

    if (!allowedValues.includes(value)) {
      throw new window.ValidationError(
        fieldName,
        `must be one of: ${allowedValues.join(', ')}`,
        value
      );
    }

    return true;
  }

  /**
   * Validate object has required keys
   * @param {Object} obj - Object to validate
   * @param {Array<string>} requiredKeys - Required keys
   * @param {string} objectName - Object name for error message
   * @throws {ValidationError} If missing required keys
   */
  static hasRequiredKeys(obj, requiredKeys, objectName = 'object') {
    this.required(obj, objectName);

    if (typeof obj !== 'object') {
      throw new window.ValidationError(objectName, 'must be an object', obj);
    }

    const missingKeys = requiredKeys.filter(key => !(key in obj));

    if (missingKeys.length > 0) {
      throw new window.ValidationError(
        objectName,
        `missing required keys: ${missingKeys.join(', ')}`,
        obj
      );
    }

    return true;
  }

  /**
   * Validate URL format
   * @param {string} value - URL to validate
   * @param {string} fieldName - Field name
   * @throws {ValidationError} If invalid URL
   */
  static url(value, fieldName) {
    this.nonEmptyString(value, fieldName);

    try {
      new URL(value);
      return true;
    } catch (error) {
      throw new window.ValidationError(fieldName, 'must be a valid URL', value);
    }
  }

  /**
   * Validate email format (basic)
   * @param {string} value - Email to validate
   * @param {string} fieldName - Field name
   * @throws {ValidationError} If invalid email
   */
  static email(value, fieldName) {
    this.nonEmptyString(value, fieldName);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new window.ValidationError(fieldName, 'must be a valid email', value);
    }

    return true;
  }

  /**
   * Validate language code (BCP 47)
   * @param {string} value - Language code
   * @param {string} fieldName - Field name
   * @throws {ValidationError} If invalid language code
   */
  static languageCode(value, fieldName) {
    this.nonEmptyString(value, fieldName);

    const validCodes = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko',
      'zh', 'zh-TW', 'ar', 'hi', 'nl', 'pl', 'tr', 'vi', 'th',
      'id', 'sv', 'da', 'fi', 'no', 'cs', 'hu', 'ro', 'uk', 'el', 'he'
    ];

    if (!validCodes.includes(value)) {
      throw new window.ValidationError(
        fieldName,
        `must be a valid language code`,
        value
      );
    }

    return true;
  }

  /**
   * Validate API response structure
   * @param {Object} response - API response
   * @param {Array<string>} requiredFields - Required fields
   * @param {string} apiName - API name for error context
   * @throws {APIError} If invalid response
   */
  static apiResponse(response, requiredFields, apiName) {
    try {
      this.hasRequiredKeys(response, requiredFields, `${apiName} response`);
      return true;
    } catch (error) {
      throw new window.APIError(
        apiName,
        null,
        `Invalid response structure: ${error.message}`,
        { requiredFields, response }
      );
    }
  }

  /**
   * Validate settings object
   * @param {Object} settings - Settings to validate
   * @returns {boolean} True if valid
   * @throws {ValidationError} If invalid
   */
  static settings(settings) {
    this.hasRequiredKeys(settings, ['maxCharacters', 'formalityToggle', 'targetLanguage'], 'settings');

    this.numberInRange(settings.maxCharacters, 'maxCharacters', 50, 1000);

    if (typeof settings.formalityToggle !== 'boolean') {
      throw new window.ValidationError('formalityToggle', 'must be a boolean', settings.formalityToggle);
    }

    this.languageCode(settings.targetLanguage, 'targetLanguage');

    return true;
  }

  /**
   * Safe validation wrapper that returns boolean instead of throwing
   * @param {Function} validationFn - Validation function
   * @param  {...any} args - Arguments to pass to validation function
   * @returns {Object} {isValid: boolean, error: Error|null}
   */
  static safe(validationFn, ...args) {
    try {
      validationFn(...args);
      return { isValid: true, error: null };
    } catch (error) {
      return { isValid: false, error };
    }
  }

  /**
   * Validate multiple fields at once
   * @param {Object} validations - Object with field names as keys and validation functions as values
   * @returns {Object} {isValid: boolean, errors: Object}
   */
  static validateAll(validations) {
    const errors = {};
    let isValid = true;

    for (const [field, validationFn] of Object.entries(validations)) {
      try {
        validationFn();
      } catch (error) {
        errors[field] = error.message;
        isValid = false;
      }
    }

    return { isValid, errors };
  }
}

// Export validator
if (typeof window !== 'undefined') {
  window.Validator = Validator;
  console.log('✅ Validator utility exported to window');
} else {
  console.error('❌ Window object not available - Validator not exported');
}
