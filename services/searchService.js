/**
 * Google Programmable Search Service
 * Handles web search functionality using Google Custom Search API
 * Used in plan mode to gather information from the web
 */

class SearchService {
  constructor() {
    this.apiKey = null;
    this.searchEngineId = null;
    this.isConfigured = false;
    this.baseUrl = 'https://www.googleapis.com/customsearch/v1';
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Configure the search service with API credentials
   * @param {Object} config - Configuration object
   * @param {string} config.apiKey - Google API Key
   * @param {string} config.searchEngineId - Custom Search Engine ID (cx)
   */
  configure(config = {}) {
    if (!config.apiKey || !config.searchEngineId) {
      console.warn('⚠️ SearchService: API key and Search Engine ID are required for configuration');
      this.isConfigured = false;
      return false;
    }

    this.apiKey = config.apiKey;
    this.searchEngineId = config.searchEngineId;
    this.isConfigured = true;
    console.log('✅ SearchService configured successfully');
    return true;
  }

  /**
   * Load configuration from storage
   * @returns {Promise<boolean>} True if configuration loaded successfully
   */
  async loadConfigFromStorage() {
    try {
      const result = await chrome.storage.local.get(['googleSearchApiKey', 'googleSearchEngineId']);

      if (result.googleSearchApiKey && result.googleSearchEngineId) {
        return this.configure({
          apiKey: result.googleSearchApiKey,
          searchEngineId: result.googleSearchEngineId
        });
      }

      console.warn('⚠️ SearchService: No API credentials found in storage');
      return false;
    } catch (error) {
      console.error('❌ SearchService: Error loading config from storage:', error);
      return false;
    }
  }

  /**
   * Save configuration to storage
   * @param {Object} config - Configuration object
   * @returns {Promise<boolean>} True if saved successfully
   */
  async saveConfigToStorage(config = {}) {
    try {
      await chrome.storage.local.set({
        googleSearchApiKey: config.apiKey || this.apiKey,
        googleSearchEngineId: config.searchEngineId || this.searchEngineId
      });
      console.log('✅ SearchService: Configuration saved to storage');
      return true;
    } catch (error) {
      console.error('❌ SearchService: Error saving config to storage:', error);
      return false;
    }
  }

  /**
   * Check if service is properly configured
   * @returns {boolean} True if configured
   */
  isReady() {
    return this.isConfigured && this.apiKey && this.searchEngineId;
  }

  /**
   * Perform a web search
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} options.numResults - Number of results to return (1-10, default: 5)
   * @param {string} options.language - Language for results (e.g., 'en', 'es')
   * @param {string} options.dateRestrict - Date restriction (e.g., 'd7' for past 7 days, 'm1' for past month)
   * @param {string} options.siteSearch - Restrict results to specific site
   * @returns {Promise<Object>} Search results
   */
  async search(query, options = {}) {
    if (!this.isReady()) {
      // Try to load config from storage
      await this.loadConfigFromStorage();

      if (!this.isReady()) {
        throw new Error('SearchService is not configured. Please provide API key and Search Engine ID.');
      }
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Invalid search query');
    }

    const numResults = Math.min(Math.max(options.numResults || 5, 1), 10);

    const params = new URLSearchParams({
      key: this.apiKey,
      cx: this.searchEngineId,
      q: query.trim(),
      num: numResults
    });

    // Add optional parameters
    if (options.language) {
      params.append('lr', `lang_${options.language}`);
      params.append('hl', options.language);
    }

    if (options.dateRestrict) {
      params.append('dateRestrict', options.dateRestrict);
    }

    if (options.siteSearch) {
      params.append('siteSearch', options.siteSearch);
    }

    const url = `${this.baseUrl}?${params.toString()}`;

    try {
      console.log('🔍 SearchService: Performing search:', query);
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Search API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      const results = {
        query: query,
        totalResults: parseInt(data.searchInformation?.totalResults || '0'),
        searchTime: parseFloat(data.searchInformation?.searchTime || '0'),
        items: this.formatResults(data.items || []),
        timestamp: new Date().toISOString()
      };

      console.log(`✅ SearchService: Found ${results.items.length} results in ${results.searchTime}s`);
      return results;

    } catch (error) {
      console.error('❌ SearchService: Search failed:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Fetch with retry logic
   * @param {string} url - URL to fetch
   * @param {number} retryCount - Current retry attempt
   * @returns {Promise<Response>} Fetch response
   */
  async fetchWithRetry(url, retryCount = 0) {
    try {
      return await fetch(url);
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`⚠️ SearchService: Retry ${retryCount + 1}/${this.maxRetries} after error:`, error.message);
        await this.sleep(this.retryDelay * (retryCount + 1));
        return this.fetchWithRetry(url, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Format search results into a cleaner structure
   * @param {Array} items - Raw search result items
   * @returns {Array} Formatted results
   */
  formatResults(items) {
    return items.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
      formattedUrl: item.formattedUrl,
      pagemap: item.pagemap // Contains structured data like images, metatags, etc.
    }));
  }

  /**
   * Create a summary of search results for AI context
   * @param {Object} searchResults - Search results from search()
   * @param {number} maxResults - Maximum number of results to include in summary
   * @returns {string} Formatted summary
   */
  createSearchSummary(searchResults, maxResults = 5) {
    if (!searchResults || !searchResults.items || searchResults.items.length === 0) {
      return 'No search results found.';
    }

    const resultsToInclude = searchResults.items.slice(0, maxResults);

    let summary = `Search Results for "${searchResults.query}" (${searchResults.totalResults} total results, showing ${resultsToInclude.length}):\n\n`;

    resultsToInclude.forEach((result, index) => {
      summary += `${index + 1}. ${result.title}\n`;
      summary += `   URL: ${result.link}\n`;
      summary += `   ${result.snippet}\n\n`;
    });

    return summary;
  }

  /**
   * Perform multiple searches and combine results
   * @param {Array<string>} queries - Array of search queries
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of search results
   */
  async multiSearch(queries, options = {}) {
    if (!Array.isArray(queries) || queries.length === 0) {
      throw new Error('Invalid queries array');
    }

    console.log(`🔍 SearchService: Performing ${queries.length} searches`);

    const searchPromises = queries.map(query =>
      this.search(query, options).catch(error => {
        console.error(`❌ Search failed for "${query}":`, error);
        return {
          query,
          error: error.message,
          items: [],
          totalResults: 0
        };
      })
    );

    const results = await Promise.all(searchPromises);
    console.log(`✅ SearchService: Completed ${results.length} searches`);

    return results;
  }

  /**
   * Sleep helper for retry logic
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      isReady: this.isReady(),
      hasApiKey: !!this.apiKey,
      hasSearchEngineId: !!this.searchEngineId
    };
  }

  /**
   * Clear configuration
   */
  clearConfig() {
    this.apiKey = null;
    this.searchEngineId = null;
    this.isConfigured = false;
    console.log('🔄 SearchService: Configuration cleared');
  }
}

// Export to window for Chrome extension compatibility
if (typeof window !== 'undefined') {
  window.SearchService = SearchService;
  console.log('✅ SearchService exported to window');
} else {
  console.error('❌ Window object not available - SearchService not exported');
}
