/**
 * TonePilot Panel - Main UI Controller (Refactored)
 * Manages the Chrome extension side panel interface using modular architecture
 */

class TonePilotPanel {
  constructor() {
    this.initializeManagers();
    this.initialize().catch(this.handleFatalError.bind(this));
  }

  /**
   * Initialize manager instances
   */
  initializeManagers() {
    try {
      // Initialize core managers
      this.stateManager = new window.TonePilotStateManager();
      this.uiManager = new window.TonePilotUIManager(this.stateManager);
      this.messageHandler = new window.TonePilotMessageHandler(this.stateManager, this.uiManager);
      this.settingsManager = new window.TonePilotSettingsManager(this.stateManager, this.uiManager);
      this.aiServicesManager = new window.TonePilotAIServicesManager(this.stateManager, this.uiManager);

      // Legacy storage for backward compatibility
      this.storage = window.StorageManager ? new window.StorageManager() : null;

      console.log('✅ Managers initialized');
    } catch (error) {
      console.error('❌ Manager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Main initialization method
   */
  async initialize() {
    try {
      // Initialize UI elements first
      const elementsReady = this.uiManager.initializeElements();
      if (!elementsReady) {
        throw new Error('Failed to initialize UI elements');
      }

      // Check Chrome API availability first
      const apiStatus = this.checkChromeAPIAvailability();
      this.updateStatusForAPIAvailability(apiStatus);

      // Now we can update status
      this.uiManager.updateStatus('loading', 'Initializing...');

      // Bind events
      this.bindEvents();

      // Initialize managers in sequence
      await this.initializeStorage();
      await this.settingsManager.initialize();
      await this.messageHandler.initialize();
      await this.aiServicesManager.initializeServices();

      // Final UI setup
      await this.initializeUIComponents();

      this.uiManager.updateStatus('ready', 'Ready');
      console.log('✅ TonePilot Panel initialized successfully');

    } catch (error) {
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize storage with error handling
   */
  async initializeStorage() {
    try {
      if (this.storage) {
        await this.storage.initialize();
        console.log('✅ Storage initialized');
      } else {
        console.warn('⚠️ Storage service not available');
      }
    } catch (error) {
      console.warn('Storage initialization failed:', error);
    }
  }

  /**
   * Initialize UI components
   */
  async initializeUIComponents() {
    try {
      this.updateWebsiteInfo();
      this.checkForCurrentSelection();
      await this.loadPageMedia();
      console.log('✅ UI components initialized');
    } catch (error) {
      console.error('UI component initialization failed:', error);
      throw error;
    }
  }

  /**
   * Bind all event listeners
   */
  bindEvents() {
    try {
      // Bind UI events through UI manager
      this.uiManager.bindEvents();

      // Connect UI manager event handlers to panel methods
      this.connectEventHandlers();

      // Bind Chrome extension events
      this.bindChromeEvents();

      console.log('✅ Events bound successfully');
    } catch (error) {
      console.error('Event binding failed:', error);
    }
  }

  /**
   * Bind Chrome extension events
   */
  bindChromeEvents() {
    // Main Chrome message listener
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.messageHandler.handleMessage(message, sender, sendResponse);
      });
      console.log('✅ Chrome runtime message listener added');
    } else {
      console.warn('⚠️ Chrome runtime messaging not available');
    }

    // Tab update listeners for website info
    if (chrome.tabs) {
      chrome.tabs.onActivated.addListener(() => {
        this.updateWebsiteInfo();
      });

      chrome.tabs.onUpdated.addListener((_, changeInfo) => {
        if (changeInfo.status === 'complete') {
          this.updateWebsiteInfo();
        }
      });
    }
  }

  /**
   * Connect UI manager event handlers to panel methods
   */
  connectEventHandlers() {
    // Override UI manager event handlers with panel methods
    this.uiManager.handleCopy = () => this.handleCopy();
    this.uiManager.handleReplace = () => this.handleReplace();
    this.uiManager.handleSelectMedia = () => this.handleSelectMedia();
    this.uiManager.handleCrop = () => this.handleCrop();
    this.uiManager.handleSubmit = () => this.handleSubmit();
    this.uiManager.handleOpenSettings = () => this.settingsManager.openSettings();
    this.uiManager.handleCloseSettings = () => this.settingsManager.closeSettings();
    this.uiManager.handleSaveSettings = () => this.settingsManager.handleSaveSettings();
    this.uiManager.handleTabSwitch = (tab) => this.handleTabSwitch(tab);
    this.uiManager.handleDocumentClick = (e) => this.handleDocumentClick(e);
  }

  /**
   * Handle text submission and processing
   */
  async handleSubmit() {
    try {
      const inputText = this.uiManager.getInputText();
      const selectionState = this.stateManager.getSelectionState();

      if (!inputText.trim() && !selectionState.hasSelection) {
        this.uiManager.showError('Please enter text or select text on the page');
        return;
      }

      // Process text through AI services
      const results = await this.aiServicesManager.processText(inputText, selectionState.currentSelection);

      // Update state and UI
      this.stateManager.setState('currentResults', results);
      this.uiManager.showResults(results, inputText);

      // Save to history if available
      if (this.storage) {
        await this.storage.saveRewriteHistory({
          input: inputText,
          selection: selectionState.currentSelection?.text || '',
          results: results,
          timestamp: Date.now()
        });
      }

      console.log('✅ Text processing completed');

    } catch (error) {
      console.error('❌ Submit handling failed:', error);
      this.uiManager.showError(`Processing failed: ${error.message}`);
    }
  }

  /**
   * Handle copy button click
   */
  async handleCopy() {
    try {
      const resultsState = this.stateManager.getResultsState();

      if (!resultsState.hasResults) {
        this.uiManager.showError('No results to copy');
        return;
      }

      await this.messageHandler.copyToClipboard(resultsState.currentResults.primary);

    } catch (error) {
      console.error('❌ Copy failed:', error);
      this.uiManager.showError('Copy failed');
    }
  }

  /**
   * Handle replace button click
   */
  async handleReplace() {
    try {
      const resultsState = this.stateManager.getResultsState();
      const selectionState = this.stateManager.getSelectionState();

      if (!resultsState.hasResults) {
        this.uiManager.showError('No results to replace with');
        return;
      }

      if (!selectionState.hasSelection) {
        this.uiManager.showError('No text selected for replacement');
        return;
      }

      await this.messageHandler.replaceText(resultsState.currentResults.primary);

    } catch (error) {
      console.error('❌ Replace failed:', error);
      this.uiManager.showError('Replace failed');
    }
  }

  /**
   * Handle select media button click
   */
  async handleSelectMedia() {
    try {
      await this.messageHandler.requestCapture();
    } catch (error) {
      console.error('❌ Media selection failed:', error);
      this.uiManager.showError('Media selection failed');
    }
  }

  /**
   * Handle crop button click
   */
  handleCrop() {
    console.log('🖼️ Crop functionality not yet implemented');
    this.uiManager.showError('Crop feature coming soon');
  }

  /**
   * Handle result tab switch (for individual results)
   */
  handleTabSwitch(tab) {
    console.log('📑 Result tab switched:', tab.textContent);

    // Update active tab display
    document.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  }

  /**
   * Handle main tab switch (between Assistant/Sources panels)
   */
  handleMainTabSwitch(tabButton) {
    console.log('📑 Main tab switched:', tabButton.textContent);

    // Remove active class from all main tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Add active class to clicked tab
    tabButton.classList.add('active');

    // Show/hide panels based on tab
    const tabText = tabButton.textContent.toLowerCase();
    if (tabText.includes('sources') || tabText.includes('media')) {
      this.showSourcesPanel();
      // Refresh media when media tab is shown
      if (tabText.includes('media')) {
        this.loadPageMedia();
      }
    } else {
      this.hideSourcesPanel();
    }
  }

  /**
   * Show sources panel
   */
  showSourcesPanel() {
    if (this.uiManager.elements.sourcesPanel) {
      this.uiManager.elements.sourcesPanel.style.display = 'block';
    }
  }

  /**
   * Hide sources panel
   */
  hideSourcesPanel() {
    if (this.uiManager.elements.sourcesPanel) {
      this.uiManager.elements.sourcesPanel.style.display = 'none';
    }
  }

  /**
   * Handle document click events
   */
  handleDocumentClick(event) {
    try {
      // Handle tab clicks
      if (event.target.classList.contains('result-tab')) {
        this.handleTabSwitch(event.target);
      }

      if (event.target.classList.contains('tab-btn')) {
        this.handleMainTabSwitch(event.target);
      }

      // Close popups when clicking outside
      if (this.uiManager.elements.settingsPopup &&
          !this.uiManager.elements.settingsPopup.contains(event.target) &&
          !this.uiManager.elements.settingsBtn.contains(event.target)) {
        this.settingsManager.closeSettings();
      }
    } catch (error) {
      console.error('❌ Document click handling failed:', error);
    }
  }

  /**
   * Update website information
   */
  async updateWebsiteInfo() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (currentTab) {
        const websiteInfo = {
          name: this.extractDomainName(currentTab.url),
          url: currentTab.url,
          title: currentTab.title
        };

        // Update UI through message handler
        this.messageHandler.handleWebsiteInfo(websiteInfo);
      }
    } catch (error) {
      console.error('Failed to update website info:', error);
    }
  }

