/**
 * TonePilot Conversation Item Manager
 * Handles individual conversation containers and their actions
 */

class TonePilotConversationItemManager {
  constructor() {
    this.activeItems = new Map(); // Track active conversation items
  }

  /**
   * Create a new conversation item with all functionality
   * @param {string} inputText - User's input text
   * @returns {Object} Conversation item container and elements
   */
  createConversationItem(inputText) {
    const safeInputText = String(inputText || '').trim();

    // Create main container
    const containerDiv = document.createElement('div');
    containerDiv.className = 'conversation-container conversation-container-loading';
    containerDiv.setAttribute('data-conversation-id', this.generateId());

    // Create query display
    const queryDisplay = this.createQueryDisplay(safeInputText);

    // Create result section with tabs and actions
    const resultSection = this.createResultSection();

    // Assemble container
    containerDiv.appendChild(queryDisplay);
    containerDiv.appendChild(resultSection);

    // Get references to key elements (new tab structure)
    const primaryContent = resultSection.querySelector('#primary-content');
    const alt1Content = resultSection.querySelector('#alt1-content');
    const alt2Content = resultSection.querySelector('#alt2-content');

    // Add event listeners for this item
    this.bindItemEvents(containerDiv);

    // Store item reference (new tab structure)
    const itemData = {
      container: containerDiv,
      queryDisplay,
      resultSection,
      primaryContent,
      alt1Content,
      alt2Content,
      inputText: safeInputText,
      results: {
        primary: null,
        alt1: null,
        alt2: null
      }
    };

    const itemId = containerDiv.getAttribute('data-conversation-id');
    this.activeItems.set(itemId, itemData);

    return itemData;
  }

  /**
   * Create query display element
   * @param {string} inputText - User's input text
   * @returns {HTMLElement} Query display element
   */
  createQueryDisplay(inputText) {
    const queryDisplay = document.createElement('div');
    queryDisplay.className = 'query-display';
    queryDisplay.style.display = 'block';
    queryDisplay.innerHTML = `<div class="query-text">${inputText}</div>`;
    return queryDisplay;
  }

  /**
   * Create result section with tabs, loading area, content, and actions
   * @returns {HTMLElement} Result section element
   */
  createResultSection() {
    const resultSection = document.createElement('div');
    resultSection.className = 'result-section visible';
    resultSection.style.display = 'block';
    resultSection.innerHTML = `
      <div class="result-tabs">
        <button class="result-tab active" data-tab="primary">Assistant</button>
        <button class="result-tab" data-tab="alt1" style="display: none;">
            <img src="../icons/branch.png" alt="Branch" style="width:10px; height:10px;" />
            <span>Steps</span>
        </button>
        <button class="result-tab" data-tab="alt2" style="display: none;">Alternative 2</button>
      </div>
      <div id="primary-content" class="tab-content">
        <div class="loading-message">* Chroming it…</div>
        <div class="result-actions" style="display: none;">
          <button class="btn btn-secondary copy-btn" title="Copy to clipboard">
            <img src="../icons/copy.png" alt="Copy" width="12" height="12" />
          </button>
        </div>
      </div>
      <div id="alt1-content" class="tab-content" style="display: none;"></div>
      <div id="alt2-content" class="tab-content" style="display: none;"></div>
    `;
    return resultSection;
  }

