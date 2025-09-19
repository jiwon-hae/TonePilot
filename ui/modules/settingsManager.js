/**
 * TonePilot Settings Manager
 * Manages user preferences and extension settings
 */

class TonePilotSettingsManager {
  constructor(stateManager, uiManager) {
    this.stateManager = stateManager;
    this.uiManager = uiManager;
    this.storageService = null;
    this.settings = {};
  }

  /**
   * Initialize settings manager
   */
  async initialize() {
    try {
      // Initialize storage service
      if (window.StorageService) {
        this.storageService = new window.StorageService();
      }

      // Load settings
      await this.loadSettings();

      // Apply settings to state
      this.applySettingsToState();

      console.log('✅ Settings manager initialized');
    } catch (error) {
      console.error('❌ Settings manager initialization failed:', error);
    }
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      if (this.storageService) {
        this.settings = await this.storageService.getSettings();
      } else {
        // Fallback to default settings
        this.settings = this.getDefaultSettings();
      }

      console.log('📥 Settings loaded:', this.settings);
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      if (this.storageService) {
        await this.storageService.saveSettings(this.settings);
        console.log('💾 Settings saved:', this.settings);
      } else {
        console.warn('⚠️ Storage service not available, settings not saved');
      }
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * Get default settings
   * @returns {Object} Default settings
   */
  getDefaultSettings() {
    return {
      maxCharacters: window.TONEPILOT_CONSTANTS.DEFAULTS.MAX_CHARACTERS,
      formalityToggle: window.TONEPILOT_CONSTANTS.DEFAULTS.FORMALITY_TOGGLE,
      enableAutoSave: true,
      enableHistory: true,
      defaultTone: 'as-is',
      enableNotifications: true,
      autoCloseResults: false,
      preserveFormatting: true
    };
  }

  /**
   * Apply settings to application state
   */
  applySettingsToState() {
    // Update state with current settings
    this.stateManager.setState('currentMaxCharacters', this.settings.maxCharacters);
    this.stateManager.setState('currentFormalityToggle', this.settings.formalityToggle);

    // Update UI elements
    this.updateSettingsUI();
  }

  /**
   * Update settings UI elements
   */
  updateSettingsUI() {
    // Update max characters input
    if (this.uiManager.elements.maxCharactersInput) {
      this.uiManager.elements.maxCharactersInput.value = this.settings.maxCharacters;
    }

    // Update formality toggle
    if (this.uiManager.elements.formalityTogglePopup) {
      this.uiManager.elements.formalityTogglePopup.checked = this.settings.formalityToggle;
    }

    console.log('🎛️ Settings UI updated');
  }

  /**
   * Handle settings popup open
   */
  openSettings() {
    if (this.uiManager.elements.settingsPopup) {
      this.uiManager.elements.settingsPopup.style.display = 'block';

      // Update UI with current settings
      this.updateSettingsUI();

      console.log('⚙️ Settings popup opened');
    }
  }

  /**
   * Handle settings popup close
   */
  closeSettings() {
    if (this.uiManager.elements.settingsPopup) {
      this.uiManager.elements.settingsPopup.style.display = 'none';
      console.log('❌ Settings popup closed');
    }
  }

  /**
   * Handle settings save
   */
  async handleSaveSettings() {
    try {
      // Collect settings from UI
      const newSettings = this.collectSettingsFromUI();

      // Validate settings
      const validatedSettings = this.validateSettings(newSettings);

      // Update settings object
      this.settings = { ...this.settings, ...validatedSettings };

      // Save to storage
      await this.saveSettings();

      // Apply to state
      this.applySettingsToState();

      // Close popup
      this.closeSettings();

      // Show success message
      this.uiManager.updateStatus('ready', 'Settings Saved');

      // Reset status after delay
      setTimeout(() => {
        this.uiManager.updateStatus('ready', 'Ready');
      }, 2000);

      console.log('✅ Settings saved successfully');

    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      this.uiManager.showError(`Settings save failed: ${error.message}`);
    }
  }

  /**
   * Collect settings from UI elements
   * @returns {Object} Collected settings
   */
  collectSettingsFromUI() {
    const settings = {};

    // Max characters
    if (this.uiManager.elements.maxCharactersInput) {
      settings.maxCharacters = parseInt(this.uiManager.elements.maxCharactersInput.value) ||
                               window.TONEPILOT_CONSTANTS.DEFAULTS.MAX_CHARACTERS;
    }

    // Formality toggle
    if (this.uiManager.elements.formalityTogglePopup) {
      settings.formalityToggle = this.uiManager.elements.formalityTogglePopup.checked;
    }

    return settings;
  }

  /**
   * Validate settings values
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validated settings
   */
  validateSettings(settings) {
    const validated = { ...settings };

    // Validate max characters
    if (validated.maxCharacters) {
      validated.maxCharacters = Math.max(
        window.TONEPILOT_CONSTANTS.LIMITS.MIN_CHARACTERS,
        Math.min(
          window.TONEPILOT_CONSTANTS.LIMITS.MAX_CHARACTERS,
          validated.maxCharacters
        )
      );
    }

    return validated;
  }

  /**
   * Get current settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Update specific setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  async updateSetting(key, value) {
    try {
      // Validate single setting
      const validatedValue = this.validateSettings({ [key]: value })[key];

      // Update settings
      this.settings[key] = validatedValue;

      // Save to storage
      await this.saveSettings();

      // Apply to state if relevant
      if (key === 'maxCharacters') {
        this.stateManager.setState('currentMaxCharacters', validatedValue);
      } else if (key === 'formalityToggle') {
        this.stateManager.setState('currentFormalityToggle', validatedValue);
      }

      console.log(`⚙️ Setting updated: ${key} = ${validatedValue}`);

    } catch (error) {
      console.error(`❌ Failed to update setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings() {
    try {
      this.settings = this.getDefaultSettings();
      await this.saveSettings();
      this.applySettingsToState();

      this.uiManager.updateStatus('ready', 'Settings Reset');

      console.log('🔄 Settings reset to defaults');

    } catch (error) {
      console.error('❌ Failed to reset settings:', error);
      this.uiManager.showError('Settings reset failed');
    }
  }

  /**
   * Export settings
   * @returns {string} JSON string of settings
   */
  exportSettings() {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from JSON
   * @param {string} jsonString - JSON settings string
   */
  async importSettings(jsonString) {
    try {
      const importedSettings = JSON.parse(jsonString);
      const validatedSettings = this.validateSettings(importedSettings);

      this.settings = { ...this.getDefaultSettings(), ...validatedSettings };
      await this.saveSettings();
      this.applySettingsToState();

      this.uiManager.updateStatus('ready', 'Settings Imported');

      console.log('📥 Settings imported successfully');

    } catch (error) {
      console.error('❌ Failed to import settings:', error);
      this.uiManager.showError('Settings import failed');
      throw error;
    }
  }

  /**
   * Get settings status for debugging
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: Boolean(this.storageService),
      settingsLoaded: Object.keys(this.settings).length > 0,
      storageServiceAvailable: Boolean(window.StorageService),
      currentSettings: this.settings
    };
  }
}

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.TonePilotSettingsManager = TonePilotSettingsManager;
  console.log('✅ TonePilotSettingsManager exported to window');
}