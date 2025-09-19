/**
 * TonePilot Content Script
 * Handles text selection, replacement, and screen capture functionality
 *
 * @fileoverview Content script for TonePilot Chrome extension
 */

/**
 * Content script constants
 * @const {Object}
 */
const CONTENT_CONSTANTS = {
  // Selection types
  SOURCE_TYPES: {
    SELECTION: 'selection',
    INPUT: 'input',
    CONTENT_EDITABLE: 'contentEditable'
  },


  // Screen capture settings
  SCREEN_CAPTURE: {
    OVERLAY_Z_INDEX: 999999,
    SELECTION_BOX_COLOR: 'rgba(0, 123, 255, 0.3)',
    SELECTION_BORDER: '2px solid #007bff',
    MIN_SELECTION_SIZE: 10
  },

  // Message actions
  MESSAGE_ACTIONS: {
    GET_SELECTION: 'getSelection',
    SELECTION_DATA: 'selectionData',
    REPLACE_TEXT: 'replaceText',
    START_SCREEN_CAPTURE: 'startScreenCapture',
    SCREEN_AREA_SELECTED: 'screenAreaSelected'
  },

  // CSS classes
  CSS_CLASSES: {
    SELECTION_OVERLAY: 'tonepilot-selection-overlay',
    SELECTION_BOX: 'tonepilot-selection-box'
  }
};

/**
 * Content script state management
 * @private
 */
let _contentState = {
  lastSelection: null,
  lastRange: null,
  isSelectingArea: false,
  selectionOverlay: null,
  selectionBox: null,
  startCoords: { x: 0, y: 0 }
};

/**
 * Extract selection data from the current page
 * @returns {Object|null} Selection data object or null if no selection
 */
function getSelectionData() {
  try {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText || selectedText.length === 0) {
      return null;
    }

    if (selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    _contentState.lastRange = range.cloneRange();

    const selectionInfo = _analyzeSelection(selection, selectedText);
    const contextInfo = _getPageContext();

    return {
      text: selectedText,
      sourceType: selectionInfo.sourceType,
      domain: window.location.hostname,
      url: window.location.href,
      context: {
        ...selectionInfo.context,
        pageTitle: document.title,
        timestamp: Date.now()
      }
    };
  } catch (error) {
    console.error('Failed to get selection data:', error);
    return null;
  }
}

/**
 * Analyze the current selection and determine its type
 * @private
 * @param {Selection} selection - Browser selection object
 * @param {string} selectedText - Selected text content
 * @returns {Object} Analysis result
 */
function _analyzeSelection(selection, selectedText) {
  const activeElement = document.activeElement;
  const { SOURCE_TYPES } = CONTENT_CONSTANTS;
  let sourceType = SOURCE_TYPES.SELECTION;
  let context = {
    wordCount: selectedText.split(/\s+/).length,
    characterCount: selectedText.length
  };

  // Check for input fields
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    sourceType = SOURCE_TYPES.INPUT;
    context = {
      ...context,
      inputType: activeElement.type || 'text',
      placeholder: activeElement.placeholder || '',
      maxLength: activeElement.maxLength || null
    };
  }
  // Check for contentEditable elements
  else if (activeElement && activeElement.contentEditable === 'true') {
    sourceType = SOURCE_TYPES.CONTENT_EDITABLE;
    context = {
      ...context,
      elementTag: activeElement.tagName.toLowerCase(),
      className: activeElement.className
    };
  }

  return { sourceType, context };
}

/**
 * Get page context information
 * @private
 * @returns {Object} Page context
 */
function _getPageContext() {
  return {
    pageUrl: window.location.href,
    pageTitle: document.title
  };
}

function replaceSelection(newText) {
  if (!_contentState.lastRange) {
    console.error('No stored range for replacement');
    return false;
  }
  
  try {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(_contentState.lastRange);
    
    const activeElement = document.activeElement;
    
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const value = activeElement.value;
      
      activeElement.value = value.substring(0, start) + newText + value.substring(end);
      activeElement.selectionStart = start;
      activeElement.selectionEnd = start + newText.length;
      
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      activeElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const textNode = document.createTextNode(newText);
      range.insertNode(textNode);
      
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      document.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    return true;
  } catch (error) {
    console.error('Failed to replace selection:', error);
    return false;
  }
}

