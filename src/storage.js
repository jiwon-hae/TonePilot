class StorageManager {
  constructor() {
    this.dbName = 'TonePilotDB';
    this.dbVersion = 1;
    this.db = null;
    this.maxHistoryItems = 5;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('rewrites')) {
          const rewriteStore = db.createObjectStore('rewrites', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          rewriteStore.createIndex('timestamp', 'timestamp', { unique: false });
          rewriteStore.createIndex('domain', 'domain', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { 
            keyPath: 'key' 
          });
        }
      };
    });
  }

  async saveRewrite(rewriteData) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const record = {
      originalText: rewriteData.originalText,
      rewrittenText: rewriteData.rewrittenText,
      preset: rewriteData.preset,
      domain: rewriteData.domain,
      timestamp: Date.now(),
      metadata: rewriteData.metadata || {}
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['rewrites'], 'readwrite');
      const store = transaction.objectStore('rewrites');
      
      const request = store.add(record);
      
      request.onsuccess = () => {
        this.cleanupOldRecords();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getRecentRewrites(limit = 5) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['rewrites'], 'readonly');
      const store = transaction.objectStore('rewrites');
      const index = store.index('timestamp');
      
      const request = index.openCursor(null, 'prev');
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

  async getRewritesByDomain(domain, limit = 3) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['rewrites'], 'readonly');
      const store = transaction.objectStore('rewrites');
      const index = store.index('domain');
      
      const request = index.openCursor(IDBKeyRange.only(domain), 'prev');
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

  async clearHistory() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['rewrites'], 'readwrite');
      const store = transaction.objectStore('rewrites');
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async cleanupOldRecords() {
    if (!this.db) return;

    const transaction = this.db.transaction(['rewrites'], 'readwrite');
    const store = transaction.objectStore('rewrites');
    const index = store.index('timestamp');
    
    const request = index.openCursor(null, 'prev');
    let count = 0;
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        count++;
        if (count > this.maxHistoryItems) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  }

  async saveSetting(key, value) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      
      const request = store.put({ key, value, timestamp: Date.now() });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSetting(key, defaultValue = null) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageStats() {
    if (!this.db) {
      return { rewriteCount: 0, storageEnabled: false };
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['rewrites'], 'readonly');
      const store = transaction.objectStore('rewrites');
      
      const request = store.count();
      
      request.onsuccess = () => {
        resolve({
          rewriteCount: request.result,
          storageEnabled: true,
          maxItems: this.maxHistoryItems
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async exportData() {
    const rewrites = await this.getRecentRewrites(100);
    const settings = {};
    
    const settingKeys = ['storeHistory', 'defaultPreset', 'piiScrubbing'];
    for (const key of settingKeys) {
      settings[key] = await this.getSetting(key);
    }

    return {
      version: this.dbVersion,
      exportDate: new Date().toISOString(),
      rewrites,
      settings
    };
  }

  async importData(data) {
    if (!data.rewrites || !Array.isArray(data.rewrites)) {
      throw new Error('Invalid import data format');
    }

    await this.clearHistory();
    
    for (const rewrite of data.rewrites) {
      await this.saveRewrite(rewrite);
    }
    
    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        if (value !== null && value !== undefined) {
          await this.saveSetting(key, value);
        }
      }
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}