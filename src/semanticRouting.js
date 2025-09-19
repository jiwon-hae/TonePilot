/**
 * Semantic Intent Router for TonePilot
 * In-browser semantic routing using TensorFlow.js + Universal Sentence Encoder
 * with fallback to keyword-based classification
 *
 * @fileoverview Semantic routing system for intent classification
 */

/**
 * Router configuration constants
 * @const {Object}
 */
const SEMANTIC_CONSTANTS = {
  // Classification threshold for semantic similarity
  THRESHOLD: 0.65,

  // CDN URLs for TensorFlow dependencies
  CDN_URLS: {
    TENSORFLOW: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.9.0/dist/tf.min.js',
    USE_ENCODER: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/universal-sentence-encoder@1.4.0/dist/universal-sentence-encoder.min.js'
  },

  // Default configuration options
  DEFAULTS: {
    USE_CDN: true,
    TIMEOUT: 5000,
    SIMPLE_MODE: false
  },

  // Intent types
  INTENTS: {
    PROOFREAD: 'proofread',
    REVISE: 'revise',
    DRAFT: 'draft',
    OTHER: 'other'
  },

  // Keyword fallback scores
  FALLBACK_SCORES: {
    PROOFREAD: 0.9,
    REVISE: 0.8,
    DRAFT: 0.9
  }
};

/**
 * Training examples for each intent category
 * @const {Object<string, string[]>}
 */
const INTENT_EXAMPLES = {
  [SEMANTIC_CONSTANTS.INTENTS.PROOFREAD]: [
    'Proofread this text for grammar and spelling.',
    'Check grammar and fix typos.',
    'Correct punctuation and spelling mistakes.'
  ],
  [SEMANTIC_CONSTANTS.INTENTS.REVISE]: [
    'Revise this to be more formal.',
    'Rewrite for clarity and concision.',
    'Improve tone to be professional.'
  ],
  [SEMANTIC_CONSTANTS.INTENTS.DRAFT]: [
    'Draft an email to a recruiter.',
    'Write a short blog introduction.',
    'Compose a message based on these notes.'
  ]
};

/**
 * Keyword fallback patterns for intent classification
 * @const {Object<string, RegExp>}
 */
const FALLBACK_PATTERNS = {
  [SEMANTIC_CONSTANTS.INTENTS.PROOFREAD]: /\b(proofread|grammar|spelling|typo|correct)\b/i,
  [SEMANTIC_CONSTANTS.INTENTS.REVISE]: /\b(revise|rewrite|improve|clarity|concise|tone|formal|casual)\b/i,
  [SEMANTIC_CONSTANTS.INTENTS.DRAFT]: /\b(draft|write|compose|create|email|cover letter|blog|message)\b/i
};

/**
 * Router state management
 * @private
 */
let _routerState = {
  useModel: null,
  exampleEmbeds: null,
  intentIndex: null,
  isInitialized: false,
  mode: null // 'tensorflow' or 'simple'
};

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vectorA - First vector
 * @param {number[]} vectorB - Second vector
 * @returns {number} Cosine similarity score (0-1)
 */
function _calculateCosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

/**
 * Initialize the semantic router
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.useCdn=true] - Whether to load TensorFlow from CDN
 * @param {number} [options.timeout=5000] - Initialization timeout in milliseconds
 * @param {boolean} [options.useSimpleMode=false] - Force simple keyword mode
 * @returns {Promise<void>}
 * @throws {Error} If initialization fails and fallback is not available
 */
export async function initSemanticRouter(options = {}) {
  const config = {
    ...SEMANTIC_CONSTANTS.DEFAULTS,
    ...options
  };

  // Return early if already initialized
  if (_routerState.isInitialized) {
    return;
  }

  // Force simple mode if requested
  if (config.useSimpleMode) {
    console.log('🔄 Using simple keyword-based routing (no TensorFlow)');
    _routerState.mode = 'simple';
    _routerState.isInitialized = true;
    return;
  }

  try {
    await _initializeTensorFlowMode(config);
    _routerState.mode = 'tensorflow';
    _routerState.isInitialized = true;
    console.log('✅ TensorFlow semantic routing initialized');
  } catch (error) {
    console.warn('TensorFlow initialization failed, falling back to simple mode:', error.message);
    _routerState.mode = 'simple';
    _routerState.isInitialized = true;
  }
}

/**
 * Initialize TensorFlow-based semantic routing
 * @private
 * @param {Object} config - Configuration object
 * @throws {Error} If TensorFlow initialization fails
 */
async function _initializeTensorFlowMode(config) {
  const timeoutPromise = _createTimeoutPromise(config.timeout, 'Router initialization timed out');

  try {
    // Load TensorFlow dependencies
    if (config.useCdn) {
      await _loadTensorFlowDependencies(timeoutPromise);
    }

    // Validate TensorFlow availability
    if (!window.tf || !window.use) {
      throw new Error('TensorFlow or Universal Sentence Encoder not available');
    }

    // Load the Universal Sentence Encoder model
    _routerState.useModel = await Promise.race([
      window.use.load(),
      timeoutPromise
    ]);

    // Pre-embed training examples
    await _preEmbedExamples(timeoutPromise);

    // Warm up the model with a test embedding
    await Promise.race([
      _routerState.useModel.embed(['warmup']),
      timeoutPromise
    ]);
  } catch (error) {
    // Clean up partial state on failure
    _routerState.useModel = null;
    _routerState.exampleEmbeds = null;
    _routerState.intentIndex = null;
    throw error;
  }
}

