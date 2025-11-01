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
    this.currentConversationContainer = null; // Track current container for real-time updates
  }

  /**
   * Set up listeners for processing steps
   */
  setupStepListeners() {
    if (!this.stateManager) {
      console.warn('⚠️ StateManager not available for step listeners');
      return;
    }

    // Listen for processing steps changes
    this.stateManager.addListener('processingSteps', (steps) => {
      console.log('🔍 Processing steps updated:', steps);
      this.updateStepsDisplay(steps);
    });

    console.log('✅ Step listeners set up');
  }

  /**
   * Update steps display in real-time
   * @param {Array} steps - Array of step objects
   */
  updateStepsDisplay(steps) {
    if (!this.currentConversationContainer) {
      console.log('ℹ️ No current conversation container for steps update');
      return;
    }

    const stepsSection = this.currentConversationContainer.stepsSection;
    const stepsContent = this.currentConversationContainer.stepsContent;

    if (!stepsSection || !stepsContent) {
      console.warn('⚠️ Steps section not found in current container');
      return;
    }

    // Check if Plan mode is active
    const planMode = this.stateManager.getPlanMode();
    const hasProgressiveSteps = this.progressiveSteps && this.progressiveSteps.length > 0;

    console.log('🔄 updateStepsDisplay - planMode:', planMode, 'hasProgressiveSteps:', hasProgressiveSteps);

    // Use progressive steps with reasoning if Plan mode is active
    if (planMode && hasProgressiveSteps) {
      stepsSection.style.display = 'block';
      const progressiveHTML = this.generateProgressiveStepHTML(planMode);
      stepsContent.innerHTML = progressiveHTML;
      console.log('✅ Steps display updated with progressive steps (Plan mode)');
      return;
    }

    // Fallback to simple step display for non-Plan mode
    stepsContent.innerHTML = '';

    if (steps && steps.length > 0) {
      // Show steps section if hidden
      stepsSection.style.display = 'block';

      // Check if all steps are complete
      const allComplete = steps.every(step => step.status === 'complete');

      // Add each step
      steps.forEach((stepData, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step-item';

        // Add status indicator
        let statusIcon = '';
        if (stepData.status === 'complete') {
          statusIcon = '<span class="step-status"> </span>';
        } else if (stepData.status === 'error') {
          statusIcon = '<span class="step-status error">✗</span>';
        } else {
          // in_progress
          statusIcon = '<span class="step-status loading">⋯</span>';
        }

        stepDiv.innerHTML = `
          <div class="step-bullet"></div>
          <div class="step-text">${this.escapeHtml(stepData.step)} ${statusIcon}</div>
        `;
        stepsContent.appendChild(stepDiv);
      });

      // Add "Complete" step at the end if all steps are complete
      if (allComplete) {
        const completeDiv = document.createElement('div');
        completeDiv.className = 'step-item';
        completeDiv.innerHTML = `
          <div class="step-bullet"></div>
          <div class="step-text">Complete <span class="step-status"> </span></div>
        `;
        stepsContent.appendChild(completeDiv);
      }

      console.log('✅ Steps display updated with', steps.length, 'simple steps');
    } else {
      // No steps yet, hide section
      stepsSection.style.display = 'none';
    }
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
        { element: 'submitBtn', handler: async () => await this.handleSubmit() },
        { element: 'mediaBtn', handler: () => this.handleOpenMedia() },
        { element: 'translateBtn', handler: () => this.handleToggleTranslate() },
        { element: 'planBtn', handler: () => this.handleTogglePlan() }
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

      // Document popup events
      if (this.elements.documentBtn) {
        const docHandler = () => this.handleOpenDocument();
        this.elements.documentBtn.addEventListener('click', docHandler);
        this.eventListeners.push({ element: this.elements.documentBtn, event: 'click', handler: docHandler });
      }

      if (this.elements.closeDocumentBtn) {
        const closeHandler = () => this.handleCloseDocument();
        this.elements.closeDocumentBtn.addEventListener('click', closeHandler);
        this.eventListeners.push({ element: this.elements.closeDocumentBtn, event: 'click', handler: closeHandler });
      }

      if (this.elements.saveDocumentBtn) {
        const saveHandler = () => this.handleSaveDocument();
        this.elements.saveDocumentBtn.addEventListener('click', saveHandler);
        this.eventListeners.push({ element: this.elements.saveDocumentBtn, event: 'click', handler: saveHandler });
      }

      // Resume upload events - upload area click
      if (this.elements.uploadArea && this.elements.resumeUpload) {
        const uploadHandler = () => this.elements.resumeUpload.click();
        this.elements.uploadArea.addEventListener('click', uploadHandler);
        this.eventListeners.push({ element: this.elements.uploadArea, event: 'click', handler: uploadHandler });

        const fileHandler = (e) => this.handleResumeUpload(e);
        this.elements.resumeUpload.addEventListener('change', fileHandler);
        this.eventListeners.push({ element: this.elements.resumeUpload, event: 'change', handler: fileHandler });
      }

      if (this.elements.removeResumeBtn) {
        const removeHandler = () => this.handleRemoveResume();
        this.elements.removeResumeBtn.addEventListener('click', removeHandler);
        this.eventListeners.push({ element: this.elements.removeResumeBtn, event: 'click', handler: removeHandler });
      }

      // Tab navigation is handled via document click handler in panel.js

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

      // Scroll event for sticky header shadow effect
      if (this.elements.mainContent) {
        const scrollHandler = () => this.handleStickyHeaderScroll();
        this.elements.mainContent.addEventListener('scroll', scrollHandler);
        this.eventListeners.push({ element: this.elements.mainContent, event: 'scroll', handler: scrollHandler });
      }

      console.log('✅ UI events bound successfully');
    } catch (error) {
      console.error('Event binding failed:', error);
    }
  }

  /**
   * Tab navigation events are handled via document click handler in panel.js
   * This ensures dynamic tabs in conversation containers work correctly
   */

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
    // Store the previous height before updating
    const previousHeight = this.elements.selectedTextDisplay?.offsetHeight || 0;
    const wasVisible = this.elements.selectedTextDisplay?.style.display !== 'none';

    if (this.elements.selectedTextContent) {
      this.elements.selectedTextContent.textContent = `"${selectionData.text}"`;
    }

    if (this.elements.selectedTextDisplay) {
      this.elements.selectedTextDisplay.style.display = 'block';
    }

    if (this.elements.inputContainer) {
      this.elements.inputContainer.classList.add('has-selected-text');
    }

    // Adjust filler if selection display height changed
    requestAnimationFrame(() => {
      const newHeight = this.elements.selectedTextDisplay?.offsetHeight || 0;
      const heightChange = wasVisible ? (newHeight - previousHeight) : newHeight;

      if (heightChange !== 0) {
        console.log('📏 Selection display size changed:', {
          previousHeight,
          newHeight,
          heightChange,
          wasVisible
        });
        this.adjustFillerForFooterChange(heightChange);
      }
    });
  }

  /**
   * Clear selection display
   */
  clearSelectionDisplay() {
    // Store the previous height before clearing
    const previousHeight = this.elements.selectedTextDisplay?.offsetHeight || 0;
    const wasVisible = this.elements.selectedTextDisplay?.style.display !== 'none';

    if (this.elements.selectedTextDisplay) {
      this.elements.selectedTextDisplay.style.display = 'none';
    }

    if (this.elements.inputContainer) {
      this.elements.inputContainer.classList.remove('has-selected-text');
    }

    // Adjust filler if selection was visible and now hidden
    if (wasVisible && previousHeight > 0) {
      requestAnimationFrame(() => {
        const heightChange = -previousHeight; // Negative because we're removing height
        console.log('📏 Selection display cleared:', {
          previousHeight,
          heightChange
        });
        this.adjustFillerForFooterChange(heightChange);
      });
    }
  }

  /**
   * Create new conversation container and prepare for processing
   * @param {string} inputText - Original input text
   * @param {boolean} planMode - Whether plan mode is active
   * @returns {Object} Reference to the new conversation container elements
   */
  createNewConversation(inputText, planMode = false) {
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

    // Remove margin-bottom from input-section to prevent double spacing above first conversation
    const inputSection = document.querySelector('.input-section');
    if (inputSection) {
      inputSection.style.marginBottom = '0';
    }

    // Resize all existing conversations to content size before creating new one
    this.resizePreviousConversationsToContent();

    // Create new container with query and new layout
    const newContainer = this.createConversationContainer(safeInputText, planMode);
    console.log('📦 createConversationContainer returned:', newContainer);

    // Set as current container for real-time step updates
    this.currentConversationContainer = newContainer;

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

      // Also reset tab content height and flex behavior to auto
      const tabContents = container.querySelectorAll('.tab-content');
      tabContents.forEach(content => {
        content.style.height = 'auto';
        content.style.minHeight = 'auto';
        content.style.flex = ''; // Reset to CSS default
      });
    });

    console.log(`🔄 Resized ${existingContainers.length} previous conversations to content size`);

    // Filler removed for height calculation debugging
  }

  /**
   * Create a new conversation container with query and result structure
   * @param {string} inputText - User's input text
   * @param {boolean} planMode - Whether plan mode is active
   * @returns {Object} Container elements
   */
  createConversationContainer(inputText, planMode = false) {
    // Create main container (let it size naturally, we'll control the result content height)
    const containerDiv = document.createElement('div');
    containerDiv.className = 'conversation-container conversation-container-loading';

    // Create query display
    const queryDisplay = document.createElement('div');
    queryDisplay.className = 'query-display';
    queryDisplay.style.display = 'block';
    queryDisplay.innerHTML = `<div class="query-text">${inputText?.trim() || ''}</div>`;

    // Create result section with new layout (no tabs)
    const resultSection = document.createElement('div');
    resultSection.className = 'result-section visible';
    resultSection.style.display = 'block';
    resultSection.innerHTML = `
      <div class="sources-section" style="display: none;">
        <div class="source-cards"></div>
      </div>
      <div class="steps-section collapsed" style="display: none;">
        <div class="steps-header">
          <span>
            <img src="../icons/branch.png" alt="Branch" style="width:10px; height:10px;" />
          </span>
          <span>Assistant Steps</span>
          <span class="chevron">›</span>
        </div>
        <div class="steps-content"></div>
      </div>
      <div class="content-section">
        <div class="result-content"></div>
        <div class="result-actions" style="display: none;">
          <button class="btn btn-secondary copy-btn" title="Copy to clipboard">
            <img src="../icons/copy.png" alt="Copy" width="12" height="12"  />
          </button>
        </div>
      </div>
    `;

    // Get content section element - loading will be managed inside this div
    const contentSection = resultSection.querySelector('.content-section');

    // Assemble container
    containerDiv.appendChild(queryDisplay);
    containerDiv.appendChild(resultSection);

    // Get section elements
    const sourcesSection = resultSection.querySelector('.sources-section');
    const stepsSection = resultSection.querySelector('.steps-section');
    const stepsHeader = resultSection.querySelector('.steps-header');
    const stepsContent = resultSection.querySelector('.steps-content');
    const sourceCards = resultSection.querySelector('.source-cards');

    // Add steps collapse/expand functionality (starts collapsed by default)
    if (stepsHeader) {
      stepsHeader.addEventListener('click', () => {
        stepsSection.classList.toggle('collapsed');
      });
    }

    // Add copy button event listener for this specific container
    const copyButton = resultSection.querySelector('.copy-btn');
    if (copyButton) {
      copyButton.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('📋 Copy button clicked for container');
        this.handleCopyFromContainer(containerDiv);
      });
    } else {
      console.warn('⚠️ Copy button not found in result section');
    }

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

      // Container margins (now consistently 24px top for all containers)
      const containerStyle = window.getComputedStyle(containerDiv);
      const containerMargins = parseFloat(containerStyle.marginTop) + parseFloat(containerStyle.marginBottom);

      // During loading: Let content section size naturally to fit loading text
      // Natural sizing prevents overscroll during loading phase
      contentSection.style.height = 'auto';
      contentSection.style.minHeight = 'auto';

      // Use natural flow instead of flex to prevent upward growth
      contentSection.style.flex = 'none';

      console.log('📐 Loading area sized naturally to prevent overscroll');

      console.log('📐 Loading height calculation:', {
        mainContentHeight: mainContent.clientHeight,
        mainContentPadding,
        availableHeight,
        visibleElements: {
          queryHeight,
          queryMargins,
          containerMargins
        },
        contentSectionHeight: 'auto (natural sizing)',
        expectedTotalHeight: 'calculated after content loads',
        shouldEqual: availableHeight,
        willFitInMainContent: 'calculated after content loads'
      });
    });

    this.startLoadingInContainer(contentSection);

    // Handle filler logic based on panel state
    requestAnimationFrame(() => {
      this.handleFillerForNewItem(containerDiv);
    });

    // Initialize results object
    const conversationContainer = {
      container: containerDiv,
      queryDisplay,
      resultSection,
      contentSection,
      sourcesSection,
      stepsSection,
      stepsContent,
      sourceCards,
      resultContent: contentSection, // For backward compatibility
      planMode: planMode,
      results: {
        content: null,
        steps: null,
        sources: null
      }
    };

    // Also add results to the DOM element for tab switching access
    containerDiv.results = conversationContainer.results;
    containerDiv.planMode = planMode;

    console.log('📋 Conversation container created with planMode:', planMode);

    // Initialize progressive steps if Plan mode is active
    if (planMode) {
      this.progressiveSteps = [];
      this.progressiveSteps.push({
        id: 'routing',
        title: 'Thinking',
        substeps: [
          { id: 'semantic-routing', icon: '🎯', text: 'Determining intent and routing', reason: null }
        ],
        status: 'active',
        activeSubstep: 'semantic-routing'
      });
      console.log('📋 Progressive steps initialized for Plan mode (reasons will be added by AI)');
    }

    return conversationContainer;
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

    // Check if loading message already exists, if not create it
    let loadingMessageElement = contentElement.querySelector('.loading-message');
    if (!loadingMessageElement) {
      loadingMessageElement = document.createElement('div');
      loadingMessageElement.className = 'loading-message';
      // Insert at the beginning of the content, before any existing elements
      contentElement.insertBefore(loadingMessageElement, contentElement.firstChild);
    }

    // Set initial message content
    loadingMessageElement.textContent = loadingMessages[0];
    // Don't set explicit display style - let parent container control visibility
    console.log('🎬 Set initial loading message:', loadingMessages[0]);

    // Clear any existing loading interval first
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      console.log('🛑 Cleared existing loading interval before starting new one');
    }

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
  async showResults(results, conversationContainer) {
    console.log('🎯 Following user specification - Step 4: Replace loading with generated text');
    console.log('📊 Results object:', results);
    console.log('📦 Conversation container:', conversationContainer);

    // DISABLE SCROLLING completely during content changes to prevent any movement
    const mainContent = document.querySelector('.main-content');

    if (mainContent) {
      mainContent.style.overflow = 'hidden';
      console.log('🔒 Disabled scrolling during content generation to prevent flickering');
    }

    console.log('📍 BEFORE content load - scroll disabled:', {
      strategy: 'Disable scrolling during content changes, no restoration needed'
    });

    // Stop the loading animation
    this.stopLoadingAnimation();

    // Switch to content mode with natural block layout
    if (conversationContainer && conversationContainer.container) {
      conversationContainer.container.classList.remove('conversation-container-loading');
      conversationContainer.container.classList.add('conversation-container-content');

      // Override flexbox layout to prevent upward growth
      const resultSection = conversationContainer.container.querySelector('.result-section');
      if (resultSection) {
        resultSection.style.flex = 'none';
        resultSection.style.display = 'block';
      }

      console.log('🎯 Switched to natural block layout to prevent query/tabs from moving upward');
    }

    // Loading is now managed inside result content, no separate loading area to hide

    // Store results in the conversation container
    if (conversationContainer) {
      conversationContainer.results = {
        content: results.primary || results.content,
        steps: results.steps || null,
        sources: results.sources || null
      };

      console.log('📋 Stored results in conversation container:', {
        hasContent: !!conversationContainer.results.content,
        hasSteps: !!conversationContainer.results.steps,
        hasSources: !!conversationContainer.results.sources
      });
    }

    // Update content section with AI-generated text
    if (conversationContainer && conversationContainer.contentSection) {
      // Remove loading message if it exists (don't just hide it to avoid spacing issues)
      const loadingMessage = conversationContainer.contentSection.querySelector('.loading-message');
      if (loadingMessage) {
        loadingMessage.remove();
      }

      // Find result content div
      let resultDiv = conversationContainer.contentSection.querySelector('.result-content');
      if (resultDiv) {
        // Update result content (trim to remove leading/trailing whitespace)
        const contentText = results.primary || results.content || '';
        console.log('📝 Content to display:', {
          hasPrimary: !!results.primary,
          hasContent: !!results.content,
          contentLength: contentText.length,
          contentPreview: contentText.substring(0, 100),
          resultService: results.service
        });

        if (!contentText.trim()) {
          console.error('❌ ERROR: Content is empty or whitespace only!', {
            results,
            primary: results.primary,
            content: results.content
          });
        }

        resultDiv.textContent = contentText.trim();
        resultDiv.style.display = 'block';
        resultDiv.style.height = 'auto';
        resultDiv.style.minHeight = 'auto';
        resultDiv.style.flex = 'none';

        conversationContainer.contentSection.style.display = 'block';
        conversationContainer.contentSection.style.height = 'auto';
        conversationContainer.contentSection.style.minHeight = 'auto';
        conversationContainer.contentSection.style.flex = 'none';

        console.log('📑 Results ready: content section updated with AI results');
      }

      // Show sources only if they are being referenced
      if (conversationContainer.sourcesSection) {
        if (results.sources && Array.isArray(results.sources) && results.sources.length > 0) {
          this.populateSources(conversationContainer.sourceCards, results.sources);
          conversationContainer.sourcesSection.style.display = 'block';
        } else {
          conversationContainer.sourcesSection.style.display = 'none';
        }
      }

      // Steps are now updated in real-time via state listener
      // Just ensure steps section is visible if we have steps
      if (conversationContainer.stepsSection) {
        const currentSteps = this.stateManager.getProcessingSteps();
        if (currentSteps && currentSteps.length > 0) {
          conversationContainer.stepsSection.style.display = 'block';
        }
      }
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

    // Adjust filler after content generation: filler + container = main-content height
    this.adjustFillerAfterContentGeneration(conversationContainer.container);

    // RE-ENABLE SCROLLING after all content changes are complete
    // This happens after a short delay to ensure all layout is settled
    setTimeout(() => {
      if (mainContent) {
        // Re-enable scrolling without changing position
        // The scroll stays at the header position from auto-scroll
        mainContent.style.overflow = '';

        console.log('🔓 Re-enabled scrolling after content generation complete:', {
          strategy: 'Scroll stays at header position, no restoration needed'
        });
      }
    }, 50); // Small delay to ensure all DOM changes are complete
  }

  /**
   * Populate sources section with source cards
   * @param {HTMLElement} sourceCards - Container for source cards
   * @param {Array} sources - Array of source objects
   */
  populateSources(sourceCards, sources) {
    if (!sourceCards || !sources || !Array.isArray(sources)) return;

    sourceCards.innerHTML = '';
    sources.forEach(source => {
      const card = document.createElement('div');
      card.className = 'source-card';

      const icon = source.icon || source.favicon || '🌐';
      const title = source.title || source.name || 'Unknown Source';
      const snippet = source.snippet || source.description || '';
      const url = source.url || null;
      const isLocal = source.isLocal || false;
      const isMedia = source.isMedia || false;
      const thumbnail = source.thumbnail || null;
      const onClick = source.onClick || null;

      // For media items, show small thumbnail similar to icon size
      if (isMedia && thumbnail) {
        card.classList.add('source-card-media');
        card.innerHTML = `
          <div class="source-thumbnail-icon">
            <img src="${thumbnail}" alt="${title}" onerror="this.style.display='none'; this.parentElement.textContent='${icon}';" />
          </div>
          <div class="source-content">
            <div class="source-title">${title}</div>
            <div class="source-snippet">${snippet}</div>
          </div>
        `;
      } else {
        // Regular source card with icon
        card.innerHTML = `
          <div class="source-icon">${icon}</div>
          <div class="source-content">
            <div class="source-title">${title}</div>
            <div class="source-snippet">${snippet}</div>
          </div>
        `;
      }

      // Handle clickability based on source type
      if (onClick) {
        // Custom click handler (e.g., for resume, media)
        card.style.cursor = 'pointer';
        if (isLocal) {
          card.classList.add('source-card-local');
        }
        card.addEventListener('click', onClick);
      } else if (url && url !== '#' && !isLocal) {
        // External URL
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          window.open(url, '_blank');
        });
      } else if (isLocal) {
        // Local documents without click handler - not clickable
        card.style.cursor = 'default';
        card.classList.add('source-card-local');
      }

      sourceCards.appendChild(card);
    });
  }

  /**
   * Populate steps section with step content
   * @param {HTMLElement} stepsContent - Container for step content
   * @param {Array|String} steps - Steps data (array or HTML string)
   */
  populateSteps(stepsContent, steps) {
    if (!stepsContent || !steps) return;

    if (typeof steps === 'string') {
      // HTML string
      stepsContent.innerHTML = steps;
    } else if (Array.isArray(steps)) {
      // Array of step objects
      stepsContent.innerHTML = '';
      steps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step-item';
        stepDiv.innerHTML = `
          <div class="step-number">${index + 1}</div>
          <div class="step-text">${step.text || step.title || step}</div>
        `;
        stepsContent.appendChild(stepDiv);
      });
    }
  }

  /**
   * Get placeholder sources for UI/UX testing
   * Now shows user's uploaded documents (resume, email templates) and selected media
   * @returns {Promise<Array>} Placeholder source objects
   */
  async getPlaceholderSources() {
    const sources = [];

    // Check for selected media first
    if (this.stateManager && this.stateManager.state.selectedMediaArray) {
      const selectedMedia = this.stateManager.state.selectedMediaArray;
      console.log('📸 Found selected media:', selectedMedia.length);

      selectedMedia.forEach((media, index) => {
        const mediaType = media.type === 'video' ? '🎥' : '🖼️';
        const mediaTitle = media.alt || `${media.type === 'video' ? 'Video' : 'Image'} ${index + 1}`;

        sources.push({
          icon: mediaType,
          title: mediaTitle,
          snippet: `Selected ${media.type} from page`,
          url: media.src,
          isLocal: false,
          isMedia: true,
          thumbnail: media.src,
          mediaType: media.type,
          onClick: () => this.handleMediaClick(media)
        });
      });
    }

    // Check for uploaded resume
    try {
      if (window.DocumentService) {
        const resumeData = await window.DocumentService.getResumeData();
        if (resumeData) {
          const sizeFormatted = this.formatFileSize(resumeData.size);
          const uploadDate = new Date(resumeData.uploadedAt).toLocaleDateString();
          sources.push({
            icon: '📄',
            title: resumeData.filename,
            snippet: `Resume • ${sizeFormatted} • Uploaded ${uploadDate}`,
            url: null,
            isLocal: true,
            onClick: () => this.handleResumeClick(resumeData)
          });
        }

        // Check for email templates
        const emailSubject = await window.DocumentService.getEmailSubject();
        const emailTemplate = await window.DocumentService.getColdEmailTemplate();
        if (emailSubject || emailTemplate) {
          const subjectText = emailSubject || 'No subject';

          sources.push({
            icon: '📧',
            title: 'Email Template',
            snippet: `Subject: ${subjectText}`,
            url: null,
            isLocal: true
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load document sources:', error);
    }

    // If no sources at all, show helpful message
    if (sources.length === 0) {
      sources.push({
        icon: '📎',
        title: 'No sources available',
        snippet: 'Select media or upload resume to see them here',
        url: null,
        isLocal: true
      });
    }

    return sources;
  }

  /**
   * Handle click on media source card
   * Opens the media in a new tab
   * @param {Object} media - Media object
   */
  handleMediaClick(media) {
    try {
      console.log('📸 Opening media:', media.src);
      window.open(media.src, '_blank');
    } catch (error) {
      console.error('Failed to open media:', error);
      alert('Failed to open media: ' + error.message);
    }
  }

  /**
   * Format file size in human-readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Handle click on resume source card
   * Opens the original resume file (PDF/DOCX) in a new window/tab
   * @param {Object} resumeData - Resume data object
   */
  handleResumeClick(resumeData) {
    try {
      console.log('📄 Opening resume:', resumeData.filename);

      // Check if we have the original file data
      if (!resumeData.fileData) {
        console.warn('⚠️ No original file data found, showing parsed text instead');
        this.showParsedResumeContent(resumeData);
        return;
      }

      // For PDF files, create a blob URL and open it
      if (resumeData.type === 'application/pdf') {
        // Convert base64 to blob
        const base64Response = fetch(resumeData.fileData);
        base64Response.then(res => res.blob()).then(blob => {
          // Create object URL
          const blobUrl = URL.createObjectURL(blob);

          // Open in new tab
          const newWindow = window.open(blobUrl, '_blank');
          if (!newWindow) {
            console.error('Failed to open new window - popup may be blocked');
            alert('Please allow popups to view the PDF');
          }

          // Clean up the object URL after some time
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 60000); // Clean up after 1 minute
        });
      } else if (resumeData.type.includes('word') || resumeData.filename.endsWith('.docx')) {
        // For Word docs, we can't display them directly, so show parsed content
        console.log('📄 DOCX files cannot be displayed directly, showing parsed content');
        this.showParsedResumeContent(resumeData);
      } else {
        console.warn('⚠️ Unknown file type, showing parsed content');
        this.showParsedResumeContent(resumeData);
      }
    } catch (error) {
      console.error('Failed to open resume:', error);
      alert('Failed to open resume: ' + error.message);
    }
  }

  /**
   * Show parsed resume content in HTML format (fallback)
   * @param {Object} resumeData - Resume data object
   */
  showParsedResumeContent(resumeData) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${resumeData.filename}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
          }
          .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header h1 {
            margin: 0 0 10px 0;
            color: #4a90e2;
            font-size: 24px;
          }
          .header .meta {
            color: #666;
            font-size: 14px;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📄 ${this.escapeHtml(resumeData.filename)}</h1>
          <div class="meta">
            Uploaded: ${new Date(resumeData.uploadedAt).toLocaleString()} •
            Size: ${this.formatFileSize(resumeData.size)}
          </div>
        </div>
        <div class="content">${this.escapeHtml(resumeData.content)}</div>
        <div class="footer">
          Parsed resume content from TonePilot
        </div>
      </body>
      </html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    } else {
      console.error('Failed to open new window - popup may be blocked');
      alert('Please allow popups to view the resume');
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get placeholder steps for UI/UX testing
   * @returns {Array} Placeholder step objects
   */

  /**
   * Adjust filler after content generation to maintain proper positioning
   * Logic: filler + container = main-content height (unless container is taller)
   */
  adjustFillerAfterContentGeneration(containerDiv) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent || !containerDiv) return;

    const existingFiller = mainContent.querySelector('.conversation-filler');
    if (!existingFiller) {
      console.log('📐 No existing filler to adjust');
      return;
    }

    // Get main-content available height
    const mainContentStyle = window.getComputedStyle(mainContent);
    const mainContentPadding = parseFloat(mainContentStyle.paddingTop) + parseFloat(mainContentStyle.paddingBottom);
    const mainContentHeight = mainContent.clientHeight - mainContentPadding;

    // Get new container height after content generation including margins
    const newContainerHeight = containerDiv.offsetHeight;
    const containerStyle = window.getComputedStyle(containerDiv);
    const containerMargins = parseFloat(containerStyle.marginTop) + parseFloat(containerStyle.marginBottom);
    const totalContainerHeight = newContainerHeight + containerMargins;

    // Apply the logic: if (container + margins) >= main-content height, filler = 0, else filler = main-content - (container + margins)
    let fillerHeight;
    if (totalContainerHeight >= mainContentHeight) {
      fillerHeight = 0;
    } else {
      fillerHeight = mainContentHeight - totalContainerHeight;
    }

    console.log('📐 Filler adjustment after content generation:', {
      mainContentHeight,
      newContainerHeight,
      containerMargins,
      totalContainerHeight,
      fillerHeight,
      logic: totalContainerHeight >= mainContentHeight ?
        'Container + margins >= main-content height → filler = 0' :
        'Container + margins < main-content height → filler = main-content - (container + margins)'
    });

    // Update filler height
    existingFiller.style.height = `${fillerHeight}px`;
    existingFiller.style.minHeight = `${fillerHeight}px`;

    // If filler height is 0, we could hide it but keep it for consistency
    if (fillerHeight === 0) {
      existingFiller.style.display = 'none';
    } else {
      existingFiller.style.display = 'block';
    }
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

      // Get new item height including its margins (24px top margin)
      const newItemHeight = newContainer.offsetHeight;
      const containerStyle = window.getComputedStyle(newContainer);
      const containerMargins = parseFloat(containerStyle.marginTop) + parseFloat(containerStyle.marginBottom);
      const totalNewItemHeight = newItemHeight + containerMargins;

      // Calculate filler: (new item + margins) + filler = main-content height
      const fillerHeight = Math.max(0, availableHeight - totalNewItemHeight);

      console.log('📦 Non-empty panel filler calculation:', {
        availableHeight,
        newItemHeight,
        containerMargins,
        totalNewItemHeight,
        fillerHeight,
        formula: 'filler = available height - (new item height + margins)'
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

      // Auto-scroll to position new conversation header at the top of viewport
      this.scrollToNewConversation(newContainer);
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
   * Adjust filler after tab switch since different tabs may have different heights
   * @param {Object} conversationContainer - The conversation container object
   */
  adjustFillerAfterTabSwitch(conversationContainer) {
    if (!conversationContainer || !conversationContainer.container) {
      console.log('📏 No conversation container to adjust filler for tab switch');
      return;
    }

    // Use the same logic as adjustFillerAfterContentGeneration
    this.adjustFillerAfterContentGeneration(conversationContainer.container);
    console.log('📏 Adjusted filler after tab switch for conversation container');
  }

  /**
   * Adjust filler when footer elements (like selection display) change size
   * @param {number} heightChange - The change in footer height (positive = grew, negative = shrunk)
   */
  adjustFillerForFooterChange(heightChange) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const existingFiller = mainContent.querySelector('.conversation-filler');
    if (!existingFiller) {
      console.log('📏 No filler to adjust for footer change');
      return;
    }

    const currentFillerHeight = existingFiller.offsetHeight;
    // When footer grows (positive heightChange), reduce filler by that amount
    // When footer shrinks (negative heightChange), increase filler by that amount
    const newFillerHeight = Math.max(0, currentFillerHeight - heightChange);

    console.log('📏 Adjusting filler for footer change:', {
      heightChange,
      currentFillerHeight,
      newFillerHeight,
      action: heightChange > 0 ? 'reducing filler (footer grew)' : 'increasing filler (footer shrunk)'
    });

    existingFiller.style.height = `${newFillerHeight}px`;
    existingFiller.style.minHeight = `${newFillerHeight}px`;

    // Update stored initial filler height for future calculations
    if (existingFiller.dataset.initialFillerHeight) {
      const updatedInitialHeight = parseInt(existingFiller.dataset.initialFillerHeight) - heightChange;
      existingFiller.dataset.initialFillerHeight = Math.max(0, updatedInitialHeight).toString();
    }
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
   * Scroll to position new conversation at the top of viewport
   * Called when a new submission is made
   * Maintains header position even as content grows
   */
  scrollToNewConversation(newContainer) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent || !newContainer) return;

    // Wait for layout to settle after filler is added
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Initial scroll to position header at top
        this.anchorHeaderAtTop(newContainer, mainContent);

        // Set up ResizeObserver to maintain header position as content grows
        this.maintainHeaderPosition(newContainer, mainContent);
      });
    });
  }

  /**
   * Anchor the conversation header at the top of viewport
   */
  anchorHeaderAtTop(container, mainContent) {
    const containerRect = container.getBoundingClientRect();
    const mainContentRect = mainContent.getBoundingClientRect();

    // Calculate scroll position to place header at top
    const scrollOffset = containerRect.top - mainContentRect.top;
    const targetScrollTop = mainContent.scrollTop + scrollOffset;

    console.log('📍 Anchoring header at top:', {
      containerTop: containerRect.top,
      mainContentTop: mainContentRect.top,
      currentScrollTop: mainContent.scrollTop,
      scrollOffset: scrollOffset,
      targetScrollTop: targetScrollTop
    });

    mainContent.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  }

  /**
   * Maintain header position at top as content grows during generation
   * Uses ResizeObserver to continuously adjust scroll as container expands
   */
  maintainHeaderPosition(container, mainContent) {
    let isObserving = true;

    // Create ResizeObserver to watch container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (!isObserving) return;

      // Re-anchor header at top as content is added
      const containerRect = container.getBoundingClientRect();
      const mainContentRect = mainContent.getBoundingClientRect();
      const scrollOffset = containerRect.top - mainContentRect.top;

      // Only adjust if header has drifted from top position
      if (Math.abs(scrollOffset) > 1) {
        const targetScrollTop = mainContent.scrollTop + scrollOffset;

        // Use instant scroll (no behavior) to avoid janky animations during content growth
        mainContent.scrollTop = targetScrollTop;

        console.log('🔄 Adjusted scroll to maintain header position:', {
          scrollOffset: scrollOffset,
          newScrollTop: targetScrollTop
        });
      }
    });

    // Start observing the container
    resizeObserver.observe(container);

    // Stop observing after content generation is complete (5 seconds should be enough)
    // We also listen for when the loading class is removed as a signal
    const checkComplete = setInterval(() => {
      if (!container.classList.contains('conversation-container-loading')) {
        console.log('✅ Content generation complete, stopping header position maintenance');
        isObserving = false;
        resizeObserver.disconnect();
        clearInterval(checkComplete);
      }
    }, 100);

    // Fallback: stop after 10 seconds regardless
    setTimeout(() => {
      if (isObserving) {
        console.log('⏱️ Timeout: Stopping header position maintenance');
        isObserving = false;
        resizeObserver.disconnect();
        clearInterval(checkComplete);
      }
    }, 10000);
  }

  /**
   * Handle sticky header scroll effect
   * Adds/removes 'scrolled' class to query displays based on scroll position
   */
  handleStickyHeaderScroll() {
    const mainContent = this.elements.mainContent;
    if (!mainContent) return;

    const containers = mainContent.querySelectorAll('.conversation-container');
    const mainContentTop = mainContent.getBoundingClientRect().top;

    containers.forEach(container => {
      const queryDisplay = container.querySelector('.query-display');
      if (!queryDisplay) return;

      // Get positions
      const containerRect = container.getBoundingClientRect();
      const queryRect = queryDisplay.getBoundingClientRect();

      // The header is sticky when:
      // 1. Container top is above the mainContent top (has scrolled up)
      // 2. Container bottom is still below where the sticky header sits
      const shouldBeSticky = containerRect.top < mainContentTop &&
                            containerRect.bottom > (mainContentTop + queryRect.height);

      // Add or remove 'scrolled' class
      if (shouldBeSticky) {
        queryDisplay.classList.add('scrolled');
      } else {
        queryDisplay.classList.remove('scrolled');
      }
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
          <button class="result-tab active" data-tab="primary">Assistant</button>
          <button class="result-tab" data-tab="alt1" style="display: none;">
            <img src="../icons/branch.png" alt="Branch" style="width:10px; height:10px;" />
            <span>Steps</span>
          </button>
          <button class="result-tab" data-tab="alt2" style="display: none;">Alternative 2</button>
        </div>
        <div id="primary-content" class="tab-content">
          <div class="result-content">${previousResult.result}</div>
          <div class="result-actions" style="height:12px">
          <button class="btn btn-secondary copy-btn" title="Copy to clipboard" >
            <img src="../icons/copy.png" alt="Copy" width="12" height="12"/>
          </button>
          </div>
        </div>
        <div id="alt1-content" class="tab-content" style="display: none;"></div>
        <div id="alt2-content" class="tab-content" style="display: none;"></div>
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

  /**
   * Handle copy button click from a specific conversation container
   * @param {HTMLElement} containerDiv - The conversation container element
   */
  handleCopyFromContainer(containerDiv) {
    try {
      // Find the result-content within the content-section (no tabs in new layout)
      const contentSection = containerDiv.querySelector('.content-section');
      if (!contentSection) {
        console.warn('No content-section found in container');
        return;
      }

      const resultContent = contentSection.querySelector('.result-content');
      if (!resultContent) {
        console.warn('No result-content found in content-section');
        return;
      }

      // Get the text content from just the result content
      const textToCopy = resultContent.textContent || resultContent.innerText || '';

      if (!textToCopy.trim()) {
        console.warn('No content to copy');
        return;
      }

      console.log('📋 Copying text:', textToCopy.substring(0, 50) + '...');

      // Copy to clipboard using the Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          console.log('✅ Content copied to clipboard successfully');
          // Optional: Show brief visual feedback
          this.showCopyFeedback(containerDiv);
        }).catch(err => {
          console.error('Failed to copy to clipboard:', err);
          // Fallback to legacy method
          this.fallbackCopyToClipboard(textToCopy);
        });
      } else {
        // Fallback for older browsers
        this.fallbackCopyToClipboard(textToCopy);
      }
    } catch (error) {
      console.error('Error in handleCopyFromContainer:', error);
    }
  }

  /**
   * Fallback copy method for older browsers
   * @param {string} text - Text to copy
   */
  fallbackCopyToClipboard(text) {
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
      } else {
        console.error('❌ Failed to copy content using fallback method');
      }
    } catch (err) {
      console.error('❌ Fallback copy failed:', err);
    }
  }

  /**
   * Show brief visual feedback when content is copied
   * @param {HTMLElement} containerDiv - The conversation container element
   */
  showCopyFeedback(containerDiv) {
    const copyButton = containerDiv.querySelector('.btn-secondary');
    if (copyButton) {
      const originalContent = copyButton.innerHTML;
      copyButton.innerHTML = '<img src="../icons/check.png" alt="Copied" style="width:12px; height:12px;" />';

      setTimeout(() => {
        copyButton.innerHTML = originalContent;
      }, 1500);
    }
  }
  handleReplace() { console.log('Replace clicked'); }
  handleSelectMedia() { console.log('Select media clicked'); }
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

  handleOpenDocument() {
    console.log('📄 Opening document popup');
    if (this.elements.documentPopup) {
      this.elements.documentPopup.style.display = 'flex';
      this.loadDocumentData();
    }
  }

  handleCloseDocument() {
    console.log('📄 Closing document popup');
    if (this.elements.documentPopup) {
      this.elements.documentPopup.style.display = 'none';
    }
  }

  async handleSaveDocument() {
    console.log('💾 Saving document data');
    try {
      const emailSubject = this.elements.emailSubject?.value || '';
      const coldEmailTemplate = this.elements.coldEmailTemplate?.value || '';

      await chrome.storage.local.set({
        emailSubject: emailSubject,
        coldEmailTemplate: coldEmailTemplate
      });

      console.log('✅ Document data saved successfully');
      this.handleCloseDocument();
    } catch (error) {
      console.error('❌ Failed to save document data:', error);
      this.showError('Failed to save document data');
    }
  }

  async loadDocumentData() {
    console.log('📂 Loading document data');
    try {
      const data = await chrome.storage.local.get(['resumeData', 'emailSubject', 'coldEmailTemplate']);

      if (data.emailSubject && this.elements.emailSubject) {
        this.elements.emailSubject.value = data.emailSubject;
      }

      if (data.coldEmailTemplate && this.elements.coldEmailTemplate) {
        this.elements.coldEmailTemplate.value = data.coldEmailTemplate;
      }

      if (data.resumeData) {
        this.displayResumePreview(data.resumeData);
      }
    } catch (error) {
      console.error('❌ Failed to load document data:', error);
    }
  }

  async handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📤 Uploading resume:', file.name);

    // Validate file size (10MB limit as shown in UI)
    if (file.size > 10 * 1024 * 1024) {
      this.showError('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.docx'];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      this.showError('Please upload a PDF or DOCX file');
      return;
    }

    try {
      // Show loading state
      this.showLoading();

      // Use DocumentService to parse and save the resume
      const resumeData = await window.DocumentService.saveResumeData(file);

      // Display preview
      this.displayResumePreview(resumeData);

      // Hide loading state
      this.hideLoading();

      console.log('✅ Resume uploaded and parsed successfully');

    } catch (error) {
      console.error('❌ Resume upload failed:', error);
      this.hideLoading();
      this.showError(`Failed to upload resume: ${error.message}`);
    }
  }

  displayResumePreview(resumeData) {
    if (!this.elements.resumePreview) return;

    const filename = this.elements.resumePreview.querySelector('.resume-filename');
    if (filename) filename.textContent = resumeData.filename;

    this.elements.resumePreview.style.display = 'flex';
    if (this.elements.uploadArea) this.elements.uploadArea.style.display = 'none';
  }

  async handleRemoveResume() {
    console.log('🗑️ Removing resume');
    try {
      await chrome.storage.local.remove('resumeData');

      if (this.elements.resumePreview) {
        this.elements.resumePreview.style.display = 'none';
      }

      if (this.elements.uploadArea) {
        this.elements.uploadArea.style.display = 'block';
      }

      if (this.elements.resumeUpload) {
        this.elements.resumeUpload.value = '';
      }

      console.log('✅ Resume removed successfully');
    } catch (error) {
      console.error('❌ Failed to remove resume:', error);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Show detail mode tab immediately upon submit
   * @param {Object} conversationContainer - The conversation container
   * @param {boolean} planMode - Whether plan mode is active
   */
  showPlanModeTab(conversationContainer, planMode) {
    if (!conversationContainer || !conversationContainer.resultSection) {
      console.warn('⚠️ Cannot show detail mode tab - no result section');
      return;
    }

    console.log('📋 showPlanModeTab called with planMode:', planMode);

    // Show Alternative 1 tab immediately
    const alt1Tab = conversationContainer.resultSection.querySelector('[data-tab="alt1"]');
    if (alt1Tab) {
      alt1Tab.style.display = 'block';
      console.log('✅ Alternative 1 tab made visible immediately');
    } else {
      console.warn('⚠️ alt1Tab not found in conversation container');
    }

    // Reset progressive steps for new conversation
    this.progressiveSteps = [];

    // Initialize with first step (routing)
    // Note: reasoning will be updated when routing completes
    this.progressiveSteps.push({
      id: 'routing',
      title: 'Thinking',
      substeps: [
        { id: 'semantic-routing', icon: '🎯', text: 'Determining intent and routing', reason: planMode ? 'Understanding what you want to accomplish' : null }
      ],
      status: 'active',
      activeSubstep: 'semantic-routing'
    });

    // Initialize step indicator HTML in the Alternative 1 tab content area
    const initialStepHTML = this.generateProgressiveStepHTML(planMode);

    // Store planMode on the container for later reference
    conversationContainer.planMode = planMode;

    // Store this in the conversation container for immediate access
    if (!conversationContainer.results) {
      conversationContainer.results = {};
    }
    conversationContainer.results.alt1 = initialStepHTML;

    // We'll need to store this for real-time updates
    this.currentDetailContainer = conversationContainer;
    this.currentStepIndicatorHTML = initialStepHTML;

    // Immediately switch to Alternative 1 tab and show the step indicators
    if (alt1Tab) {
      console.log('🔍 DEBUG: About to hide all tab contents');

      // Hide all tab contents first
      conversationContainer.resultSection.querySelectorAll('.tab-content').forEach((content, index) => {
        console.log(`🔍 DEBUG: Hiding tab content ${index}:`, content.id, 'innerHTML:', content.innerHTML);
        content.style.display = 'none';
      });

      // Make Alternative 1 tab active
      conversationContainer.resultSection.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
      alt1Tab.classList.add('active');

      // Show step indicators immediately in alt1 content
      if (conversationContainer.alt1Content) {
        console.log('🔍 DEBUG: alt1Content before setting innerHTML:', conversationContainer.alt1Content.innerHTML);

        // Replace loading content with step indicators in alt1 content
        conversationContainer.alt1Content.innerHTML = initialStepHTML;
        conversationContainer.alt1Content.style.display = 'block';
        conversationContainer.alt1Content.style.visibility = 'visible';

        console.log('🔍 DEBUG: alt1Content after setting innerHTML:', conversationContainer.alt1Content.innerHTML);

        // Double-check that primary-content is actually hidden
        const primaryContentAfter = conversationContainer.resultSection.querySelector('#primary-content');
        if (primaryContentAfter) {
          console.log('🔍 DEBUG: primaryContent display style after hiding:', primaryContentAfter.style.display);
          console.log('🔍 DEBUG: primaryContent computed display:', window.getComputedStyle(primaryContentAfter).display);
          console.log('🔍 DEBUG: primaryContent classList:', primaryContentAfter.classList.toString());
          console.log('🔍 DEBUG: primaryContent id:', primaryContentAfter.id);
          console.log('🔍 DEBUG: primaryContent innerHTML after alt1 setup:', primaryContentAfter.innerHTML);

          // Check if primary-content is actually being found by the hide logic
          const allTabContents = conversationContainer.resultSection.querySelectorAll('.tab-content');
          console.log('🔍 DEBUG: All tab contents found:', allTabContents.length);
          allTabContents.forEach((content, index) => {
            console.log(`🔍 DEBUG: Tab content ${index}: id="${content.id}", display="${content.style.display}", computed="${window.getComputedStyle(content).display}"`);
          });
        }

        // Mark this container as having detail mode active so tab switching knows to handle it differently
        conversationContainer._planModeActive = true;

        console.log('📋 Alternative 1 tab activated with step indicators in result content, replaced loading');
      }
    }

    console.log('📋 Detail mode tab initialized with step indicator content stored and displayed');
  }

  /**
   * Generate initial step indicator HTML
   * @param {boolean} planMode - Whether plan mode is active
   * @returns {string} Initial step indicator HTML
   */
  generateInitialStepIndicatorHTML(planMode = null) {
    // No hardcoded reason - AI will provide it dynamically when routing completes
    return `<div class="step-indicator"><ul class="step-list"><li class="step-item" data-step="routing" data-status="active"><div class="step-circle"></div><div class="step-content"><div class="step-title">Analyzing your request</div><div class="step-substeps"><div class="substep" data-active="true"><span class="substep-icon">🎯</span><div class="substep-content"><span class="substep-text">Determining intent and routing</span></div></div></div></div></li></ul></div>`;
  }

  /**
   * Update step indicator in real-time during processing
   * @param {string} stepId - Step identifier
   * @param {string} status - Status (pending, active, completed)
   * @param {string} activeSubstep - Optional active substep
   * @param {string} reasoning - Optional reasoning to display
   */
  updatePlanModeStepIndicator(stepId, status, activeSubstep = null, reasoning = null) {
    // Use currentConversationContainer instead of currentDetailContainer (which is deprecated)
    const container = this.currentConversationContainer || this.currentDetailContainer;

    if (!container) {
      console.warn('⚠️ No conversation container available for step update');
      return;
    }

    console.log('🔍 updatePlanModeStepIndicator CALLED:', {
      stepId,
      status,
      activeSubstep,
      reasoning,
      reasoningType: typeof reasoning,
      reasoningLength: reasoning?.length,
      hasContainer: !!container
    });

    // Initialize step tracking if it doesn't exist
    if (!this.progressiveSteps) {
      this.progressiveSteps = [];
      console.log('📦 Initialized empty progressiveSteps array');
    }

    console.log('📦 Current progressiveSteps before update:', JSON.stringify(this.progressiveSteps, null, 2));

    // Add or update the step in progressive tracking with reasoning
    this.addOrUpdateProgressiveStep(stepId, status, activeSubstep, reasoning);

    console.log('📦 Current progressiveSteps after addOrUpdate:', JSON.stringify(this.progressiveSteps, null, 2));

    // Trigger steps display update which will render progressive steps in Plan mode
    this.updateStepsDisplay(this.stateManager.getProcessingSteps());

    console.log(`📋 Updated step indicator: ${stepId} -> ${status}${reasoning ? ` (reasoning: ${reasoning})` : ' (NO REASONING)'}`);
  }

  /**
   * Add or update a step in progressive tracking
   * @param {string} stepId - Step identifier
   * @param {string} status - Status (pending, active, completed)
   * @param {string} activeSubstep - Optional active substep
   * @param {string} reasoning - Optional reasoning to display
   */
  addOrUpdateProgressiveStep(stepId, status, activeSubstep = null, reasoning = null) {
    console.log('🔧 addOrUpdateProgressiveStep CALLED:', {
      stepId,
      status,
      activeSubstep,
      reasoning,
      reasoningType: typeof reasoning,
      reasoningIsNull: reasoning === null,
      reasoningIsUndefined: reasoning === undefined,
      reasoningLength: reasoning?.length
    });

    // Define step metadata (no hardcoded reasons - AI will provide them dynamically)
    const stepDefinitions = {
      'routing': {
        title: 'Thinking', substeps: [
          { id: 'semantic-routing', icon: '🎯', text: 'Determining intent and routing', reason: null }
        ]
      },
      'resume': {
        title: 'Retrieving Context', substeps: [
          { id: 'resume-retrieval', icon: '📄', text: 'Fetching resume data', reason: null }
        ]
      },
      'generation': {
        title: 'Generating AI output', substeps: [
          { id: 'ai-generation', icon: '⚙️', text: 'Running AI service', reason: null }
        ]
      },
      'processing': {
        title: 'Processing AI output', substeps: [
          { id: 'ai-service', icon: '⚙️', text: 'Running AI service', reason: null }
        ]
      },
      'reflection': {
        title: 'Reflecting on output quality', substeps: [
          { id: 'quality-analysis', icon: '🔍', text: 'Analyzing quality and accuracy', reason: null },
          { id: 'improvement-check', icon: '📊', text: 'Evaluating improvement opportunities', reason: null }
        ]
      },
      'improvement': {
        title: 'Enhancing output', substeps: [
          { id: 'generating-improved', icon: '✨', text: 'Generating improved version', reason: null }
        ]
      }
    };

    // Check if step already exists
    const existingStepIndex = this.progressiveSteps.findIndex(step => step.id === stepId);

    if (existingStepIndex !== -1) {
      // Update existing step
      const oldStatus = this.progressiveSteps[existingStepIndex].status;
      this.progressiveSteps[existingStepIndex].status = status;
      this.progressiveSteps[existingStepIndex].activeSubstep = activeSubstep;

      console.log(`🔄 Step status transition: ${stepId} (${oldStatus} → ${status})`);

      // Update reasoning if provided
      if (reasoning && this.progressiveSteps[existingStepIndex].substeps) {
        this.progressiveSteps[existingStepIndex].substeps.forEach(substep => {
          if (substep.id === activeSubstep) {
            const oldReason = substep.reason;
            substep.reason = reasoning;
            console.log(`💡 AI reasoning added to ${stepId}/${substep.id}:`, {
              wasNull: oldReason === null,
              reasoning: reasoning
            });
          }
        });
      } else if (!reasoning && status === 'completed') {
        console.log(`⚠️ Step completed without AI reasoning: ${stepId}/${activeSubstep}`);
      }

      console.log(`📋 Updated existing step: ${stepId} -> ${status}${reasoning ? ` (with AI reasoning)` : ''}`);
    } else {
      // Add new step (any status - we want to show completed steps too)
      const stepDef = stepDefinitions[stepId];
      if (stepDef) {
        const substeps = JSON.parse(JSON.stringify(stepDef.substeps)); // Deep clone

        // Inject reasoning if provided
        if (reasoning && activeSubstep) {
          substeps.forEach(substep => {
            if (substep.id === activeSubstep) {
              substep.reason = reasoning;
              console.log(`💡 AI reasoning included in new step ${stepId}/${substep.id}: "${reasoning}"`);
            }
          });
        } else if (!reasoning && status === 'active') {
          console.log(`✨ New step added as active (reasoning will be added on completion): ${stepId}/${activeSubstep}`);
        } else if (!reasoning && status === 'completed') {
          console.log(`⚠️ New step added as completed without AI reasoning: ${stepId}/${activeSubstep}`);
        }

        this.progressiveSteps.push({
          id: stepId,
          title: stepDef.title,
          substeps: substeps,
          status: status,
          activeSubstep: activeSubstep
        });
        console.log(`📋 Added new step: ${stepId} -> ${status}${reasoning ? ` (with AI reasoning)` : ' (reasoning pending)'}`);
      } else {
        console.warn(`⚠️ Step definition not found for: ${stepId}`);
      }
    }
  }

  /**
   * Get all steps with their current status
   * @returns {Array} Array of all steps with current status
   */
  getAllStepsWithStatus() {
    const stepDefinitions = [
      {
        id: 'routing', title: 'Thinking', substeps: [
          { id: 'semantic-routing', icon: '🎯', text: 'Determining intent and routing', reason: 'Understanding what you want to accomplish' }
        ]
      },
      {
        id: 'processing', title: 'Generating AI output', substeps: [
          { id: 'ai-service', icon: '⚙️', text: 'Running AI service', reason: 'Creating your content with AI' }
        ]
      },
      {
        id: 'reflection', title: 'Reflecting on output quality', substeps: [
          { id: 'quality-analysis', icon: '🔍', text: 'Analyzing quality and accuracy', reason: 'Checking if the output meets standards' },
          { id: 'improvement-check', icon: '📊', text: 'Evaluating improvement opportunities', reason: 'Finding ways to make it better' }
        ]
      },
      {
        id: 'improvement', title: 'Enhancing output', substeps: [
          { id: 'generating-improved', icon: '✨', text: 'Generating improved version', reason: 'Creating an enhanced version' }
        ]
      }
    ];

    // Apply current status from progressiveSteps if available
    return stepDefinitions.map((stepDef, index) => {
      const progressiveStep = this.progressiveSteps?.find(ps => ps.id === stepDef.id);
      // First step should be active by default if no progressive steps exist
      const defaultStatus = (index === 0 && (!this.progressiveSteps || this.progressiveSteps.length === 0)) ? 'active' : 'pending';
      return {
        ...stepDef,
        status: progressiveStep?.status || defaultStatus,
        activeSubstep: progressiveStep?.activeSubstep || null
      };
    });
  }

  /**
   * Generate HTML showing only revealed steps progressively
   * @param {boolean} planMode - Whether plan mode is active
   * @returns {string} Progressive step indicator HTML
   */
  generateProgressiveStepHTML(planMode = null) {
    // Only show steps that have been revealed (in progressiveSteps array)
    if (!this.progressiveSteps || this.progressiveSteps.length === 0) {
      return this.generateInitialStepIndicatorHTML(planMode);
    }

    // Determine plan mode from parameter or fallback to container
    const isPlanMode = planMode !== null ? planMode : (this.currentDetailContainer?.planMode || false);

    console.log('🎨 generateProgressiveStepHTML - isPlanMode:', isPlanMode);
    console.log('🎨 generateProgressiveStepHTML - steps:', JSON.stringify(this.progressiveSteps, null, 2));

    // Check if all steps are complete
    const allComplete = this.progressiveSteps.every(step => step.status === 'completed');
    console.log('🎨 All progressive steps complete:', allComplete);

    let stepsHTML = '';

    this.progressiveSteps.forEach((step, index) => {
      console.log(`🎨 Processing step ${step.id}:`, {
        status: step.status,
        activeSubstep: step.activeSubstep,
        substepsCount: step.substeps.length,
        substeps: step.substeps.map(s => ({ id: s.id, text: s.text, hasReason: !!s.reason, reason: s.reason }))
      });

      const substepsHTML = step.substeps.map(substep => {
        const isActive = step.activeSubstep === substep.id;
        // Only show reason in Plan mode if it exists and has actual content
        const hasReason = substep.reason && substep.reason.trim().length > 0;

        const reasonHTML = (isPlanMode && hasReason) ? `<div class="substep-reason">${substep.reason}</div>` : '';
        console.log(`🎨 Substep ${substep.id}:`, {
          isPlanMode,
          reasonValue: substep.reason,
          reasonType: typeof substep.reason,
          hasReason,
          willShowReason: !!(isPlanMode && hasReason)
        });
        return `<div class="substep" ${isActive ? 'data-active="true"' : ''}>
          <div class="substep-content">
            <span class="substep-text">${substep.text}</span>
            ${reasonHTML}
          </div>
        </div>`;
      }).join('');

      stepsHTML += `<li class="step-item" data-step="${step.id}" data-status="${step.status}"><div class="step-circle"></div><div class="step-content"><div class="step-title">${step.title}</div><div class="step-substeps">${substepsHTML}</div></div></li>`;
    });

    // Add "Complete" step at the end if all steps are complete
    if (allComplete) {
      const completeSubstepHTML = `<div class="substep">
        <div class="substep-content">
          <span class="substep-text">Complete</span>
        </div>
      </div>`;
      stepsHTML += `<li class="step-item" data-step="complete" data-status="completed"><div class="step-circle"></div><div class="step-content"><div class="step-title">Complete</div><div class="step-substeps">${completeSubstepHTML}</div></div></li>`;
      console.log('✅ Added Complete step to progressive steps');
    }

    return `<div class="step-indicator"><ul class="step-list">${stepsHTML}</ul></div>`;
  }

  /**
   * Update step indicator HTML based on step status
   * @param {string} stepId - Step identifier
   * @param {string} status - Status
   * @param {string} activeSubstep - Optional active substep
   * @param {boolean} planMode - Whether plan mode is active
   * @returns {string} Updated HTML
   */
  updateStepIndicatorHTML(stepId, status, activeSubstep = null, planMode = null) {
    // This is a simplified version - in a real implementation, you'd parse and update the existing HTML
    // For now, I'll generate fresh HTML with the updated status
    const steps = [
      {
        id: 'routing', title: 'Thinking', substeps: [
          { id: 'semantic-routing', icon: '🎯', text: 'Determining intent and routing', reason: 'Understanding what you want to accomplish' }
        ]
      },
      {
        id: 'processing', title: 'Generating AI output', substeps: [
          { id: 'ai-service', icon: '⚙️', text: 'Running AI service', reason: 'Creating your content with AI' }
        ]
      },
      {
        id: 'reflection', title: 'Reflecting on output quality', substeps: [
          { id: 'quality-analysis', icon: '🔍', text: 'Analyzing quality and accuracy', reason: 'Checking if the output meets standards' },
          { id: 'improvement-check', icon: '📊', text: 'Evaluating improvement opportunities', reason: 'Finding ways to make it better' }
        ]
      },
      {
        id: 'improvement', title: 'Enhancing output', substeps: [
          { id: 'generating-improved', icon: '✨', text: 'Generating improved version', reason: 'Creating an enhanced version' }
        ]
      }
    ];

    // Update the step status
    const targetStep = steps.find(s => s.id === stepId);
    if (targetStep) {
      targetStep.status = status;
      if (status === 'active' && activeSubstep) {
        targetStep.activeSubstep = activeSubstep;
      }
    }

    // Determine plan mode from parameter or fallback to container
    const isPlanMode = planMode !== null ? planMode : (this.currentDetailContainer?.planMode || false);

    // Generate HTML with updated statuses
    const stepsHTML = steps.map(step => {
      const substepsHTML = step.substeps.map(substep => {
        const isActive = step.status === 'active' && step.activeSubstep === substep.id;
        // Only show reason in Plan mode
        const reasonHTML = (isPlanMode && substep.reason) ? `<div class="substep-reason">${substep.reason}</div>` : '';
        return `<div class="substep" ${isActive ? 'data-active="true"' : ''}>
          <span class="substep-icon">${substep.icon}</span>
          <div class="substep-content">
            <span class="substep-text">${substep.text}</span>
            ${reasonHTML}
          </div>
        </div>`;
      }).join('');

      return `<li class="step-item" data-step="${step.id}" data-status="${step.status ?? 'pending'}"><div class="step-circle"></div><div class="step-content"><div class="step-title">${step.title}</div><div class="step-substeps">${substepsHTML}</div></div></li>`;
    }).join('');

    return `<div class="step-indicator"><ul class="step-list">${stepsHTML}</ul></div>`;
  }

  /**
   * Show step indicator when detail mode is active
   */
  showStepIndicator() {
    if (this.elements.stepIndicator) {
      this.elements.stepIndicator.style.display = 'block';
      this.resetStepIndicator();
      console.log('📋 Step indicator shown');
    }
  }

  /**
   * Hide step indicator
   */
  hideStepIndicator() {
    if (this.elements.stepIndicator) {
      this.elements.stepIndicator.style.display = 'none';
      console.log('📋 Step indicator hidden');
    }
  }

  /**
   * Reset all steps to pending state
   */
  resetStepIndicator() {
    if (!this.elements.stepIndicator) return;

    const steps = this.elements.stepIndicator.querySelectorAll('.step-item');
    steps.forEach(step => {
      step.setAttribute('data-status', 'pending');
    });

    const substeps = this.elements.stepIndicator.querySelectorAll('.substep');
    substeps.forEach(substep => {
      substep.removeAttribute('data-active');
    });

    console.log('📋 Step indicator reset');
  }

  /**
   * Update step status
   * @param {string} stepId - Step identifier (routing, processing, reflection, improvement)
   * @param {string} status - Status (pending, active, completed)
   * @param {string} activeSubstep - Optional active substep identifier
   */
  updateStepStatus(stepId, status, activeSubstep = null) {
    if (!this.elements.stepIndicator) return;

    const stepElement = this.elements.stepIndicator.querySelector(`[data-step="${stepId}"]`);
    if (!stepElement) {
      console.warn(`⚠️ Step element not found: ${stepId}`);
      return;
    }

    stepElement.setAttribute('data-status', status);

    // Clear all active substeps in this step first
    const substeps = stepElement.querySelectorAll('.substep');
    substeps.forEach(substep => {
      substep.removeAttribute('data-active');
    });

    // Set active substep if provided
    if (activeSubstep && status === 'active') {
      const activeSubstepElement = stepElement.querySelector(`[data-substep="${activeSubstep}"]`);
      if (activeSubstepElement) {
        activeSubstepElement.setAttribute('data-active', 'true');
      }
    }

    console.log(`📋 Step ${stepId} updated to ${status}${activeSubstep ? ` (substep: ${activeSubstep})` : ''}`);
  }

  /**
   * Complete a step and move to the next one
   * @param {string} currentStepId - Current step to complete
   * @param {string} nextStepId - Next step to activate (optional)
   * @param {string} nextSubstep - Next substep to activate (optional)
   */
  completeStep(currentStepId, nextStepId = null, nextSubstep = null) {
    this.updateStepStatus(currentStepId, 'completed');

    if (nextStepId) {
      this.updateStepStatus(nextStepId, 'active', nextSubstep);
    }

    console.log(`📋 Step ${currentStepId} completed${nextStepId ? `, activated ${nextStepId}` : ''}`);
  }

  /**
   * Complete all steps (called when processing is done)
   */
  completeAllSteps() {
    if (!this.elements.stepIndicator) return;

    const steps = this.elements.stepIndicator.querySelectorAll('.step-item');
    steps.forEach(step => {
      step.setAttribute('data-status', 'completed');
    });

    console.log('📋 All steps completed');
  }
}

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.TonePilotUIManager = TonePilotUIManager;
  console.log('✅ TonePilotUIManager exported to window');
}