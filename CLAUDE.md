# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TonePilot is a Chrome extension that rewrites selected text with different tone presets. The extension is designed to work with Chrome's Built-in AI but can operate in fallback modes. It features semantic intent routing and operates primarily on-device.

## Extension Architecture

### Core Components

- **manifest.json**: Chrome MV3 extension configuration with side panel, content scripts, and AI-related permissions
- **src/background.js**: Service worker that handles context menus, message routing between content script and panel
- **src/content.js**: Injected into all pages to detect text selection, handle text replacement, and screen capture functionality
- **src/panel.js**: Main extension UI controller (TonePilotPanel class) managing the side panel interface
- **src/panel.html**: Side panel UI with dark theme, tone presets, and controls
- **src/presets.js**: Tone preset definitions and domain-specific adaptations
- **src/storage.js**: Local storage management for settings and history
- **src/semanticRouting.js**: In-browser semantic intent router using TensorFlow.js and Universal Sentence Encoder for classifying user intents (proofread, revise, draft)

### Message Flow Architecture

1. **Text Selection**: content.js detects selection → sends to background.js → forwards to panel.js
2. **Text Replacement**: panel.js → background.js → content.js replaces original selection
3. **Screen Capture**: panel.js requests → content.js handles area selection → captures via tabCapture API

### Key Classes and Objects

- **TonePilotPanel**: Main UI controller with methods for rewriting, selection handling, and state management
- **StorageManager**: Handles extension settings and rewrite history persistence

### Script Loading Dependencies

Scripts must be loaded in this order in panel.html:
1. `presets.js` - Defines tone presets and exports to window globals
2. `storage.js` - Provides StorageManager class
3. `panel.js` - Main application logic

## Development Commands

### Testing the Extension
```bash
# Load extension in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select the TonePilot directory
```

### Requirements
- Chrome 121+ for side panel support
- Modern browser with ES6+ support

## Technical Constraints

### Browser Compatibility
- Chrome MV3 extension architecture
- ES6 modules not used - relies on script tags and window globals
- All JavaScript files export to `window` object for browser compatibility

### Extension Permissions
- `activeTab`: Access current tab for text selection/replacement
- `scripting`: Inject content scripts
- `contextMenus`: Right-click "TonePilot: Rewrite..." option
- `storage`: Persist settings and history
- `sidePanel`: Main UI interface
- `tabCapture`/`desktopCapture`: Screen area selection for image context

### Content Script Injection
- Runs on `<all_urls>` at `document_idle`
- Handles text selection detection via `mouseup` and `selectionchange` events
- Manages text replacement in input fields, textareas, and contentEditable elements
- Provides screen area selection overlay functionality

## Tone Presets System

Presets are defined in `presets.js` with:
- **constraints**: Technical parameters (word limits, formality, structure)
- **systemPrompt**: AI instruction for the rewrite
- **domain adaptations**: Context-specific preset recommendations (Gmail→diplomatic, LinkedIn→professional)

Built-in presets: concise, diplomatic, executive, friendly, academic

## Semantic Intent Routing

The extension includes an advanced semantic routing system that classifies user intents:

### Intent Categories
- **proofread**: Grammar and spelling corrections
- **revise**: Tone and style improvements
- **draft**: Creating new content from scratch
- **other**: Fallback for unclassified intents

### Technical Implementation
- Uses TensorFlow.js with Universal Sentence Encoder for semantic similarity
- Pre-embeds example prompts for each intent category
- Includes keyword fallback for low-confidence classifications
- Configurable similarity threshold (default: 0.65)

### Usage in Code
```javascript
await initSemanticRouter();
const result = await routeIntent("Revise this to be concise");
// Returns: { intent: "revise", score: 0.79, averages: {...} }
```

## Development Notes

### Current State (Hybrid Implementation)
- Extension is designed for Chrome Built-in AI but `aiClient.js` file is missing
- `panel.js` references AIClient but should handle graceful degradation
- Semantic routing provides intent classification independent of AI backend
- UI supports preset selection and mock rewriting for testing

### Common Development Tasks

#### Adding New Tone Presets
Edit `src/presets.js` and add to `TONE_PRESETS` object with:
- `name`, `description`, `icon`
- `constraints` object (formality, word limits, etc.)
- `systemPrompt` for AI instruction

#### Debugging Extension Issues
1. Open Chrome DevTools on the side panel
2. Check console for initialization errors
3. Verify script loading order in panel.html
4. Ensure all dependencies export to window globals

#### Script Dependencies
All JavaScript files use this pattern for browser compatibility:
```javascript
// Browser global export
if (typeof window !== 'undefined') {
  window.ClassName = ClassName;
}
```