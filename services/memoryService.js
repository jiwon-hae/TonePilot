/**
 * MemoryService - Session-based context memory management for TonePilot
 *
 * Uses chrome.storage.session for:
 * - Fast in-memory access
 * - Automatic cleanup on browser restart
 * - Session-scoped conversation context
 *
 * Stores conversation history with auto-summarized content for context.
 * Memory is cleared when browser closes, ensuring fresh context each session.
 */

class MemoryService extends window.BaseService {
  constructor() {
    super('MemoryService');

    this.summarizerService = null;
    this.storageService = null;
    this.memoryStore = [];

    // Configuration
    this.MAX_MEMORY_ITEMS = 50; // Maximum number of conversations to store in session
    this.CONTENT_LENGTH_THRESHOLD = 500; // Summarize content longer than this
    this.MAX_QUERY_LENGTH = 200; // Truncate very long queries
  }

  async onInitialize() {
    // Get dependencies
    this.summarizerService = new window.SummarizerService();
    await this.summarizerService.initialize();

    this.storageService = window.StorageService;

    // Load existing memory from storage
    await this.loadMemoryFromStorage();

    this.isAvailable = true;
    this.log('✅', 'MemoryService initialized with', this.memoryStore.length, 'items');
  }

  /**
   * Load memory from Chrome session storage
   * Session storage is faster (in-memory) and auto-clears on browser restart
   */
  async loadMemoryFromStorage() {
    try {
      // Use chrome.storage.session for fast, session-based context
      const result = await chrome.storage.session.get('conversationMemory');
      const stored = result.conversationMemory;

      if (stored && Array.isArray(stored)) {
        this.memoryStore = stored;
        this.log('📚', 'Loaded', stored.length, 'memory items from session storage');
      } else {
        this.log('📚', 'No existing memory in session, starting fresh');
      }
    } catch (error) {
      this.handleError('Failed to load memory from session storage', error, false);
      this.memoryStore = [];
    }
  }

  /**
   * Save memory to Chrome session storage
   * Session storage provides fast in-memory access and auto-cleanup
   */
  async saveMemoryToStorage() {
    try {
      await chrome.storage.session.set({ conversationMemory: this.memoryStore });
      this.log('💾', 'Saved', this.memoryStore.length, 'memory items to session storage');
    } catch (error) {
      this.handleError('Failed to save memory to session storage', error, false);
    }
  }

