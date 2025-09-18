# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TonePilot is a Chrome extension that rewrites selected text using Chrome's Built-in AI with different tone presets. It operates entirely on-device with no external API calls.

## Extension Architecture

### Core Components

- **manifest.json**: Chrome MV3 extension configuration with side panel, content scripts, and AI-related permissions
- **src/background.js**: Service worker that handles context menus, message routing between content script and panel
- **src/content.js**: Injected into all pages to detect text selection, handle text replacement, and screen capture functionality
- **src/panel.js**: Main extension UI controller (TonePilotPanel class) managing the side panel interface
- **src/panel.html**: Side panel UI with dark theme, tone presets, and controls
- **src/aiClient.js**: Chrome Built-in AI interface wrapper (AIClient class)
- **src/presets.js**: Tone preset definitions and domain-specific adaptations
- **src/storage.js**: Local storage management for settings and history

### Message Flow Architecture

1. **Text Selection**: content.js detects selection → sends to background.js → forwards to panel.js
2. **Text Replacement**: panel.js → background.js → content.js replaces original selection
3. **Screen Capture**: panel.js requests → content.js handles area selection → captures via tabCapture API

### Key Classes and Objects

- **TonePilotPanel**: Main UI controller with methods for rewriting, selection handling, and state management
- **AIClient**: Chrome Built-in AI wrapper with session management and capability detection
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
- **domain adaptations**: Context-specific preset recommendations (Gmail→diplomatic, LinkedIn→professional)

Built-in presets: concise, diplomatic, executive, friendly, academic