function getPageMedia() {
  console.log('🔍 Scanning page for media...');
  const media = [];

  // Get all images
  const images = document.querySelectorAll('img');
  console.log(`🖼️ Found ${images.length} img elements`);
  images.forEach((img, index) => {
    if (img.src && img.width > 50 && img.height > 50) { // Filter out small images
      // Create unique identifier for the element
      const elementId = `tonepilot-media-${Date.now()}-${index}`;
      img.setAttribute('data-tonepilot-id', elementId);

      media.push({
        type: 'image',
        src: img.src,
        alt: img.alt || `Image ${index + 1}`,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        elementId: elementId,
        element: 'img'
      });
    }
  });

  // Get all videos
  const videos = document.querySelectorAll('video');
  console.log(`🎥 Found ${videos.length} video elements`);
  videos.forEach((video, index) => {
    const elementId = `tonepilot-video-${Date.now()}-${index}`;
    video.setAttribute('data-tonepilot-id', elementId);

    media.push({
      type: 'video',
      src: video.src || (video.currentSrc),
      poster: video.poster,
      alt: `Video ${index + 1}`,
      width: video.videoWidth || video.clientWidth,
      height: video.videoHeight || video.clientHeight,
      duration: video.duration,
      elementId: elementId,
      element: 'video'
    });
  });

  // Get background images from CSS
  const elementsWithBg = document.querySelectorAll('*');
  elementsWithBg.forEach((el, index) => {
    const bgImage = window.getComputedStyle(el).backgroundImage;
    if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
      const url = bgImage.match(/url\(['"]?([^'")]+)['"]?\)/);
      if (url && url[1]) {
        const elementId = `tonepilot-bg-${Date.now()}-${index}`;
        el.setAttribute('data-tonepilot-id', elementId);

        media.push({
          type: 'background',
          src: url[1],
          alt: `Background Image ${index + 1}`,
          width: el.clientWidth,
          height: el.clientHeight,
          elementId: elementId,
          element: 'background'
        });
      }
    }
  });

  console.log(`📊 Total media found: ${media.length}`);
  return media;
}

function scrollToMediaElement(elementId) {
  const element = document.querySelector(`[data-tonepilot-id="${elementId}"]`);
  if (element) {
    // Scroll to element with smooth behavior
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });

    return true;
  }
  return false;
}

function highlightElement(element) {
  // Create highlight overlay
  const highlight = document.createElement('div');
  highlight.style.cssText = `
    position: absolute;
    pointer-events: none;
    border: 3px solid #22c55e;
    border-radius: 8px;
    background: rgba(34, 197, 94, 0.1);
    z-index: 999999;
    transition: opacity 0.3s ease;
  `;

  // Position the highlight over the element
  const rect = element.getBoundingClientRect();
  highlight.style.left = (rect.left + window.scrollX - 3) + 'px';
  highlight.style.top = (rect.top + window.scrollY - 3) + 'px';
  highlight.style.width = (rect.width + 6) + 'px';
  highlight.style.height = (rect.height + 6) + 'px';

  document.body.appendChild(highlight);

  // Remove highlight after 2 seconds
  setTimeout(() => {
    highlight.style.opacity = '0';
    setTimeout(() => {
      if (highlight.parentNode) {
        highlight.parentNode.removeChild(highlight);
      }
    }, 300);
  }, 2000);
}