  /**
   * Extract domain name from URL
   */
  extractDomainName(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Check for current text selection
   */
  async checkForCurrentSelection() {
    try {
      // Request current selection from content script
      await this.messageHandler.sendToContentScript('getCurrentSelection');
    } catch (error) {
      console.log('No current selection or content script not ready');
    }
  }

  /**
   * Load page media from content script
   */
  async loadPageMedia() {
    try {
      console.log('🔍 Requesting page media from content script...');
      const response = await this.messageHandler.sendToContentScript('getPageMedia');
      console.log('📦 Content script response:', response);

      if (response && response.media) {
        this.displayPageMedia(response.media);
        console.log(`📸 Loaded ${response.media.length} media items`);
      } else {
        console.log('⚠️ No media data in response');
        // Show empty state
        this.displayPageMedia([]);
      }
    } catch (error) {
      console.error('❌ Failed to load page media:', error);
      // Show empty state on error
      this.displayPageMedia([]);
    }
  }

  /**
   * Display page media in the media grid
   */
  displayPageMedia(mediaItems) {
    const mediaGrid = this.uiManager.elements.mediaGrid;
    const mediaCount = this.uiManager.elements.mediaCount;

    if (!mediaGrid || !mediaCount) {
      console.warn('Media grid elements not found');
      return;
    }

    // Update count
    mediaCount.textContent = `${mediaItems.length} items`;

    // Clear existing media
    mediaGrid.innerHTML = '';

    if (mediaItems.length === 0) {
      mediaGrid.innerHTML = '<div style="text-align: center; color: #71717a; padding: 20px;">No media found on this page</div>';
      return;
    }

    // Create media items
    mediaItems.forEach((media) => {
      const mediaItem = this.createMediaItem(media);
      mediaGrid.appendChild(mediaItem);
    });

    // Store media for later reference
    this.stateManager.setState('pageMedia', mediaItems);
  }

  /**
   * Create a media item element
   */
  createMediaItem(media) {
    const mediaItem = document.createElement('div');
    mediaItem.className = 'media-item';
    mediaItem.setAttribute('data-media-id', media.elementId);

    let thumbnail;
    if (media.type === 'video') {
      thumbnail = media.poster || media.src;
    } else {
      thumbnail = media.src;
    }

    mediaItem.innerHTML = `
      <img class="media-thumbnail" src="${thumbnail}" alt="${media.alt}"
           onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"80\" viewBox=\"0 0 120 80\"><rect width=\"120\" height=\"80\" fill=\"%23404040\"/><text x=\"60\" y=\"45\" text-anchor=\"middle\" fill=\"%23999\" font-size=\"12\">No Preview</text></svg>'">
      <div class="media-info">
        <div class="media-type">${media.type}</div>
        <div class="media-title">${media.alt}</div>
        <div class="media-dimensions">${media.width}×${media.height}</div>
      </div>
    `;

    // Add click handler for media selection
    mediaItem.addEventListener('click', () => this.handleMediaItemClick(media, mediaItem));

    return mediaItem;
  }

  /**
   * Handle media item click for selection
   */
  handleMediaItemClick(media, element) {
    const isSelected = element.classList.contains('selected');

    if (isSelected) {
      // Deselect
      element.classList.remove('selected');
      this.stateManager.state.selectedMediaIds.delete(media.elementId);
      this.stateManager.state.selectedMediaItems.delete(media.elementId);
    } else {
      // Select
      element.classList.add('selected');
      this.stateManager.state.selectedMediaIds.add(media.elementId);
      this.stateManager.state.selectedMediaItems.set(media.elementId, media);
    }

    // Update selected media array
    this.stateManager.state.selectedMediaArray = Array.from(this.stateManager.state.selectedMediaItems.values());

    // Update display
    this.updateSelectedMediaDisplay();

    console.log(`📸 Media ${isSelected ? 'deselected' : 'selected'}:`, media.alt);
  }

  /**
   * Update selected media display
   */
  updateSelectedMediaDisplay() {
    const selectedMediaDisplay = this.uiManager.elements.selectedMediaDisplay;
    const selectedMediaGrid = this.uiManager.elements.selectedMediaGrid;

    if (!selectedMediaDisplay || !selectedMediaGrid) return;

    const selectedCount = this.stateManager.state.selectedMediaIds.size;

    if (selectedCount === 0) {
      selectedMediaDisplay.style.display = 'none';
      return;
    }

    selectedMediaDisplay.style.display = 'block';
    selectedMediaGrid.innerHTML = '';

    // Add selected media thumbnails
    this.stateManager.state.selectedMediaArray.forEach(media => {
      const thumb = document.createElement('div');
      thumb.className = 'selected-media-item';
      thumb.innerHTML = `
        <img class="selected-media-thumbnail" src="${media.src}" alt="${media.alt}">
        <button class="selected-media-item-remove" onclick="window.tonePilotPanel.removeSelectedMedia('${media.elementId}')">×</button>
      `;
      selectedMediaGrid.appendChild(thumb);
    });

    console.log(`📸 Updated selected media display: ${selectedCount} items`);
  }

  /**
   * Remove selected media item
   */
  removeSelectedMedia(elementId) {
    // Remove from state
    this.stateManager.state.selectedMediaIds.delete(elementId);
    this.stateManager.state.selectedMediaItems.delete(elementId);
    this.stateManager.state.selectedMediaArray = Array.from(this.stateManager.state.selectedMediaItems.values());

    // Update UI
    const mediaItem = document.querySelector(`[data-media-id="${elementId}"]`);
    if (mediaItem) {
      mediaItem.classList.remove('selected');
    }

    this.updateSelectedMediaDisplay();
  }

  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    console.error('❌ Initialization failed:', error);
    this.uiManager.updateStatus('error', 'Initialization Failed');
    this.uiManager.showError(`Initialization failed: ${error.message}`);
  }

