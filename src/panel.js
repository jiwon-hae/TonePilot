class TonePilotPanel {
  constructor() {
    this.aiClient = new AIClient();
    this.storage = new StorageManager();
    this.currentSelection = null;
    this.currentResults = null;
    this.selectedPreset = 'diplomatic';
    
    this.elements = {};
    this.initializeElements();
    this.bindEvents();
    this.initialize();
  }

  initializeElements() {
    this.elements = {
      status: document.getElementById('status'),
      inputText: document.getElementById('inputText'),
      inputContainer: document.querySelector('.input-container'),
      contextInfo: document.getElementById('contextInfo'),
      presets: document.getElementById('presets'),
      lengthSlider: document.getElementById('lengthSlider'),
      formalityToggle: document.getElementById('formalityToggle'),
      rewriteBtn: document.getElementById('rewriteBtn'),
      clearBtn: document.getElementById('clearBtn'),
      loading: document.getElementById('loading'),
      error: document.getElementById('error'),
      resultSection: document.getElementById('resultSection'),
      resultContent: document.getElementById('resultContent'),
      replaceBtn: document.getElementById('replaceBtn'),
      copyBtn: document.getElementById('copyBtn'),
      captureBtn: document.getElementById('captureBtn'),
      websiteInfo: document.getElementById('websiteInfo'),
      websiteName: document.getElementById('websiteName'),
      websiteUrl: document.getElementById('websiteUrl'),
      selectedTextDisplay: document.getElementById('selectedTextDisplay'),
      selectedTextContent: document.getElementById('selectedTextContent'),
      clearSelectedBtn: document.getElementById('clearSelectedBtn'),
      textInputWrapper: document.getElementById('textInputWrapper'),
      sourcesPanel: document.getElementById('sourcesPanel'),
      mediaGrid: document.getElementById('mediaGrid'),
      mediaCount: document.getElementById('mediaCount'),
      selectMediaBtn: document.getElementById('selectMediaBtn'),
      selectedMediaDisplay: document.getElementById('selectedMediaDisplay'),
      selectedMediaGrid: document.getElementById('selectedMediaGrid'),
      removeSelectedMediaBtn: document.getElementById('removeSelectedMediaBtn')
    };

    // Add captured image property
    this.capturedImageData = null;

    // Track selected media thumbnails (now supports multiple)
    this.selectedMediaIds = new Set();
    this.selectedMediaItems = new Map();
    this.selectedMediaArray = [];
  }

  async initialize() {
    try {
      this.updateStatus('loading', 'Initializing AI...');

      await this.storage.initialize();
      const aiReady = await this.aiClient.initialize();

      if (aiReady) {
        const status = this.aiClient.getStatus();
        const availableCapabilities = status.capabilities;

        if (availableCapabilities.length > 0) {
          this.updateStatus('ready', `Ready (${availableCapabilities.length} models)`);
        } else {
          this.updateStatus('warning', 'Limited functionality');
          this.showError('AI models are downloading. Some features may be limited until download completes.', 'warning');
        }
      } else {
        this.updateStatus('error', 'AI unavailable');
        this.showError('Chrome Built-in AI is not available. Please ensure you\'re using Chrome 128+ with AI features enabled.');
      }

      this.renderPresets();
      this.loadSettings();
      this.updateWebsiteInfo();
      this.checkForCurrentSelection();

    } catch (error) {
      console.error('Initialization failed:', error);
      this.updateStatus('error', 'Initialization failed');
      this.showError('Failed to initialize TonePilot. Please refresh the panel and try again.');
    }
  }

  bindEvents() {
    this.elements.rewriteBtn.addEventListener('click', () => this.handleRewrite());
    this.elements.clearBtn.addEventListener('click', () => this.handleClear());
    this.elements.replaceBtn.addEventListener('click', () => this.handleReplace());
    this.elements.copyBtn.addEventListener('click', () => this.handleCopy());
    this.elements.captureBtn.addEventListener('click', () => this.handleScreenCapture());
    this.elements.clearSelectedBtn.addEventListener('click', () => this.clearSelectedText());
    this.elements.selectMediaBtn.addEventListener('click', () => this.handleSelectMedia());
    this.elements.removeSelectedMediaBtn.addEventListener('click', () => this.removeSelectedMedia());

    this.elements.lengthSlider.addEventListener('input', (e) => {
      this.updateLengthDisplay(e.target.value);
    });

    chrome.runtime.onMessage.addListener((message) => {
      console.log('Panel received message:', message);
      if (message.action === 'newSelection') {
        this.handleNewSelection(message.data);
      }
      if (message.action === 'screenAreaSelected') {
        this.handleScreenAreaSelected(message.data);
      }
      if (message.action === 'clearSelection') {
        this.handleClearSelection();
      }
    });

    // Listen for tab updates to refresh website info
    chrome.tabs.onActivated.addListener(() => {
      this.updateWebsiteInfo();
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'complete') {
        this.updateWebsiteInfo();
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('result-tab')) {
        this.switchResultTab(e.target.dataset.tab);
      }
      if (e.target.classList.contains('tab-btn')) {
        this.handleTabSwitch(e.target);
      }
    });

    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  cleanup() {
    if (this.aiClient) {
      this.aiClient.reset();
    }
  }

  renderPresets() {
    const presets = getAllPresets();
    this.elements.presets.innerHTML = '';
    
    presets.forEach(preset => {
      const button = document.createElement('button');
      button.className = `preset-btn ${preset.key === this.selectedPreset ? 'active' : ''}`;
      button.dataset.preset = preset.key;
      
      button.innerHTML = `
        <span class="preset-icon">${preset.icon}</span>
        <span class="preset-name">${preset.name}</span>
        <div class="preset-desc">${preset.description}</div>
      `;
      
      button.addEventListener('click', () => this.selectPreset(preset.key));
      this.elements.presets.appendChild(button);
    });
  }

  selectPreset(presetKey) {
    this.selectedPreset = presetKey;
    
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetKey);
    });
    
    this.storage.saveSetting('defaultPreset', presetKey);
  }

  async loadSettings() {
    const defaultPreset = await this.storage.getSetting('defaultPreset', 'diplomatic');
    const formalityPreference = await this.storage.getSetting('formalityPreference', false);
    const lengthPreference = await this.storage.getSetting('lengthPreference', 2);
    
    this.selectPreset(defaultPreset);
    this.elements.formalityToggle.checked = formalityPreference;
    this.elements.lengthSlider.value = lengthPreference;
    this.updateLengthDisplay(lengthPreference);
  }

  handleNewSelection(selectionData) {
    console.log('Panel received selection data:', selectionData);

    this.currentSelection = selectionData;
    // Don't populate the input text box - keep it empty for user instructions

    // Show selected text display
    this.elements.selectedTextContent.textContent = selectionData.text;
    this.elements.selectedTextDisplay.style.display = 'block';
    this.elements.inputContainer.classList.add('has-selected-text');
    console.log('Selected text display should now be visible');

    this.elements.contextInfo.style.display = 'block';
    this.elements.contextInfo.textContent = `From ${selectionData.domain} • ${selectionData.domainContext} context`;

    const domainAdaptation = getDomainAdaptation(selectionData.domain);
    if (domainAdaptation && domainAdaptation.defaultPreset) {
      this.selectPreset(domainAdaptation.defaultPreset);
    }

    this.hideError();
    this.hideResults();
  }

  async handleRewrite() {
    // Use selected text if available, otherwise use input text
    const text = this.currentSelection ? this.currentSelection.text : this.elements.inputText.value.trim();
    if (!text) {
      this.showError('Please select text on the page or enter text to rewrite.');
      return;
    }

    if (!this.aiClient.isReady) {
      this.showError('AI client is not ready. Please wait for initialization to complete.');
      return;
    }

    if (text.length > 4000) {
      this.showError('Text is too long. Please keep it under 4000 characters.');
      return;
    }

    try {
      this.showLoading();
      this.hideError();
      this.hideResults();

      const preset = getPresetByName(this.selectedPreset);
      const context = this.currentSelection || { domainContext: 'general' };

      // Add captured image to context if available
      if (this.capturedImageData) {
        context.image = this.capturedImageData;
      }

      const adjustedPreset = this.adjustPresetForControls(preset);
      const results = await this.aiClient.rewriteText(text, adjustedPreset, context);

      this.currentResults = results;
      this.showResults(results);

      await this.storage.saveRewrite({
        originalText: text,
        rewrittenText: results.primary,
        preset: this.selectedPreset,
        domain: context.domain || 'unknown',
        metadata: results.metadata
      });

    } catch (error) {
      console.error('Rewrite failed:', error);
      if (error.message.includes('downloading')) {
        this.showError('AI model is downloading. Please try again in a moment.', 'warning');
      } else if (error.message.includes('too long')) {
        this.showError(error.message);
      } else if (error.message.includes('not available')) {
        this.showError('AI model temporarily unavailable. Please try again.');
      } else {
        this.showError('Failed to rewrite text. Please try again.');
      }
    } finally {
      this.hideLoading();
    }
  }

  adjustPresetForControls(preset) {
    const adjusted = JSON.parse(JSON.stringify(preset));
    
    const lengthValue = parseInt(this.elements.lengthSlider.value);
    if (lengthValue === 1) {
      adjusted.constraints.sentenceMax = 1;
      adjusted.constraints.wordLimit = 25;
    } else if (lengthValue === 3) {
      adjusted.constraints.sentenceMax = 5;
      adjusted.constraints.wordLimit = 150;
    }
    
    if (this.elements.formalityToggle.checked) {
      adjusted.constraints.formality = 'formal';
    } else {
      adjusted.constraints.formality = 'casual';
    }
    
    return adjusted;
  }

  showResults(results) {
    this.elements.resultSection.classList.add('visible');
    
    const tabs = document.querySelectorAll('.result-tab');
    tabs[0].style.display = 'block';
    tabs[1].style.display = results.alternatives[0] ? 'block' : 'none';
    tabs[2].style.display = results.alternatives[1] ? 'block' : 'none';
    
    this.switchResultTab('primary');
  }

  switchResultTab(tabName) {
    document.querySelectorAll('.result-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    let content = '';
    if (tabName === 'primary') {
      content = this.currentResults.primary;
    } else if (tabName === 'alt1') {
      content = this.currentResults.alternatives[0] || '';
    } else if (tabName === 'alt2') {
      content = this.currentResults.alternatives[1] || '';
    }
    
    this.elements.resultContent.textContent = content;
  }

  async handleReplace() {
    if (!this.currentResults || !this.currentSelection) {
      this.showError('No text to replace. Please select text on the page first.');
      return;
    }

    const activeTab = document.querySelector('.result-tab.active').dataset.tab;
    let textToReplace = '';
    
    if (activeTab === 'primary') {
      textToReplace = this.currentResults.primary;
    } else if (activeTab === 'alt1') {
      textToReplace = this.currentResults.alternatives[0];
    } else if (activeTab === 'alt2') {
      textToReplace = this.currentResults.alternatives[1];
    }

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'replaceSelection',
        newText: textToReplace
      });
      
      if (response.success) {
        this.showError('Text replaced successfully!', 'success');
        setTimeout(() => this.hideError(), 2000);
      } else {
        this.showError('Failed to replace text. Please try selecting the text again.');
      }
    } catch (error) {
      console.error('Replace failed:', error);
      this.showError('Failed to replace text. Please ensure the original page is still active.');
    }
  }

  async handleCopy() {
    const activeTab = document.querySelector('.result-tab.active').dataset.tab;
    let textToCopy = '';
    
    if (activeTab === 'primary') {
      textToCopy = this.currentResults.primary;
    } else if (activeTab === 'alt1') {
      textToCopy = this.currentResults.alternatives[0];
    } else if (activeTab === 'alt2') {
      textToCopy = this.currentResults.alternatives[1];
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      this.showError('Text copied to clipboard!', 'success');
      setTimeout(() => this.hideError(), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      this.showError('Failed to copy text to clipboard.');
    }
  }

  handleClear() {
    // Only clear input if user wants to clear everything
    this.elements.inputText.value = '';
    this.hideResults();
    this.hideError();
    this.elements.contextInfo.style.display = 'none';
    this.elements.selectedTextDisplay.style.display = 'none';
    this.elements.inputContainer.classList.remove('has-selected-text');
    this.currentSelection = null;
    this.currentResults = null;
    this.removeSelectedMedia(); // Clear both captured image and selected media
  }

  clearSelectedText() {
    this.elements.selectedTextDisplay.style.display = 'none';
    this.elements.inputContainer.classList.remove('has-selected-text');
    this.elements.contextInfo.style.display = 'none';
    this.currentSelection = null;
  }

  handleClearSelection() {
    console.log('Panel clearing selection due to deselection on webpage');
    this.clearSelectedText();
  }

  updateStatus(type, text) {
    this.elements.status.className = `status-badge status-${type}`;
    this.elements.status.textContent = text;
  }

  updateLengthDisplay(value) {
    const labels = ['Short', 'Medium', 'Long'];
    const label = labels[value - 1] || 'Medium';
    
    this.storage.saveSetting('lengthPreference', parseInt(value));
  }

  showLoading() {
    this.elements.loading.style.display = 'flex';
    this.elements.rewriteBtn.disabled = true;
  }

  hideLoading() {
    this.elements.loading.style.display = 'none';
    this.elements.rewriteBtn.disabled = false;
  }

  showError(message, type = 'error') {
    this.elements.error.textContent = message;
    this.elements.error.style.display = 'block';
    this.elements.error.className = `alert alert-${type}`;

    if (type === 'success' || type === 'warning') {
      setTimeout(() => this.hideError(), 4000);
    }
  }

  hideError() {
    this.elements.error.style.display = 'none';
  }

  showResults() {
    this.elements.resultSection.classList.add('visible');
  }

  hideResults() {
    this.elements.resultSection.classList.remove('visible');
  }

  async handleScreenCapture() {
    try {
      // Start area selection on the current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      // Send message to content script to start area selection
      await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startScreenAreaSelection'
      });

      // Add temporary storage for selection data
      this.pendingCaptureData = null;

    } catch (error) {
      console.error('Screen capture failed:', error);
      this.showError('Failed to start screen capture. Please try again.');
    }
  }

  async handleScreenAreaSelected(selectionData) {
    try {
      // Get the current tab to capture
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      // Use chrome.tabCapture to capture the tab
      const stream = await new Promise((resolve, reject) => {
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

      // Create video element to capture the frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      video.addEventListener('loadedmetadata', () => {
        // Create canvas for cropping
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to the selected area
        canvas.width = selectionData.width;
        canvas.height = selectionData.height;

        // Calculate scaling factor between video and viewport
        const scaleX = video.videoWidth / window.innerWidth;
        const scaleY = video.videoHeight / window.innerHeight;

        // Draw the cropped area
        ctx.drawImage(
          video,
          selectionData.x * scaleX, // source x
          selectionData.y * scaleY, // source y
          selectionData.width * scaleX, // source width
          selectionData.height * scaleY, // source height
          0, // destination x
          0, // destination y
          selectionData.width, // destination width
          selectionData.height // destination height
        );

        // Convert to data URL
        const dataURL = canvas.toDataURL('image/png');
        this.displayCapturedImage(dataURL);

        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
      });

    } catch (error) {
      console.error('Area capture failed:', error);
      this.showError('Failed to capture selected area. Please try again.');
    }
  }

  displayCapturedImage(dataURL) {
    this.capturedImageData = dataURL;

    // Clear any selected media since we're showing a captured image
    this.selectedMediaArray = [];
    this.selectedMediaIds.clear();
    this.selectedMediaItems.clear();

    // Show the captured image in the grid
    this.elements.selectedMediaDisplay.style.display = 'block';
    this.elements.selectedMediaGrid.innerHTML = '';

    // Create thumbnail for captured image
    const mediaItem = document.createElement('div');
    mediaItem.className = 'selected-media-item';

    const thumbnail = document.createElement('img');
    thumbnail.className = 'selected-media-thumbnail';
    thumbnail.src = dataURL;
    thumbnail.alt = 'Captured screen';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'selected-media-item-remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove captured image';
    removeBtn.onclick = () => this.removeImage();

    mediaItem.appendChild(thumbnail);
    mediaItem.appendChild(removeBtn);
    this.elements.selectedMediaGrid.appendChild(mediaItem);

    // Update placeholder text to indicate image is included
    this.elements.inputText.placeholder = 'Describe what you want to know about the image or add additional context...';

    this.showError('Screen captured! You can now ask questions about the image.', 'success');
  }

  removeImage() {
    this.capturedImageData = null;
    this.elements.inputText.placeholder = 'Tell me what to do...';

    // If there's no selected media either, hide the display
    if (this.selectedMediaArray.length === 0) {
      this.elements.selectedMediaDisplay.style.display = 'none';
    } else {
      // Redisplay selected media without the captured image
      this.displaySelectedMediaInAssistant(this.selectedMediaArray);
    }
  }

  async updateWebsiteInfo() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (currentTab && currentTab.url) {
        const url = new URL(currentTab.url);
        const hostname = url.hostname;

        // Update the display elements
        this.elements.websiteName.textContent = currentTab.title || hostname;
        this.elements.websiteUrl.textContent = hostname;
        this.elements.websiteInfo.style.display = 'flex';
      }
    } catch (error) {
      console.error('Error getting website info:', error);
      // Hide website info if there's an error
      this.elements.websiteInfo.style.display = 'none';
    }
  }

  async checkForCurrentSelection() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (currentTab && currentTab.id) {
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'getCurrentSelection'
        });

        if (response && response.data) {
          this.handleNewSelection(response.data);
        }
      }
    } catch (error) {
      console.log('No current selection or content script not ready');
    }
  }

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

  showSourcesPanel() {
    this.elements.sourcesPanel.style.display = 'block';
    // Hide other panels
    this.elements.textInputWrapper.style.display = 'none';
    document.getElementById('presets').style.display = 'none';
    document.querySelector('.controls').style.display = 'none';
    document.querySelector('.action-buttons').style.display = 'none';
  }

  hideSourcesPanel() {
    this.elements.sourcesPanel.style.display = 'none';
    // Show other panels
    this.elements.textInputWrapper.style.display = 'block';
    document.getElementById('presets').style.display = 'grid';
    document.querySelector('.controls').style.display = 'flex';
    document.querySelector('.action-buttons').style.display = 'flex';
  }

  async loadPageMedia() {
    // Clear any existing selection when loading new media
    this.clearMediaSelection();

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (currentTab && currentTab.id) {
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'getPageMedia'
        });

        if (response && response.media) {
          this.displayMedia(response.media);
        }
      }
    } catch (error) {
      console.error('Failed to load page media:', error);
      this.elements.mediaGrid.innerHTML = '<div style="text-align: center; color: #71717a; padding: 20px;">Failed to load media from this page.</div>';
    }
  }

  displayMedia(mediaArray) {
    this.elements.mediaCount.textContent = `${mediaArray.length} items`;

    if (mediaArray.length === 0) {
      this.elements.mediaGrid.innerHTML = '<div style="text-align: center; color: #71717a; padding: 20px;">No media found on this page.</div>';
      return;
    }

    this.elements.mediaGrid.innerHTML = '';

    mediaArray.forEach((media, index) => {
      const mediaItem = document.createElement('div');
      mediaItem.className = 'media-item';
      mediaItem.dataset.mediaId = media.elementId;
      mediaItem.onclick = () => this.handleMediaClick(media, mediaItem);
      mediaItem.title = `Click to scroll to this ${media.type} on the page`;

      let thumbnailHtml = '';
      if (media.type === 'video') {
        thumbnailHtml = `
          <img class="media-thumbnail" src="${media.poster || media.src}" alt="${media.alt}" onerror="this.style.display='none'">
          <div class="video-overlay">▶</div>
        `;
      } else {
        thumbnailHtml = `<img class="media-thumbnail" src="${media.src}" alt="${media.alt}" onerror="this.style.display='none'">`;
      }

      mediaItem.innerHTML = `
        ${thumbnailHtml}
        <div class="media-info">
          <div class="media-type">${media.type}</div>
          <div class="media-title">${media.alt}</div>
          <div class="media-dimensions">${media.width} × ${media.height}</div>
        </div>
      `;

      this.elements.mediaGrid.appendChild(mediaItem);
    });
  }

  async handleMediaClick(media, mediaItem) {
    // Toggle selection instead of clearing previous selections
    if (mediaItem.classList.contains('selected')) {
      // Deselect this item
      mediaItem.classList.remove('selected');
      this.removeFromSelectedMedia(media.elementId);
    } else {
      // Select this item
      mediaItem.classList.add('selected');
      this.addToSelectedMedia(media);
    }

    // Update select button visibility based on selection count
    this.updateSelectButtonVisibility();

    // Scroll to the media element on the webpage
    if (media.elementId) {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];

        if (currentTab && currentTab.id) {
          const response = await chrome.tabs.sendMessage(currentTab.id, {
            action: 'scrollToMedia',
            elementId: media.elementId
          });
        }
      } catch (error) {
        console.error('Failed to scroll to media:', error);
        this.showError('Media selected but failed to scroll', 'error');
      }
    }
  }

  addToSelectedMedia(media) {
    this.selectedMediaIds.add(media.elementId);
    this.selectedMediaItems.set(media.elementId, media);
  }

  removeFromSelectedMedia(elementId) {
    this.selectedMediaIds.delete(elementId);
    this.selectedMediaItems.delete(elementId);
  }

  updateSelectButtonVisibility() {
    if (this.selectedMediaIds.size > 0) {
      this.elements.selectMediaBtn.style.display = 'inline-block';
      // Update button text to show count
      const count = this.selectedMediaIds.size;
      this.elements.selectMediaBtn.textContent = `Select Media (${count})`;
    } else {
      this.elements.selectMediaBtn.style.display = 'none';
      this.elements.selectMediaBtn.textContent = 'Select Media';
    }
  }

  clearMediaSelection() {
    // Remove selected class from all media items
    const selectedItems = this.elements.mediaGrid.querySelectorAll('.media-item.selected');
    selectedItems.forEach(item => {
      item.classList.remove('selected');
    });

    // Clear selection tracking
    this.selectedMediaIds.clear();
    this.selectedMediaItems.clear();

    // Hide the select media button
    this.updateSelectButtonVisibility();
  }

  handleSelectMedia() {
    if (this.selectedMediaIds.size === 0) {
      this.showError('No media selected', 'error');
      return;
    }

    // Switch back to Assistant tab
    const assistantTab = document.querySelector('.tab-btn:first-child');
    this.handleTabSwitch(assistantTab);

    // Store the selected media for display in assistant tab
    const selectedMediaArray = Array.from(this.selectedMediaItems.values());
    this.displaySelectedMediaInAssistant(selectedMediaArray);

    const count = this.selectedMediaIds.size;
    this.showError(`${count} media item${count > 1 ? 's' : ''} selected successfully!`, 'success');
  }

  displaySelectedMediaInAssistant(mediaArray) {
    // Clear any captured image since we're showing selected media
    this.capturedImageData = null;

    if (mediaArray.length === 0) {
      this.elements.selectedMediaDisplay.style.display = 'none';
      return;
    }

    // Show the selected media display
    this.elements.selectedMediaDisplay.style.display = 'block';

    // Clear the grid
    this.elements.selectedMediaGrid.innerHTML = '';

    // Create thumbnail for each selected media
    mediaArray.forEach((media, index) => {
      const mediaItem = document.createElement('div');
      mediaItem.className = 'selected-media-item';
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
      this.elements.selectedMediaGrid.appendChild(mediaItem);
    });

    // Store the full array for AI processing
    this.selectedMediaArray = mediaArray;

    // Reset placeholder if it was changed for image capture
    this.elements.inputText.placeholder = 'Tell me what to do...';

    console.log('Displaying selected media in assistant tab:', mediaArray);
  }

  removeSpecificMedia(index) {
    // Remove from the array
    this.selectedMediaArray.splice(index, 1);

    // If no media left, hide the display
    if (this.selectedMediaArray.length === 0) {
      this.elements.selectedMediaDisplay.style.display = 'none';
    } else {
      // Redisplay with remaining media
      this.displaySelectedMediaInAssistant(this.selectedMediaArray);
    }
  }

  removeSelectedMedia() {
    // Clear both captured image and selected media
    this.capturedImageData = null;
    this.selectedMediaArray = [];

    // Clear the selection tracking
    this.selectedMediaIds.clear();
    this.selectedMediaItems.clear();

    // Hide the selected media display
    this.elements.selectedMediaDisplay.style.display = 'none';

    // Reset placeholder text
    this.elements.inputText.placeholder = 'Tell me what to do...';

    // Clear media selection in sources panel if visible
    this.clearMediaSelection();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TonePilotPanel();
});