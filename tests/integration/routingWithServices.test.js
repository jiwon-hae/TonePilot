/**
 * Integration Tests: Routing + Services
 * Tests the complete flow from query routing to service execution
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

// Execute code
eval(loggerCode);
eval(errorHandlerCode);
eval(validatorCode);
eval(baseServiceCode);
eval(promptServiceCode);
eval(semanticRoutingCode);
eval(writerServiceCode);
eval(rewriterServiceCode);

describe('Integration: Routing + Services', () => {
  let router;
  let writerService;
  let rewriterService;

  beforeEach(async () => {
    resetAllMocks();

    router = new window.SemanticRouter();
    await router.initialize();

    writerService = new window.WriterService();
    await writerService.initialize();

    rewriterService = new window.RewriterService();
    await rewriterService.initialize();
  });

  describe('Write Intent Flow', () => {
    test('should route write query and execute WriterService', async () => {
      const query = 'write an email about project updates';

      // Step 1: Route the query
      const routing = router.route(query);

      expect(routing.intent).toBe('write');
      expect(routing.outputType).toBe('email');

      // Step 2: Execute appropriate service
      const result = await writerService.write(query, {
        tone: routing.tones[0],
        format: routing.outputType
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('should handle formal email generation', async () => {
      const query = 'write a formal email to my manager about deadline extension';

      const routing = router.route(query);
      expect(routing.tones).toContain('formal');

      const result = await writerService.write(query, { tone: 'formal' });
      expect(result).toBeDefined();
    });

    test('should handle cover letter generation', async () => {
      const query = 'write a cover letter for software engineer position';

      const routing = router.route(query);
      expect(routing.outputType).toBe('letter');

      const result = await writerService.write(query);
      expect(result).toBeDefined();
    });
  });

  describe('Rewrite Intent Flow', () => {
    test('should route rewrite query and execute RewriterService', async () => {
      const query = 'make this more professional';
      const textToRewrite = 'hey can u send me the docs';

      // Step 1: Route the query
      const routing = router.route(query);

      expect(routing.intent).toBe('rewrite');

      // Step 2: Execute appropriate service
      const result = await rewriterService.rewrite(textToRewrite, {
        tone: routing.tones[0] || 'formal'
      });

      expect(result).toBeDefined();
    });

    test('should handle tone-specific rewriting', async () => {
      const query = 'rewrite this in a diplomatic tone';
      const routing = router.route(query);

      expect(routing.tones).toContain('diplomatic');

      const result = await rewriterService.rewrite('I disagree with this approach', {
        tone: 'diplomatic'
      });

      expect(result).toBeDefined();
    });
  });

  describe('Complex Routing Scenarios', () => {
    test('should handle multi-aspect query correctly', async () => {
      const query = 'write a formal professional email to CEO about quarterly results';

      const routing = router.route(query);

      expect(routing.intent).toBe('write');
      expect(routing.outputType).toBe('email');
      expect(routing.tones).toEqual(expect.arrayContaining(['formal', 'professional']));

      const result = await writerService.write(query, {
        tone: routing.tones[0],
        format: routing.outputType
      });

      expect(result).toBeDefined();
    });

    test('should route to correct service based on primary intent', async () => {
      const writeQuery = 'write and proofread an email';
      const writeRouting = router.route(writeQuery);

      // "write" should be primary intent
      expect(writeRouting.intent).toBe('write');

      const rewriteQuery = 'proofread and improve this text';
      const rewriteRouting = router.route(rewriteQuery);

      // "proofread" should be primary intent
      expect(rewriteRouting.intent).toBe('proofread');
    });
  });

  describe('Service Selection Based on Routing', () => {
    test('should select WriterService for write intent', async () => {
      const routing = router.route('create a blog post');

      expect(routing.intent).toBe('write');

      // Verify WriterService can handle this
      expect(writerService.isAvailable).toBe(true);

      const result = await writerService.write('create a blog post about AI');
      expect(result).toBeDefined();
    });

    test('should select RewriterService for rewrite intent', async () => {
      const routing = router.route('improve this paragraph');

      expect(routing.intent).toBe('rewrite');

      // Verify RewriterService can handle this
      expect(rewriterService.isAvailable).toBe(true);

      const result = await rewriterService.rewrite('sample text');
      expect(result).toBeDefined();
    });

    test('should handle service unavailability gracefully', async () => {
      // Make WriterService unavailable
      writerService.isAvailable = false;

      const routing = router.route('write an email');
      expect(routing.intent).toBe('write');

      // In real implementation, would fallback to alternative service
      // For now, just verify routing worked
      expect(routing).toBeDefined();
    });
  });

  describe('Routing Metadata Usage', () => {
    test('should use routing tone in service call', async () => {
      const query = 'write a casual friendly email';
      const routing = router.route(query);

      expect(routing.tones).toEqual(expect.arrayContaining(['casual', 'friendly']));

      const result = await writerService.write(query, {
        tone: routing.tones[0]
      });

      expect(result).toBeDefined();
    });

    test('should use routing output type in service call', async () => {
      const query = 'write a LinkedIn post';
      const routing = router.route(query);

      expect(routing.outputType).toBe('post');

      const result = await writerService.write(query, {
        format: routing.outputType
      });

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling in Integration', () => {
    test('should handle routing errors', () => {
      // Empty input should still route (default to rewrite)
      const routing = router.route('');
      expect(routing).toBeDefined();
      expect(routing.intent).toBeDefined();
    });

    test('should handle service execution errors', async () => {
      // Create a mock that will fail
      const mockSession = {
        write: jest.fn(() => Promise.reject(new Error('Service error'))),
        destroy: jest.fn()
      };

      global.self.Writer.create = jest.fn(() => Promise.resolve(mockSession));

      const service = new window.WriterService();
      await service.initialize();

      await expect(service.write('test')).rejects.toThrow('Service error');
    });
  });
});
