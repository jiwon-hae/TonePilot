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

### Modular UI Architecture

The UI is built with a modular architecture where each manager handles specific responsibilities:

- **ui/modules/constants.js**: Shared constants and configuration (TONEPILOT_CONSTANTS)
- **ui/modules/stateManager.js**: Application state management (TonePilotStateManager)
- **ui/modules/uiManager.js**: DOM manipulation, events, and UI state (TonePilotUIManager)
- **ui/modules/messageHandler.js**: Chrome extension message routing (TonePilotMessageHandler)
- **ui/modules/settingsManager.js**: Settings UI and persistence (TonePilotSettingsManager)
- **ui/modules/aiServicesManager.js**: AI service coordination and fallbacks (TonePilotAIServicesManager)

### AI Services Layer

- **services/aiSetupService.js**: AI capability detection and status reporting
- **services/proofreaderService.js**: Chrome Built-in Proofreader API wrapper
- **services/rewriterService.js**: Chrome Built-in Rewriter API wrapper
- **services/summarizerService.js**: Chrome Built-in Summarizer API wrapper
- **services/writerService.js**: Chrome Built-in Writer API wrapper
- **services/translationService.js**: Chrome Translation API and Language Detection API wrapper (Chrome 138+)
- **services/promptService.js**: Direct language model API wrapper for fallback scenarios

### Message Flow Architecture

1. **Text Selection**: content.js detects selection → sends to background.js → forwards to panel.js
2. **Text Replacement**: panel.js → background.js → content.js replaces original selection
3. **Screen Capture**: panel.js requests → content.js handles area selection → captures via tabCapture API

### Key Classes and Objects

- **TonePilotPanel**: Main UI controller with methods for rewriting, selection handling, and state management
- **TonePilotUIManager**: Handles DOM manipulation, events, and UI state
- **TonePilotAIServicesManager**: Manages all AI service interactions and processing
- **TonePilotStateManager**: Centralized application state management

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

Uses Chrome's Built-in AI APIs (global objects, not `window.ai` namespace):
- `LanguageModel`: Direct language model access for prompts
- `Rewriter`: Text rewriting with tone control
- `Writer`: Content generation with context
- `Summarizer`: Text summarization (key-points, headlines, tl;dr)
- `Proofreader`: Grammar and spelling correction
- `Translator`: Language translation (Chrome 138+)
- `LanguageDetector`: Auto-detect text language (Chrome 138+)

**Important API details**:
- All processing happens on-device with Gemini Nano
- APIs are global objects (e.g., `self.LanguageModel`), not under `window.ai`
- Requires capability checking via `.availability()` before use
- Each service creates sessions that must be destroyed after use
- Fallback to LanguageModel if specialized APIs unavailable

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

## Semantic Routing and Intent Detection

The extension uses pattern-based semantic routing to detect user intent and route to appropriate AI services:

- **Patterns**: Fast regex matching for intents (proofread, rewrite, write, summarize, translate)
- **Translation intent**: Detects "translate", "translation", "to [language]" patterns
- **Target language extraction**: Parses user input for explicit language targets (e.g., "translate to Spanish")
- **Fallback**: Unmatched queries default to 'rewrite' intent

### Translation System

Two modes of translation:

1. **Toggle Button Mode**: User enables translate button → any AI output is post-processed for translation to target language from settings
2. **Explicit Request Mode**: User says "translate this to [language]" → semantic router detects translate intent → extracts target language from input → translates directly

Translation flow:
- Auto-detects source language using LanguageDetector API
- Skips translation if source and target languages match
- Falls back to language model if Chrome Translation API unavailable
- Supports 30+ languages with BCP 47 codes

### AI Processing Pipeline

Text processing flow in `aiServicesManager.processText()`:

1. **Semantic Routing**: Input text analyzed for intent (proofread/summarize/rewrite/write/translate)
2. **Service Selection**: Route to appropriate handler based on intent
3. **API Execution**: Call Chrome Built-in AI service or fallback to LanguageModel
4. **Post-Processing Translation**: If translate mode enabled AND intent wasn't already translate, apply translation to result
5. **Result Return**: Unified result object with `primary`, `type`, `service`, metadata

