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

      // Clear button event
      if (this.elements.clearBtn) {
        const clearHandler = () => this.handleClearAll();
        this.elements.clearBtn.addEventListener('click', clearHandler);
        this.eventListeners.push({ element: this.elements.clearBtn, event: 'click', handler: clearHandler });
      }

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

        // Input change events for submit button state
        const inputHandler = () => this.updateSubmitButtonState();
        this.elements.inputText.addEventListener('input', inputHandler);
        this.eventListeners.push({ element: this.elements.inputText, event: 'input', handler: inputHandler });

        // Initialize submit button state
        this.updateSubmitButtonState();
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

    // Filler removed for height calculation debugging
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

    // Calculate height for result content to fill remaining space in main-content
    // Use main-content height directly since it's already constrained by header/footer via flexbox
    requestAnimationFrame(() => {
      // Get main-content available height minus its padding
      const mainContentStyle = window.getComputedStyle(mainContent);
      const mainContentPadding = parseFloat(mainContentStyle.paddingTop) + parseFloat(mainContentStyle.paddingBottom);

      // Check for dynamic footer content that might be visible
      const websiteInfo = document.getElementById('websiteInfo');
      const selectedTextDisplay = document.getElementById('selectedTextDisplay');
      const selectedMediaDisplay = document.getElementById('selectedMediaDisplay');

      const websiteInfoHeight = (websiteInfo && websiteInfo.style.display !== 'none') ? websiteInfo.offsetHeight : 0;
      const selectedTextHeight = (selectedTextDisplay && selectedTextDisplay.style.display !== 'none') ? selectedTextDisplay.offsetHeight : 0;
      const selectedMediaHeight = (selectedMediaDisplay && selectedMediaDisplay.style.display !== 'none') ? selectedMediaDisplay.offsetHeight : 0;

      const dynamicFooterHeight = websiteInfoHeight + selectedTextHeight + selectedMediaHeight;

      // Use current main-content height (which already accounts for current footer state)
      // but we need to be aware if footer elements are dynamically shown/hidden
      const availableHeight = mainContent.clientHeight - mainContentPadding;

      console.log('📐 Height calculation:', {
        mainContentClientHeight: mainContent.clientHeight,
        mainContentPadding,
        dynamicFooterElements: {
          websiteInfoHeight,
          selectedTextHeight,
          selectedMediaHeight,
          totalDynamicHeight: dynamicFooterHeight
        },
        availableHeight,
        note: 'mainContent.clientHeight already reflects current footer state'
      });

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

      // During loading: Let loading area size naturally to fit loading text
      // Natural sizing prevents overscroll during loading phase
      loadingArea.style.height = 'auto';
      loadingArea.style.minHeight = 'auto';
      // Ensure loading area is visible and properly styled
      loadingArea.style.display = 'block';
      loadingArea.style.visibility = 'visible';

      // Don't set height on result-content during loading since it's hidden
      resultContent.style.flex = 'none'; // Still override flex behavior

      console.log('📐 Loading area sized naturally to prevent overscroll');

      console.log('📐 Loading height calculation:', {
        mainContentHeight: mainContent.clientHeight,
        mainContentPadding,
        availableHeight,
        visibleElements: {
          queryHeight,
          queryMargins,
          tabsHeight,
          tabsMargins,
          containerMargins
        },
        loadingAreaTargetHeight,
        expectedTotalHeight: queryHeight + queryMargins + tabsHeight + tabsMargins + loadingAreaTargetHeight + containerMargins,
        shouldEqual: availableHeight,
        willFitInMainContent: (queryHeight + queryMargins + tabsHeight + tabsMargins + loadingAreaTargetHeight + containerMargins) <= availableHeight
      });
    });

    // Start loading animation in this new container
    console.log('🎬 Starting loading animation in:', loadingArea);
    this.startLoadingInContainer(loadingArea);

    // Handle filler logic based on panel state
    requestAnimationFrame(() => {
      this.handleFillerForNewItem(containerDiv);
    });

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
    console.log('🎯 Following user specification - Step 4: Replace loading with generated text');

    // CRITICAL: Lock the scroll position during content changes
    const mainContent = document.querySelector('.main-content');
    const scrollTopBeforeLoad = mainContent ? mainContent.scrollTop : 0;

    console.log('📍 BEFORE content load - locking scroll position:', {
      scrollTop: scrollTopBeforeLoad,
      strategy: 'Maintain exact scroll position during content expansion'
    });

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

    // CRITICAL: Immediately restore the EXACT scroll position
    // This prevents any scroll drift during content expansion
    if (mainContent) {
      mainContent.scrollTop = scrollTopBeforeLoad;

      console.log('📍 IMMEDIATELY restored scroll position:', {
        restoredScrollTop: scrollTopBeforeLoad,
        currentScrollTop: mainContent.scrollTop,
        strategy: 'Lock scroll during content changes'
      });
    }

    // Skip filler adjustment entirely for now to test if that's causing issues
    // this.adjustFillerAfterLoading(conversationContainer.container);
  }

  /**
   * Remove any existing filler elements
   */
  removeExistingFiller() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const existingFiller = mainContent.querySelector('.conversation-filler');
    if (existingFiller) {
      existingFiller.remove();
      console.log('🗑️ Removed existing filler');
    }
  }

  /**
   * Get common measurements for filler calculations
   */
  getFillerMeasurements() {
    const header = document.querySelector('.header');
    const footer = document.querySelector('.footer');
    const headerHeight = header ? header.offsetHeight : 0;
    const footerHeight = footer ? footer.offsetHeight : 0;
    const viewportHeight = window.innerHeight;
    const availableHeight = viewportHeight - headerHeight - footerHeight;

    return { headerHeight, footerHeight, viewportHeight, availableHeight };
  }

  /**
   * Add filler space during loading phase
   * Uses viewport-height container for calculation to ensure proper top-alignment
   */
  addLoadingFiller() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    this.removeExistingFiller();

    // Check if there are any conversation containers
    const allContainers = mainContent.querySelectorAll('.conversation-container');
    if (allContainers.length === 0) {
      console.log('📦 Loading phase: No conversation containers - skipping filler');
      return;
    }

    // Skip filler for the first conversation (panel was empty before)
    if (allContainers.length === 1) {
      console.log('📦 Loading phase: First conversation item - no filler needed');
      return;
    }

    const lastContainer = mainContent.querySelector('.conversation-container:last-child');
    if (!lastContainer) return;

    const { availableHeight } = this.getFillerMeasurements();

    // During loading: container is viewport height, calculate filler for top-alignment
    requestAnimationFrame(() => {
      const containerHeight = lastContainer.offsetHeight;
      const containerStyle = window.getComputedStyle(lastContainer);
      const containerMarginBottom = parseFloat(containerStyle.marginBottom) || 0;

      // For loading phase: ensure enough space above for scrolling to top-align new content
      const totalContentHeight = containerHeight + containerMarginBottom;

      // We need enough filler so that when we scroll to align new content at top,
      // there's sufficient scrollable area above the new container
      if (totalContentHeight < availableHeight) {
        const fillerHeight = availableHeight - totalContentHeight;

        const filler = document.createElement('div');
        filler.className = 'conversation-filler loading-filler';
        filler.style.height = `${fillerHeight}px`;
        filler.style.minHeight = `${fillerHeight}px`;

        lastContainer.insertAdjacentElement('afterend', filler);

        console.log('📦 Added loading filler:', {
          phase: 'loading',
          containerHeight,
          containerMarginBottom,
          totalContentHeight,
          availableHeight,
          fillerHeight
        });
      } else {
        console.log('📦 Loading phase: No filler needed - content fills available space');
      }
    });
  }

  /**
   * Add filler space after loading phase
   * Uses actual content height for natural content flow
   */
  addPostLoadingFiller() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    this.removeExistingFiller();

    const allContainers = mainContent.querySelectorAll('.conversation-container');
    if (allContainers.length === 0) {
      console.log('📦 Post-loading: No conversation containers - skipping filler');
      return;
    }

    // For post-loading, we may want minimal filler or none at all
    // since content should flow naturally after shrinking to content size
    if (allContainers.length === 1) {
      console.log('📦 Post-loading: First conversation item - no filler needed');
      return;
    }

    const lastContainer = mainContent.querySelector('.conversation-container:last-child');
    if (!lastContainer) return;

    const { availableHeight } = this.getFillerMeasurements();

    // Wait for container to settle to its actual content size after loading
    requestAnimationFrame(() => {
      const containerHeight = lastContainer.offsetHeight;
      const containerStyle = window.getComputedStyle(lastContainer);
      const containerMarginBottom = parseFloat(containerStyle.marginBottom) || 0;

      const totalContentHeight = containerHeight + containerMarginBottom;

      // Post-loading: only add minimal filler if absolutely necessary
      // Most of the time, content should flow naturally without extra space
      const minimumGap = 20; // Small gap for visual breathing room
      const needsFiller = totalContentHeight + minimumGap < availableHeight;

      if (needsFiller) {
        // Add minimal filler - just enough for visual spacing
        const fillerHeight = minimumGap;

        const filler = document.createElement('div');
        filler.className = 'conversation-filler post-loading-filler';
        filler.style.height = `${fillerHeight}px`;
        filler.style.minHeight = `${fillerHeight}px`;

        lastContainer.insertAdjacentElement('afterend', filler);

        console.log('📦 Added post-loading filler:', {
          phase: 'post-loading',
          containerHeight,
          containerMarginBottom,
          totalContentHeight,
          availableHeight,
          fillerHeight,
          reason: 'minimal spacing'
        });
      } else {
        console.log('📦 Post-loading: No filler needed - content flows naturally');
      }
    });
  }

  /**
   * Calculate panel body height A = main-content height (already constrained by header/footer)
   */
  calculatePanelBodyHeight() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
      console.error('Main content not found for panel body height calculation');
      return 0;
    }

    const A = mainContent.clientHeight;

    console.log('📐 Panel body height calculation:', {
      mainContentHeight: A,
      panelBodyHeight_A: A,
      note: 'Using main-content height directly (already constrained by flexbox)'
    });

    return A;
  }

  /**
   * Handle filler logic for new item following exact user requirements
   */
  handleFillerForNewItem(newContainer) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Get all existing containers (before the new one)
    const allContainers = mainContent.querySelectorAll('.conversation-container');
    const isEmptyPanel = allContainers.length <= 1; // Only the new container

    console.log('🎯 Panel state check:', {
      totalContainers: allContainers.length,
      isEmptyPanel: isEmptyPanel
    });

    if (isEmptyPanel) {
      // A: When panel is empty - no filler needed, natural behavior
      console.log('📦 Empty panel: No filler needed');
      return;
    } else {
      // B: When panel is not empty - follow the filler rules
      this.addFillerForNonEmptyPanel(newContainer);
    }
  }

  /**
   * B: Non-empty panel logic
   * 1.1: Remove existing filler before adding new content
   * 1: New item + filler = main-content height
   */
  addFillerForNonEmptyPanel(newContainer) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // 1.1: Remove existing filler before adding new content
    const existingFiller = mainContent.querySelector('.conversation-filler');
    if (existingFiller) {
      existingFiller.remove();
      console.log('📦 Removed existing filler');
    }

    requestAnimationFrame(() => {
      // Get main-content height (available space)
      const mainContentStyle = window.getComputedStyle(mainContent);
      const mainContentPadding = parseFloat(mainContentStyle.paddingTop) + parseFloat(mainContentStyle.paddingBottom);
      const availableHeight = mainContent.clientHeight - mainContentPadding;

      // Get new item height
      const newItemHeight = newContainer.offsetHeight;

      // Calculate filler: new item + filler = main-content height
      const fillerHeight = Math.max(0, availableHeight - newItemHeight);

      console.log('📦 Non-empty panel filler calculation:', {
        availableHeight,
        newItemHeight,
        fillerHeight,
        formula: 'filler = available height - new item height'
      });

      if (fillerHeight > 0) {
        // Create and add filler after new container
        const filler = document.createElement('div');
        filler.className = 'conversation-filler';
        filler.style.height = `${fillerHeight}px`;
        filler.style.minHeight = `${fillerHeight}px`;
        filler.style.background = 'transparent';
        filler.style.pointerEvents = 'none';

        // Store initial loading state for later adjustment
        filler.dataset.initialContainerHeight = newItemHeight;
        filler.dataset.initialFillerHeight = fillerHeight;

        // Insert after the new container
        newContainer.insertAdjacentElement('afterend', filler);

        console.log('📦 Added filler for non-empty panel:', {
          height: fillerHeight,
          storedData: {
            initialContainerHeight: newItemHeight,
            initialFillerHeight: fillerHeight
          }
        });
      }

      // Scroll to show new content (previous items scroll out of view)
      this.scrollToEnd();
    });
  }

  /**
   * Adjust filler after content is loaded (called from showResults)
   */
  adjustFillerAfterLoading(containerDiv) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Check if this is the last container and if there's a filler
    const lastContainer = mainContent.querySelector('.conversation-container:last-child');
    const existingFiller = mainContent.querySelector('.conversation-filler');

    if (lastContainer !== containerDiv || !existingFiller) {
      // Not the last container or no filler to adjust
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Get main-content height (available space)
        const mainContentStyle = window.getComputedStyle(mainContent);
        const mainContentPadding = parseFloat(mainContentStyle.paddingTop) + parseFloat(mainContentStyle.paddingBottom);
        const availableHeight = mainContent.clientHeight - mainContentPadding;

        // Get stored initial state from loading phase
        const initialContainerHeight = parseInt(existingFiller.dataset.initialContainerHeight) || 0;
        const initialFillerHeight = parseInt(existingFiller.dataset.initialFillerHeight) || 0;
        const initialTotalHeight = initialContainerHeight + initialFillerHeight;

        // Get current container height after content is loaded
        const newContainerHeight = containerDiv.offsetHeight;
        const containerGrowth = newContainerHeight - initialContainerHeight;

        // MAINTAIN CONSTANT TOTAL HEIGHT: Reduce filler by exactly how much container grew
        const newFillerHeight = Math.max(0, initialFillerHeight - containerGrowth);
        const newTotalHeight = newContainerHeight + newFillerHeight;

        console.log('📦 POST-LOADING: Maintaining constant total height:', {
          phase: 'after content generation',
          loadingState: {
            initialContainerHeight,
            initialFillerHeight,
            initialTotalHeight
          },
          afterGeneration: {
            newContainerHeight,
            containerGrowth,
            newFillerHeight,
            newTotalHeight
          },
          verification: {
            totalHeightChange: newTotalHeight - initialTotalHeight,
            shouldBeZero: newTotalHeight - initialTotalHeight === 0
          },
          strategy: 'Maintain constant total height to prevent layout shift'
        });

        // Update filler height
        existingFiller.style.height = `${newFillerHeight}px`;
        existingFiller.style.minHeight = `${newFillerHeight}px`;

        console.log('📦 POST-LOADING: Filler adjusted, no scroll needed:', {
          newFillerHeight,
          finalScrollTop: mainContent.scrollTop,
          note: 'Scroll only happens during initial loading, not after content generation'
        });
      });
    });
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use addLoadingFiller() or addPostLoadingFiller() instead
   */
  addFillerSpaceIfNeeded() {
    console.warn('⚠️ addFillerSpaceIfNeeded() is deprecated. Use addLoadingFiller() or addPostLoadingFiller()');
    this.addPostLoadingFiller();
  }

  /**
   * Scroll to show the new container at the top of the visible area
   * Hide all previous conversations outside the visible area
   * @param {Object} newContainer - The newly created conversation container
   */
  /**
   * Get the actual scrollable parent element
   */
  getScrollableParent(el) {
    let p = el?.parentElement;
    while (p) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight) return p;
      p = p.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  /**
   * Scroll new element into view with precise top alignment
   */
  scrollNewIntoView(newEl, opts = {}) {
    if (!newEl) return;
    const scroller = opts.scroller || this.getScrollableParent(newEl);
    if (!scroller) return;

    const offsetTopAdjust = opts.offsetTopAdjust || 0;

    console.log('🎯 scrollNewIntoView called', {
      newEl: newEl,
      scroller: scroller,
      scrollerHeight: scroller.clientHeight,
      scrollerScrollHeight: scroller.scrollHeight,
      isScrollable: scroller.scrollHeight > scroller.clientHeight
    });

    // Wait for layout to settle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const elRect = newEl.getBoundingClientRect();
        const scRect = scroller.getBoundingClientRect();
        const delta = (elRect.top - scRect.top) - offsetTopAdjust;

        let target = scroller.scrollTop + delta;
        const max = scroller.scrollHeight - scroller.clientHeight;
        if (target > max) target = max;
        if (target < 0) target = 0;

        console.log('📏 Scroll calculation:', {
          elementTop: elRect.top,
          scrollerTop: scRect.top,
          delta: delta,
          currentScrollTop: scroller.scrollTop,
          targetScrollTop: target,
          maxScroll: max
        });

        scroller.scrollTo({ top: target, behavior: 'smooth' });
      });
    });
  }

  /**
   * Scroll to the end of the content
   * Used with modulo filler approach to position new container at viewport top
   */
  scrollToEnd() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Wait for filler to be added and layout to settle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const maxScroll = mainContent.scrollHeight - mainContent.clientHeight;

        console.log('📍 Scrolling to end:', {
          scrollHeight: mainContent.scrollHeight,
          clientHeight: mainContent.clientHeight,
          maxScroll: maxScroll,
          currentScroll: mainContent.scrollTop
        });

        mainContent.scrollTo({
          top: maxScroll,
          behavior: 'smooth'
        });
      });
    });
  }

  /**
   * Setup re-alignment for images and dynamic content
   */
  setupContentReAlignment(newEl) {
    if (!newEl) return;

    // Handle image load events - NO scrolling after initial load
    const images = newEl.querySelectorAll('img');
    images.forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', () => {
          console.log('🖼️ Image loaded - no re-scroll needed');
        }, { once: true });
      }
    });

    // Use ResizeObserver for dynamic content changes - NO scrolling
    const ro = new ResizeObserver(() => {
      console.log('📐 Content size changed - no re-scroll needed');
    });
    ro.observe(newEl);

    // Stop observing after initial settle period
    setTimeout(() => {
      ro.disconnect();
      console.log('📐 ResizeObserver disconnected for', newEl);
    }, 1500);
  }

  animateToNewContainer(newContainer) {
    console.log('animateToNewContainer called', newContainer);

    if (!newContainer || !newContainer.container) {
      console.error('Invalid container:', newContainer);
      return;
    }

    const newEl = newContainer.container;

    // 1. Mark existing conversation containers as moving up
    const scroller = document.querySelector('.main-content');
    if (scroller) {
      const existingContainers = scroller.querySelectorAll('.conversation-container:not(:last-child)');
      existingContainers.forEach(container => {
        container.classList.add('moving-up');
      });
    }

    // 2. Add entering animation to new container
    newEl.classList.add('entering');

    // Step 3.2: Scroll will happen after filler is added (moved to filler callback)

    // Step 3.3: Now ready for generation (handled by caller)
    console.log('🎯 Following user specification - Step 3.3: Ready for await generation');

    // Set up re-alignment for images and dynamic content (no scrolling)
    this.setupContentReAlignment(newEl);

    // 5. Clean up animation classes after transition
    setTimeout(() => {
      newEl.classList.remove('entering');
      if (scroller) {
        const existingContainers = scroller.querySelectorAll('.conversation-container:not(:last-child)');
        existingContainers.forEach(container => {
          container.classList.remove('moving-up');
        });
      }
    }, 400);
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
      // Update submit button state after setting text
      this.updateSubmitButtonState();
    }
  }

  /**
   * Update submit button disabled state based on input content
   */
  updateSubmitButtonState() {
    if (this.elements.submitBtn && this.elements.inputText) {
      const text = this.elements.inputText.value;
      const isEmpty = !text || text.trim() === '';

      this.elements.submitBtn.disabled = isEmpty;

      // Add visual styling for disabled state
      if (isEmpty) {
        this.elements.submitBtn.style.opacity = '0.5';
        this.elements.submitBtn.style.cursor = 'not-allowed';
      } else {
        this.elements.submitBtn.style.opacity = '';
        this.elements.submitBtn.style.cursor = '';
      }
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

  handleClearAll() {
    console.log('🧹 Clearing all conversations');

    // Get main content area
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
      console.error('Main content area not found');
      return;
    }

    // Remove all conversation containers and any filler elements
    const conversations = mainContent.querySelectorAll('.conversation-container');
    conversations.forEach(conversation => {
      conversation.remove();
    });

    // Remove any filler elements that might exist
    const fillers = mainContent.querySelectorAll('.conversation-filler');
    fillers.forEach(filler => {
      filler.remove();
    });

    // Reset conversation history
    this.conversationHistory = [];
    this.previousResult = null;

    // Clear input text
    if (this.elements.inputText) {
      this.elements.inputText.value = '';
      this.updateSubmitButtonState();
    }

    // Reset main content scroll
    mainContent.scrollTop = 0;

    console.log('✅ All conversations cleared');
  }

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
        // Enter alone: Submit (only if button is not disabled)
        e.preventDefault();

        if (this.elements.submitBtn && !this.elements.submitBtn.disabled) {
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