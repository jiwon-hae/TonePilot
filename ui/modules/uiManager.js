/**
 * TonePilot UI Manager
 * Handles DOM manipulation, events, and UI state
 */

class TonePilotUIManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.elements = {};
    this.eventListeners = [];
    this.conversationHistory = [];
    this.previousResult = null;
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
          console.log(`✅ Binding ${element} button event`);
          this.elements[element].addEventListener('click', handler);
          this.eventListeners.push({ element: this.elements[element], event: 'click', handler });
        } else {
          console.warn(`❌ Button element ${element} not found`);
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
   * Show loading state (for capture and other non-text-processing operations)
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
   * Create new conversation container and prepare for processing
   * @param {string} inputText - Original input text
   * @returns {Object} Reference to the new conversation container elements
   */
  createNewConversation(inputText) {
    console.log('🎯 createNewConversation called with:', inputText);

    // Ensure inputText is a string
    const safeInputText = String(inputText || '').trim();

    if (!safeInputText) {
      console.warn('createNewConversation called with empty or invalid inputText');
      // Return a minimal container to prevent null errors
      return {
        container: null,
        queryDisplay: null,
        resultSection: null,
        resultContent: { textContent: '' }
      };
    }

    // Hide the default result section since we're using dynamic containers now
    if (this.elements.resultSection) {
      this.elements.resultSection.style.display = 'none';
    }
    if (this.elements.queryDisplay) {
      this.elements.queryDisplay.style.display = 'none';
    }

    // Create new container with query and tabs at the bottom
    const newContainer = this.createConversationContainer(safeInputText);
    console.log('📦 createConversationContainer returned:', newContainer);

    // Animate to show the new container with smooth transitions
    console.log('🎬 About to call animateToNewContainer');
    this.animateToNewContainer(newContainer);

    return newContainer;
  }

  /**
   * Create a new conversation container with query and result structure
   * @param {string} inputText - User's input text
   * @returns {Object} Container elements
   */
  createConversationContainer(inputText) {
    // Create main container
    const containerDiv = document.createElement('div');
    containerDiv.className = 'conversation-container';
    containerDiv.style.marginBottom = '24px';

    // Create query display
    const queryDisplay = document.createElement('div');
    queryDisplay.className = 'query-display';
    queryDisplay.style.display = 'block';
    queryDisplay.innerHTML = `<div class="query-text">${inputText?.trim() || ''}</div>`;

    // Create result section with tabs
    const resultSection = document.createElement('div');
    resultSection.className = 'result-section visible';
    resultSection.style.display = 'block';
    resultSection.innerHTML = `
      <div class="result-tabs">
        <button class="result-tab active" data-tab="primary">Primary</button>
        <button class="result-tab" data-tab="alt1">Alternative 1</button>
        <button class="result-tab" data-tab="alt2">Alternative 2</button>
      </div>
      <div class="result-content"></div>
      <div class="result-actions">
        <button class="btn btn-secondary">
          <img src="../icons/copy.png" alt="Copy" style="width:10px; height:10px;" />
        </button>
      </div>
    `;

    // Get the result content element for loading animation
    const resultContent = resultSection.querySelector('.result-content');

    // Assemble container
    containerDiv.appendChild(queryDisplay);
    containerDiv.appendChild(resultSection);

    // Append at the bottom of main content (newest conversations at bottom)
    const mainContent = document.querySelector('.main-content');
    mainContent.appendChild(containerDiv);

    // Start loading animation in this new container
    this.startLoadingInContainer(resultContent);

    return {
      container: containerDiv,
      queryDisplay,
      resultSection,
      resultContent
    };
  }

  /**
   * Start loading animation in a specific container
   * @param {HTMLElement} contentElement - The content element to show loading in
   */
  startLoadingInContainer(contentElement) {
    const loadingMessages = [
      '* Chroming it…',
      '* Nano-boosting…',
      '* Re-writing reality…',
      '* Polishing drafts…',
      '* Re-thinking words…',
      '* Dialing the tone…',
      '* Crafting magic…',
      '* Brewing brilliance…',
      '* Shaping thoughts…'
    ];

    let messageIndex = 0;

    // Set initial message
    contentElement.innerHTML = `<div class="loading-message">${loadingMessages[0]}</div>`;

    // Start cycling through messages
    this.loadingInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      const messageElement = contentElement.querySelector('.loading-message');
      if (messageElement) {
        messageElement.textContent = loadingMessages[messageIndex];
      }
    }, 1500);
  }


  /**
   * Stop loading animation
   */
  stopLoadingAnimation() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
  }

  /**
   * Show results in the specific conversation container
   * @param {Object} results - Results object
   * @param {Object} conversationContainer - The container to update with results
   */
  showResults(results, conversationContainer) {
    // Stop the loading animation
    this.stopLoadingAnimation();

    // Update the result content in the specific container
    if (conversationContainer && conversationContainer.resultContent) {
      conversationContainer.resultContent.textContent = results.primary;
    } else {
      console.warn('showResults called with invalid conversationContainer');
    }
  }

  /**
   * Scroll to show the new container at the top of the visible area
   * Hide all previous conversations outside the visible area
   * @param {Object} newContainer - The newly created conversation container
   */
  animateToNewContainer(newContainer) {
    console.log('animateToNewContainer called', newContainer);

    const scroller = document.querySelector('.main-content');
    if (!scroller || !newContainer || !newContainer.container) {
      console.error('Invalid scroller or container:', { scroller, newContainer });
      return;
    }

    const newEl = newContainer.container;

    // 1. Mark existing conversation containers as moving up
    const existingContainers = scroller.querySelectorAll('.conversation-container:not(:last-child)');
    existingContainers.forEach(container => {
      container.classList.add('moving-up');
    });

    // 2. Add entering animation to new container
    newEl.classList.add('entering');

    // 3. Wait for DOM layout then scroll to position new content at top
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newElPosition = newEl.offsetTop;
        const target = newElPosition;
        const max = scroller.scrollHeight - scroller.clientHeight;
        const clampedTarget = Math.max(0, Math.min(target, max));

        console.log('🔍 Detailed scroll debug:', {
          newElPosition,
          target,
          max,
          clampedTarget,
          currentScrollTop: scroller.scrollTop,
          scrollHeight: scroller.scrollHeight,
          clientHeight: scroller.clientHeight,
          isScrollable: scroller.scrollHeight > scroller.clientHeight,
          scrollDifference: clampedTarget - scroller.scrollTop
        });

        // Only scroll if there's a meaningful difference
        if (Math.abs(clampedTarget - scroller.scrollTop) > 5) {
          console.log('📍 Scrolling from', scroller.scrollTop, 'to', clampedTarget);

          // Smooth scroll with natural timing
          scroller.scrollTo({
            top: clampedTarget,
            behavior: 'smooth'
          });

          // Verify scroll actually happened
          setTimeout(() => {
            console.log('📍 Final scroll position:', scroller.scrollTop, '(target was', clampedTarget, ')');
          }, 600);
        } else {
          console.log('⚠️ No scroll needed - target too close to current position');
        }

        // Clean up animation classes after transition
        setTimeout(() => {
          newEl.classList.remove('entering');
          existingContainers.forEach(container => {
            container.classList.remove('moving-up');
          });
        }, 400);
      });
    });
  }

  /**
   * Move previous result to conversation history
   * @param {Object} previousResult - Previous query and result
   */
  movePreviousToHistory(previousResult) {
    if (previousResult.query && previousResult.result) {
      // Create a new history entry using existing styling
      const historyEntry = document.createElement('div');
      historyEntry.style.marginBottom = '24px';

      // Query display (same as existing query-display)
      const queryDisplay = document.createElement('div');
      queryDisplay.className = 'query-display';
      queryDisplay.style.display = 'block';
      queryDisplay.innerHTML = `<div class="query-text">${previousResult.query}</div>`;

      // Result section (same as existing result-section)
      const resultSection = document.createElement('div');
      resultSection.className = 'result-section visible';
      resultSection.style.display = 'block';
      resultSection.innerHTML = `
        <div class="result-tabs">
          <button class="result-tab active" data-tab="primary">Primary</button>
          <button class="result-tab" data-tab="alt1">Alternative 1</button>
          <button class="result-tab" data-tab="alt2">Alternative 2</button>
        </div>
        <div class="result-content">${previousResult.result}</div>
        <div class="result-actions">
          <button class="btn btn-secondary">
            <img src="../icons/copy.png" alt="Copy" style="width:10px; height:10px;" />
          </button>
        </div>
      `;

      historyEntry.appendChild(queryDisplay);
      historyEntry.appendChild(resultSection);

      // Insert into main content (before the current result section)
      const mainContent = document.querySelector('.main-content');
      const currentResultSection = document.getElementById('resultSection');
      mainContent.insertBefore(historyEntry, currentResultSection);
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
    // Stop any ongoing loading animation
    this.stopLoadingAnimation();

    if (this.elements.resultSection) {
      this.elements.resultSection.classList.remove('visible');
      this.elements.resultSection.style.display = 'none';
    }

    // Also hide the query display
    if (this.elements.queryDisplay) {
      this.elements.queryDisplay.style.display = 'none';
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
  handleSubmit() { console.log('🔴 WRONG handleSubmit called - this is the uiManager stub, not panel.js'); }
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