// Log that content script is loaded
console.log('🚀 TonePilot content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🎯 Content script received message:', message);

  if (message.action === 'getSelection') {
    const selectionData = getSelectionData();
    if (selectionData) {
      chrome.runtime.sendMessage({
        action: 'selectionData',
        data: selectionData
      });
    }
    sendResponse({ success: !!selectionData });
  }

  if (message.action === 'replaceSelection') {
    const success = replaceSelection(message.newText);
    sendResponse({ success });
  }

  if (message.action === 'getCurrentSelection') {
    const selectionData = getSelectionData();
    sendResponse({ data: selectionData });
  }

  if (message.action === 'startScreenAreaSelection') {
    startScreenAreaSelection();
    sendResponse({ success: true });
  }

  if (message.action === 'getPageMedia') {
    console.log('📸 Getting page media...');
    const mediaData = getPageMedia();
    console.log('📸 Found media:', mediaData);
    sendResponse({ media: mediaData });
  }

  if (message.action === 'scrollToMedia') {
    const success = scrollToMediaElement(message.elementId);
    sendResponse({ success });
  }

  return true;
});

document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  if (selection.toString().trim()) {
    console.log('Content script detected text selection:', selection.toString());
    const selectionData = getSelectionData();
    _contentState.lastSelection = selectionData;

    // Automatically send selection to panel
    if (selectionData) {
      console.log('Sending selection data to background:', selectionData);
      chrome.runtime.sendMessage({
        action: 'selectionData',
        data: selectionData
      });
    }
  }
});

document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  if (selection.toString().trim()) {
    console.log('Content script detected selection change:', selection.toString());
    const selectionData = getSelectionData();
    _contentState.lastSelection = selectionData;

    // Automatically send selection to panel
    if (selectionData) {
      chrome.runtime.sendMessage({
        action: 'selectionData',
        data: selectionData
      });
    }
  } else {
    // Text was deselected - clear the selection
    console.log('Content script detected text deselection');
    _contentState.lastSelection = null;
    _contentState.lastRange = null;

    // Send clear message to panel
    chrome.runtime.sendMessage({
      action: 'clearSelection'
    });
  }
});

// Screen Area Selection Functions
function startScreenAreaSelection() {
  if (isSelectingArea) return;

  isSelectingArea = true;

  // Create overlay
  selectionOverlay = document.createElement('div');
  selectionOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999999;
    cursor: crosshair;
    user-select: none;
  `;

  // Create selection box
  selectionBox = document.createElement('div');
  selectionBox.style.cssText = `
    position: absolute;
    border: 2px dashed #22c55e;
    background: rgba(34, 197, 94, 0.1);
    display: none;
    pointer-events: none;
  `;

  // Add instructions
  const instructions = document.createElement('div');
  instructions.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 1000000;
  `;
  instructions.textContent = 'Click and drag to select an area to capture. Press ESC to cancel.';

  selectionOverlay.appendChild(selectionBox);
  selectionOverlay.appendChild(instructions);
  document.body.appendChild(selectionOverlay);

  // Add event listeners
  selectionOverlay.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keydown', handleKeyDown);

  // Prevent page scrolling
  document.body.style.overflow = 'hidden';
}

function handleMouseDown(e) {
  if (!isSelectingArea) return;

  startX = e.clientX;
  startY = e.clientY;

  selectionBox.style.left = startX + 'px';
  selectionBox.style.top = startY + 'px';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  selectionBox.style.display = 'block';
}

function handleMouseMove(e) {
  if (!isSelectingArea || !selectionBox.style.display === 'block') return;

  const currentX = e.clientX;
  const currentY = e.clientY;

  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);

  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
}

function handleMouseUp(e) {
  if (!isSelectingArea) return;

  const rect = selectionBox.getBoundingClientRect();

  // Check if we have a valid selection (minimum 10x10 pixels)
  if (rect.width > 10 && rect.height > 10) {
    const selectionData = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };

    // Send selection data to extension
    chrome.runtime.sendMessage({
      action: 'screenAreaSelected',
      data: selectionData
    });
  }

  endScreenAreaSelection();
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    endScreenAreaSelection();
  }
}

function endScreenAreaSelection() {
  if (!isSelectingArea) return;

  isSelectingArea = false;

  // Remove overlay
  if (selectionOverlay) {
    document.body.removeChild(selectionOverlay);
    selectionOverlay = null;
    selectionBox = null;
  }

  // Remove event listeners
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('keydown', handleKeyDown);

  // Restore page scrolling
  document.body.style.overflow = '';
}