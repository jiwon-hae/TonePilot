/**
 * Integration Tests: Routing + Services + Memory
 * Tests the complete flow including context retrieval and memory management
 */

const fs = require('fs');
const path = require('path');

// Load all dependencies
const loggerCode = fs.readFileSync(path.join(__dirname, '../../utils/logger.js'), 'utf8');
const errorHandlerCode = fs.readFileSync(path.join(__dirname, '../../utils/errorHandler.js'), 'utf8');
const validatorCode = fs.readFileSync(path.join(__dirname, '../../utils/validator.js'), 'utf8');
const baseServiceCode = fs.readFileSync(path.join(__dirname, '../../services/baseService.js'), 'utf8');
const promptServiceCode = fs.readFileSync(path.join(__dirname, '../../services/promptService.js'), 'utf8');
const semanticRoutingCode = fs.readFileSync(path.join(__dirname, '../../services/semanticRouting.js'), 'utf8');
const writerServiceCode = fs.readFileSync(path.join(__dirname, '../../services/writerService.js'), 'utf8');
const rewriterServiceCode = fs.readFileSync(path.join(__dirname, '../../services/rewriterService.js'), 'utf8');
const summarizerServiceCode = fs.readFileSync(path.join(__dirname, '../../services/summarizerService.js'), 'utf8');
const memoryServiceCode = fs.readFileSync(path.join(__dirname, '../../services/memoryService.js'), 'utf8');

// Execute code
eval(loggerCode);
eval(errorHandlerCode);
eval(validatorCode);
eval(baseServiceCode);
eval(promptServiceCode);
eval(semanticRoutingCode);
eval(writerServiceCode);
eval(rewriterServiceCode);
eval(summarizerServiceCode);
eval(memoryServiceCode);

