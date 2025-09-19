/**
 * Storage configuration constants
 * @const {Object}
 */
const STORAGE_CONSTANTS = {
  DB_NAME: 'TonePilotDB',
  DB_VERSION: 1,
  MAX_HISTORY_ITEMS: 5,
  MAX_EXPORT_ITEMS: 100,
  STORE_NAMES: {
    REWRITES: 'rewrites',
    SETTINGS: 'settings'
  },
  INDICES: {
    TIMESTAMP: 'timestamp',
    DOMAIN: 'domain'
  },
  SETTING_KEYS: ['storeHistory', 'defaultPreset', 'piiScrubbing']
};

/**
 * IndexedDB-based storage manager for TonePilot extension
 * Handles rewrite history, settings, and data export/import functionality
 */
class StorageManager {
  /**
   * Initialize the storage manager
   */
  constructor() {
    this.dbName = STORAGE_CONSTANTS.DB_NAME;
    this.dbVersion = STORAGE_CONSTANTS.DB_VERSION;
    this.db = null;
    this.maxHistoryItems = STORAGE_CONSTANTS.MAX_HISTORY_ITEMS;
    this.isInitialized = false;
  }

  /**
   * Initialize the IndexedDB database
   * @returns {Promise<void>}
   * @throws {Error} If database initialization fails
   */
  async initialize() {
    if (this.isInitialized && this.db) {
      return;
    }

    try {
      await this._openDatabase();
      this.isInitialized = true;
    } catch (error) {
      console.error('StorageManager initialization failed:', error);
      throw new Error(`Failed to initialize storage: ${error.message}`);
    }
  }

