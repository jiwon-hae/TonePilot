/**
 * TonePilot Preset Management System
 * Defines tone presets and domain-specific adaptations for text rewriting
 *
 * @fileoverview Preset configuration and management for TonePilot extension
 */

/**
 * Preset configuration constants
 * @const {Object}
 */
const PRESET_CONSTANTS = {
  // Default settings
  DEFAULTS: {
    PRESET: 'diplomatic',
    FORMALITY: 'neutral',
    MAX_EMOJI: 1
  },

  // Constraint limits
  LIMITS: {
    MAX_SENTENCE_COUNT: 10,
    MAX_WORD_LIMIT: 1000,
    MIN_WORD_LIMIT: 10
  },

  // Validation patterns
  PATTERNS: {
    PRESET_NAME: /^[a-z][a-z0-9_]*$/,
    DOMAIN: /^[a-z0-9.-]+\.[a-z]{2,}$/
  },

  // Preset categories
  CATEGORIES: {
    PROFESSIONAL: ['diplomatic', 'executive', 'academic'],
    CASUAL: ['friendly', 'concise'],
    STRUCTURED: ['executive', 'academic']
  }
};

/**
 * Available tone presets with their configurations
 * @const {Object<string, Object>}
 */
const TONE_PRESETS = {
  concise: {
    name: 'Concise',
    description: 'Clear and direct, ≤2 sentences',
    icon: '⚡',
    constraints: {
      sentenceMax: 2,
      formality: 'neutral',
      bullets: false,
      avoid: ['hedging', 'apologies', 'unnecessary_qualifiers'],
      wordLimit: 50,
      style: 'direct'
    },
    systemPrompt: 'Rewrite the text to be concise and direct. Maximum 2 sentences. Remove hedging language and unnecessary words.'
  },
  
  diplomatic: {
    name: 'Diplomatic',
    description: 'Polite and considerate tone',
    icon: '🤝',
    constraints: {
      formality: 'polite',
      softenCritiques: true,
      includeThanks: true,
      hedging: 'moderate',
      tone: 'respectful'
    },
    systemPrompt: 'Rewrite the text with a diplomatic, polite tone. Soften any criticism and include appropriate courtesy phrases.'
  },
  
  executive: {
    name: 'Executive',
    description: 'Summary + bullets + clear ask',
    icon: '📊',
    constraints: {
      structure: '1-line summary + 2 bullets + explicit ask',
      numbersPreferred: true,
      formality: 'professional',
      includeActionItems: true,
      tone: 'authoritative'
    },
    systemPrompt: 'Rewrite in executive format: Start with a 1-line summary, follow with 2 bullet points, end with a clear ask or next step.'
  },
  
  friendly: {
    name: 'Friendly',
    description: 'Warm and approachable',
    icon: '😊',
    constraints: {
      warmth: 'high',
      contractions: true,
      emojis: '<=1',
      tone: 'casual',
      formality: 'informal'
    },
    systemPrompt: 'Rewrite with a friendly, warm tone. Use contractions and approachable language. Add one emoji if appropriate.'
  },
  
  academic: {
    name: 'Academic',
    description: 'Formal and scholarly',
    icon: '🎓',
    constraints: {
      formality: 'high',
      passiveVoiceLimit: 'low',
      hedging: 'allowed',
      tone: 'scholarly',
      vocabulary: 'formal',
      citations: 'preserve'
    },
    systemPrompt: 'Rewrite in academic style. Use formal vocabulary, minimize passive voice, and maintain scholarly tone.'
  }
};


/**
 * Get a preset configuration by name
 * @param {string} name - Preset name to retrieve
 * @returns {Object|null} Preset configuration or null if not found
 * @throws {Error} If name is invalid
 */
function getPresetByName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Preset name must be a non-empty string');
  }

  const normalizedName = name.toLowerCase().trim();

  if (!PRESET_CONSTANTS.PATTERNS.PRESET_NAME.test(normalizedName)) {
    throw new Error('Invalid preset name format');
  }

  const preset = TONE_PRESETS[normalizedName];
  if (!preset) {
    return null;
  }

  // Return a deep copy to prevent mutations
  return JSON.parse(JSON.stringify(preset));
}

/**
 * Get all available presets with their keys
 * @returns {Array<Object>} Array of preset objects with keys
 */
