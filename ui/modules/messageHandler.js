/**
 * TonePilot Message Handler
 * Handles Chrome extension messaging between components
 */

class TonePilotMessageHandler {
  constructor(stateManager, uiManager) {
    this.stateManager = stateManager;
    this.uiManager = uiManager;
    this.messageListeners = [];
  }

  /**
   * Initialize message handling
   */
  initialize() {
    try {
      this.setupMessageListener();
      console.log('✅ Message handler initialized');
    } catch (error) {
      console.error('❌ Message handler initialization failed:', error);
    }
  }

  /**
   * Setup Chrome extension message listener
   */
  setupMessageListener() {
    const messageHandler = (message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    };

    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(messageHandler);
      this.messageListeners.push(messageHandler);
      console.log('✅ Chrome runtime message listener added');
    } else {
      console.warn('⚠️ Chrome runtime messaging not available');
    }
  }

  /**
   * Handle incoming messages
   * @param {Object} message - Message object
   * @param {Object} sender - Message sender
   * @param {Function} sendResponse - Response function
   */
  handleMessage(message, sender, sendResponse) {
    console.log('📨 Received message:', message);

    try {
      // Handle both old format (action) and new format (type)
      const messageType = message.type || message.action;

      switch (messageType) {
        case 'TEXT_SELECTED':
        case 'newSelection':
          this.handleTextSelected(message.data);
          break;

        case 'TEXT_REPLACED':
          this.handleTextReplaced(message.data);
          break;

        case 'SELECTION_CLEARED':
        case 'clearSelection':
          this.handleSelectionCleared();
          break;

        case 'CAPTURE_COMPLETE':
        case 'screenAreaSelected':
          this.handleCaptureComplete(message.data);
          break;

        case 'CAPTURE_ERROR':
          this.handleCaptureError(message.data);
          break;

        case 'WEBSITE_INFO':
          this.handleWebsiteInfo(message.data);
          break;

        default:
          console.warn('⚠️ Unknown message type:', messageType);
      }

      // Send acknowledgment
      if (sendResponse) {
        sendResponse({ success: true });
      }

    } catch (error) {
      console.error('❌ Message handling error:', error);
      if (sendResponse) {
        sendResponse({ success: false, error: error.message });
      }
    }
  }

  /**
   * Handle text selection message
   * @param {Object} data - Selection data
   */
  handleTextSelected(data) {
    console.log('📝 Text selected:', data);

    // Update state
    this.stateManager.setState('currentSelection', data);

    // Update UI
    this.uiManager.updateSelectionDisplay(data);
    this.uiManager.hideError();

    // Show website info if available
    if (data.websiteInfo) {
      this.handleWebsiteInfo(data.websiteInfo);
    }
  }

  /**
   * Handle text replacement completion
   * @param {Object} data - Replacement data
   */
  handleTextReplaced(data) {
    console.log('✅ Text replaced successfully:', data);
    this.uiManager.updateStatus('ready', 'Text Replaced');

    // Clear selection after replacement
    setTimeout(() => {
      this.handleSelectionCleared();
    }, 2000);
  }

  /**
   * Handle selection cleared
   */
  handleSelectionCleared() {
    console.log('🧹 Selection cleared');

    // Update state
    this.stateManager.setState('currentSelection', null);

    // Update UI
    this.uiManager.clearSelectionDisplay();
    this.uiManager.updateStatus('ready', 'Ready');
  }

  /**
   * Handle screen capture completion
   * @param {Object} data - Capture data
   */
  handleCaptureComplete(data) {
    console.log('📸 Capture completed:', data);

    // Update state
    this.stateManager.setState('capturedImageData', data);

    // Update UI
    this.uiManager.updateStatus('ready', 'Capture Ready');
    this.uiManager.hideLoading();
  }

  /**
   * Handle screen capture error
   * @param {Object} data - Error data
   */
  handleCaptureError(data) {
    console.error('❌ Capture error:', data);

    // Update UI
    this.uiManager.showError(`Capture failed: ${data.error}`);
    this.uiManager.hideLoading();
    this.uiManager.updateStatus('error', 'Capture Failed');
  }

  /**
   * Handle website information
   * @param {Object} data - Website data
   */
  handleWebsiteInfo(data) {
    console.log('🌐 Website info:', data);

    // Update UI with website information
    if (this.uiManager.elements.websiteName) {
      this.uiManager.elements.websiteName.textContent = data.name || 'Unknown';
    }

    if (this.uiManager.elements.websiteUrl) {
      this.uiManager.elements.websiteUrl.textContent = data.url || '';
    }

    if (this.uiManager.elements.websiteInfo) {
      this.uiManager.elements.websiteInfo.style.display = 'block';
    }
  }

  /**
   * Send message to content script
   * @param {string} type - Message type
   * @param {Object} data - Message data
   * @returns {Promise} Message response
   */
  async sendToContentScript(action, data = {}) {
    try {
      // For simple actions without data, send just the action
      const message = Object.keys(data).length === 0 ? { action } : { action, ...data };

      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, message);
      console.log('📤 Message sent to content script:', message);
      console.log('📨 Response from content script:', response);
      return response;

    } catch (error) {
      console.error('❌ Failed to send message to content script:', error);
      throw error;
    }
  }

  /**
   * Send text replacement request
   * @param {string} newText - Text to replace with
   * @returns {Promise} Replacement response
   */
  async replaceText(newText) {
    const selectionState = this.stateManager.getSelectionState();

    if (!selectionState.hasSelection) {
      throw new Error('No text selected for replacement');
    }

    // Send directly to content script with newText
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return chrome.tabs.sendMessage(tab.id, { action: 'replaceSelection', newText });
  }

  /**
   * Request screen capture
   * @returns {Promise} Capture response
   */
  async requestCapture() {
    this.uiManager.showLoading();
    this.uiManager.updateStatus('loading', 'Starting Capture...');

    return this.sendToContentScript('startScreenAreaSelection');
  }

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise} Copy response
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.uiManager.updateStatus('ready', 'Copied!');
      console.log('📋 Text copied to clipboard');

      // Reset status after delay
      setTimeout(() => {
        this.uiManager.updateStatus('ready', 'Ready');
      }, 2000);

      return true;

    } catch (error) {
      console.error('❌ Clipboard copy failed:', error);
      this.uiManager.showError('Copy failed');
      throw error;
    }
  }

  /**
   * Clean up message listeners
   */
  cleanup() {
    this.messageListeners.forEach(listener => {
      if (chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(listener);
      }
    });
    this.messageListeners = [];
    console.log('🧹 Message handler cleaned up');
  }

  /**
   * Get message handler status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      listenersCount: this.messageListeners.length,
      chromeRuntimeAvailable: Boolean(chrome?.runtime?.onMessage),
      tabsApiAvailable: Boolean(chrome?.tabs?.sendMessage)
    };
  }
}

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.TonePilotMessageHandler = TonePilotMessageHandler;
  console.log('✅ TonePilotMessageHandler exported to window');
}