**Critical**: When intent is `translate`, post-processing translation is skipped to avoid double translation.

## Module Loading and Dependencies

### Script Loading Order (Critical)

Scripts in `ui/panel.html` must load in specific order:

1. **Core Services** (foundational utilities):
   - `services/storageService.js`
   - `services/aiSetupService.js`
   - `services/promptService.js`
   - `services/semanticRouting.js`
   - `services/proofreaderService.js`
   - `services/summarizerService.js`
   - `services/rewriterService.js`
   - `services/writerService.js`
   - `services/translationService.js`

2. **UI Modules** (dependent on services):
   - `modules/constants.js`
   - `modules/stateManager.js`
   - `modules/uiManager.js`
   - `modules/messageHandler.js`
   - `modules/settingsManager.js`
   - `modules/aiServicesManager.js`

3. **Main Controller**:
   - `panel.js` (depends on all modules)

### Window Global Exports

All modules export to `window` object for browser compatibility:
- `window.TONEPILOT_CONSTANTS`
- `window.TonePilotStateManager`
- `window.TonePilotUIManager`
- `window.TonePilotMessageHandler`
- `window.TonePilotSettingsManager`
- `window.TonePilotAIServicesManager`
- Service classes: `window.TranslationService`, `window.PromptService`, `window.SemanticRouter`, etc.

### Module Verification

Panel includes built-in module loading verification that checks all required exports before initialization. Failure to load any module will prevent panel startup.

## State Management

**TonePilotStateManager** maintains centralized application state:

Key state properties:
- `currentSelection`: Selected text data from page
- `currentResults`: Latest AI processing results
- `translateMode`: Boolean for translation toggle state
- `targetLanguage`: User's preferred translation target (from settings)
- `currentMaxCharacters`, `currentFormalityToggle`: Rewriter settings
- `selectedMediaArray`: Media items selected from page

State change listeners available via `addListener(key, callback)` for reactive updates.

## Settings Management

**TonePilotSettingsManager** handles persistent user preferences:

- Loads from Chrome storage on init
- Validates settings before save
- Applies to state manager automatically
- UI elements auto-update on load
- Default values defined in `TONEPILOT_CONSTANTS.DEFAULTS`

Settings include: maxCharacters, formalityToggle, targetLanguage, enableAutoSave, enableHistory, preserveFormatting

## UI Management Architecture

### Conversation History System

The extension supports dynamic conversation history with:
- **Dynamic container creation**: Each submission creates a new conversation container
- **Smooth animations**: CSS transforms and transitions for natural content movement
- **Scroll management**: Bottom-aligned scroll positioning with automatic filler space calculation
- **Loading states**: Per-conversation loading animations with rotating messages under Primary tab
- **Height management**: Precise viewport height calculations for proper scroll positioning

### Key UI Methods in TonePilotUIManager

- `createNewConversation(inputText)`: Creates new conversation container and manages scroll
- `createConversationContainer(inputText)`: Builds DOM structure for query + result section + tabs
- `animateToNewContainer(newContainer)`: Handles smooth transitions and scroll positioning
- `showResults(results, conversationContainer)`: Updates specific conversation with AI results
- `adjustFillerAfterContentGeneration(container)`: Called after AI result loads to maintain scroll position
- `adjustFillerForFooterChange(heightChange)`: Compensates filler when footer elements resize
- `updateSelectionDisplay(selectionData)`: Shows selected text, auto-adjusts filler
- `clearSelectionDisplay()`: Hides selected text, auto-adjusts filler
- `handleInputKeydown(e)`: Manages keyboard shortcuts (Enter=submit, Shift+Enter=newline)

### UI Button Layout

**Header buttons** (top-right):
- `clearBtn`: Clear all conversations
- `documentBtn`: Document upload (Note: exists in HTML but not yet in constants.js - may be work in progress)
- `settingsBtn`: Open settings popup

**Footer input actions** (bottom):
- Left side: `mediaBtn` (file upload), `proofread-btn`, `translateBtn` (toggle with label)
- Right side: `cropBtn`, `submitBtn`

### Conversation Container Structure

