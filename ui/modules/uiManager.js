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
        { element: 'submitBtn', handler: async () => await this.handleSubmit() },
        { element: 'mediaBtn', handler: () => this.handleOpenMedia() }
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

      // Media popup events
      if (this.elements.closeMediaBtn) {
        const closeHandler = () => this.handleCloseMedia();
        this.elements.closeMediaBtn.addEventListener('click', closeHandler);
        this.eventListeners.push({ element: this.elements.closeMediaBtn, event: 'click', handler: closeHandler });
      }

      // Tab navigation
      this.bindTabEvents();

      // Input textarea keyboard events
      if (this.elements.inputText) {
        const keydownHandler = (e) => this.handleInputKeydown(e);
        this.elements.inputText.addEventListener('keydown', keydownHandler);
        this.eventListeners.push({ element: this.elements.inputText, event: 'keydown', handler: keydownHandler });
      }

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

    // Resize all existing conversations to content size before creating new one
    this.resizePreviousConversationsToContent();

    // Create new container with query and tabs at the bottom
    const newContainer = this.createConversationContainer(safeInputText);
    console.log('📦 createConversationContainer returned:', newContainer);

    // Animate to show the new container with smooth transitions
    console.log('🎬 About to call animateToNewContainer');
    this.animateToNewContainer(newContainer);

    return newContainer;
  }

  /**
   * Resize all previous conversation containers to content size
   * This is called when creating a new conversation to wrap previous ones
   */
  resizePreviousConversationsToContent() {
    const mainContent = document.querySelector('.main-content');
    const existingContainers = mainContent.querySelectorAll('.conversation-container');

    existingContainers.forEach(container => {
      // Switch to content-sized mode
      container.classList.remove('conversation-container-loading');
      container.classList.add('conversation-container-content');
      // Remove fixed height from container
      container.style.height = 'auto';
      container.style.minHeight = 'auto';

      // Also reset result content height and flex behavior to auto
      const resultContent = container.querySelector('.result-content');
      if (resultContent) {
        resultContent.style.height = 'auto';
        resultContent.style.minHeight = 'auto';
        resultContent.style.flex = ''; // Reset to CSS default
      }
    });

    console.log(`🔄 Resized ${existingContainers.length} previous conversations to content size`);

    // Add filler space if needed after resizing
    this.addFillerSpaceIfNeeded();
  }

  /**
   * Create a new conversation container with query and result structure
   * @param {string} inputText - User's input text
   * @returns {Object} Container elements
   */
  createConversationContainer(inputText) {
    // Create main container (let it size naturally, we'll control the result content height)
    const containerDiv = document.createElement('div');
    containerDiv.className = 'conversation-container conversation-container-loading';
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
        <button class="result-tab" data-tab="alt1" style="display: none;">Alternative 1</button>
        <button class="result-tab" data-tab="alt2" style="display: none;">Alternative 2</button>
      </div>
      <div class="loading-area"></div>
      <div class="result-content" style="display: none;"></div>
      <div class="result-actions" style="display: none;">
        <button class="btn btn-secondary">
          <img src="../icons/copy.png" alt="Copy" style="width:10px; height:10px;" />
        </button>
      </div>
    `;

    // Get elements for loading animation and results
    const loadingArea = resultSection.querySelector('.loading-area');
    const resultContent = resultSection.querySelector('.result-content');

    // Assemble container
    containerDiv.appendChild(queryDisplay);
    containerDiv.appendChild(resultSection);

    // Append at the bottom of main content (newest conversations at bottom)
    const mainContent = document.querySelector('.main-content');
    mainContent.appendChild(containerDiv);

    // Calculate height for result content to fill remaining viewport space
    // This ensures query text and tabs are visible at the top when scrolled to this container
    requestAnimationFrame(() => {
      const header = document.querySelector('.header');
      const footer = document.querySelector('.footer');
      const headerHeight = header ? header.offsetHeight : 0;
      const footerHeight = footer ? footer.offsetHeight : 0;
      const viewportHeight = window.innerHeight;
      const availableHeight = viewportHeight - headerHeight - footerHeight;

      // Calculate proper height: available space minus actual fixed elements
      // This ensures total container height doesn't exceed available space

      // Get precise heights of all fixed elements including margins/padding
      const queryHeight = queryDisplay.offsetHeight;
      const queryStyle = window.getComputedStyle(queryDisplay);
      const queryMargins = parseFloat(queryStyle.marginTop) + parseFloat(queryStyle.marginBottom);

      // Get tab container height (Primary tab is visible during loading)
      const tabsElement = resultSection.querySelector('.result-tabs');
      const tabsHeight = tabsElement.offsetHeight || 40;
      const tabsStyle = window.getComputedStyle(tabsElement);
      const tabsMargins = parseFloat(tabsStyle.marginTop) + parseFloat(tabsStyle.marginBottom);

      // Container margins
      const containerStyle = window.getComputedStyle(containerDiv);
      const containerMargins = parseFloat(containerStyle.marginTop) + parseFloat(containerStyle.marginBottom);

      // Calculate height for loading area to fill remaining space
      // During loading: queryDisplay + result-tabs (with Primary) + loading-area are visible
      const loadingAreaTargetHeight = availableHeight - queryHeight - queryMargins - tabsHeight - tabsMargins - containerMargins;

      // Set height on the VISIBLE loading area (not hidden result-content)
      loadingArea.style.height = `${Math.max(100, loadingAreaTargetHeight)}px`;
      loadingArea.style.minHeight = `${Math.max(100, loadingAreaTargetHeight)}px`;
      // Ensure loading area is visible and properly styled
      loadingArea.style.display = 'block';
      loadingArea.style.visibility = 'visible';
      
      // Don't set height on result-content during loading since it's hidden
      resultContent.style.flex = 'none'; // Still override flex behavior

      console.log('📐 Loading height (Primary tab visible):', {
        viewportHeight,
        headerHeight,
        footerHeight,
        availableHeight,
        visibleElements: {
          queryHeight,
          queryMargins,
          tabsHeight,
          tabsMargins,
          containerMargins,
          note: 'Primary tab visible, alternatives hidden'
        },
        loadingAreaTargetHeight,
        expectedTotalHeight: queryHeight + queryMargins + tabsHeight + tabsMargins + loadingAreaTargetHeight + containerMargins,
        shouldEqual: availableHeight
      });
    });

    // Start loading animation in this new container
    console.log('🎬 Starting loading animation in:', loadingArea);
    this.startLoadingInContainer(loadingArea);

    return {
      container: containerDiv,
      queryDisplay,
      resultSection,
      loadingArea,
      resultContent
    };
  }

  /**
   * Start loading animation in a specific container
   * @param {HTMLElement} contentElement - The content element to show loading in
   */
  startLoadingInContainer(contentElement) {
    console.log('🎬 startLoadingInContainer called with:', contentElement);

    if (!contentElement) {
      console.error('❌ No contentElement provided to startLoadingInContainer');
      return;
    }

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
    console.log('🎬 Set initial loading message:', loadingMessages[0]);

    // Start cycling through messages
    this.loadingInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      const messageElement = contentElement.querySelector('.loading-message');
      if (messageElement) {
        // Update text content
        messageElement.textContent = loadingMessages[messageIndex];

        // Restart the animation by removing and re-adding the animation
        messageElement.style.animation = 'none';
        // Force a reflow to ensure the animation is removed
        messageElement.offsetHeight;
        // Re-apply the animation (1.5s to match message interval)
        messageElement.style.animation = 'fadeInOut 1.5s ease-in-out';

        console.log('🔄 Updated loading message with animation restart:', loadingMessages[messageIndex]);
      } else {
        console.warn('⚠️ Loading message element not found');
      }
    }, 1500);

    console.log('🎬 Loading animation interval started');
  }


  /**
   * Stop loading animation
   */
  stopLoadingAnimation() {
    console.log('🛑 stopLoadingAnimation called, interval exists:', !!this.loadingInterval);
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
      console.log('🛑 Loading animation stopped');
    } else {
      console.warn('⚠️ No loading interval to stop');
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

    // Keep the latest conversation at full height, only update the class for styling
    if (conversationContainer && conversationContainer.container) {
      conversationContainer.container.classList.remove('conversation-container-loading');
      conversationContainer.container.classList.add('conversation-container-content');
      // Keep the result content height as-is for the latest conversation (maintain calculated height)
      console.log('🎯 Latest conversation maintains calculated result content height after results loaded');
    }

    // Hide loading area and show results
    if (conversationContainer && conversationContainer.loadingArea) {
      conversationContainer.loadingArea.style.display = 'none';
    } else {
      console.warn('⚠️ loadingArea not found in conversationContainer:', conversationContainer);
    }

    // Show alternative tabs based on available data
    if (conversationContainer && conversationContainer.resultSection) {
      // Show Alternative 1 tab if data exists
      if (results.alt1) {
        const alt1Tab = conversationContainer.resultSection.querySelector('[data-tab="alt1"]');
        if (alt1Tab) {
          alt1Tab.style.display = 'block';
        } else {
          console.warn('⚠️ alt1Tab not found');
        }
      }

      // Show Alternative 2 tab if data exists
      if (results.alt2) {
        const alt2Tab = conversationContainer.resultSection.querySelector('[data-tab="alt2"]');
        if (alt2Tab) {
          alt2Tab.style.display = 'block';
        } else {
          console.warn('⚠️ alt2Tab not found');
        }
      }
    }

    // Update the result content in the specific container
    if (conversationContainer && conversationContainer.resultContent) {
      conversationContainer.resultContent.textContent = results.primary;
      conversationContainer.resultContent.style.display = 'block';
      // Reset height to auto so content wraps to its natural size
      conversationContainer.resultContent.style.height = 'auto';
      conversationContainer.resultContent.style.minHeight = 'auto';
      conversationContainer.resultContent.style.flex = ''; // Reset flex behavior
    } else {
      console.warn('showResults called with invalid conversationContainer');
    }

    // Show result actions (including crop button)
    if (conversationContainer && conversationContainer.resultSection) {
      const resultActions = conversationContainer.resultSection.querySelector('.result-actions');
      if (resultActions) {
        resultActions.style.display = 'flex';
      } else {
        console.warn('⚠️ resultActions not found');
      }
    } else {
      console.warn('⚠️ resultSection not found in conversationContainer:', conversationContainer);
    }

    // Add filler space if the last container is shorter than viewport
    this.addFillerSpaceIfNeeded();
  }

  /**
   * Add filler space after the last container if it's shorter than the viewport
   * This ensures proper scroll positioning for bottom-aligned calculations
   */
  addFillerSpaceIfNeeded() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Remove any existing filler
    const existingFiller = mainContent.querySelector('.conversation-filler');
    if (existingFiller) {
      existingFiller.remove();
    }

    // Check if there are any conversation containers
    const allContainers = mainContent.querySelectorAll('.conversation-container');
    if (allContainers.length === 0) {
      console.log('📦 No conversation containers - skipping filler');
      return;
    }

    // Skip filler for the first conversation (panel was empty before)
    if (allContainers.length === 1) {
      console.log('📦 First conversation item - no filler needed');
      return;
    }

    // Get the last conversation container
    const lastContainer = mainContent.querySelector('.conversation-container:last-child');
    if (!lastContainer) return;

    // Calculate available height for scroll positioning
    const header = document.querySelector('.header');
    const footer = document.querySelector('.footer');
    const headerHeight = header ? header.offsetHeight : 0;
    const footerHeight = footer ? footer.offsetHeight : 0;
    const viewportHeight = window.innerHeight;
    const availableHeight = viewportHeight - headerHeight - footerHeight;

    // Wait for container to settle to its natural size
    requestAnimationFrame(() => {
      const containerHeight = lastContainer.offsetHeight;

      // Account for container margins that affect scroll calculation
      const containerStyle = window.getComputedStyle(lastContainer);
      const containerMarginBottom = parseFloat(containerStyle.marginBottom) || 0;

      // The total height should be: container + margins + minimal filler (if needed)
      // Goal: When bottom-aligned scroll is applied, query text appears at header height
      const totalContentHeight = containerHeight + containerMarginBottom;

      // Only add filler if the total content is shorter than the available scroll area
      if (totalContentHeight < availableHeight) {
        // Add minimal filler to make the scroll calculation work properly
        // We want exactly enough so bottom-aligned scroll positions query at header
        const fillerHeight = availableHeight - totalContentHeight;

        const filler = document.createElement('div');
        filler.className = 'conversation-filler';
        filler.style.height = `${fillerHeight}px`;
        filler.style.minHeight = `${fillerHeight}px`;

        // Insert after the last container
        lastContainer.insertAdjacentElement('afterend', filler);

        console.log('📦 Added precise filler space:', {
          containerHeight,
          containerMarginBottom,
          totalContentHeight,
          availableHeight,
          fillerHeight,
          finalTotalHeight: totalContentHeight + fillerHeight
        });
      } else {
        console.log('📦 No filler needed - content fills available space:', {
          containerHeight,
          containerMarginBottom,
          totalContentHeight,
          availableHeight
        });
      }
    });
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
        // Bottom-aligned approach: Position the BOTTOM of the new container at the header height
        // This positions the new content perfectly below the header with previous content hidden above

        // Get header height for proper positioning
        const header = document.querySelector('.header');
        const headerHeight = header ? header.offsetHeight : 0;

        // Get the bottom position of the new container
        const containerBottom = newEl.offsetTop + newEl.offsetHeight;

        // Calculate scroll position so container bottom aligns just below header
        // We want: containerBottom - scrollTop = scroller.clientHeight
        // So: scrollTop = containerBottom - scroller.clientHeight
        const targetScrollTop = containerBottom - scroller.clientHeight;

        // Clamp within scrollable range
        const max = scroller.scrollHeight - scroller.clientHeight;
        const clampedTarget = Math.max(0, Math.min(targetScrollTop, max));

        console.log('🔍 Bottom-aligned scroll calculation:', {
          headerHeight,
          containerTop: newEl.offsetTop,
          containerHeight: newEl.offsetHeight,
          containerBottom,
          targetScrollTop,
          clampedTarget,
          currentScrollTop: scroller.scrollTop,
          scrollDifference: clampedTarget - scroller.scrollTop,
          isScrollable: scroller.scrollHeight > scroller.clientHeight,
          scrollHeight: scroller.scrollHeight,
          clientHeight: scroller.clientHeight,
          maxScroll: max
        });

        // Only scroll if there's a meaningful difference
        if (Math.abs(clampedTarget - scroller.scrollTop) > 5) {
          console.log('📍 Scrolling to align container bottom with viewport');

          // Try both immediate and smooth scroll
          console.log('🚀 Attempting scroll...');

          // First try immediate scroll
          scroller.scrollTop = clampedTarget;
          console.log('📍 After immediate scroll:', scroller.scrollTop);

          // Then try smooth scroll
          scroller.scrollTo({
            top: clampedTarget,
            behavior: 'smooth'
          });

          // Verify scroll actually happened
          setTimeout(() => {
            console.log('📍 Final scroll position:', scroller.scrollTop, '(target was', clampedTarget, ')');
            console.log('📏 Scroll success:', Math.abs(scroller.scrollTop - clampedTarget) < 10);
          }, 600);
        } else {
          console.log('⚠️ No scroll needed - already positioned correctly');
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
  handleOpenMedia() { console.log('Media popup opened'); }
  handleCloseMedia() { console.log('Media popup closed'); }

  /**
   * Handle keyboard events in the input textarea
   * Enter = submit, Shift+Enter = new line
   */
  handleInputKeydown(e) {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: Insert new line
        e.preventDefault();
        const textarea = e.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;

        // Insert newline at cursor position
        textarea.value = value.substring(0, start) + '\n' + value.substring(end);

        // Move cursor after the newline
        textarea.selectionStart = textarea.selectionEnd = start + 1;

        // Trigger input event to notify of value change
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // Enter alone: Submit
        e.preventDefault();
        // Trigger submit button click with visual feedback
        if (this.elements.submitBtn) {
          // Add visual click effect (hover + active states)
          this.elements.submitBtn.style.background = 'var(--hover-border)';
          this.elements.submitBtn.style.transform = 'scale(0.95)';

          // Trigger the actual click
          this.elements.submitBtn.click();

          // Remove visual effect after a short delay
          setTimeout(() => {
            this.elements.submitBtn.style.background = '';
            this.elements.submitBtn.style.transform = '';
          }, 150);
        }
      }
    }
  }
}

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.TonePilotUIManager = TonePilotUIManager;
  console.log('✅ TonePilotUIManager exported to window');
}