  /**
   * Bind all event listeners for a conversation item
   * @param {HTMLElement} containerDiv - The conversation container
   */
  bindItemEvents(containerDiv) {
    // Copy button
    const copyButton = containerDiv.querySelector('.copy-btn');
    if (copyButton) {
      copyButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleCopy(containerDiv);
      });
    }

    // Tab switching is handled by global event delegation in panel.js
    // No need to bind individual tab click listeners here
  }

  /**
   * Handle copy action for a specific conversation item
   * @param {HTMLElement} containerDiv - The conversation container
   */
  handleCopy(containerDiv) {
    try {
      // Find the currently active tab content
      const activeTab = containerDiv.querySelector('.result-tab.active');
      const activeTabType = activeTab ? activeTab.getAttribute('data-tab') : 'primary';
      const resultContent = containerDiv.querySelector(`#${activeTabType}-content`);

      if (!resultContent) {
        console.warn('No result content found in active tab');
        return;
      }

      // Get the text content
      const textToCopy = resultContent.textContent || resultContent.innerText || '';

      if (!textToCopy.trim()) {
        console.warn('No content to copy');
        return;
      }

      // Copy to clipboard using the Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          console.log('✅ Content copied to clipboard successfully');
          this.showCopyFeedback(containerDiv);
        }).catch(err => {
          console.error('Failed to copy to clipboard:', err);
          this.fallbackCopyToClipboard(textToCopy, containerDiv);
        });
      } else {
        // Fallback for older browsers
        this.fallbackCopyToClipboard(textToCopy, containerDiv);
      }
    } catch (error) {
      console.error('Error in handleCopy:', error);
    }
  }

  /**
   * Fallback copy method for older browsers
   * @param {string} text - Text to copy
   * @param {HTMLElement} containerDiv - The conversation container
   */
  fallbackCopyToClipboard(text, containerDiv) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        console.log('✅ Content copied to clipboard using fallback method');
        this.showCopyFeedback(containerDiv);
      } else {
        console.error('❌ Failed to copy content using fallback method');
      }
    } catch (err) {
      console.error('❌ Fallback copy failed:', err);
    }
  }

  /**
   * Show brief visual feedback when content is copied
   * @param {HTMLElement} containerDiv - The conversation container
   */
  showCopyFeedback(containerDiv) {
    const copyButton = containerDiv.querySelector('.copy-btn');
    if (copyButton) {
      const originalContent = copyButton.innerHTML;
      copyButton.innerHTML = '<img src="../icons/check.png" alt="Copied" style="width:12px; height:12px;" />';

      setTimeout(() => {
        copyButton.innerHTML = originalContent;
      }, 1500);
    }
  }

  /**
   * Update conversation item with generated results
   * @param {Object} itemData - Conversation item data
   * @param {Object} results - Generated results
   */
  updateWithResults(itemData, results) {
    if (!itemData || !results) return;

    const { container, primaryContent, alt1Content, alt2Content, resultSection } = itemData;

    // Remove loading message and show result content in primary tab
    if (primaryContent) {
      const loadingMessage = primaryContent.querySelector('.loading-message');
      if (loadingMessage) {
        loadingMessage.style.display = 'none';
      }

      // Add result content to primary tab
      let resultDiv = primaryContent.querySelector('.result-content');
      if (!resultDiv) {
        resultDiv = document.createElement('div');
        resultDiv.className = 'result-content';
        primaryContent.insertBefore(resultDiv, primaryContent.querySelector('.result-actions'));
      }

      resultDiv.textContent = results.primary || '';
      resultDiv.style.display = 'block';
      resultDiv.style.height = 'auto';
      resultDiv.style.minHeight = 'auto';
      resultDiv.style.flex = 'none';
      resultDiv.style.position = 'relative';
      resultDiv.style.top = '0';
    }

    // Populate alternative tabs with their content
    if (results.alt1 && alt1Content) {
      alt1Content.innerHTML = `<div class="result-content">${results.alt1}</div>`;
    }

    if (results.alt2 && alt2Content) {
      alt2Content.innerHTML = `<div class="result-content">${results.alt2}</div>`;
    }

    // Show alternative tabs if they have content
    if (results.alt1) {
      const alt1Tab = resultSection.querySelector('[data-tab="alt1"]');
      if (alt1Tab) alt1Tab.style.display = 'block';
    }

    if (results.alt2) {
      const alt2Tab = resultSection.querySelector('[data-tab="alt2"]');
      if (alt2Tab) alt2Tab.style.display = 'block';
    }

    // Show result actions
    const resultActions = resultSection.querySelector('.result-actions');
    if (resultActions) {
      resultActions.style.display = 'flex';
    }

    // Switch container from loading to content mode
    container.classList.remove('conversation-container-loading');
    container.classList.add('conversation-container-content');

    // Override flexbox layout to prevent upward growth
    resultSection.style.flex = 'none';
    resultSection.style.display = 'block';

    console.log('✅ Conversation item updated with results');
  }

  /**
   * Remove a conversation item
   * @param {string} itemId - Conversation item ID
   */
  removeItem(itemId) {
    const itemData = this.activeItems.get(itemId);
    if (itemData && itemData.container) {
      itemData.container.remove();
      this.activeItems.delete(itemId);
      console.log(`Removed conversation item: ${itemId}`);
    }
  }

  /**
   * Clear all conversation items
   */
  clearAllItems() {
    this.activeItems.forEach((itemData, itemId) => {
      if (itemData.container) {
        itemData.container.remove();
      }
    });
    this.activeItems.clear();
    console.log('Cleared all conversation items');
  }

  /**
   * Generate unique ID for conversation items
   * @returns {string} Unique ID
   */
  generateId() {
    return `conversation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get conversation item data by ID
   * @param {string} itemId - Conversation item ID
   * @returns {Object|null} Item data or null
   */
  getItem(itemId) {
    return this.activeItems.get(itemId) || null;
  }

  /**
   * Get all active conversation items
   * @returns {Map} Map of all active items
   */
  getAllItems() {
    return this.activeItems;
  }
}

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.TonePilotConversationItemManager = TonePilotConversationItemManager;
  console.log('✅ TonePilotConversationItemManager exported to window');
}