  /**
   * Open and configure the IndexedDB database
   * @private
   * @returns {Promise<void>}
   */
  _openDatabase() {
    return new Promise((resolve, reject) => {
      if (!indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        const error = request.error || new Error('Unknown database error');
        reject(error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this._setupErrorHandlers();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        try {
          this._upgradeDatabase(event.target.result);
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  /**
   * Setup database error handlers
   * @private
   */
  _setupErrorHandlers() {
    if (this.db) {
      this.db.onerror = (event) => {
        console.error('Database error:', event.target.error);
      };

      this.db.onversionchange = () => {
        this.db.close();
        this.db = null;
        this.isInitialized = false;
      };
    }
  }

  /**
   * Upgrade database schema
   * @private
   * @param {IDBDatabase} db - Database instance
   */
  _upgradeDatabase(db) {
    const { STORE_NAMES, INDICES } = STORAGE_CONSTANTS;

    if (!db.objectStoreNames.contains(STORE_NAMES.REWRITES)) {
      const rewriteStore = db.createObjectStore(STORE_NAMES.REWRITES, {
        keyPath: 'id',
        autoIncrement: true
      });
      rewriteStore.createIndex(INDICES.TIMESTAMP, INDICES.TIMESTAMP, { unique: false });
      rewriteStore.createIndex(INDICES.DOMAIN, INDICES.DOMAIN, { unique: false });
    }

    if (!db.objectStoreNames.contains(STORE_NAMES.SETTINGS)) {
      db.createObjectStore(STORE_NAMES.SETTINGS, {
        keyPath: 'key'
      });
    }
  }

  /**
   * Save a rewrite record to storage
   * @param {Object} rewriteData - The rewrite data to save
   * @param {string} rewriteData.originalText - Original text
   * @param {string} rewriteData.rewrittenText - Rewritten text
   * @param {string} rewriteData.preset - Preset used
   * @param {string} rewriteData.domain - Domain where rewrite occurred
   * @param {Object} [rewriteData.metadata] - Additional metadata
   * @returns {Promise<number>} The ID of the saved record
   * @throws {Error} If database is not initialized or save fails
   */
  async saveRewrite(rewriteData) {
    await this._ensureInitialized();

    if (!this._validateRewriteData(rewriteData)) {
      throw new Error('Invalid rewrite data provided');
    }

    const record = this._createRewriteRecord(rewriteData);

    try {
      const id = await this._executeTransaction(
        [STORAGE_CONSTANTS.STORE_NAMES.REWRITES],
        'readwrite',
        (store) => store.add(record)
      );

      // Cleanup old records asynchronously
      this.cleanupOldRecords().catch(error => {
        console.warn('Failed to cleanup old records:', error);
      });

      return id;
    } catch (error) {
      console.error('Failed to save rewrite:', error);
      throw new Error(`Failed to save rewrite: ${error.message}`);
    }
  }

  /**
   * Validate rewrite data structure
   * @private
   * @param {Object} data - Data to validate
   * @returns {boolean} True if valid
   */
  _validateRewriteData(data) {
    return data &&
           typeof data.originalText === 'string' &&
           typeof data.rewrittenText === 'string' &&
           typeof data.preset === 'string' &&
           data.originalText.length > 0 &&
           data.rewrittenText.length > 0;
  }

  /**
   * Create a standardized rewrite record
   * @private
   * @param {Object} rewriteData - Source data
   * @returns {Object} Formatted record
   */
  _createRewriteRecord(rewriteData) {
    return {
      originalText: rewriteData.originalText.trim(),
      rewrittenText: rewriteData.rewrittenText.trim(),
      preset: rewriteData.preset,
      domain: rewriteData.domain || 'unknown',
      timestamp: Date.now(),
      metadata: rewriteData.metadata || {}
    };
  }

  /**
   * Get recent rewrite records
   * @param {number} [limit=5] - Maximum number of records to retrieve
   * @returns {Promise<Array>} Array of rewrite records
   * @throws {Error} If database operation fails
   */
  async getRecentRewrites(limit = STORAGE_CONSTANTS.MAX_HISTORY_ITEMS) {
    await this._ensureInitialized();

    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error('Limit must be a non-negative integer');
    }

    try {
      return await this._getCursorResults(
        STORAGE_CONSTANTS.STORE_NAMES.REWRITES,
        STORAGE_CONSTANTS.INDICES.TIMESTAMP,
        null,
        'prev',
        limit
      );
    } catch (error) {
      console.error('Failed to get recent rewrites:', error);
      throw new Error(`Failed to retrieve recent rewrites: ${error.message}`);
    }
  }

  /**
   * Get rewrite records for a specific domain
   * @param {string} domain - Domain to filter by
   * @param {number} [limit=3] - Maximum number of records to retrieve
   * @returns {Promise<Array>} Array of domain-specific rewrite records
   * @throws {Error} If domain is invalid or database operation fails
   */
  async getRewritesByDomain(domain, limit = 3) {
    await this._ensureInitialized();

    if (!domain || typeof domain !== 'string') {
      throw new Error('Domain must be a non-empty string');
    }

    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error('Limit must be a non-negative integer');
    }

    try {
      return await this._getCursorResults(
        STORAGE_CONSTANTS.STORE_NAMES.REWRITES,
        STORAGE_CONSTANTS.INDICES.DOMAIN,
        IDBKeyRange.only(domain),
        'prev',
        limit
      );
    } catch (error) {
      console.error('Failed to get rewrites by domain:', error);
      throw new Error(`Failed to retrieve rewrites for domain: ${error.message}`);
    }
  }

  /**
   * Clear all rewrite history
   * @returns {Promise<void>}
   * @throws {Error} If database operation fails
   */
  async clearHistory() {
    await this._ensureInitialized();

    try {
      await this._executeTransaction(
        [STORAGE_CONSTANTS.STORE_NAMES.REWRITES],
        'readwrite',
        (store) => store.clear()
      );
    } catch (error) {
      console.error('Failed to clear history:', error);
      throw new Error(`Failed to clear history: ${error.message}`);
    }
  }

  /**
   * Cleanup old records beyond the maximum limit
   * @returns {Promise<number>} Number of records deleted
   */
  async cleanupOldRecords() {
    if (!this.isInitialized || !this.db) {
      return 0;
    }

    try {
      return await this._executeTransaction(
        [STORAGE_CONSTANTS.STORE_NAMES.REWRITES],
        'readwrite',
        async (store) => {
          const index = store.index(STORAGE_CONSTANTS.INDICES.TIMESTAMP);
          return await this._cleanupWithCursor(index);
        }
      );
    } catch (error) {
      console.warn('Failed to cleanup old records:', error);
      return 0;
    }
  }

  /**
   * Cleanup records using cursor iteration
   * @private
   * @param {IDBIndex} index - Timestamp index
   * @returns {Promise<number>} Number of deleted records
   */
  _cleanupWithCursor(index) {
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      let count = 0;
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          count++;
          if (count > this.maxHistoryItems) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a setting value
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @returns {Promise<void>}
   * @throws {Error} If key is invalid or database operation fails
   */
  async saveSetting(key, value) {
    await this._ensureInitialized();

    if (!key || typeof key !== 'string') {
      throw new Error('Setting key must be a non-empty string');
    }

    try {
      await this._executeTransaction(
        [STORAGE_CONSTANTS.STORE_NAMES.SETTINGS],
        'readwrite',
        (store) => store.put({ key, value, timestamp: Date.now() })
      );
    } catch (error) {
      console.error('Failed to save setting:', error);
      throw new Error(`Failed to save setting '${key}': ${error.message}`);
    }
  }

  /**
   * Get a setting value
   * @param {string} key - Setting key
   * @param {*} [defaultValue=null] - Default value if setting not found
   * @returns {Promise<*>} Setting value or default
   * @throws {Error} If key is invalid or database operation fails
   */
  async getSetting(key, defaultValue = null) {
    await this._ensureInitialized();

    if (!key || typeof key !== 'string') {
      throw new Error('Setting key must be a non-empty string');
    }

    try {
      const result = await this._executeTransaction(
        [STORAGE_CONSTANTS.STORE_NAMES.SETTINGS],
        'readonly',
        (store) => store.get(key)
      );
      return result ? result.value : defaultValue;
    } catch (error) {
      console.error('Failed to get setting:', error);
      return defaultValue;
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage statistics object
   */
  async getStorageStats() {
    if (!this.isInitialized || !this.db) {
      return {
        rewriteCount: 0,
        storageEnabled: false,
        maxItems: this.maxHistoryItems,
        dbSize: 0
      };
    }

    try {
      const rewriteCount = await this._executeTransaction(
        [STORAGE_CONSTANTS.STORE_NAMES.REWRITES],
        'readonly',
        (store) => store.count()
      );

      return {
        rewriteCount,
        storageEnabled: true,
        maxItems: this.maxHistoryItems,
        dbName: this.dbName,
        dbVersion: this.dbVersion
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        rewriteCount: 0,
        storageEnabled: false,
        maxItems: this.maxHistoryItems,
        error: error.message
      };
    }
  }

  /**
   * Export all data for backup
   * @returns {Promise<Object>} Exported data object
   * @throws {Error} If export operation fails
   */
  async exportData() {
    try {
      const rewrites = await this.getRecentRewrites(STORAGE_CONSTANTS.MAX_EXPORT_ITEMS);
      const settings = {};

      // Export all known settings
      for (const key of STORAGE_CONSTANTS.SETTING_KEYS) {
        try {
          settings[key] = await this.getSetting(key);
        } catch (error) {
          console.warn(`Failed to export setting '${key}':`, error);
          settings[key] = null;
        }
      }

      return {
        version: this.dbVersion,
        exportDate: new Date().toISOString(),
        rewrites,
        settings,
        stats: await this.getStorageStats()
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error(`Failed to export data: ${error.message}`);
    }
  }

  /**
   * Import data from backup
   * @param {Object} data - Data object to import
   * @param {Array} data.rewrites - Rewrite records to import
   * @param {Object} [data.settings] - Settings to import
   * @returns {Promise<Object>} Import result statistics
   * @throws {Error} If data is invalid or import fails
   */
  async importData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Import data must be an object');
    }

    if (!data.rewrites || !Array.isArray(data.rewrites)) {
      throw new Error('Invalid import data: rewrites must be an array');
    }

    const results = {
      rewritesImported: 0,
      rewritesFailed: 0,
      settingsImported: 0,
      settingsFailed: 0
    };

    try {
      // Clear existing history
      await this.clearHistory();

      // Import rewrites
      for (const rewrite of data.rewrites) {
        try {
          await this.saveRewrite(rewrite);
          results.rewritesImported++;
        } catch (error) {
          console.warn('Failed to import rewrite:', error);
          results.rewritesFailed++;
        }
      }

      // Import settings if provided
      if (data.settings && typeof data.settings === 'object') {
        for (const [key, value] of Object.entries(data.settings)) {
          if (value !== null && value !== undefined) {
            try {
              await this.saveSetting(key, value);
              results.settingsImported++;
            } catch (error) {
              console.warn(`Failed to import setting '${key}':`, error);
              results.settingsFailed++;
            }
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error(`Failed to import data: ${error.message}`);
    }
  }

  /**
   * Ensure database is initialized
   * @private
   * @throws {Error} If initialization fails
   */
  async _ensureInitialized() {
    if (!this.isInitialized || !this.db) {
      await this.initialize();
    }
  }

  /**
   * Execute a database transaction
   * @private
   * @param {string[]} storeNames - Store names to access
   * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
   * @param {Function} operation - Operation to perform
   * @returns {Promise<*>} Transaction result
   */
  _executeTransaction(storeNames, mode, operation) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not available'));
        return;
      }

      const transaction = this.db.transaction(storeNames, mode);
      const store = transaction.objectStore(storeNames[0]);

      transaction.onerror = () => {
        reject(transaction.error || new Error('Transaction failed'));
      };

      transaction.onabort = () => {
        reject(new Error('Transaction aborted'));
      };

      try {
        const request = operation(store);

        if (request && typeof request.then === 'function') {
          // Handle async operations
          request.then(resolve).catch(reject);
        } else if (request && request.onsuccess !== undefined) {
          // Handle IDB requests
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } else {
          // Handle direct values
          resolve(request);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get results using cursor iteration
   * @private
   * @param {string} storeName - Store name
   * @param {string} indexName - Index name
   * @param {IDBKeyRange|null} keyRange - Key range
   * @param {string} direction - Cursor direction
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Results array
   */
  _getCursorResults(storeName, indexName, keyRange, direction, limit) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);

      const request = index.openCursor(keyRange, direction);
      const results = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// Browser global export
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
  window.STORAGE_CONSTANTS = STORAGE_CONSTANTS;
}

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, STORAGE_CONSTANTS };
}