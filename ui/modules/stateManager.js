/**
 * TonePilot State Manager
 * Manages application state and data
 */

class TonePilotStateManager {
  constructor() {
    this.state = {
      currentSelection: null,
      currentResults: null,
      routerReady: false,
      capturedImageData: null,
      selectedMediaIds: new Set(),
      selectedMediaItems: new Map(),
      selectedMediaArray: [],
      currentMaxCharacters: window.TONEPILOT_CONSTANTS.DEFAULTS.MAX_CHARACTERS,
      currentFormalityToggle: window.TONEPILOT_CONSTANTS.DEFAULTS.FORMALITY_TOGGLE,
      targetLanguage: window.TONEPILOT_CONSTANTS.DEFAULTS.TARGET_LANGUAGE,
      translateMode: false,
      planMode: false,
      processingSteps: [] // Array of {step: string, timestamp: Date, status: 'in_progress'|'complete'|'error'}
    };

    this.listeners = new Map();
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Update state property
   * @param {string} key - State property key
   * @param {*} value - New value
   */
  setState(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;
    this.notifyListeners(key, value, oldValue);
  }

  /**
   * Update multiple state properties
   * @param {Object} updates - Object with key-value pairs to update
   */
  updateState(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.setState(key, value);
    });
  }

  /**
   * Add state change listener
   * @param {string} key - State property to listen to
   * @param {Function} callback - Callback function
   */
  addListener(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  /**
   * Remove state change listener
   * @param {string} key - State property
   * @param {Function} callback - Callback function to remove
   */
  removeListener(key, callback) {
    if (this.listeners.has(key)) {
      const callbacks = this.listeners.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify listeners of state changes
   * @param {string} key - Changed property
   * @param {*} newValue - New value
   * @param {*} oldValue - Previous value
   */
  notifyListeners(key, newValue, oldValue) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(callback => {
        try {
          callback(newValue, oldValue, key);
        } catch (error) {
          console.error('State listener error:', error);
        }
      });
    }
  }

  /**
   * Clear all state
   */
  clearState() {
    this.state = {
      currentSelection: null,
      currentResults: null,
      routerReady: false,
      capturedImageData: null,
      selectedMediaIds: new Set(),
      selectedMediaItems: new Map(),
      selectedMediaArray: [],
      currentMaxCharacters: window.TONEPILOT_CONSTANTS.DEFAULTS.MAX_CHARACTERS,
      currentFormalityToggle: window.TONEPILOT_CONSTANTS.DEFAULTS.FORMALITY_TOGGLE,
      translateMode: false,
      planMode: false,
      processingSteps: []
    };
  }

  /**
   * Get selection-related state
   * @returns {Object} Selection state
   */
  getSelectionState() {
    return {
      currentSelection: this.state.currentSelection,
      selectedText: this.state.currentSelection?.text || '',
      hasSelection: Boolean(this.state.currentSelection?.text)
    };
  }

  /**
   * Get results-related state
   * @returns {Object} Results state
   */
  getResultsState() {
    return {
      currentResults: this.state.currentResults,
      hasResults: Boolean(this.state.currentResults)
    };
  }

  /**
   * Get media-related state
   * @returns {Object} Media state
   */
  getMediaState() {
    return {
      capturedImageData: this.state.capturedImageData,
      selectedMediaIds: this.state.selectedMediaIds,
      selectedMediaItems: this.state.selectedMediaItems,
      selectedMediaArray: this.state.selectedMediaArray,
      hasMedia: this.state.selectedMediaArray.length > 0
    };
  }

  /**
   * Set translate mode
   * @param {boolean} enabled - Translate mode enabled
   */
  setTranslateMode(enabled) {
    console.log('🔄 setTranslateMode called:', {
      enabled: enabled,
      previousValue: this.state.translateMode
    });
    this.setState('translateMode', enabled);
    console.log('🔄 translateMode state after setState:', this.state.translateMode);
  }

  /**
   * Get translate mode state
   * @returns {boolean} Translate mode enabled
   */
  getTranslateMode() {
    return this.state.translateMode;
  }

  /**
   * Get target language
   * @returns {string} Target language code
   */
  getTargetLanguage() {
    return this.state.targetLanguage || 'en';
  }

  getPlanMode(){
    return this.state.planMode;
  }

  setPlanMode(enabled){
    console.log('🔄 setPlanMode called:', {
      enabled: enabled,
      previousValue: this.state.planMode
    });
    this.setState('planMode', enabled);
    console.log('🔄 planMode state after setState:', this.state.planMode);
  }

  /**
   * Clear all processing steps
   */
  clearProcessingSteps() {
    this.state.processingSteps = [];
    this.notifyListeners('processingSteps', [], null);
  }

  /**
   * Add a processing step
   * @param {string} step - Step description
   * @param {string} status - Step status ('in_progress', 'complete', 'error')
   */
  addProcessingStep(step, status = 'in_progress') {
    const stepData = {
      step,
      timestamp: new Date(),
      status
    };
    this.state.processingSteps.push(stepData);
    console.log(`🔍 Step added: ${step} [${status}]`);
    this.notifyListeners('processingSteps', [...this.state.processingSteps], null);
  }

  /**
   * Update the last processing step status
   * @param {string} status - New status ('complete', 'error')
   */
  updateLastStepStatus(status) {
    if (this.state.processingSteps.length > 0) {
      const lastStep = this.state.processingSteps[this.state.processingSteps.length - 1];
      lastStep.status = status;
      console.log(`✅ Step completed: ${lastStep.step}`);
      this.notifyListeners('processingSteps', [...this.state.processingSteps], null);
    }
  }

  /**
   * Get all processing steps
   * @returns {Array} Array of step objects
   */
  getProcessingSteps() {
    return [...this.state.processingSteps];
  }

}

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.TonePilotStateManager = TonePilotStateManager;
  console.log('✅ TonePilotStateManager exported to window');
}