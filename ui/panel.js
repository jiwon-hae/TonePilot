/**
 * TonePilot Panel - Main UI Controller
 * Manages the Chrome extension side panel interface
 */

// Constants
const CONSTANTS = {
  DEFAULTS: {
    MAX_CHARACTERS: 300,
    FORMALITY_TOGGLE: false,
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
  }
};

/**
 * Main TonePilot Panel class
 * Handles UI interactions, semantic routing, and extension functionality
 */
class TonePilotPanel {
  constructor() {
    this.initializeProperties();
    this.initializeElements();
    this.bindEvents();
    this.initialize().catch(this.handleFatalError.bind(this));
  }

  /**
   * Initialize class properties with default values
   */
  initializeProperties() {
    // Core dependencies
    this.storage = new StorageManager();

    // State management
    this.state = {
      currentSelection: null,
      currentResults: null,
      routerReady: false,
      capturedImageData: null,
      selectedMediaIds: new Set(),
      selectedMediaItems: new Map(),
      selectedMediaArray: [],
      currentMaxCharacters: CONSTANTS.DEFAULTS.MAX_CHARACTERS,
      currentFormalityToggle: CONSTANTS.DEFAULTS.FORMALITY_TOGGLE
    };

    // UI element references
    this.elements = {};
  }

  /**
   * Initialize DOM element references
   * Validates that all required elements exist
   */
  initializeElements() {
    const elementIds = [
      'status', 'inputText', 'loading', 'error',
      'resultSection', 'resultContent', 'queryDisplay', 'replaceBtn', 'copyBtn', 'websiteInfo',
      'websiteName', 'websiteUrl', 'selectedTextDisplay', 'selectedTextContent',
      'textInputWrapper', 'sourcesPanel', 'mediaGrid',
      'mediaCount', 'selectMediaBtn', 'selectedMediaDisplay', 'selectedMediaGrid',
      'settingsBtn', 'settingsPopup', 'closeSettingsBtn', 'saveSettingsBtn',
      'maxCharactersInput', 'formalityTogglePopup', 'cropBtn', 'submitBtn'
    ];

    const selectors = {
      inputContainer: '.input-container'
    };

    // Initialize element references
    elementIds.forEach(id => {
      this.elements[id] = document.getElementById(id);
      if (!this.elements[id]) {
        console.warn(`Element with id '${id}' not found`);
      }
    });

    // Initialize selector-based elements
    Object.entries(selectors).forEach(([key, selector]) => {
      this.elements[key] = document.querySelector(selector);
      if (!this.elements[key]) {
        console.warn(`Element with selector '${selector}' not found`);
      }
    });
  }