/**
 * Create a timeout promise for initialization operations
 * @private
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} message - Error message
 * @returns {Promise} Timeout promise
 */
function _createTimeoutPromise(timeout, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), timeout);
  });
}

/**
 * Load TensorFlow dependencies from CDN
 * @private
 * @param {Promise} timeoutPromise - Timeout promise
 * @throws {Error} If script loading fails
 */
async function _loadTensorFlowDependencies(timeoutPromise) {
  // Load TensorFlow.js if not already loaded
  if (!window.tf) {
    await Promise.race([
      _loadScript(SEMANTIC_CONSTANTS.CDN_URLS.TENSORFLOW),
      timeoutPromise
    ]);
  }

  // Load Universal Sentence Encoder if not already loaded
  if (!window.use) {
    await Promise.race([
      _loadScript(SEMANTIC_CONSTANTS.CDN_URLS.USE_ENCODER),
      timeoutPromise
    ]);
  }
}

/**
 * Load a script from URL
 * @private
 * @param {string} url - Script URL
 * @returns {Promise<void>}
 */
function _loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

/**
 * Pre-embed training examples for faster classification
 * @private
 * @param {Promise} timeoutPromise - Timeout promise
 * @throws {Error} If embedding fails
 */
async function _preEmbedExamples(timeoutPromise) {
  const exampleTexts = [];
  _routerState.intentIndex = [];

  // Collect all training examples
  for (const [intent, examples] of Object.entries(INTENT_EXAMPLES)) {
    for (const example of examples) {
      exampleTexts.push(example);
      _routerState.intentIndex.push(intent);
    }
  }

  // Embed all examples in one batch
  _routerState.exampleEmbeds = await Promise.race([
    _routerState.useModel.embed(exampleTexts),
    timeoutPromise
  ]);
}

/**
 * Route user input to appropriate intent category
 * @param {string} input - User input text to classify
 * @returns {Promise<Object>} Classification result
 * @throws {Error} If router is not initialized or input is invalid
 */
export async function routeIntent(input) {
  if (!_routerState.isInitialized) {
    throw new Error('Router not initialized. Call initSemanticRouter() first.');
  }

  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    throw new Error('Input must be a non-empty string');
  }

  const trimmedInput = input.trim();

  try {
    // Route based on current mode
    if (_routerState.mode === 'simple') {
      return _routeWithKeywords(trimmedInput);
    } else {
      return await _routeWithTensorFlow(trimmedInput);
    }
  } catch (error) {
    console.warn('Routing failed, falling back to keyword mode:', error.message);
    return _routeWithKeywords(trimmedInput);
  }
}

/**
 * Route input using TensorFlow semantic similarity
 * @private
 * @param {string} input - Input text
 * @returns {Promise<Object>} Classification result
 */
async function _routeWithTensorFlow(input) {
  if (!_routerState.useModel || !_routerState.exampleEmbeds) {
    throw new Error('TensorFlow model not ready');
  }

  // Embed the input text
  const inputEmbedding = await _routerState.useModel.embed([input]);
  const inputVector = (await inputEmbedding.array())[0];
  const exampleVectors = await _routerState.exampleEmbeds.array();

  // Calculate similarity scores for each intent
  const intentScores = _calculateIntentScores(inputVector, exampleVectors);

  // Find best intent and apply threshold
  const result = _determineBestIntent(intentScores, input);

  return {
    intent: result.intent,
    score: +result.score.toFixed(3),
    averages: result.averages,
    mode: 'tensorflow'
  };
}

/**
 * Calculate similarity scores for each intent category
 * @private
 * @param {number[]} inputVector - Input embedding vector
 * @param {number[][]} exampleVectors - Pre-computed example vectors
 * @returns {Object} Intent scores object
 */
function _calculateIntentScores(inputVector, exampleVectors) {
  const scores = {
    [SEMANTIC_CONSTANTS.INTENTS.PROOFREAD]: [],
    [SEMANTIC_CONSTANTS.INTENTS.REVISE]: [],
    [SEMANTIC_CONSTANTS.INTENTS.DRAFT]: []
  };

  // Calculate similarity for each example
  for (let i = 0; i < exampleVectors.length; i++) {
    const intent = _routerState.intentIndex[i];
    const similarity = _calculateCosineSimilarity(inputVector, exampleVectors[i]);
    scores[intent].push(similarity);
  }

  return scores;
}

/**
 * Determine the best intent from scores
 * @private
 * @param {Object} intentScores - Scores for each intent
 * @param {string} input - Original input for fallback
 * @returns {Object} Best intent result
 */