function getAllPresets() {
  return Object.keys(TONE_PRESETS).map(key => {
    const preset = TONE_PRESETS[key];
    return {
      key,
      name: preset.name,
      description: preset.description,
      icon: preset.icon,
      category: _getPresetCategory(key),
      constraints: { ...preset.constraints },
      systemPrompt: preset.systemPrompt
    };
  });
}

/**
 * Get the category for a preset
 * @private
 * @param {string} presetKey - Preset key
 * @returns {string} Category name
 */
function _getPresetCategory(presetKey) {
  const { CATEGORIES } = PRESET_CONSTANTS;

  for (const [category, presets] of Object.entries(CATEGORIES)) {
    if (presets.includes(presetKey)) {
      return category.toLowerCase();
    }
  }

  return 'general';
}



/**
 * Build a complete prompt configuration for AI rewriting
 * @param {Object|string} preset - Preset object or preset name
 * @param {string} originalText - Original text to rewrite
 * @returns {Object} Complete prompt configuration
 * @throws {Error} If parameters are invalid
 */
function buildPrompt(preset, originalText) {
  // Validate inputs
  if (!originalText || typeof originalText !== 'string') {
    throw new Error('Original text must be a non-empty string');
  }

  if (originalText.trim().length === 0) {
    throw new Error('Original text cannot be empty');
  }

  // Resolve preset if string provided
  let presetConfig = preset;
  if (typeof preset === 'string') {
    presetConfig = getPresetByName(preset);
    if (!presetConfig) {
      throw new Error(`Preset '${preset}' not found`);
    }
  }

  if (!presetConfig || typeof presetConfig !== 'object') {
    throw new Error('Invalid preset configuration');
  }

  // Build base prompt
  let systemPrompt = presetConfig.systemPrompt;
  const enhancedConstraints = { ...presetConfig.constraints };

  // Validate text length constraints
  const wordCount = originalText.split(/\s+/).length;
  if (enhancedConstraints.wordLimit && wordCount > enhancedConstraints.wordLimit * 2) {
    systemPrompt += ` Note: Input text is long (${wordCount} words), prioritize key points.`;
  }

  return {
    system: systemPrompt,
    constraints: enhancedConstraints,
    originalText: originalText.trim(),
    preset: presetConfig.name || 'Unknown',
    metadata: {
      wordCount,
      estimatedTokens: Math.ceil(wordCount * 1.3)
    }
  };
}

/**
 * Validate preset configuration
 * @param {Object} preset - Preset to validate
 * @returns {boolean} True if valid
 * @throws {Error} If preset is invalid
 */
function validatePreset(preset) {
  if (!preset || typeof preset !== 'object') {
    throw new Error('Preset must be an object');
  }

  const required = ['name', 'description', 'systemPrompt'];
  for (const field of required) {
    if (!preset[field] || typeof preset[field] !== 'string') {
      throw new Error(`Preset missing required field: ${field}`);
    }
  }

  if (preset.constraints && typeof preset.constraints !== 'object') {
    throw new Error('Preset constraints must be an object');
  }

  return true;
}

/**
 * Get presets by category
 * @param {string} category - Category to filter by
 * @returns {Array<Object>} Presets in the category
 */
function getPresetsByCategory(category) {
  if (!category || typeof category !== 'string') {
    throw new Error('Category must be a non-empty string');
  }

  const normalizedCategory = category.toUpperCase();
  const categoryPresets = PRESET_CONSTANTS.CATEGORIES[normalizedCategory];

  if (!categoryPresets) {
    return [];
  }

  return categoryPresets.map(presetKey => ({
    key: presetKey,
    ...TONE_PRESETS[presetKey]
  }));
}

/**
 * Get available preset categories
 * @returns {Array<string>} Available categories
 */
function getAvailableCategories() {
  return Object.keys(PRESET_CONSTANTS.CATEGORIES).map(cat => cat.toLowerCase());
}

// Browser global exports
if (typeof window !== 'undefined') {
  window.TONE_PRESETS = TONE_PRESETS;
  window.PRESET_CONSTANTS = PRESET_CONSTANTS;
  window.getPresetByName = getPresetByName;
  window.getAllPresets = getAllPresets;
  window.buildPrompt = buildPrompt;
  window.validatePreset = validatePreset;
  window.getPresetsByCategory = getPresetsByCategory;
  window.getAvailableCategories = getAvailableCategories;
}

// Node.js exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TONE_PRESETS,
    PRESET_CONSTANTS,
    getPresetByName,
    getAllPresets,
    buildPrompt,
    validatePreset,
    getPresetsByCategory,
    getAvailableCategories
  };
}