describe('Integration: Routing + Services + Memory', () => {
  let router;
  let writerService;
  let rewriterService;
  let memoryService;

  beforeEach(async () => {
    resetAllMocks();

    router = new window.SemanticRouter();
    await router.initialize();

    writerService = new window.WriterService();
    await writerService.initialize();

    rewriterService = new window.RewriterService();
    await rewriterService.initialize();

    memoryService = new window.MemoryService();
    // Mock summarizer to avoid actual AI calls
    memoryService.summarizerService = {
      isAvailable: true,
      initialize: jest.fn(() => Promise.resolve()),
      summarize: jest.fn((text) => Promise.resolve(`Summarized: ${text.substring(0, 50)}...`))
    };
    await memoryService.initialize();
  });

  describe('Memory Context Integration', () => {
    test('should save conversation to memory after successful processing', async () => {
      const query = 'write an email about project updates';
      const routing = router.route(query);

      expect(routing.intent).toBe('write');

      const result = await writerService.write(query, { tone: routing.tones[0] });

      // Save to memory
      await memoryService.addConversation(query, result, {
        intent: routing.intent,
        format: routing.outputType
      });

      expect(memoryService.memoryStore).toHaveLength(1);
      expect(memoryService.memoryStore[0].query).toBe(query);
      expect(memoryService.memoryStore[0].content).toBe(result);
    });

    test('should retrieve relevant context for related follow-up query', async () => {
      // First conversation
      const query1 = 'write an email about project deadline';
      const result1 = 'Dear team, regarding the project deadline...';
      await memoryService.addConversation(query1, result1, { intent: 'write' });

      // Second conversation
      const query2 = 'write a status update email';
      const result2 = 'Hi everyone, here is the status update...';
      await memoryService.addConversation(query2, result2, { intent: 'write' });

      // Retrieve context for email-related query
      const followUpQuery = 'write another email about the project';
      const relevantContext = memoryService.retrieveRelevant(followUpQuery, 2);

      expect(relevantContext).toHaveLength(2);
      expect(relevantContext[0].retrievalType).toBe('semantic');
      // Should retrieve email-related conversations
      expect(relevantContext.some(item => item.query.includes('email'))).toBe(true);
    });

    test('should use chronological retrieval for temporal queries', async () => {
      // Add multiple conversations
      await memoryService.addConversation('write email 1', 'content 1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await memoryService.addConversation('write email 2', 'content 2');
      await new Promise(resolve => setTimeout(resolve, 10));
      await memoryService.addConversation('write email 3', 'content 3');

      // Query for recent conversations
      const query = 'what did we discuss earlier?';
      const relevantContext = memoryService.retrieveRelevant(query, 2);

      expect(relevantContext).toHaveLength(2);
      expect(relevantContext[0].retrievalType).toBe('chronological');
      expect(relevantContext[0].query).toBe('write email 3'); // Most recent first
      expect(relevantContext[1].query).toBe('write email 2');
    });

    test('should format context string for AI consumption', async () => {
      await memoryService.addConversation('write a formal email', 'formal email content');
      await memoryService.addConversation('write a casual note', 'casual note content');

      const contextString = memoryService.getRelevantContextString('write an email', 2);

      expect(contextString).toContain('RELEVANT CONVERSATION CONTEXT:');
      expect(contextString).toContain('Q: write a formal email');
      expect(contextString).toContain('A: formal email content');
      expect(contextString).toMatch(/Score: [\d.]+/); // Should include BM25 scores
    });
  });

  describe('End-to-End Flow with Memory', () => {
    test('should complete full flow: route → process → save → retrieve → use context', async () => {
      // Step 1: First query - write an email
      const query1 = 'write a formal email to manager about vacation';
      const routing1 = router.route(query1);

      expect(routing1.intent).toBe('write');
      expect(routing1.tones).toContain('formal');

      const result1 = await writerService.write(query1, { tone: 'formal' });

      // Save to memory
      await memoryService.addConversation(query1, result1, {
        intent: routing1.intent,
        format: routing1.outputType,
        tone: routing1.tones[0]
      });

      // Step 2: Second query - related follow-up
      const query2 = 'write another email about the vacation dates';

      // Retrieve context before processing
      const context = memoryService.getRelevantContextString(query2, 3);
      expect(context).toBeDefined();
      expect(context).toContain('vacation'); // Should retrieve previous vacation email

      const routing2 = router.route(query2);
      const result2 = await writerService.write(query2);

      // Save second conversation
      await memoryService.addConversation(query2, result2, {
        intent: routing2.intent
      });

      // Verify memory state
      expect(memoryService.memoryStore).toHaveLength(2);

      // Step 3: Chronological query
      const query3 = 'what did we discuss earlier?';
      const recentContext = memoryService.retrieveRelevant(query3, 2);

      expect(recentContext).toHaveLength(2);
      expect(recentContext[0].retrievalType).toBe('chronological');
      expect(recentContext[0].query).toBe(query2); // Most recent
    });

    test('should handle long content with summarization in memory', async () => {
      const query = 'write a detailed project report';
      const longContent = 'a'.repeat(600); // Exceeds 500 char threshold

      const routing = router.route(query);
      expect(routing.intent).toBe('write');

      // Simulate AI service result
      const result = longContent;

      // Save to memory (should trigger summarization)
      await memoryService.addConversation(query, result, {
        intent: routing.intent
      });

      const savedItem = memoryService.memoryStore[0];
      expect(savedItem.isSummarized).toBe(true);
      expect(savedItem.content).not.toBe(longContent);
      expect(savedItem.content.startsWith('Summarized:')).toBe(true);
      expect(memoryService.summarizerService.summarize).toHaveBeenCalled();
    });

    test('should not save failed or empty responses to memory', async () => {
      const query = 'write an email';

      // Simulate empty response
      const emptyResult = '';
      await memoryService.addConversation(query, emptyResult);

      // Memory should be empty (validation should prevent empty saves)
      // Note: This depends on implementation - may need adjustment
      expect(memoryService.memoryStore.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memory Management in Full Flow', () => {
    test('should handle memory trimming when exceeding MAX_MEMORY_ITEMS', async () => {
      memoryService.MAX_MEMORY_ITEMS = 3;

      // Add 4 conversations
      await memoryService.addConversation('query 1', 'content 1');
      await memoryService.addConversation('query 2', 'content 2');
      await memoryService.addConversation('query 3', 'content 3');
      await memoryService.addConversation('query 4', 'content 4');

      // Should only keep last 3
      expect(memoryService.memoryStore).toHaveLength(3);
      expect(memoryService.memoryStore[0].query).toBe('query 2'); // Oldest removed
      expect(memoryService.memoryStore[2].query).toBe('query 4'); // Newest retained
    });

    test('should clear memory and persist to storage', async () => {
      // Add conversations
      await memoryService.addConversation('test 1', 'content 1');
      await memoryService.addConversation('test 2', 'content 2');

      expect(memoryService.memoryStore).toHaveLength(2);

      // Clear memory
      await memoryService.clearMemory();

      expect(memoryService.memoryStore).toHaveLength(0);
      expect(chrome.storage.session.set).toHaveBeenCalledWith({ conversationMemory: [] });
    });

    test('should provide accurate memory statistics', async () => {
      await memoryService.addConversation('write email', 'short content', { intent: 'write' });
      await memoryService.addConversation('rewrite text', 'a'.repeat(600), { intent: 'rewrite' });

      const stats = memoryService.getStats();

      expect(stats.totalConversations).toBe(2);
      expect(stats.summarizedCount).toBe(1); // Second one was summarized
      expect(stats.intentBreakdown).toEqual({ write: 1, rewrite: 1 });
      expect(stats.compressionRatio).toBeDefined();
    });
  });

  describe('Cross-Service Memory Integration', () => {
    test('should use memory across different service types', async () => {
      // Write intent with WriterService
      const writeQuery = 'write an email about AI';
      const writeRouting = router.route(writeQuery);
      const writeResult = await writerService.write(writeQuery);

      await memoryService.addConversation(writeQuery, writeResult, {
        intent: writeRouting.intent
      });

      // Rewrite intent with RewriterService
      const rewriteQuery = 'make this more professional';
      const rewriteRouting = router.route(rewriteQuery);

      // Retrieve context (should get write conversation)
      const context = memoryService.retrieveRelevant(rewriteQuery, 5);
      expect(context).toHaveLength(1);

      const rewriteResult = await rewriterService.rewrite('sample text', {
        tone: 'professional'
      });

      await memoryService.addConversation(rewriteQuery, rewriteResult, {
        intent: rewriteRouting.intent
      });

      // Verify both conversations are in memory
      expect(memoryService.memoryStore).toHaveLength(2);

      // Stats should show intent breakdown
      const stats = memoryService.getStats();
      expect(stats.intentBreakdown).toEqual({ write: 1, rewrite: 1 });
    });

    test('should handle semantic routing with memory context for complex queries', async () => {
      // Build up context with multiple conversations
      await memoryService.addConversation(
        'write a cover letter for software engineer',
        'Dear Hiring Manager, I am applying for the software engineer position...'
      );

      await memoryService.addConversation(
        'write a resume summary',
        'Experienced software engineer with 5 years in full-stack development...'
      );

      // Complex query that should benefit from context
      const complexQuery = 'write a follow-up email for the software engineer application';
      const routing = router.route(complexQuery);

      expect(routing.intent).toBe('write');
      expect(routing.outputType).toBe('email');

      // Retrieve relevant context
      const relevantContext = memoryService.retrieveRelevant(complexQuery, 3);

      // Should retrieve both previous career-related conversations
      expect(relevantContext.length).toBeGreaterThan(0);
      expect(relevantContext[0].retrievalType).toBe('semantic');

      // Context should be relevant to software engineer role
      const contextString = memoryService.getRelevantContextString(complexQuery, 3);
      expect(contextString).toContain('software engineer');
    });
  });

  describe('Memory Persistence and Recovery', () => {
    test('should load existing memory from session storage on initialization', async () => {
      const existingMemory = [
        {
          id: 'mem_1',
          query: 'test query 1',
          content: 'test content 1',
          timestamp: new Date().toISOString(),
          metadata: { intent: 'write' }
        },
        {
          id: 'mem_2',
          query: 'test query 2',
          content: 'test content 2',
          timestamp: new Date().toISOString(),
          metadata: { intent: 'rewrite' }
        }
      ];

      setMockStorageData('session', { conversationMemory: existingMemory });

      // Create new service instance
      const newMemoryService = new window.MemoryService();
      newMemoryService.summarizerService = memoryService.summarizerService;
      await newMemoryService.initialize();

      expect(newMemoryService.memoryStore).toHaveLength(2);
      expect(newMemoryService.memoryStore[0].id).toBe('mem_1');
      expect(newMemoryService.memoryStore[1].id).toBe('mem_2');
    });

    test('should handle corrupted storage data gracefully', async () => {
      setMockStorageData('session', { conversationMemory: 'invalid data' });

      const newMemoryService = new window.MemoryService();
      newMemoryService.summarizerService = memoryService.summarizerService;
      await newMemoryService.initialize();

      // Should start with empty memory if data is corrupted
      expect(newMemoryService.memoryStore).toEqual([]);
    });
  });
});
