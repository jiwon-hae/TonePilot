# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TonePilot is a Chrome extension that rewrites selected text using Chrome's Built-in AI with different tone presets. It operates entirely on-device with no external API calls.

## Extension Architecture

### Core Components

- **manifest.json**: Chrome MV3 extension configuration with side panel, content scripts, and AI-related permissions
- **background.js**: Service worker that handles context menus, message routing between content script and panel
- **content.js**: Injected into all pages to detect text selection, handle text replacement, and screen capture functionality
- **ui/panel.js**: Main extension UI controller (TonePilotPanel class) managing the side panel interface
- **ui/panel.html**: Side panel UI with dark theme, tone presets, and controls
- **presets.js**: Tone preset definitions and domain-specific adaptations
- **services/storageService.js**: Local storage management for settings and history
- **services/semanticRouting.js**: In-browser semantic intent router using TensorFlow.js

### Message Flow Architecture

1. **Text Selection**: content.js detects selection → sends to background.js → forwards to panel.js
2. **Text Replacement**: panel.js → background.js → content.js replaces original selection
3. **Screen Capture**: panel.js requests → content.js handles area selection → captures via tabCapture API

### Key Classes and Objects

- **TonePilotPanel**: Main UI controller with methods for rewriting, selection handling, and state management
- **StorageManager**: Handles extension settings and rewrite history persistence

## Development Commands

### Testing the Extension
```bash
# Load extension in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select the TonePilot directory
```

### Requirements
- Chrome 121+ with Built-in AI enabled
- Chrome's experimental AI features must be activated

## Technical Constraints

### Chrome Built-in AI Integration
- Uses `window.ai.languageModel`, `window.ai.rewriter`, `window.ai.writer`, `window.ai.summarizer`
- All AI processing happens on-device
- Requires capability checking before use
- Sessions are managed per rewrite operation

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

Built-in presets: concise, diplomatic, executive, friendly, academic

## UI Architecture

### Result Display System
The extension supports two result display modes:

1. **Individual Result Sections** (for textarea input):
   - Creates separate result containers for each submission
   - Each container includes: Query display → Tabs → Content → Actions
   - Multiple submissions stack vertically
   - Independent tab functionality per section

2. **Original Result Section** (for selected text only):
   - Uses the original `resultSection` in panel.html
   - Single result display with tabs for alternatives
   - No query display since no textarea input

### Key UI Methods
- `createNewResultSection()`: Creates individual result containers with query display
- `updateOriginalResultDisplay()`: Updates the original result section for selected text
- `switchIndividualResultTab()`: Handles tab switching within individual sections

### Style Guidelines
- Dark theme with consistent color palette
- Clean, minimal design without heavy borders
- Query text: 20px, bold styling
- Result tabs: Subtle styling without borders
- Individual result sections separated by bottom borders

## Development Notes

### Script Loading Dependencies
Scripts in panel.html must load in order:
1. `storage.js` - Storage utilities
2. `semanticRouting.js` - Intent classification
3. `panel.js` - Main application logic

### Browser Compatibility
- Chrome MV3 extension architecture
- ES6 modules not used - relies on script tags and window globals
- All JavaScript files export to `window` object for browser compatibility

### Common Development Tasks

#### Adding New Tone Presets
Edit `presets.js` and add to `TONE_PRESETS` object with:
- `name`, `description`, `icon`
- `constraints` object (formality, word limits, etc.)
- `systemPrompt` for AI instruction

#### Debugging Extension Issues
1. Open Chrome DevTools on the side panel
2. Check console for initialization errors
3. Verify script loading order in panel.html
4. Ensure all dependencies export to window globals