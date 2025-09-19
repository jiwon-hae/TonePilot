/**
 * TonePilot Background Service Worker
 * Handles context menus, message routing, and side panel management
 *
 * @fileoverview Background script for TonePilot Chrome extension
 */

/**
 * Background script constants
 * @const {Object}
 */
const BACKGROUND_CONSTANTS = {
  CONTEXT_MENU_ID: 'tonepilot-rewrite',
  CONTEXT_MENU_TITLE: 'TonePilot: Rewrite...',

  MESSAGE_ACTIONS: {
    OPEN_SIDE_PANEL: 'openSidePanel',
    GET_SELECTION: 'getSelection',
    SELECTION_DATA: 'selectionData',
    NEW_SELECTION: 'newSelection',
    SCREEN_AREA_SELECTED: 'screenAreaSelected',
    CLEAR_SELECTION: 'clearSelection',
    REPLACE_TEXT: 'replaceText'
  },

  ERROR_MESSAGES: {
    SIDE_PANEL_FAILED: 'Failed to open side panel',
    MESSAGE_SEND_FAILED: 'Failed to send message',
    CONTEXT_MENU_FAILED: 'Failed to create context menu'
  }
};

/**
 * Initialize extension on install
 * Sets up context menus and other startup tasks
 */
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await _createContextMenu();
    console.log('TonePilot extension initialized successfully');
  } catch (error) {
    console.error('Extension initialization failed:', error);
  }
});

/**
 * Create the context menu for text rewriting
 * @private
 * @throws {Error} If context menu creation fails
 */
async function _createContextMenu() {
  try {
    await chrome.contextMenus.create({
      id: BACKGROUND_CONSTANTS.CONTEXT_MENU_ID,
      title: BACKGROUND_CONSTANTS.CONTEXT_MENU_TITLE,
      contexts: ['selection']
    });
  } catch (error) {
    console.error(BACKGROUND_CONSTANTS.ERROR_MESSAGES.CONTEXT_MENU_FAILED, error);
    throw error;
  }
}

/**
 * Handle context menu clicks
 * Opens side panel and requests text selection
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === BACKGROUND_CONSTANTS.CONTEXT_MENU_ID) {
    try {
      await _handleRewriteRequest(tab);
    } catch (error) {
      console.error('Context menu action failed:', error);
    }
  }
});

/**
 * Handle rewrite request from context menu
 * @private
 * @param {Object} tab - Chrome tab object
 * @throws {Error} If side panel or message sending fails
 */
async function _handleRewriteRequest(tab) {
  if (!tab || !tab.id) {
    throw new Error('Invalid tab information');
  }

  try {
    // Open side panel first
    await chrome.sidePanel.open({ tabId: tab.id });

    // Small delay to ensure panel is ready
    setTimeout(() => {
      _sendMessageToTab(tab.id, {
        action: BACKGROUND_CONSTANTS.MESSAGE_ACTIONS.GET_SELECTION
      });
    }, 100);
  } catch (error) {
    console.error(BACKGROUND_CONSTANTS.ERROR_MESSAGES.SIDE_PANEL_FAILED, error);
    throw error;
  }
}

/**
 * Handle runtime messages between extension components
 * Routes messages between content scripts and side panel
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    _handleRuntimeMessage(message, sender, sendResponse);
  } catch (error) {
    console.error('Message handling failed:', error);
    sendResponse({ error: error.message });
  }

  // Keep message channel open for async responses
  return true;
});

/**
 * Process different types of runtime messages
 * @private
 * @param {Object} message - Message object
 * @param {Object} sender - Message sender information
 * @param {Function} sendResponse - Response callback
 */
function _handleRuntimeMessage(message, sender, sendResponse) {
  if (!message || !message.action) {
    throw new Error('Invalid message format');
  }

  const { action, data } = message;
  const { MESSAGE_ACTIONS } = BACKGROUND_CONSTANTS;

  switch (action) {
    case MESSAGE_ACTIONS.OPEN_SIDE_PANEL:
      _handleOpenSidePanel(sender, sendResponse);
      break;

    case MESSAGE_ACTIONS.SELECTION_DATA:
      _handleSelectionData(data);
      sendResponse({ success: true });
      break;

    case MESSAGE_ACTIONS.SCREEN_AREA_SELECTED:
      _handleScreenAreaSelected(data);
      sendResponse({ success: true });
      break;

    case MESSAGE_ACTIONS.CLEAR_SELECTION:
      _handleClearSelection();
      sendResponse({ success: true });
      break;

    case MESSAGE_ACTIONS.REPLACE_TEXT:
      _handleReplaceText(data, sender, sendResponse);
      break;

    default:
      console.warn('Unknown message action:', action);
      sendResponse({ error: 'Unknown action' });
  }
}

