/**
 * TonePilot Constants
 * Shared constants used across the application
 */

const TONEPILOT_CONSTANTS = {
  DEFAULTS: {
    MAX_CHARACTERS: 300,
    FORMALITY_TOGGLE: false,
    TARGET_LANGUAGE: 'en',
    ROUTER_TIMEOUT: 3000,
    INITIALIZATION_TIMEOUT: 100
  },
  LIMITS: {
    MAX_TEXT_LENGTH: 4000,
    MIN_CHARACTERS: 50,
    MAX_CHARACTERS: 1000
  },
  STATUS_TYPES: {
    LOADING: 'loading',
    READY: 'ready',
    ERROR: 'error',
    WARNING: 'warning'
  },
  ERROR_TYPES: {
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
  },
  ELEMENTS: {
    IDS: [
      'status', 'inputText', 'loading', 'error',
      'resultSection', 'resultContent', 'queryDisplay', 'replaceBtn', 'copyBtn', 'websiteInfo',
      'websiteName', 'websiteUrl', 'websiteIcon', 'selectedTextDisplay', 'selectedTextContent',
      'textInputWrapper', 'mediaGrid',
      'mediaCount', 'selectMediaBtn', 'selectedMediaDisplay', 'selectedMediaGrid',
      'clearBtn', 'translateBtn', 'planBtn', 'settingsBtn', 'settingsPopup', 'closeSettingsBtn', 'saveSettingsBtn',
      'maxCharactersInput', 'formalityTogglePopup', 'targetLanguageSelect', 'submitBtn',
      'mediaBtn', 'mediaPopup', 'closeMediaBtn',
      'documentBtn', 'documentPopup', 'closeDocumentBtn', 'saveDocumentBtn',
      'resumeUpload', 'resumePreview', 'coldEmailTemplate', 'removeResumeBtn',
      'uploadArea', 'emailSubject'
    ],
    SELECTORS: {
      inputContainer: '.input-container'
    }
  }
};

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.TONEPILOT_CONSTANTS = TONEPILOT_CONSTANTS;
  console.log('✅ TonePilot constants exported to window');
}