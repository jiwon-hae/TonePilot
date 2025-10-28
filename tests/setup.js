/**
 * Jest Test Setup
 * Mocks Chrome APIs and global objects for testing
 */

// Mock Chrome Storage API
const mockStorage = {
  session: {
    data: {},
    get: jest.fn((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockStorage.session.data[keys] });
      }
      return Promise.resolve(mockStorage.session.data);
    }),
    set: jest.fn((items) => {
      Object.assign(mockStorage.session.data, items);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockStorage.session.data = {};
      return Promise.resolve();
    }),
    remove: jest.fn((keys) => {
      if (Array.isArray(keys)) {
        keys.forEach(key => delete mockStorage.session.data[key]);
      } else {
        delete mockStorage.session.data[keys];
      }
      return Promise.resolve();
    })
  },
  local: {
    data: {},
    get: jest.fn((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockStorage.local.data[keys] });
      }
      return Promise.resolve(mockStorage.local.data);
    }),
    set: jest.fn((items) => {
      Object.assign(mockStorage.local.data, items);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockStorage.local.data = {};
      return Promise.resolve();
    })
  }
};

// Mock Chrome Runtime API
const mockRuntime = {
  sendMessage: jest.fn(),
  onMessage: {
    addListener: jest.fn()
  }
};

// Set up global Chrome API
global.chrome = {
  storage: mockStorage,
  runtime: mockRuntime
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};

// Mock Chrome AI APIs (global objects, not under window.ai)
const mockAIApis = {
  LanguageModel: {
    availability: jest.fn(() => Promise.resolve('readily')),
    create: jest.fn(() => Promise.resolve({
      prompt: jest.fn((text) => Promise.resolve(`Mocked response for: ${text}`)),
      destroy: jest.fn()
    }))
  },
  Rewriter: {
    availability: jest.fn(() => Promise.resolve('readily')),
    create: jest.fn(() => Promise.resolve({
      rewrite: jest.fn((text) => Promise.resolve(`Rewritten: ${text}`)),
      destroy: jest.fn()
    }))
  },
  Writer: {
    availability: jest.fn(() => Promise.resolve('readily')),
    create: jest.fn(() => Promise.resolve({
      write: jest.fn((prompt) => Promise.resolve(`Written content for: ${prompt}`)),
      destroy: jest.fn()
    }))
  },
  Summarizer: {
    availability: jest.fn(() => Promise.resolve('readily')),
    create: jest.fn(() => Promise.resolve({
      summarize: jest.fn((text) => Promise.resolve(`Summary: ${text.substring(0, 50)}...`)),
      destroy: jest.fn()
    }))
  },
  Proofreader: {
    availability: jest.fn(() => Promise.resolve('readily')),
    create: jest.fn(() => Promise.resolve({
      proofread: jest.fn((text) => Promise.resolve(`Proofread: ${text}`)),
      destroy: jest.fn()
    }))
  },
  Translator: {
    availability: jest.fn(() => Promise.resolve('readily')),
    create: jest.fn(() => Promise.resolve({
      translate: jest.fn((text) => Promise.resolve(`Translated: ${text}`)),
      destroy: jest.fn()
    }))
  },
  LanguageDetector: {
    availability: jest.fn(() => Promise.resolve('readily')),
    create: jest.fn(() => Promise.resolve({
      detect: jest.fn((text) => Promise.resolve({ detectedLanguage: 'en', confidence: 0.95 })),
      destroy: jest.fn()
    }))
  }
};

// Set APIs on both global.self and global scope
global.self = mockAIApis;
// Also make them available directly on global for direct access (e.g., Writer.availability())
Object.assign(global, mockAIApis);

// Mock navigator for PromptService
global.navigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  userAgentData: {
    brands: [
      { brand: 'Google Chrome', version: '138' }
    ]
  }
};

// Helper to reset all mocks between tests
global.resetAllMocks = () => {
  mockStorage.session.data = {};
  mockStorage.local.data = {};
  jest.clearAllMocks();
};

// Helper to set mock storage data
global.setMockStorageData = (type, data) => {
  if (type === 'session') {
    mockStorage.session.data = { ...data };
  } else if (type === 'local') {
    mockStorage.local.data = { ...data };
  }
};

// Run before each test
beforeEach(() => {
  resetAllMocks();
});

console.log('✅ Test environment setup complete');