function _determineBestIntent(intentScores, input) {
  const averages = {};
  let bestIntent = SEMANTIC_CONSTANTS.INTENTS.OTHER;
  let bestScore = 0.0;

  // Calculate average scores for each intent
  for (const [intent, scores] of Object.entries(intentScores)) {
    const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    averages[intent] = +average.toFixed(3);

    if (average > bestScore) {
      bestIntent = intent;
      bestScore = average;
    }
  }

  // Apply threshold and fallback logic
  if (bestScore < SEMANTIC_CONSTANTS.THRESHOLD) {
    bestIntent = _applyKeywordFallback(input) || SEMANTIC_CONSTANTS.INTENTS.OTHER;
  }

  return {
    intent: bestIntent,
    score: bestScore,
    averages
  };
}

/**
 * Apply keyword fallback for low-confidence classifications
 * @private
 * @param {string} input - Input text
 * @returns {string|null} Matched intent or null
 */
function _applyKeywordFallback(input) {
  const { INTENTS } = SEMANTIC_CONSTANTS;

  if (FALLBACK_PATTERNS[INTENTS.PROOFREAD].test(input)) {
    return INTENTS.PROOFREAD;
  }
  if (FALLBACK_PATTERNS[INTENTS.REVISE].test(input)) {
    return INTENTS.REVISE;
  }
  if (FALLBACK_PATTERNS[INTENTS.DRAFT].test(input)) {
    return INTENTS.DRAFT;
  }

  return null;
}

/**
 * Simple keyword-based routing fallback
 * @private
 * @param {string} input - Input text to classify
 * @returns {Object} Classification result
 */
function _routeWithKeywords(input) {
  const { INTENTS, FALLBACK_SCORES } = SEMANTIC_CONSTANTS;
  const scores = {
    [INTENTS.PROOFREAD]: 0,
    [INTENTS.REVISE]: 0,
    [INTENTS.DRAFT]: 0
  };

  // Apply pattern matching with predefined scores
  if (FALLBACK_PATTERNS[INTENTS.PROOFREAD].test(input)) {
    scores[INTENTS.PROOFREAD] = FALLBACK_SCORES.PROOFREAD;
  }

  if (FALLBACK_PATTERNS[INTENTS.REVISE].test(input)) {
    scores[INTENTS.REVISE] = FALLBACK_SCORES.REVISE;
  }

  if (FALLBACK_PATTERNS[INTENTS.DRAFT].test(input)) {
    scores[INTENTS.DRAFT] = FALLBACK_SCORES.DRAFT;
  }

  // Find the highest scoring intent
  let bestIntent = INTENTS.OTHER;
  let bestScore = 0.0;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestIntent = intent;
      bestScore = score;
    }
  }

  return {
    intent: bestIntent,
    score: +bestScore.toFixed(3),
    averages: scores,
    mode: 'keyword'
  };
}

/**
 * Extract normalized fields for intent handlers
 * @param {string} input - User input text
 * @param {string} intent - Classified intent
 * @returns {Object} Normalized field object
 */
export function normalizeFields(input, intent) {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }

  if (!intent || typeof intent !== 'string') {
    throw new Error('Intent must be a non-empty string');
  }

  const { INTENTS } = SEMANTIC_CONSTANTS;

  switch (intent) {
    case INTENTS.PROOFREAD:
      return {
        text: input.trim(),
        type: 'proofread'
      };

    case INTENTS.REVISE: {
      const goalMatch = input.match(/\b(for|to)\s+(concise|clarity|formal|casual|short|long|professional)\b/i);
      return {
        text: input.trim(),
        goal: goalMatch?.[2]?.toLowerCase() || null,
        type: 'revise'
      };
    }

    case INTENTS.DRAFT:
      return {
        instructions: input.trim(),
        type: 'draft'
      };

    default:
      return {
        text: input.trim(),
        type: 'other'
      };
  }
}

/**
 * Get router status and configuration
 * @returns {Object} Router status information
 */
export function getRouterStatus() {
  return {
    isInitialized: _routerState.isInitialized,
    mode: _routerState.mode,
    hasTensorFlow: _routerState.useModel !== null,
    hasEmbeddings: _routerState.exampleEmbeds !== null,
    availableIntents: Object.values(SEMANTIC_CONSTANTS.INTENTS)
  };
}

/**
 * Reset router state (useful for testing or reinitialization)
 * @returns {void}
 */
export function resetRouter() {
  _routerState.useModel = null;
  _routerState.exampleEmbeds = null;
  _routerState.intentIndex = null;
  _routerState.isInitialized = false;
  _routerState.mode = null;
}

// Browser global exports
if (typeof window !== 'undefined') {
  window.initSemanticRouter = initSemanticRouter;
  window.routeIntent = routeIntent;
  window.normalizeFields = normalizeFields;
  window.getRouterStatus = getRouterStatus;
  window.resetRouter = resetRouter;
  window.SEMANTIC_CONSTANTS = SEMANTIC_CONSTANTS;
}

// Node.js exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initSemanticRouter,
    routeIntent,
    normalizeFields,
    getRouterStatus,
    resetRouter,
    SEMANTIC_CONSTANTS
  };
}