/**
 * Handle side panel open request
 * @private
 * @param {Object} sender - Message sender
 * @param {Function} sendResponse - Response callback
 */
async function _handleOpenSidePanel(sender, sendResponse) {
  try {
    if (!sender.tab || !sender.tab.id) {
      throw new Error('Invalid sender tab');
    }

    await chrome.sidePanel.open({ tabId: sender.tab.id });
    sendResponse({ success: true });
  } catch (error) {
    console.error(BACKGROUND_CONSTANTS.ERROR_MESSAGES.SIDE_PANEL_FAILED, error);
    sendResponse({ error: error.message });
  }
}

/**
 * Handle selection data forwarding
 * @private
 * @param {Object} data - Selection data
 */
function _handleSelectionData(data) {
  console.log('Background received selection data:', data);

  _forwardMessageToPanel({
    action: BACKGROUND_CONSTANTS.MESSAGE_ACTIONS.NEW_SELECTION,
    data
  });
}

/**
 * Handle screen area selection forwarding
 * @private
 * @param {Object} data - Screen area data
 */
function _handleScreenAreaSelected(data) {
  _forwardMessageToPanel({
    action: BACKGROUND_CONSTANTS.MESSAGE_ACTIONS.SCREEN_AREA_SELECTED,
    data
  });
}

/**
 * Handle clear selection forwarding
 * @private
 */
function _handleClearSelection() {
  console.log('Background received clear selection request');

  _forwardMessageToPanel({
    action: BACKGROUND_CONSTANTS.MESSAGE_ACTIONS.CLEAR_SELECTION
  });
}

/**
 * Handle text replacement request
 * @private
 * @param {Object} data - Replacement data
 * @param {Object} sender - Message sender
 * @param {Function} sendResponse - Response callback
 */
function _handleReplaceText(data, sender, sendResponse) {
  if (!data || !data.newText) {
    sendResponse({ error: 'Invalid replacement data' });
    return;
  }

  if (!sender.tab || !sender.tab.id) {
    sendResponse({ error: 'Invalid sender tab' });
    return;
  }

  _sendMessageToTab(sender.tab.id, {
    action: BACKGROUND_CONSTANTS.MESSAGE_ACTIONS.REPLACE_TEXT,
    data
  }).then(() => {
    sendResponse({ success: true });
  }).catch(error => {
    sendResponse({ error: error.message });
  });
}

/**
 * Handle extension icon clicks
 * Opens the side panel for manual access
 */
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await _openSidePanel(tab.id);
  } catch (error) {
    console.error('Extension icon click failed:', error);
  }
});

/**
 * Utility function to open side panel
 * @private
 * @param {number} tabId - Tab ID to open panel for
 * @throws {Error} If side panel opening fails
 */
async function _openSidePanel(tabId) {
  if (!tabId || typeof tabId !== 'number') {
    throw new Error('Invalid tab ID');
  }

  try {
    await chrome.sidePanel.open({ tabId });
  } catch (error) {
    console.error(BACKGROUND_CONSTANTS.ERROR_MESSAGES.SIDE_PANEL_FAILED, error);
    throw error;
  }
}

/**
 * Forward message to side panel
 * @private
 * @param {Object} message - Message to forward
 */
function _forwardMessageToPanel(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Panel might not be open, which is acceptable
    console.log('No panel listening for message:', message.action);
  });
}

/**
 * Send message to specific tab
 * @private
 * @param {number} tabId - Tab ID to send message to
 * @param {Object} message - Message to send
 * @returns {Promise} Message sending promise
 */
async function _sendMessageToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.error(BACKGROUND_CONSTANTS.ERROR_MESSAGES.MESSAGE_SEND_FAILED, error);
    throw error;
  }
}