  /**
   * Add a conversation to memory
   * @param {string} query - User's query
   * @param {string} content - AI-generated content
   * @param {Object} metadata - Additional metadata (intent, format, etc.)
   * @returns {Promise<Object>} - The memory item that was added
   */
  async addConversation(query, content, metadata = {}) {
    this.ensureInitialized();
    this.validateNonEmptyString(query, 'query');
    this.validateNonEmptyString(content, 'content');

    return this.wrapAsync(async () => {
      // Truncate very long queries
      const truncatedQuery = query.length > this.MAX_QUERY_LENGTH
        ? query.substring(0, this.MAX_QUERY_LENGTH) + '...'
        : query;

      // Determine if content needs summarization
      let processedContent = content;
      let isSummarized = false;

      if (content.length > this.CONTENT_LENGTH_THRESHOLD) {
        this.log('📝', 'Content exceeds threshold, summarizing...');

        try {
          const summarized = await this.summarizeContent(content);
          if (summarized) {
            processedContent = summarized;
            isSummarized = true;
            this.log('✅', 'Content summarized:', content.length, '→', processedContent.length, 'chars');
          }
        } catch (error) {
          this.warn('Failed to summarize content, using original:', error.message);
        }
      }

      // Create memory item
      const memoryItem = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        query: truncatedQuery,
        content: processedContent,
        originalContentLength: content.length,
        isSummarized: isSummarized,
        metadata: {
          intent: metadata.intent || 'unknown',
          format: metadata.format || 'unknown',
          tone: metadata.tone || 'unknown',
          ...metadata
        }
      };

      // Add to memory store
      this.memoryStore.push(memoryItem);

      // Trim old items if exceeding max
      if (this.memoryStore.length > this.MAX_MEMORY_ITEMS) {
        const removed = this.memoryStore.shift();
        this.log('🗑️', 'Removed oldest memory item:', removed.id);
      }

      // Save to storage
      await this.saveMemoryToStorage();

      this.log('💾', 'Added conversation to memory:', memoryItem.id);
      return memoryItem;
    }, null)();
  }

  /**
   * Summarize content using the summarizer service
   * @param {string} content - Content to summarize
   * @returns {Promise<string>} - Summarized content
   */
  async summarizeContent(content) {
    if (!this.summarizerService.isAvailable) {
      this.warn('Summarizer service not available, skipping summarization');
      return content;
    }

    try {
      // Use key-points format for memory summarization
      const result = await this.summarizerService.summarize(content, {
        type: 'key-points',
        format: 'markdown',
        length: 'short'
      });

      return result || content;
    } catch (error) {
      this.warn('Summarization failed:', error.message);
      return content;
    }
  }

  /**
   * Get recent conversation history
   * @param {number} count - Number of recent conversations to retrieve
   * @returns {Array} - Array of memory items
   */
  getRecentConversations(count = 10) {
    this.ensureInitialized();

    const recent = this.memoryStore.slice(-count).reverse();
    this.log('📖', 'Retrieved', recent.length, 'recent conversations');
    return recent;
  }

  /**
   * Get all conversation history
   * @returns {Array} - All memory items
   */
  getAllConversations() {
    this.ensureInitialized();
    return [...this.memoryStore];
  }

  /**
   * Search conversations by query text
   * @param {string} searchTerm - Term to search for
   * @returns {Array} - Matching memory items
   */
  searchConversations(searchTerm) {
    this.ensureInitialized();
    this.validateNonEmptyString(searchTerm, 'searchTerm');

    const lowerSearch = searchTerm.toLowerCase();
    const matches = this.memoryStore.filter(item =>
      item.query.toLowerCase().includes(lowerSearch) ||
      item.content.toLowerCase().includes(lowerSearch)
    );

    this.log('🔍', 'Found', matches.length, 'conversations matching:', searchTerm);
    return matches;
  }

  /**
   * Get conversations by metadata filters
   * @param {Object} filters - Metadata filters (intent, format, tone, etc.)
   * @returns {Array} - Matching memory items
   */
  filterByMetadata(filters = {}) {
    this.ensureInitialized();

    const matches = this.memoryStore.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        return item.metadata[key] === value;
      });
    });

    this.log('🔍', 'Found', matches.length, 'conversations matching filters:', filters);
    return matches;
  }

  /**
   * Get context string from recent conversations
   * Useful for providing context to AI services
   * @param {number} count - Number of recent conversations to include
   * @returns {string} - Formatted context string
   */
  getContextString(count = 5) {
    this.ensureInitialized();

    const recent = this.getRecentConversations(count);
    if (recent.length === 0) {
      return '';
    }

    const contextLines = recent.map((item, index) => {
      return `[${count - index}] Q: ${item.query}\nA: ${item.content}`;
    });

    const contextString = `RECENT CONVERSATION CONTEXT:\n\n${contextLines.join('\n\n')}`;

    this.log('📋', 'Generated context string from', recent.length, 'conversations');
    return contextString;
  }

  /**
   * Retrieve relevant conversations based on query
   * Uses chronological patterns and BM25 semantic similarity
   *
   * @param {string} query - User's current query
   * @param {number} topK - Number of relevant conversations to return
   * @returns {Array} - Array of relevant memory items with scores
   */
  retrieveRelevant(query, topK = 5) {
    this.ensureInitialized();
    this.validateNonEmptyString(query, 'query');

    if (this.memoryStore.length === 0) {
      this.log('📚', 'No memory to retrieve from');
      return [];
    }

    // 1. Check if query has chronological patterns
    const isChronological = this.detectChronologicalQuery(query);

    if (isChronological) {
      // For chronological queries, return recent items in reverse chronological order
      const recentCount = Math.min(topK, this.memoryStore.length);
      const recent = this.memoryStore.slice(-recentCount).reverse();

      this.log('🕐', 'Chronological query detected, returning', recent.length, 'recent items');

      return recent.map((item, index) => ({
        ...item,
        score: 1.0 - (index * 0.1), // Descending scores for recency
        retrievalType: 'chronological'
      }));
    }

    // 2. For semantic queries, use BM25 scoring
    const scoredItems = this.memoryStore.map(item => {
      const score = this.calculateBM25Score(query, item);
      return {
        ...item,
        score: score,
        retrievalType: 'semantic'
      };
    });

    // 3. Sort by score (descending) and return top K
    const sorted = scoredItems.sort((a, b) => b.score - a.score);
    const topResults = sorted.slice(0, topK);

    this.log('🔍', 'Retrieved', topResults.length, 'semantically relevant items');

    return topResults;
  }

  /**
   * Detect if query is asking for chronological/recent information
   * @param {string} query - User query
   * @returns {boolean} - True if chronological query
   */
  detectChronologicalQuery(query) {
    const chronologicalPatterns = [
      /\b(previous|last|recent|earlier|before|past|ago)\b/i,
      /\b(what (did|was) (i|we))\b/i,
      /\b(remind me|recall|remember)\b/i,
      /\b(history|earlier conversation)\b/i,
      /\b(just now|moments ago|a while ago)\b/i
    ];

    return chronologicalPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Calculate BM25 score between query and conversation item
   * BM25 is a ranking function that scores documents based on term frequency
   *
   * @param {string} query - User query
   * @param {Object} item - Memory item (with query and content fields)
   * @returns {number} - BM25 score
   */
  calculateBM25Score(query, item) {
    // BM25 parameters
    const k1 = 1.5; // Term frequency saturation parameter
    const b = 0.75; // Length normalization parameter

    // Combine item query and content for matching
    const document = `${item.query} ${item.content}`.toLowerCase();
    const queryTerms = this.tokenize(query.toLowerCase());
    const docTerms = this.tokenize(document);

    // Calculate average document length
    const avgDocLength = this.getAverageDocLength();
    const docLength = docTerms.length;

    // Calculate document term frequencies
    const docTermFreqs = this.getTermFrequencies(docTerms);

    // Calculate BM25 score
    let score = 0;

    for (const term of queryTerms) {
      const tf = docTermFreqs[term] || 0;
      if (tf === 0) continue;

      // Calculate IDF (Inverse Document Frequency)
      const idf = this.calculateIDF(term);

      // BM25 formula
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));

      score += idf * (numerator / denominator);
    }

    return score;
  }

  /**
   * Tokenize text into terms (simple whitespace tokenization)
   * @param {string} text - Text to tokenize
   * @returns {Array<string>} - Array of terms
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(term => term.length > 2); // Filter out very short terms
  }

  /**
   * Get term frequencies in document
   * @param {Array<string>} terms - Array of terms
   * @returns {Object} - Term frequency map
   */
  getTermFrequencies(terms) {
    const freqs = {};
    for (const term of terms) {
      freqs[term] = (freqs[term] || 0) + 1;
    }
    return freqs;
  }

  /**
   * Calculate average document length across all memory items
   * @returns {number} - Average document length
   */
  getAverageDocLength() {
    if (this.memoryStore.length === 0) return 0;

    const totalLength = this.memoryStore.reduce((sum, item) => {
      const doc = `${item.query} ${item.content}`;
      return sum + this.tokenize(doc.toLowerCase()).length;
    }, 0);

    return totalLength / this.memoryStore.length;
  }

  /**
   * Calculate IDF (Inverse Document Frequency) for a term
   * IDF measures how unique/rare a term is across all documents
   *
   * @param {string} term - Term to calculate IDF for
   * @returns {number} - IDF score
   */
  calculateIDF(term) {
    const N = this.memoryStore.length; // Total number of documents

    // Count documents containing the term
    let docsWithTerm = 0;
    for (const item of this.memoryStore) {
      const doc = `${item.query} ${item.content}`.toLowerCase();
      if (doc.includes(term)) {
        docsWithTerm++;
      }
    }

    // IDF formula: log((N - df + 0.5) / (df + 0.5) + 1)
    // Adding smoothing to avoid division by zero
    if (docsWithTerm === 0) return 0;

    return Math.log((N - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1);
  }

  /**
   * Get context string from retrieved relevant conversations
   * @param {string} query - User query
   * @param {number} topK - Number of relevant items to retrieve
   * @returns {string} - Formatted context string
   */
  getRelevantContextString(query, topK = 5) {
    this.ensureInitialized();

    const relevant = this.retrieveRelevant(query, topK);
    if (relevant.length === 0) {
      return '';
    }

    const contextLines = relevant.map((item, index) => {
      const scoreLabel = item.retrievalType === 'chronological' ? 'Recent' : `Score: ${item.score.toFixed(2)}`;
      return `[${index + 1}] (${scoreLabel})\nQ: ${item.query}\nA: ${item.content}`;
    });

    const contextString = `RELEVANT CONVERSATION CONTEXT:\n\n${contextLines.join('\n\n')}`;

    this.log('📋', 'Generated relevant context from', relevant.length, 'conversations');
    return contextString;
  }

  /**
   * Clear all conversation memory
   */
  async clearMemory() {
    this.ensureInitialized();

    const previousCount = this.memoryStore.length;
    this.memoryStore = [];
    await this.saveMemoryToStorage();

    this.log('🗑️', 'Cleared all memory:', previousCount, 'items removed');
  }

  /**
   * Delete a specific conversation by ID
   * @param {string} id - Memory item ID
   * @returns {boolean} - True if deleted, false if not found
   */
  async deleteConversation(id) {
    this.ensureInitialized();
    this.validateRequired(id, 'id');

    const index = this.memoryStore.findIndex(item => item.id === id);
    if (index === -1) {
      this.warn('Memory item not found:', id);
      return false;
    }

    const removed = this.memoryStore.splice(index, 1);
    await this.saveMemoryToStorage();

    this.log('🗑️', 'Deleted memory item:', removed[0].id);
    return true;
  }

  /**
   * Get memory statistics
   * @returns {Object} - Statistics about the memory store
   */
  getStats() {
    this.ensureInitialized();

    const totalItems = this.memoryStore.length;
    const summarizedCount = this.memoryStore.filter(item => item.isSummarized).length;
    const totalOriginalChars = this.memoryStore.reduce((sum, item) => sum + item.originalContentLength, 0);
    const totalStoredChars = this.memoryStore.reduce((sum, item) => sum + item.content.length, 0);
    const compressionRatio = totalOriginalChars > 0
      ? ((1 - totalStoredChars / totalOriginalChars) * 100).toFixed(1)
      : 0;

    const intentBreakdown = this.memoryStore.reduce((acc, item) => {
      const intent = item.metadata.intent || 'unknown';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {});

    return {
      totalConversations: totalItems,
      summarizedCount: summarizedCount,
      totalOriginalChars: totalOriginalChars,
      totalStoredChars: totalStoredChars,
      compressionRatio: `${compressionRatio}%`,
      spaceSaved: totalOriginalChars - totalStoredChars,
      intentBreakdown: intentBreakdown,
      oldestConversation: totalItems > 0 ? this.memoryStore[0].timestamp : null,
      newestConversation: totalItems > 0 ? this.memoryStore[totalItems - 1].timestamp : null
    };
  }

  /**
   * Generate a unique ID for memory items
   * @returns {string} - Unique ID
   */
  generateId() {
    return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Export memory as JSON
   * @returns {string} - JSON string of all memory
   */
  exportMemory() {
    this.ensureInitialized();
    return JSON.stringify(this.memoryStore, null, 2);
  }

  /**
   * Import memory from JSON
   * @param {string} jsonString - JSON string to import
   * @returns {Promise<boolean>} - True if successful
   */
  async importMemory(jsonString) {
    this.ensureInitialized();
    this.validateNonEmptyString(jsonString, 'jsonString');

    try {
      const imported = JSON.parse(jsonString);

      if (!Array.isArray(imported)) {
        throw new Error('Invalid import format: expected array');
      }

      this.memoryStore = imported;
      await this.saveMemoryToStorage();

      this.log('📥', 'Imported', imported.length, 'memory items');
      return true;
    } catch (error) {
      this.handleError('Failed to import memory', error, false);
      return false;
    }
  }
}

// Export to window
window.MemoryService = MemoryService;

console.log('✅ MemoryService loaded');
