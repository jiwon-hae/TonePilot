/**
 * TonePilot UI Manager
 * Handles DOM manipulation, events, and UI state
 */

class TonePilotUIManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.elements = {};
    this.eventListeners = [];
  }

  /**
   * Initialize all DOM elements
   * @returns {boolean} True if initialization successful
   */
  initializeElements() {
    try {
      // Initialize element references by ID
      window.TONEPILOT_CONSTANTS.ELEMENTS.IDS.forEach(id => {
        this.elements[id] = document.getElementById(id);
        if (!this.elements[id]) {
          console.warn(`Element with id '${id}' not found`);
        }
      });

      // Initialize selector-based elements
      Object.entries(window.TONEPILOT_CONSTANTS.ELEMENTS.SELECTORS).forEach(([key, selector]) => {
        this.elements[key] = document.querySelector(selector);
        if (!this.elements[key]) {
          console.warn(`Element with selector '${selector}' not found`);
        }
      });

      return true;
    } catch (error) {
      console.error('UI element initialization failed:', error);
      return false;
    }
  }

  /**
   * Bind all event listeners
   */
  bindEvents() {
    try {
      // Button events
      const buttonEvents = [
        { element: 'copyBtn', handler: () => this.handleCopy() },
        { element: 'replaceBtn', handler: () => this.handleReplace() },
        { element: 'selectMediaBtn', handler: () => this.handleSelectMedia() },
        { element: 'cropBtn', handler: () => this.handleCrop() },
        { element: 'submitBtn', handler: async () => await this.handleSubmit() }
      ];

      buttonEvents.forEach(({ element, handler }) => {
        if (this.elements[element]) {
          this.elements[element].addEventListener('click', handler);
          this.eventListeners.push({ element: this.elements[element], event: 'click', handler });
        }
      });

      // Settings events
      if (this.elements.settingsBtn) {
        const settingsHandler = () => this.handleOpenSettings();
        this.elements.settingsBtn.addEventListener('click', settingsHandler);
        this.eventListeners.push({ element: this.elements.settingsBtn, event: 'click', handler: settingsHandler });
      }

      if (this.elements.closeSettingsBtn) {
        const closeHandler = () => this.handleCloseSettings();
        this.elements.closeSettingsBtn.addEventListener('click', closeHandler);
        this.eventListeners.push({ element: this.elements.closeSettingsBtn, event: 'click', handler: closeHandler });
      }

      if (this.elements.saveSettingsBtn) {
        const saveHandler = () => this.handleSaveSettings();
        this.elements.saveSettingsBtn.addEventListener('click', saveHandler);
        this.eventListeners.push({ element: this.elements.saveSettingsBtn, event: 'click', handler: saveHandler });
      }

      // Tab navigation
      this.bindTabEvents();

      // Document click for modal close
      const documentClickHandler = (e) => this.handleDocumentClick(e);
      document.addEventListener('click', documentClickHandler);
      this.eventListeners.push({ element: document, event: 'click', handler: documentClickHandler });

      console.log('✅ UI events bound successfully');
    } catch (error) {
      console.error('Event binding failed:', error);
    }
  }

  /**
   * Bind tab navigation events
   */
  bindTabEvents() {
    const tabs = document.querySelectorAll('.result-tab');
    tabs.forEach(tab => {
      const tabHandler = () => this.handleTabSwitch(tab);
      tab.addEventListener('click', tabHandler);
      this.eventListeners.push({ element: tab, event: 'click', handler: tabHandler });
    });
  }

  /**
   * Update status display
   * @param {string} type - Status type
   * @param {string} message - Status message
   */
  updateStatus(type, message) {
    if (!this.elements.status) return;

    this.elements.status.className = `status-badge status-${type}`;
    this.elements.status.title = message; // Use tooltip instead of text content
  }

  /**
   * Show loading state
   */
  showLoading() {
    if (this.elements.loading) {
      this.elements.loading.style.display = 'flex';
    }
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    if (this.elements.loading) {
      this.elements.loading.style.display = 'none';
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    if (this.elements.error) {
      this.elements.error.textContent = message;
      this.elements.error.style.display = 'block';
    }
  }

  /**
   * Hide error message
   */
  hideError() {
    if (this.elements.error) {
      this.elements.error.style.display = 'none';
    }
  }

  /**
   * Update selection display
   * @param {Object} selectionData - Selection data
   */
  updateSelectionDisplay(selectionData) {
    if (this.elements.selectedTextContent) {
      this.elements.selectedTextContent.textContent = `"${selectionData.text}"`;
    }

    if (this.elements.selectedTextDisplay) {
      this.elements.selectedTextDisplay.style.display = 'block';
    }

    if (this.elements.inputContainer) {
      this.elements.inputContainer.classList.add('has-selected-text');
    }
  }

  /**
   * Clear selection display
   */
  clearSelectionDisplay() {
    if (this.elements.selectedTextDisplay) {
      this.elements.selectedTextDisplay.style.display = 'none';
    }

    if (this.elements.inputContainer) {
      this.elements.inputContainer.classList.remove('has-selected-text');
    }
  }

  /**
   * Show results in UI
   * @param {Object} results - Results object
   * @param {string} inputText - Original input text
   */
  showResults(results, inputText) {
    // Create individual result section
    this.createIndividualResultSection(results, inputText);

    // Show original result section with current result
    if (this.elements.resultSection && this.elements.resultContent) {
      this.elements.resultContent.textContent = results.primary;
      this.elements.resultSection.classList.add('visible');
      this.elements.resultSection.style.display = 'block';
    }
  }

  /**
   * Create individual result section
   * @param {Object} results - Results object
   * @param {string} inputText - Original input text
   */
  createIndividualResultSection(results, inputText) {
    // This would contain the logic for creating individual result containers
    // Implementation would depend on your specific UI requirements
    console.log('Creating individual result section:', { results, inputText });
  }

  /**
   * Hide results
   */
  hideResults() {
    if (this.elements.resultSection) {
      this.elements.resultSection.classList.remove('visible');
      this.elements.resultSection.style.display = 'none';
    }
  }

  /**
   * Get input text value
   * @returns {string} Input text
   */
  getInputText() {
    return this.elements.inputText?.value?.trim() || '';
  }

  /**
   * Set input text value
   * @param {string} text - Text to set
   */
  setInputText(text) {
    if (this.elements.inputText) {
      this.elements.inputText.value = text;
    }
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  // Event handlers (to be connected to main panel logic)
  handleCopy() { console.log('Copy clicked'); }
  handleReplace() { console.log('Replace clicked'); }
  handleSelectMedia() { console.log('Select media clicked'); }
  handleCrop() { console.log('Crop clicked'); }
  handleSubmit() { console.log('Submit clicked'); }
  handleOpenSettings() { console.log('Settings opened'); }
  handleCloseSettings() { console.log('Settings closed'); }
  handleSaveSettings() { console.log('Settings saved'); }
  handleTabSwitch(tab) { console.log('Tab switched:', tab); }
  handleDocumentClick(e) { console.log('Document clicked:', e); }
}

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.TonePilotUIManager = TonePilotUIManager;
  console.log('✅ TonePilotUIManager exported to window');
}