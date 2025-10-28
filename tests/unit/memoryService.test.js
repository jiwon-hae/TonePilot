/**
 * MemoryService Unit Tests
 * Tests BM25 retrieval, chronological detection, and memory operations
 */

// Load dependencies
const fs = require('fs');
const path = require('path');

// Load utility files first
const loggerCode = fs.readFileSync(path.join(__dirname, '../../utils/logger.js'), 'utf8');
const errorHandlerCode = fs.readFileSync(path.join(__dirname, '../../utils/errorHandler.js'), 'utf8');
const validatorCode = fs.readFileSync(path.join(__dirname, '../../utils/validator.js'), 'utf8');
const baseServiceCode = fs.readFileSync(path.join(__dirname, '../../services/baseService.js'), 'utf8');

// Load services
const summarizerServiceCode = fs.readFileSync(path.join(__dirname, '../../services/summarizerService.js'), 'utf8');
const memoryServiceCode = fs.readFileSync(path.join(__dirname, '../../services/memoryService.js'), 'utf8');

// Execute code in global scope
eval(loggerCode);
eval(errorHandlerCode);
eval(validatorCode);
eval(baseServiceCode);
eval(summarizerServiceCode);
eval(memoryServiceCode);

describe('MemoryService', () => {
  let memoryService;

  beforeEach(async () => {
    resetAllMocks();
    memoryService = new window.MemoryService();

    // Mock summarizer to avoid actual AI calls
    memoryService.summarizerService = {
      isAvailable: true,
      initialize: jest.fn(() => Promise.resolve()),
      summarize: jest.fn((text) => Promise.resolve(`Summarized: ${text.substring(0, 50)}...`))
    };

    await memoryService.initialize();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      expect(memoryService.isInitialized).toBe(true);
      expect(memoryService.isAvailable).toBe(true);
      expect(memoryService.memoryStore).toEqual([]);
    });

    test('should load existing memory from session storage', async () => {
      const existingMemory = [
        { id: 'mem_1', query: 'test query', content: 'test content', timestamp: new Date().toISOString() }
      ];

      setMockStorageData('session', { conversationMemory: existingMemory });

      const newService = new window.MemoryService();
      newService.summarizerService = memoryService.summarizerService;
      await newService.initialize();

      expect(newService.memoryStore).toHaveLength(1);
      expect(newService.memoryStore[0].id).toBe('mem_1');
    });
  });

  describe('addConversation', () => {
    test('should add conversation without summarization for short content', async () => {
      const query = 'Write an email';
      const content = 'Short response';

      const result = await memoryService.addConversation(query, content, { intent: 'write' });

      expect(result).toBeDefined();
      expect(result.query).toBe(query);
      expect(result.content).toBe(content);
      expect(result.isSummarized).toBe(false);
      expect(memoryService.memoryStore).toHaveLength(1);
    });

    test('should summarize long content', async () => {
      const query = 'Write a long email';
      const longContent = 'a'.repeat(600); // Exceeds 500 char threshold

      const result = await memoryService.addConversation(query, longContent);

      expect(result.isSummarized).toBe(true);
      expect(result.content).not.toBe(longContent);
      expect(result.originalContentLength).toBe(600);
      expect(memoryService.summarizerService.summarize).toHaveBeenCalled();
    });

    test('should include metadata', async () => {
      const metadata = { intent: 'write', format: 'email', tone: 'formal' };

      const result = await memoryService.addConversation('test', 'content', metadata);

      expect(result.metadata).toMatchObject(metadata);
    });

    test('should save to session storage', async () => {
      await memoryService.addConversation('test', 'content');

      expect(chrome.storage.session.set).toHaveBeenCalled();
    });

    test('should trim memory when exceeding MAX_MEMORY_ITEMS', async () => {
      memoryService.MAX_MEMORY_ITEMS = 3;

      await memoryService.addConversation('query1', 'content1');
      await memoryService.addConversation('query2', 'content2');
      await memoryService.addConversation('query3', 'content3');
      await memoryService.addConversation('query4', 'content4'); // Should remove oldest

      expect(memoryService.memoryStore).toHaveLength(3);
      expect(memoryService.memoryStore[0].query).toBe('query2');
    });
  });

  describe('Chronological Query Detection', () => {
    test('should detect "previous" as chronological', () => {
      expect(memoryService.detectChronologicalQuery('what did we discuss previous?')).toBe(true);
    });

    test('should detect "last" as chronological', () => {
      expect(memoryService.detectChronologicalQuery('tell me about the last conversation')).toBe(true);
    });

    test('should detect "recent" as chronological', () => {
      expect(memoryService.detectChronologicalQuery('show me recent chats')).toBe(true);
    });

    test('should detect "earlier" as chronological', () => {
      expect(memoryService.detectChronologicalQuery('what did we talk about earlier?')).toBe(true);
    });

    test('should detect "remind me" as chronological', () => {
      expect(memoryService.detectChronologicalQuery('remind me what I said')).toBe(true);
    });

    test('should NOT detect semantic queries as chronological', () => {
      expect(memoryService.detectChronologicalQuery('write an email about projects')).toBe(false);
      expect(memoryService.detectChronologicalQuery('help me with cover letter')).toBe(false);
    });
  });

  describe('BM25 Scoring', () => {
    beforeEach(async () => {
      // Add test conversations
      await memoryService.addConversation('write email template', 'Professional email template with greeting');
      await memoryService.addConversation('create cover letter', 'Cover letter for job application');
      await memoryService.addConversation('draft LinkedIn post', 'Post about AI and machine learning');
    });

    test('should calculate BM25 scores correctly', () => {
      const query = 'email template professional';
      const item = memoryService.memoryStore[0];

      const score = memoryService.calculateBM25Score(query, item);

      expect(score).toBeGreaterThan(0);
      expect(typeof score).toBe('number');
    });

    test('should give higher scores to more relevant documents', () => {
      const query = 'email template';

      const scores = memoryService.memoryStore.map(item => ({
        query: item.query,
        score: memoryService.calculateBM25Score(query, item)
      }));

      // First item (email template) should have highest score
      expect(scores[0].score).toBeGreaterThan(scores[1].score);
      expect(scores[0].score).toBeGreaterThan(scores[2].score);
    });

    test('should return 0 score for completely irrelevant documents', () => {
      const query = 'xyz123 nonexistent terms';
      const item = memoryService.memoryStore[0];

      const score = memoryService.calculateBM25Score(query, item);

      expect(score).toBe(0);
    });
  });

  describe('retrieveRelevant', () => {
    beforeEach(async () => {
      // Add test conversations with timestamps
      await memoryService.addConversation('write email', 'Email content 1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await memoryService.addConversation('create letter', 'Letter content 2');
      await new Promise(resolve => setTimeout(resolve, 10));
      await memoryService.addConversation('draft post', 'Post content 3');
    });

    test('should return recent conversations for chronological queries', () => {
      const results = memoryService.retrieveRelevant('what did we discuss earlier?', 2);

      expect(results).toHaveLength(2);
      expect(results[0].retrievalType).toBe('chronological');
      expect(results[0].query).toBe('draft post'); // Most recent first
      expect(results[1].query).toBe('create letter');
    });

    test('should return BM25-scored conversations for semantic queries', () => {
      const results = memoryService.retrieveRelevant('email template', 3);

      expect(results).toHaveLength(3);
      expect(results[0].retrievalType).toBe('semantic');
      expect(results[0].score).toBeDefined();
      // Email query should have highest score
      expect(results[0].query).toBe('write email');
    });

    test('should limit results to topK', () => {
      const results = memoryService.retrieveRelevant('anything', 2);

      expect(results).toHaveLength(2);
    });

    test('should return empty array when no memory exists', () => {
      memoryService.memoryStore = [];

      const results = memoryService.retrieveRelevant('test query', 5);

      expect(results).toEqual([]);
    });
  });

  describe('getRelevantContextString', () => {
    beforeEach(async () => {
      await memoryService.addConversation('query 1', 'content 1');
      await memoryService.addConversation('query 2', 'content 2');
    });

    test('should format context string correctly', () => {
      const context = memoryService.getRelevantContextString('query 1', 2);

      expect(context).toContain('RELEVANT CONVERSATION CONTEXT:');
      expect(context).toContain('Q: query 1');
      expect(context).toContain('A: content 1');
    });

    test('should include score labels for semantic retrieval', () => {
      const context = memoryService.getRelevantContextString('query 1', 2);

      expect(context).toMatch(/Score: \d+\.\d+|Recent/);
    });

    test('should return empty string when no results', () => {
      memoryService.memoryStore = [];

      const context = memoryService.getRelevantContextString('test', 5);

      expect(context).toBe('');
    });
  });

  describe('Tokenization', () => {
    test('should tokenize text correctly', () => {
      const tokens = memoryService.tokenize('Write an email template for job applications');

      expect(tokens).toContain('write');
      expect(tokens).toContain('email');
      expect(tokens).toContain('template');
      expect(tokens).toContain('job');
      expect(tokens).toContain('applications');
    });

    test('should remove punctuation', () => {
      const tokens = memoryService.tokenize('Hello, world! How are you?');

      expect(tokens).not.toContain(',');
      expect(tokens).not.toContain('!');
      expect(tokens).not.toContain('?');
    });

    test('should filter out short terms', () => {
      const tokens = memoryService.tokenize('I am a developer');

      expect(tokens).not.toContain('i');
      expect(tokens).not.toContain('am');
      expect(tokens).toContain('developer');
    });

    test('should convert to lowercase', () => {
      const tokens = memoryService.tokenize('HELLO World');

      expect(tokens).toContain('hello');
      expect(tokens).toContain('world');
    });
  });

  describe('Memory Management', () => {
    test('should clear all memory', async () => {
      await memoryService.addConversation('test1', 'content1');
      await memoryService.addConversation('test2', 'content2');

      await memoryService.clearMemory();

      expect(memoryService.memoryStore).toHaveLength(0);
      expect(chrome.storage.session.set).toHaveBeenCalledWith({ conversationMemory: [] });
    });

    test('should delete specific conversation', async () => {
      await memoryService.addConversation('test1', 'content1');
      const item = await memoryService.addConversation('test2', 'content2');
      await memoryService.addConversation('test3', 'content3');

      const deleted = await memoryService.deleteConversation(item.id);

      expect(deleted).toBe(true);
      expect(memoryService.memoryStore).toHaveLength(2);
      expect(memoryService.memoryStore.find(m => m.id === item.id)).toBeUndefined();
    });

    test('should return false when deleting non-existent conversation', async () => {
      const deleted = await memoryService.deleteConversation('fake-id');

      expect(deleted).toBe(false);
    });
  });

  describe('Statistics', () => {
    test('should calculate stats correctly', async () => {
      await memoryService.addConversation('query1', 'short content', { intent: 'write' });
      await memoryService.addConversation('query2', 'a'.repeat(600), { intent: 'rewrite' });

      const stats = memoryService.getStats();

      expect(stats.totalConversations).toBe(2);
      expect(stats.summarizedCount).toBe(1); // Second one was summarized
      expect(stats.intentBreakdown).toEqual({ write: 1, rewrite: 1 });
      expect(stats.compressionRatio).toBeDefined();
    });
  });

  describe('Export/Import', () => {
    test('should export memory as JSON', async () => {
      await memoryService.addConversation('test', 'content');

      const exported = memoryService.exportMemory();

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });

    test('should import memory from JSON', async () => {
      const data = [
        { id: 'mem_1', query: 'q1', content: 'c1', timestamp: new Date().toISOString() },
        { id: 'mem_2', query: 'q2', content: 'c2', timestamp: new Date().toISOString() }
      ];

      const success = await memoryService.importMemory(JSON.stringify(data));

      expect(success).toBe(true);
      expect(memoryService.memoryStore).toHaveLength(2);
    });

    test('should fail on invalid JSON import', async () => {
      const success = await memoryService.importMemory('invalid json');

      expect(success).toBe(false);
    });
  });
});