  /**
   * Main initialization method
   * Sets up the extension and its components
   */
  async initialize() {
    try {
      this.updateStatus(CONSTANTS.STATUS_TYPES.LOADING, 'Initializing...');

      // Initialize storage
      await this.initializeStorage();

      // Initialize UI components
      await this.initializeUIComponents();

      // Initialize semantic router (non-blocking)
      this.initializeSemanticRouter();

      this.updateStatus(CONSTANTS.STATUS_TYPES.READY, 'Ready');

    } catch (error) {
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize storage with error handling
   */
  async initializeStorage() {
    try {
      await this.storage.initialize();
    } catch (error) {
      console.warn('Storage initialization failed:', error);
      // Continue without storage - extension should still work
    }
  }

  /**
   * Initialize UI components
   */
  async initializeUIComponents() {
    try {
      await this.loadSettings();
      this.updateWebsiteInfo();
      this.checkForCurrentSelection();
    } catch (error) {
      console.error('UI component initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize semantic router in background
   * Non-blocking to prevent UI hang
   */
  initializeSemanticRouter() {
    setTimeout(async () => {
      try {
        console.log('🧠 Starting semantic router initialization...');

        // Try TensorFlow mode first, fall back to simple mode
        try {
          await this.initializeRouterWithTensorFlow();
        } catch (tfError) {
          await this.initializeRouterSimpleMode();
        }

        this.state.routerReady = true;
        console.log('✅ Semantic router initialized successfully');

        // Update status if still initializing
        if (this.elements.status?.textContent?.includes('Initializing')) {
          this.updateStatus(CONSTANTS.STATUS_TYPES.READY, 'Ready (with routing)');
        }
      } catch (error) {
        this.handleRouterInitializationError(error);
      }
    }, CONSTANTS.DEFAULTS.INITIALIZATION_TIMEOUT);
  }

  /**
   * Initialize router with TensorFlow
   */
  async initializeRouterWithTensorFlow() {
    if (typeof initSemanticRouter !== 'function') {
      throw new Error('Semantic router not available');
    }

    await initSemanticRouter({ timeout: CONSTANTS.DEFAULTS.ROUTER_TIMEOUT });
    console.log('🧠 TensorFlow semantic routing enabled');
  }

  /**
   * Initialize router in simple mode
   */
  async initializeRouterSimpleMode() {
    if (typeof initSemanticRouter !== 'function') {
      throw new Error('Semantic router not available');
    }

    console.log('⚡ Using simple keyword routing');
    await initSemanticRouter({ useSimpleMode: true });
  }

  /**
   * Handle router initialization errors
   */
  handleRouterInitializationError(error) {
    console.warn('⚠️ Semantic router failed to initialize:', error.message);
    this.state.routerReady = false;
    console.log('📝 Extension will work without semantic routing');
  }

  /**
   * Bind event listeners to UI elements
   */
  bindEvents() {
    try {
      this.bindButtonEvents();
      this.bindSettingsEvents();
      this.bindChromeEvents();
      this.bindDocumentEvents();
      this.bindWindowEvents();
    } catch (error) {
      console.error('Event binding failed:', error);
    }
  }

  /**
   * Bind main button events
   */
  bindButtonEvents() {
    const buttonEvents = [
      { element: 'replaceBtn', handler: () => this.handleReplace() },
      { element: 'copyBtn', handler: () => this.handleCopy() },
      { element: 'selectMediaBtn', handler: () => this.handleSelectMedia() },
      { element: 'cropBtn', handler: () => this.handleCrop() },
      { element: 'submitBtn', handler: () => this.handleSubmit() }
    ];

    buttonEvents.forEach(({ element, handler }) => {
      if (this.elements[element]) {
        this.elements[element].addEventListener('click', handler);
      }
    });
  }

  /**
   * Bind settings-related events
   */
  bindSettingsEvents() {
    const settingsEvents = [
      { element: 'settingsBtn', handler: () => this.openSettingsPopup() },
      { element: 'closeSettingsBtn', handler: () => this.closeSettingsPopup() },
      { element: 'saveSettingsBtn', handler: () => this.saveSettings() }
    ];

    settingsEvents.forEach(({ element, handler }) => {
      if (this.elements[element]) {
        this.elements[element].addEventListener('click', handler);
      }
    });

    // Settings popup overlay click
    if (this.elements.settingsPopup) {
      this.elements.settingsPopup.addEventListener('click', (e) => {
        if (e.target.classList.contains('settings-popup-overlay')) {
          this.closeSettingsPopup();
        }
      });
    }
  }

  /**
   * Bind Chrome extension events
   */
  bindChromeEvents() {
    // Message listener for Chrome extension communication
    chrome.runtime.onMessage.addListener((message) => {
      this.handleChromeMessage(message);
    });

    // Tab update listeners
    if (chrome.tabs) {
      chrome.tabs.onActivated.addListener(() => {
        this.updateWebsiteInfo();
      });

      chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.status === 'complete') {
          this.updateWebsiteInfo();
        }
      });
    }
  }

  /**
   * Bind document events
   */
  bindDocumentEvents() {
    document.addEventListener('click', (e) => {
      this.handleDocumentClick(e);
    });
  }

  /**
   * Bind window events
   */
  bindWindowEvents() {
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Handle Chrome extension messages
   */
  handleChromeMessage(message) {
    try {
      console.log('Panel received message:', message);

      const messageHandlers = {
        'newSelection': () => this.handleNewSelection(message.data),
        'screenAreaSelected': () => this.handleScreenAreaSelected(message.data),
        'clearSelection': () => this.handleClearSelection()
      };

      const handler = messageHandlers[message.action];
      if (handler) {
        handler();
      }
    } catch (error) {
      console.error('Error handling Chrome message:', error);
    }
  }

  /**
   * Handle document click events
   */
  handleDocumentClick(e) {
    try {
      if (e.target.classList.contains('result-tab')) {
        this.switchIndividualResultTab(e.target);
      }
      if (e.target.classList.contains('tab-btn')) {
        this.handleTabSwitch(e.target);
      }
    } catch (error) {
      console.error('Error handling document click:', error);
    }
  }

  /**
   * Handle fatal errors during initialization
   */
  handleFatalError(error) {
    console.error('Fatal initialization error:', error);
    this.updateStatus(CONSTANTS.STATUS_TYPES.ERROR, 'Critical Error');
    this.showError('Failed to initialize TonePilot. Please refresh the page.');
  }

  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    console.error('Initialization failed:', error);
    this.updateStatus(CONSTANTS.STATUS_TYPES.ERROR, 'Initialization failed');
    this.showError('Failed to initialize TonePilot. Please refresh the panel and try again.');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    console.log('🧹 Cleaning up panel resources');
    // Add any cleanup logic here
  }






  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      if (!this.storage) return;

      const formalityPreference = await this.storage.getSetting('formalityPreference', CONSTANTS.DEFAULTS.FORMALITY_TOGGLE);
      const lengthPreference = await this.storage.getSetting('lengthPreference', CONSTANTS.DEFAULTS.MAX_CHARACTERS);
      this.state.currentFormalityToggle = formalityPreference;
      this.state.currentMaxCharacters = lengthPreference;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Handle new text selection from content script
   */
  handleNewSelection(selectionData) {
    try {
      console.log('Panel received selection data:', selectionData);

      this.state.currentSelection = selectionData;

      // Update UI
      this.updateSelectionDisplay(selectionData);

      this.hideError();
      this.hideResults();
    } catch (error) {
      console.error('Error handling new selection:', error);
    }
  }

  /**
   * Update selection display in UI
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
   * Handle semantic routing
   */
  async handleRouting() {
    const inputText = this.getInputText();
    const selectedText = this.getSelectedText();
    const hasSelection = Boolean(selectedText);

    if (!inputText && !hasSelection) {
      this.showError('Please select text or type an instruction.');
      return;
    }

    if (!this.state.routerReady) {
      console.log('⚠️ Semantic router not ready, using fallback rewrite');
      return this.handleRewrite();
    }

    try {
      const routeQuery = inputText || 'revise this text';
      const result = await this.performSemanticRouting(routeQuery);

      this.displayRoutingResult(result, hasSelection ? selectedText : inputText, inputText);
      this.executeRoutingResult(result, hasSelection, selectedText, inputText);

    } catch (error) {
      this.handleRoutingError(error);
    }
  }

  /**
   * Get input text from textarea
   */
  getInputText() {
    return this.elements.inputText?.value?.trim() || '';
  }

  /**
   * Get selected text from state
   */
  getSelectedText() {
    return this.state.currentSelection?.text?.trim() || '';
  }

  /**
   * Perform semantic routing
   */
  async performSemanticRouting(query) {
    if (typeof routeIntent !== 'function') {
      throw new Error('Semantic routing not available');
    }

    console.log('🔍 Routing query:', query);
    const result = await routeIntent(query);
    const fields = typeof normalizeFields === 'function'
      ? normalizeFields(query, result.intent)
      : { text: query };

    console.log('🎯 Routing result:', result);
    console.log('📋 Normalized fields:', fields);

    return { ...result, fields };
  }

  /**
   * Display routing result in UI
   */
  displayRoutingResult(result, text, inputTextForDisplay = '') {
    const routingInfo = this.formatRoutingInfo(result, text);

    if (this.elements.resultContent) {
      this.elements.resultContent.innerHTML = `
        <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">
          ${routingInfo}
        </pre>
      `;
    }

    this.showResults({ primary: routingInfo, alternatives: [] }, inputTextForDisplay);
  }

  /**
   * Format routing information for display
   */
  formatRoutingInfo(result, text) {
    const truncatedText = text.length > 100 ? `${text.substring(0, 100)}...` : text;

    return `🎯 Intent: ${result.intent} (confidence: ${result.score})
📊 Scores: ${JSON.stringify(result.averages, null, 2)}
📝 Text: "${truncatedText}"
⚙️ Fields: ${JSON.stringify(result.fields, null, 2)}`;
  }

  /**
   * Execute routing result based on intent
   */
  executeRoutingResult(result, hasSelection, selectedText, inputText) {
    const intentHandlers = {
      'proofread': () => this.handleProofreadFlow(hasSelection ? selectedText : inputText),
      'revise': () => this.handleReviseFlow(hasSelection ? selectedText : inputText, result.fields?.goal),
      'draft': () => this.handleDraftFlow(inputText),
      'default': () => {
        this.showError('Intent unclear. Try starting with "Proofread...", "Revise...", or "Draft..."', CONSTANTS.ERROR_TYPES.WARNING);
        if (hasSelection) this.handleRewrite();
      }
    };

    const handler = intentHandlers[result.intent] || intentHandlers.default;
    handler();
  }

  /**
   * Handle routing errors
   */
  handleRoutingError(error) {
    console.error('❌ Routing failed:', error);
    this.showError('Routing failed. Trying basic rewrite instead.', CONSTANTS.ERROR_TYPES.WARNING);
    this.handleRewrite();
  }

  /**
   * Handle proofread flow
   */
  async handleProofreadFlow(text) {
    console.log('📝 Proofread flow:', text);
    this.showError(`Proofread intent detected for: "${this.truncateText(text)}"`, CONSTANTS.ERROR_TYPES.SUCCESS);
  }

  /**
   * Handle revise flow
   */
  async handleReviseFlow(text, goal) {
    console.log('✏️ Revise flow:', text, 'Goal:', goal);
    const goalText = goal ? ` (goal: ${goal})` : '';
    this.showError(`Revise intent detected${goalText} for: "${this.truncateText(text)}"`, CONSTANTS.ERROR_TYPES.SUCCESS);
  }

  /**
   * Handle draft flow
   */
  async handleDraftFlow(instructions) {
    console.log('📄 Draft flow:', instructions);
    this.showError(`Draft intent detected for: "${this.truncateText(instructions)}"`, CONSTANTS.ERROR_TYPES.SUCCESS);
  }

  /**
   * Truncate text for display
   */
  truncateText(text, maxLength = 50) {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  }

  /**
   * Handle rewrite functionality
   */
  async handleRewrite() {
    const text = this.state.currentSelection?.text || this.getInputText();
    const inputText = this.getInputText(); // Only get textarea input for display

    if (!text) {
      this.showError('Please select text on the page or enter text to rewrite.');
      return;
    }

    if (text.length > CONSTANTS.LIMITS.MAX_TEXT_LENGTH) {
      this.showError(`Text is too long. Please keep it under ${CONSTANTS.LIMITS.MAX_TEXT_LENGTH} characters.`);
      return;
    }

    try {
      this.showLoading();
      this.hideError();

      const context = this.buildContext();

      // Create mock results for demonstration
      const results = this.createMockResults(text);

      this.state.currentResults = results;
      this.showResults(results, inputText); // Pass only textarea input for display

      await this.saveRewriteToHistory(text, results, context);

    } catch (error) {
      this.handleRewriteError(error);
    } finally {
      this.hideLoading();
    }
  }


  /**
   * Build context for rewriting
   */
  buildContext() {
    const context = this.state.currentSelection || {};

    if (this.state.capturedImageData) {
      context.image = this.state.capturedImageData;
    }

    return context;
  }

  /**
   * Create mock results for testing
   */
  createMockResults(text) {
    return {
      primary: `${text}`,
      alternatives: [
        `${text}`,
        `${text}`
      ],
      metadata: {
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Save rewrite to history
   */
  async saveRewriteToHistory(originalText, results, context) {
    try {
      if (this.storage) {
        await this.storage.saveRewrite({
          originalText,
          rewrittenText: results.primary,
            domain: context.domain || 'unknown',
          metadata: results.metadata
        });
      }
    } catch (error) {
      console.warn('Failed to save rewrite to history:', error);
    }
  }

  /**
   * Handle rewrite errors
   */
  handleRewriteError(error) {
    console.error('Rewrite failed:', error);

    const errorMessages = {
      'downloading': 'AI model is downloading. Please try again in a moment.',
      'too long': error.message,
      'not available': 'AI model temporarily unavailable. Please try again.',
      'default': 'Failed to rewrite text. Please try again.'
    };

    const errorType = Object.keys(errorMessages).find(key =>
      error.message.includes(key)
    ) || 'default';

    const messageType = errorType === 'downloading' ? CONSTANTS.ERROR_TYPES.WARNING : CONSTANTS.ERROR_TYPES.ERROR;
    this.showError(errorMessages[errorType], messageType);
  }


  /**
   * Update status display
   */
  updateStatus(type, text) {
    if (this.elements.status) {
      this.elements.status.className = `status-badge status-${type}`;
      this.elements.status.textContent = text;
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    if (this.elements.loading) {
      this.elements.loading.style.display = 'flex';
    }
    if (this.elements.submitBtn) {
      this.elements.submitBtn.disabled = true;
      this.elements.submitBtn.innerHTML = `
        <img src="../icons/loading.gif" alt="Loading..." style="width:16px; height:16px;" />
      `;
    }
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    if (this.elements.loading) {
      this.elements.loading.style.display = 'none';
    }
    if (this.elements.submitBtn) {
      this.elements.submitBtn.disabled = false;
      this.elements.submitBtn.innerHTML = `
        <img src="../icons/submit.png" alt="Submit" style="width:16px; height:16px;" />
      `;
    }
  }

  /**
   * Show error message
   */
  showError(message, type = CONSTANTS.ERROR_TYPES.ERROR) {
    if (this.elements.error) {
      this.elements.error.textContent = message;
      this.elements.error.style.display = 'block';
      this.elements.error.className = `alert alert-${type}`;

      if (type === CONSTANTS.ERROR_TYPES.SUCCESS || type === CONSTANTS.ERROR_TYPES.WARNING) {
        setTimeout(() => this.hideError(), 4000);
      }
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
   * Show results
   */
  showResults(results, inputText = '') {
    // Always hide the original result section when we have textarea input
    if (inputText && inputText.trim() !== '') {
      if (this.elements.resultSection) {
        this.elements.resultSection.classList.remove('visible');
      }
    } else {
      if (this.elements.resultSection) {
        this.elements.resultSection.classList.add('visible');
      }
    }

    this.createNewResultSection(results, inputText);
  }

  /**
   * Create a new complete result section for each submission
   */
  createNewResultSection(results, inputText) {
    // Only create result containers when there's actual textarea input
    if (!inputText || inputText.trim() === '') {
      // For selected text without textarea input, use the original result display
      if (this.elements.resultSection) {
        this.elements.resultSection.classList.add('visible');
      }
      this.updateOriginalResultDisplay(results);
      return;
    }

    // Create a container for all individual result sections if it doesn't exist
    let resultsContainer = document.getElementById('allResultsContainer');
    if (!resultsContainer) {
      resultsContainer = document.createElement('div');
      resultsContainer.id = 'allResultsContainer';
      resultsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 0;
      `;

      // Insert after the main-content, before footer
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.appendChild(resultsContainer);
      }
    }

    const sectionId = `result-section-${Date.now()}`;

    const resultSection = document.createElement('div');
    resultSection.className = 'individual-result-section';
    resultSection.style.cssText = `
      margin-bottom: 24px;
      overflow: hidden;
    `;


    resultSection.innerHTML = `
      ${inputText ? `
        <div class="query-display" style="
          padding: 0px 10px;
          border:none;
        ">
          <div class="query-text" style="
            font-size: 20px;
            font-weight:bold;
            line-height: 1.5;
            color: #e4e4e7;
            white-space: pre-wrap;
            word-wrap: break-word;
          ">${inputText}</div>
        </div>
      ` : ''}

      <div class="result-tabs" style="
        display: flex;
        border-bottom: none;
      ">
        <button class="result-tab active" data-section="${sectionId}" data-tab="primary" style="
          padding: 0px 12px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color:#B3B3B3 ;
        ">Primary</button>
        <button class="result-tab" data-section="${sectionId}" data-tab="alt1" style="
          padding: 0px 12px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
        ">Alternative 1</button>
        <button class="result-tab" data-section="${sectionId}" data-tab="alt2" style="
          padding: 0px 12px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
        ">Alternative 2</button>
      </div>

      <div class="result-content" style="
        padding: 20px;
        white-space: pre-wrap;
        line-height: 1.6;
        color: #e4e4e7;
        font-size: 15px;
      ">${results.primary || ''}</div>
      
      <div class="result-actions" style="border-bottom: 0.05px solid rgb(109, 109, 109); padding-bottom: 20px;">
          <button id="copyBtn" class="btn btn-secondary" style ="background:none">
            <img src="../icons/copy.png" alt="Copy" style="width:10px; height:10px;" />
          </button>
      </div>
    `;

    // Store results data on the section for tab switching
    resultSection.resultData = results;

    resultsContainer.appendChild(resultSection);

    // Scroll to the new result
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Update original result display for cases without textarea input
   */
  updateOriginalResultDisplay(results) {
    // Hide the query display since there's no textarea input
    if (this.elements.queryDisplay) {
      this.elements.queryDisplay.style.display = 'none';
    }

    // Update the original result content
    if (this.elements.resultContent) {
      this.elements.resultContent.textContent = results.primary || '';
    }

    // Update tabs to show alternatives if available
    this.updateResultTabs(results);
  }

  /**
   * Switch tabs within individual result sections
   */
  switchIndividualResultTab(tabElement) {
    const sectionId = tabElement.dataset.section;
    const tabName = tabElement.dataset.tab;

    // Find the parent section
    const section = tabElement.closest('.individual-result-section');
    if (!section || !section.resultData) return;

    // Update tab styles within this section only
    const sectionTabs = section.querySelectorAll('.result-tab');
    sectionTabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.style.color = '#3b82f6';
        tab.style.borderBottomColor = '#3b82f6';
      } else {
        tab.style.color = '#6b7280';
        tab.style.borderBottomColor = 'transparent';
      }
    });

    // Update content within this section only
    const contentElement = section.querySelector('.result-content');
    if (contentElement) {
      let content = '';
      if (tabName === 'primary') {
        content = section.resultData.primary || '';
      } else if (tabName === 'alt1') {
        content = section.resultData.alternatives?.[0] || '';
      } else if (tabName === 'alt2') {
        content = section.resultData.alternatives?.[1] || '';
      }
      contentElement.textContent = content;
    }
  }

  /**
   * Hide results
   */
  hideResults() {
    if (this.elements.resultSection) {
      this.elements.resultSection.classList.remove('visible');
    }
  }

  /**
   * Update result tabs visibility
   */
  updateResultTabs(results) {
    const tabs = document.querySelectorAll('.result-tab');
    if (tabs.length >= 3) {
      tabs[0].style.display = 'block';
      tabs[1].style.display = results.alternatives?.[0] ? 'block' : 'none';
      tabs[2].style.display = results.alternatives?.[1] ? 'block' : 'none';
    }

    this.switchResultTab('primary');
  }

  /**
   * Switch result tab
   */
  switchResultTab(tabName) {
    document.querySelectorAll('.result-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    let content = '';
    if (tabName === 'primary') {
      content = this.state.currentResults?.primary || '';
    } else if (tabName === 'alt1') {
      content = this.state.currentResults?.alternatives?.[0] || '';
    } else if (tabName === 'alt2') {
      content = this.state.currentResults?.alternatives?.[1] || '';
    }

    if (this.elements.resultContent) {
      this.elements.resultContent.textContent = content;
    }
  }

  /**
   * Handle replace button click
   */
  async handleReplace() {
    if (!this.state.currentResults || !this.state.currentSelection) {
      this.showError('No text to replace. Please select text on the page first.');
      return;
    }

    const activeTab = document.querySelector('.result-tab.active')?.dataset.tab;
    const textToReplace = this.getTextToReplace(activeTab);

    try {
      const success = await this.replaceTextInPage(textToReplace);

      if (success) {
        this.showError('Text replaced successfully!', CONSTANTS.ERROR_TYPES.SUCCESS);
        setTimeout(() => this.hideError(), 2000);
      } else {
        this.showError('Failed to replace text. Please try selecting the text again.');
      }
    } catch (error) {
      console.error('Replace failed:', error);
      this.showError('Failed to replace text. Please ensure the original page is still active.');
    }
  }

  /**
   * Get text to replace based on active tab
   */
  getTextToReplace(activeTab) {
    const tabMapping = {
      'primary': this.state.currentResults?.primary,
      'alt1': this.state.currentResults?.alternatives?.[0],
      'alt2': this.state.currentResults?.alternatives?.[1]
    };

    return tabMapping[activeTab] || '';
  }

  /**
   * Replace text in the page using Chrome extension API
   */
  async replaceTextInPage(newText) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tabs[0].id, {
      action: 'replaceSelection',
      newText: newText
    });

    return response?.success || false;
  }

  /**
   * Handle copy button click
   */
  async handleCopy() {
    const activeTab = document.querySelector('.result-tab.active')?.dataset.tab;
    const textToCopy = this.getTextToReplace(activeTab);

    try {
      await navigator.clipboard.writeText(textToCopy);
      this.showError('Text copied to clipboard!', CONSTANTS.ERROR_TYPES.SUCCESS);
      setTimeout(() => this.hideError(), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      this.showError('Failed to copy text to clipboard.');
    }
  }

  /**
   * Clear selected text
   */
  clearSelectedText() {
    if (this.elements.selectedTextDisplay) {
      this.elements.selectedTextDisplay.style.display = 'none';
    }

    if (this.elements.inputContainer) {
      this.elements.inputContainer.classList.remove('has-selected-text');
    }


    this.state.currentSelection = null;
  }

  /**
   * Handle clear selection from content script
   */
  handleClearSelection() {
    console.log('Panel clearing selection due to deselection on webpage');
    this.clearSelectedText();
  }




  /**
   * Update website information in the UI
   */
  async updateWebsiteInfo() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (currentTab?.url) {
        const url = new URL(currentTab.url);
        this.displayWebsiteInfo(currentTab.title || url.hostname, url.hostname);
      }
    } catch (error) {
      console.error('Error getting website info:', error);
      this.hideWebsiteInfo();
    }
  }

  /**
   * Display website information
   */
  displayWebsiteInfo(title, hostname) {
    if (this.elements.websiteName) {
      this.elements.websiteName.textContent = title;
    }

    if (this.elements.websiteUrl) {
      this.elements.websiteUrl.textContent = hostname;
    }

    if (this.elements.websiteInfo) {
      this.elements.websiteInfo.style.display = 'flex';
    }
  }

  /**
   * Hide website information
   */
  hideWebsiteInfo() {
    if (this.elements.websiteInfo) {
      this.elements.websiteInfo.style.display = 'none';
    }
  }

  /**
   * Check for current selection on page load
   */
  async checkForCurrentSelection() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (currentTab?.id) {
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'getCurrentSelection'
        });

        if (response?.data) {
          this.handleNewSelection(response.data);
        }
      }
    } catch (error) {
      console.log('No current selection or content script not ready');
    }
  }

  /**
   * Handle tab switching
   */
  handleTabSwitch(tabButton) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Add active class to clicked tab
    tabButton.classList.add('active');

    // Show/hide panels based on tab
    const tabText = tabButton.textContent.toLowerCase();
    if (tabText.includes('sources') || tabText.includes('media')) {
      this.showSourcesPanel();
      this.loadPageMedia();
    } else {
      this.hideSourcesPanel();
    }
  }

  /**
   * Show sources panel
   */
  showSourcesPanel() {
    if (this.elements.sourcesPanel) {
      this.elements.sourcesPanel.style.display = 'block';
    }

    if (this.elements.textInputWrapper) {
      this.elements.textInputWrapper.style.display = 'none';
    }

  }

  /**
   * Hide sources panel
   */
  hideSourcesPanel() {
    if (this.elements.sourcesPanel) {
      this.elements.sourcesPanel.style.display = 'none';
    }

    if (this.elements.textInputWrapper) {
      this.elements.textInputWrapper.style.display = 'block';
    }

  }

  /**
   * Load page media
   */
  async loadPageMedia() {
    this.clearMediaSelection();

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (currentTab?.id) {
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'getPageMedia'
        });

        if (response?.media) {
          this.displayMedia(response.media);
        }
      }
    } catch (error) {
      console.error('Failed to load page media:', error);
      this.displayMediaError();
    }
  }

  /**
   * Display media in grid
   */
  displayMedia(mediaArray) {
    if (this.elements.mediaCount) {
      this.elements.mediaCount.textContent = `${mediaArray.length} items`;
    }

    if (!this.elements.mediaGrid) return;

    if (mediaArray.length === 0) {
      this.elements.mediaGrid.innerHTML = '<div style="text-align: center; color: #71717a; padding: 20px;">No media found on this page.</div>';
      return;
    }

    this.elements.mediaGrid.innerHTML = '';
    mediaArray.forEach((media) => {
      const mediaItem = this.createMediaItem(media);
      this.elements.mediaGrid.appendChild(mediaItem);
    });
  }

  /**
   * Create media item element
   */
  createMediaItem(media) {
    const mediaItem = document.createElement('div');
    mediaItem.className = 'media-item';
    mediaItem.dataset.mediaId = media.elementId;
    mediaItem.onclick = () => this.handleMediaClick(media, mediaItem);
    mediaItem.title = `Click to scroll to this ${media.type} on the page`;

    const thumbnailHtml = media.type === 'video'
      ? `<img class="media-thumbnail" src="${media.poster || media.src}" alt="${media.alt}" onerror="this.style.display='none'">
         <div class="video-overlay">▶</div>`
      : `<img class="media-thumbnail" src="${media.src}" alt="${media.alt}" onerror="this.style.display='none'">`;

    mediaItem.innerHTML = `
      ${thumbnailHtml}
      <div class="media-info">
        <div class="media-type">${media.type}</div>
        <div class="media-title">${media.alt}</div>
        <div class="media-dimensions">${media.width} × ${media.height}</div>
      </div>
    `;

    return mediaItem;
  }

  /**
   * Display media loading error
   */
  displayMediaError() {
    if (this.elements.mediaGrid) {
      this.elements.mediaGrid.innerHTML = '<div style="text-align: center; color: #71717a; padding: 20px;">Failed to load media from this page.</div>';
    }
  }

  /**
   * Handle media item click
   */
  async handleMediaClick(media, mediaItem) {
    // Toggle selection
    if (mediaItem.classList.contains('selected')) {
      mediaItem.classList.remove('selected');
      this.removeFromSelectedMedia(media.elementId);
    } else {
      mediaItem.classList.add('selected');
      this.addToSelectedMedia(media);
    }

    this.updateSelectButtonVisibility();
    await this.scrollToMediaOnPage(media);
  }

  /**
   * Add media to selection
   */
  addToSelectedMedia(media) {
    this.state.selectedMediaIds.add(media.elementId);
    this.state.selectedMediaItems.set(media.elementId, media);
  }

  /**
   * Remove media from selection
   */
  removeFromSelectedMedia(elementId) {
    this.state.selectedMediaIds.delete(elementId);
    this.state.selectedMediaItems.delete(elementId);
  }

  /**
   * Update select button visibility
   */
  updateSelectButtonVisibility() {
    if (!this.elements.selectMediaBtn) return;

    if (this.state.selectedMediaIds.size > 0) {
      this.elements.selectMediaBtn.style.display = 'inline-block';
      const count = this.state.selectedMediaIds.size;
      this.elements.selectMediaBtn.textContent = `Select Media (${count})`;
    } else {
      this.elements.selectMediaBtn.style.display = 'none';
      this.elements.selectMediaBtn.textContent = 'Select Media';
    }
  }

  /**
   * Scroll to media on page
   */
  async scrollToMediaOnPage(media) {
    if (!media.elementId) return;

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (currentTab?.id) {
        await chrome.tabs.sendMessage(currentTab.id, {
          action: 'scrollToMedia',
          elementId: media.elementId
        });
      }
    } catch (error) {
      console.error('Failed to scroll to media:', error);
      this.showError('Media selected but failed to scroll', CONSTANTS.ERROR_TYPES.ERROR);
    }
  }

  /**
   * Clear media selection
   */
  clearMediaSelection() {
    if (this.elements.mediaGrid) {
      const selectedItems = this.elements.mediaGrid.querySelectorAll('.media-item.selected');
      selectedItems.forEach(item => item.classList.remove('selected'));
    }

    this.state.selectedMediaIds.clear();
    this.state.selectedMediaItems.clear();
    this.updateSelectButtonVisibility();
  }

  /**
   * Handle select media button click
   */
  handleSelectMedia() {
    if (this.state.selectedMediaIds.size === 0) {
      this.showError('No media selected', CONSTANTS.ERROR_TYPES.ERROR);
      return;
    }

    // Switch back to Assistant tab
    const assistantTab = document.querySelector('.tab-btn:first-child');
    if (assistantTab) {
      this.handleTabSwitch(assistantTab);
    }

    // Store selected media
    const selectedMediaArray = Array.from(this.state.selectedMediaItems.values());
    this.displaySelectedMediaInAssistant(selectedMediaArray);

    const count = this.state.selectedMediaIds.size;
    this.showError(`${count} media item${count > 1 ? 's' : ''} selected successfully!`, CONSTANTS.ERROR_TYPES.SUCCESS);
  }

  /**
   * Display selected media in assistant tab
   */
  displaySelectedMediaInAssistant(mediaArray) {
    this.state.selectedMediaArray = mediaArray;
    this.refreshMediaDisplay();
    console.log('Displaying selected media in assistant tab:', mediaArray);
  }

  /**
   * Refresh media display
   */
  refreshMediaDisplay() {
    const hasSelectedMedia = this.state.selectedMediaArray?.length > 0;
    const hasCapturedImage = this.state.capturedImageData;

    if (!hasSelectedMedia && !hasCapturedImage) {
      if (this.elements.selectedMediaDisplay) {
        this.elements.selectedMediaDisplay.style.display = 'none';
      }
      return;
    }

    if (this.elements.selectedMediaDisplay) {
      this.elements.selectedMediaDisplay.style.display = 'block';
    }

    if (this.elements.selectedMediaGrid) {
      this.elements.selectedMediaGrid.innerHTML = '';

      // Add captured image first
      if (hasCapturedImage) {
        this.addCapturedImageToGrid();
      }

      // Add selected media
      if (hasSelectedMedia) {
        this.addSelectedMediaToGrid();
      }
    }
  }

  /**
   * Add captured image to grid
   */
  addCapturedImageToGrid() {
    const mediaItem = document.createElement('div');
    mediaItem.className = 'selected-media-item';
    mediaItem.dataset.mediaType = 'captured';

    const thumbnail = document.createElement('img');
    thumbnail.className = 'selected-media-thumbnail';
    thumbnail.src = this.state.capturedImageData;
    thumbnail.alt = 'Captured screen';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'selected-media-item-remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove captured image';
    removeBtn.onclick = () => this.removeImage();

    mediaItem.appendChild(thumbnail);
    mediaItem.appendChild(removeBtn);

    if (this.elements.selectedMediaGrid) {
      this.elements.selectedMediaGrid.appendChild(mediaItem);
    }
  }

  /**
   * Add selected media to grid
   */
  addSelectedMediaToGrid() {
    this.state.selectedMediaArray.forEach((media, index) => {
      const mediaItem = document.createElement('div');
      mediaItem.className = 'selected-media-item';
      mediaItem.dataset.mediaType = 'selected';
      mediaItem.dataset.mediaIndex = index;

      const thumbnail = document.createElement('img');
      thumbnail.className = 'selected-media-thumbnail';
      thumbnail.src = media.src;
      thumbnail.alt = media.alt;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'selected-media-item-remove';
      removeBtn.innerHTML = '×';
      removeBtn.title = 'Remove this media';
      removeBtn.onclick = () => this.removeSpecificMedia(index);

      mediaItem.appendChild(thumbnail);
      mediaItem.appendChild(removeBtn);

      if (this.elements.selectedMediaGrid) {
        this.elements.selectedMediaGrid.appendChild(mediaItem);
      }
    });
  }

  /**
   * Remove specific media item
   */
  removeSpecificMedia(index) {
    this.state.selectedMediaArray.splice(index, 1);
    this.refreshMediaDisplay();
  }

  /**
   * Remove captured image
   */
  removeImage() {
    this.state.capturedImageData = null;

    if (!this.state.selectedMediaArray || this.state.selectedMediaArray.length === 0) {
      if (this.elements.inputText) {
        this.elements.inputText.placeholder = 'Tell me what to do...';
      }
    }

    this.refreshMediaDisplay();
  }

  /**
   * Handle screen area selection
   */
  async handleScreenAreaSelected(selectionData) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const stream = await this.captureTabStream();
      const dataURL = await this.processScreenCapture(stream, selectionData);

      this.displayCapturedImage(dataURL);
    } catch (error) {
      console.error('Area capture failed:', error);
      this.showError('Failed to capture selected area. Please try again.');
    }
  }

  /**
   * Capture tab stream
   */
  captureTabStream() {
    return new Promise((resolve, reject) => {
      chrome.tabCapture.capture(
        { audio: false, video: true },
        (stream) => {
          if (stream) {
            resolve(stream);
          } else {
            reject(new Error('Failed to capture tab'));
          }
        }
      );
    });
  }

  /**
   * Process screen capture
   */
  processScreenCapture(stream, selectionData) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      video.addEventListener('loadedmetadata', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = selectionData.width;
        canvas.height = selectionData.height;

        const scaleX = video.videoWidth / window.innerWidth;
        const scaleY = video.videoHeight / window.innerHeight;

        ctx.drawImage(
          video,
          selectionData.x * scaleX,
          selectionData.y * scaleY,
          selectionData.width * scaleX,
          selectionData.height * scaleY,
          0,
          0,
          selectionData.width,
          selectionData.height
        );

        const dataURL = canvas.toDataURL('image/png');
        stream.getTracks().forEach(track => track.stop());
        resolve(dataURL);
      });
    });
  }

  /**
   * Display captured image
   */
  displayCapturedImage(dataURL) {
    this.state.capturedImageData = dataURL;

    if (this.elements.inputText) {
      this.elements.inputText.placeholder = 'Describe what you want to know about the image or add additional context...';
    }

    this.refreshMediaDisplay();
    this.showError('Screen captured! You can now ask questions about the image.', CONSTANTS.ERROR_TYPES.SUCCESS);
  }

  /**
   * Handle screen capture
   */
  async handleScreenCapture() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startScreenAreaSelection'
      });

      this.pendingCaptureData = null;
    } catch (error) {
      console.error('Screen capture failed:', error);
      this.showError('Failed to start screen capture. Please try again.');
    }
  }

  /**
   * Open settings popup
   */
  openSettingsPopup() {
    if (this.elements.maxCharactersInput) {
      this.elements.maxCharactersInput.value = this.state.currentMaxCharacters || CONSTANTS.DEFAULTS.MAX_CHARACTERS;
    }

    if (this.elements.formalityTogglePopup) {
      this.elements.formalityTogglePopup.checked = this.state.currentFormalityToggle || CONSTANTS.DEFAULTS.FORMALITY_TOGGLE;
    }

    if (this.elements.settingsPopup) {
      this.elements.settingsPopup.style.display = 'block';
    }
  }

  /**
   * Close settings popup
   */
  closeSettingsPopup() {
    if (this.elements.settingsPopup) {
      this.elements.settingsPopup.style.display = 'none';
    }
  }

  /**
   * Save settings
   */
  saveSettings() {
    // Validate and save max characters
    const maxChars = parseInt(this.elements.maxCharactersInput?.value);
    if (isNaN(maxChars) || maxChars < CONSTANTS.LIMITS.MIN_CHARACTERS || maxChars > CONSTANTS.LIMITS.MAX_CHARACTERS) {
      this.showError(`Max characters must be between ${CONSTANTS.LIMITS.MIN_CHARACTERS} and ${CONSTANTS.LIMITS.MAX_CHARACTERS}`, CONSTANTS.ERROR_TYPES.WARNING);
      if (this.elements.maxCharactersInput) {
        this.elements.maxCharactersInput.value = CONSTANTS.DEFAULTS.MAX_CHARACTERS;
      }
      this.state.currentMaxCharacters = CONSTANTS.DEFAULTS.MAX_CHARACTERS;
    } else {
      this.state.currentMaxCharacters = maxChars;
    }

    // Save formality setting
    this.state.currentFormalityToggle = this.elements.formalityTogglePopup?.checked || false;

    // Save to storage
    if (this.storage) {
      this.storage.saveSetting('lengthPreference', this.state.currentMaxCharacters);
      this.storage.saveSetting('formalityPreference', this.state.currentFormalityToggle);
    }

    this.closeSettingsPopup();
    this.showError('Settings saved successfully!', CONSTANTS.ERROR_TYPES.SUCCESS);
  }

  /**
   * Handle crop button click
   */
  handleCrop() {
    this.handleScreenCapture();
  }

  /**
   * Handle submit button click
   */
  handleSubmit() {
    this.elements.inputText.text = '';
    this.handleRouting();
  }
}

// Initialize the panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    new TonePilotPanel();
  } catch (error) {
    console.error('Failed to initialize TonePilot panel:', error);
  }
});