Each conversation consists of:
- **Query display**: User's input text
- **Primary tab**: Always visible, contains main result
- **Alternative tabs**: Conditionally shown based on AI response (alt1, alt2)
- **Loading area**: Displays animated loading messages during processing
- **Result content**: AI-generated text with natural height wrapping
- **Result actions**: Copy and crop buttons (shown after completion)

### Scroll Management System

- **Bottom-aligned positioning**: Latest conversation positioned at header height
- **Dynamic filler calculation**: Adds spacer elements when content is shorter than viewport to maintain scroll position
- **Height precision**: Accounts for all margins, padding, and container dimensions
- **Smooth transitions**: CSS animations for entering/exiting conversations
- **Footer compensation**: Filler auto-adjusts when footer elements (selection display) change size to prevent layout shifts

#### Filler Adjustment Logic

The filler system maintains constant total height to prevent scroll jumps:
- **On content generation**: Filler shrinks by amount container grew
- **On footer changes**: Filler adjusts inversely to footer height changes (footer grows → filler shrinks, footer shrinks → filler grows)
- **Selection display**: When text selection appears/changes, filler compensates automatically via `adjustFillerForFooterChange()`

### User Interaction Patterns

#### Keyboard Shortcuts
- **Enter**: Submit current input for processing
- **Shift+Enter**: Insert new line in textarea (multi-line input)
- **Visual feedback**: Keyboard submission triggers same button press animations as mouse clicks

#### Tab Behavior
- **Primary tab**: Always visible from creation, shows main AI result
- **Alternative tabs**: Conditionally displayed based on AI response content
- **Loading state**: Only Primary tab visible during processing

#### Visual States
- **Loading**: Animated rotating messages with fadeInOut CSS animation (1.5s duration)
- **Container transitions**: Scale and opacity animations for smooth content updates
- **Button feedback**: Hover and active states for all interactive elements

### CSS Architecture

- **Modular styles**: Centralized color palette with CSS custom properties
- **Responsive design**: Flexible layout for Chrome side panel
- **Dark theme**: Consistent dark mode styling throughout
- **Smooth animations**: CSS transitions for natural UI interactions
- **Height management**: Dynamic container sizing with flexbox layout constraints

## Debugging and Development

### Common Issues

1. **Module Loading Failures**:
   - Check browser console for missing module exports
   - Verify script loading order in `panel.html`
   - Ensure all dependencies export to window globals

2. **AI Service Unavailability**:
   - Chrome Built-in AI requires specific flags and Chrome version
   - Services include fallback mechanisms to language model
   - Check `aiSetupService` status reports

3. **Event Handler Issues**:
   - UI event handlers are bound in `uiManager.js` then overridden by `panel.js`
   - Method override happens after module initialization
   - Check that button elements exist before binding

4. **Adding New UI Buttons**:
   - Add button ID to `TONEPILOT_CONSTANTS.ELEMENTS.IDS` in `constants.js`
   - Add button HTML to `panel.html` with proper ID
   - Bind event handler in `uiManager.js` `bindEvents()` method
   - Implement handler method (either in `uiManager.js` or override in `panel.js`)

5. **Scroll and Height Issues**:
   - Monitor console for height calculation logs (`📐` and `📏` prefixes)
   - Check for undefined DOM elements when setting display properties
   - Verify filler space calculations match viewport dimensions
   - Ensure conversation containers have proper class transitions
   - Filler adjusts on: content generation, footer size changes (selection display show/hide)

6. **Animation and Loading States**:
   - Loading animations restart on each message change via CSS manipulation
   - Tab visibility controlled by inline styles, not CSS classes
   - Height calculations must account for all visible elements during loading

### Debug Console Output

Extension includes comprehensive console logging:
- `🎬` Panel initialization
- `📦` Module loading and verification
- `🚀` Event handling and submission flow
- `🔍` AI service status and routing
- `📍` UI state changes and animations
- `🎯` Routing and intent detection
- `🌐` Translation operations and language detection
- `📐` / `📏` Height calculations and filler adjustments
- `🔄` State changes and data flow

### Browser Compatibility

- Chrome MV3 extension architecture
- ES6 modules not used - relies on script tags and window globals
- All JavaScript files export to `window` object for browser compatibility
- Requires Chrome 121+ with Built-in AI experimental features enabled