  /**
   * Handle fatal errors
   */
  handleFatalError(error) {
    console.error('💥 Fatal error:', error);

    // Try to show error in UI if possible
    if (this.uiManager) {
      this.uiManager.updateStatus('error', 'Fatal Error');
      this.uiManager.showError('A fatal error occurred. Please reload the extension.');
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      if (this.uiManager) {
        this.uiManager.cleanup();
      }
      if (this.messageHandler) {
        this.messageHandler.cleanup();
      }
      console.log('🧹 Panel cleanup completed');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Check Chrome API availability
   * @returns {Object} API availability status
   */
  checkChromeAPIAvailability() {
    const apis = {
      runtime: Boolean(chrome?.runtime),
      tabs: Boolean(chrome?.tabs),
      storage: Boolean(chrome?.storage),
      sidePanel: Boolean(chrome?.sidePanel),
      contextMenus: Boolean(chrome?.contextMenus),
      scripting: Boolean(chrome?.scripting),
      ai: Boolean(window?.ai),
      aiLanguageModel: Boolean(window?.ai?.languageModel),
      aiRewriter: Boolean(window?.ai?.rewriter),
      aiSummarizer: Boolean(window?.ai?.summarizer),
      aiProofreader: Boolean(window?.ai?.proofreader)
    };

    const coreAPIs = ['runtime', 'tabs', 'storage'];
    const extensionAPIs = ['sidePanel', 'contextMenus', 'scripting'];
    const aiAPIs = ['ai', 'aiLanguageModel', 'aiRewriter', 'aiSummarizer', 'aiProofreader'];

    const coreAvailable = coreAPIs.every(api => apis[api]);
    const extensionAvailable = extensionAPIs.every(api => apis[api]);
    const aiAvailable = apis.ai && apis.aiLanguageModel;
    const allAIAvailable = aiAPIs.every(api => apis[api]);

    return {
      apis,
      coreAvailable,
      extensionAvailable,
      aiAvailable,
      allAIAvailable,
      isExtensionContext: coreAvailable && extensionAvailable,
      summary: this.generateAPIStatusSummary(coreAvailable, extensionAvailable, aiAvailable, allAIAvailable)
    };
  }

  /**
   * Generate API status summary
   */
  generateAPIStatusSummary(coreAvailable, extensionAvailable, aiAvailable, allAIAvailable) {
    if (!coreAvailable) {
      return {
        level: 'error',
        message: 'Chrome Extension APIs unavailable',
        description: 'Extension is not running in Chrome extension context'
      };
    }

    if (!extensionAvailable) {
      return {
        level: 'error',
        message: 'Extension APIs missing',
        description: 'Some Chrome extension APIs are not available'
      };
    }

    if (!aiAvailable) {
      return {
        level: 'warning',
        message: 'Chrome AI unavailable',
        description: 'Chrome Built-in AI is not enabled or supported'
      };
    }

    if (!allAIAvailable) {
      return {
        level: 'warning',
        message: 'AI partially available',
        description: 'Some Chrome AI features are not available'
      };
    }

    return {
      level: 'ready',
      message: 'All APIs ready',
      description: 'Chrome extension and AI APIs are fully available'
    };
  }

  /**
   * Update status badge based on API availability
   */
  updateStatusForAPIAvailability(apiStatus) {
    const { summary } = apiStatus;

    // Update status badge
    this.uiManager.updateStatus(summary.level, summary.message);

    // Log detailed information
    console.log('🔍 Chrome API Availability Check:');
    console.log('📋 Summary:', summary);
    console.log('🔧 APIs:', apiStatus.apis);

    // Show detailed error if needed
    if (summary.level === 'error') {
      this.uiManager.showError(summary.description);
    } else if (summary.level === 'warning' && !apiStatus.aiAvailable) {
      // Show helpful guidance for AI setup
      this.showAISetupGuidance(summary.description);
    }

    // Store API status for later reference
    this.apiStatus = apiStatus;
  }

  /**
   * Show AI setup guidance
   */
  showAISetupGuidance(description) {
    const guidance = `
${description}

To enable Chrome AI:
1. Use Chrome Canary/Dev (121+)
2. Go to chrome://flags/
3. Enable "Prompt API for Gemini Nano"
4. Enable "Rewriter API for Gemini Nano"
5. Restart Chrome and wait for model download
    `.trim();

    console.warn('⚠️ AI Setup Required:', guidance);

    // Show a user-friendly message in the UI
    this.uiManager.showError('Chrome AI not available. Check console for setup instructions.');
  }

  /**
   * Get panel status for debugging
   */
  getStatus() {
    return {
      stateManager: Boolean(this.stateManager),
      uiManager: Boolean(this.uiManager),
      messageHandler: Boolean(this.messageHandler),
      settingsManager: Boolean(this.settingsManager),
      aiServicesManager: Boolean(this.aiServicesManager),
      storage: Boolean(this.storage),
      apiStatus: this.apiStatus,
      managersReady: Boolean(
        this.stateManager &&
        this.uiManager &&
        this.messageHandler &&
        this.settingsManager &&
        this.aiServicesManager
      )
    };
  }
}

// Initialize panel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Verify all required modules are available
    const requiredModules = [
      'TonePilotStateManager',
      'TonePilotUIManager',
      'TonePilotMessageHandler',
      'TonePilotSettingsManager',
      'TonePilotAIServicesManager',
      'TONEPILOT_CONSTANTS'
    ];

    const missingModules = requiredModules.filter(module => !window[module]);

    if (missingModules.length > 0) {
      console.error('❌ Missing required modules:', missingModules);
      throw new Error(`Required modules not loaded: ${missingModules.join(', ')}`);
    }

    // Initialize panel
    window.tonePilotPanel = new TonePilotPanel();
    console.log('✅ TonePilot Panel created successfully');

  } catch (error) {
    console.error('💥 Panel initialization failed:', error);

    // Show error in DOM if possible
    const errorElement = document.getElementById('error');
    if (errorElement) {
      errorElement.textContent = `Initialization failed: ${error.message}`;
      errorElement.style.display = 'block';
    }
  }
});

// Export for window access
if (typeof window !== 'undefined') {
  window.TonePilotPanel = TonePilotPanel;
}