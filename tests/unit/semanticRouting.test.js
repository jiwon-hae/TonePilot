/**
 * SemanticRouter Unit Tests
 * Tests intent detection, format recognition, and tone analysis
 */

const fs = require('fs');
const path = require('path');

// Load dependencies
const loggerCode = fs.readFileSync(path.join(__dirname, '../../utils/logger.js'), 'utf8');
const errorHandlerCode = fs.readFileSync(path.join(__dirname, '../../utils/errorHandler.js'), 'utf8');
const validatorCode = fs.readFileSync(path.join(__dirname, '../../utils/validator.js'), 'utf8');
const baseServiceCode = fs.readFileSync(path.join(__dirname, '../../services/baseService.js'), 'utf8');
const promptServiceCode = fs.readFileSync(path.join(__dirname, '../../services/promptService.js'), 'utf8');
const semanticRoutingCode = fs.readFileSync(path.join(__dirname, '../../services/semanticRouting.js'), 'utf8');

// Execute code
eval(loggerCode);
eval(errorHandlerCode);
eval(validatorCode);
eval(baseServiceCode);
eval(promptServiceCode);
eval(semanticRoutingCode);

describe('SemanticRouter', () => {
  let router;

  beforeEach(() => {
    resetAllMocks();
    router = new window.SemanticRouter();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      expect(router).toBeDefined();
      expect(router.patterns).toBeDefined();
      expect(router.outputTypePatterns).toBeDefined();
      expect(router.tonePatterns).toBeDefined();
    });
  });

  describe('Intent Detection', () => {
    test('should detect "write" intent', async () => {
      const inputs = [
        'write an email',
        'create a letter',
        'draft a post',
        'compose a message'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.intent).toBe('write');
      }
    });

    test('should detect "rewrite" intent', async () => {
      const inputs = [
        'rewrite this text',
        'improve this paragraph',
        'make this better',
        'rephrase this sentence'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.intent).toBe('rewrite');
      }
    });

    test('should detect "proofread" intent', async () => {
      const inputs = [
        'proofread this document',
        'check for errors',
        'fix grammar mistakes',
        'correct spelling'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.intent).toBe('proofread');
      }
    });

    test('should detect "summarize" intent', async () => {
      const inputs = [
        'summarize this article',
        'give me the key points',
        'condense this text',
        'tl;dr this post'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.intent).toBe('summarize');
      }
    });

    test('should detect "translate" intent', async () => {
      const inputs = [
        'translate to Spanish',
        'translate this to French',
        'convert to German',
        'translate to Japanese'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.intent).toBe('translate');
      }
    });

    test('should default to "rewrite" for ambiguous input', async () => {
      const result = await router.route('help me with this');
      expect(result.intent).toBe('rewrite');
    });
  });

  describe('Format Detection', () => {
    test('should detect email format', async () => {
      const inputs = [
        'write an email to my boss',
        'compose an email about the project',
        'draft email for team update'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.outputType).toBe('email');
      }
    });

    test('should detect letter format', async () => {
      const inputs = [
        'write a cover letter',
        'create a formal letter',
        'draft a resignation letter'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.outputType).toBe('letter');
      }
    });

    test('should detect post format', async () => {
      const inputs = [
        'write a LinkedIn post',
        'create a social media post',
        'draft a blog post'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.outputType).toBe('post');
      }
    });

    test('should detect list format', async () => {
      const inputs = [
        'create a list of tasks',
        'make a bullet point list',
        'write an action items list'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.outputType).toBe('list');
      }
    });
  });

  describe('Tone Detection', () => {
    test('should detect formal tone', async () => {
      const inputs = [
        'write a formal email',
        'create a professional letter',
        'draft a formal announcement'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.tones).toContain('formal');
      }
    });

    test('should detect casual tone', async () => {
      const inputs = [
        'write a casual email',
        'create a friendly message',
        'draft an informal note'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.tones).toContain('casual');
      }
    });

    test('should detect diplomatic tone', async () => {
      const inputs = [
        'write a diplomatic response',
        'create a polite email',
        'draft a tactful message'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.tones).toContain('diplomatic');
      }
    });

    test('should detect urgent tone', async () => {
      const inputs = [
        'write an urgent email',
        'create an immediate request',
        'draft a critical message'
      ];

      for (const input of inputs) {
        const result = await router.route(input);
        expect(result.tones).toContain('urgent');
      }
    });
  });

  describe('Target Language Extraction', () => {
    test('should extract target language from explicit request', async () => {
      const testCases = [
        { input: 'translate to Spanish', expected: 'es' },
        { input: 'translate this to French', expected: 'fr' },
        { input: 'convert to German', expected: 'de' },
        { input: 'translate to Japanese', expected: 'ja' },
        { input: 'translate to Korean', expected: 'ko' },
        { input: 'translate to Chinese', expected: 'zh' }
      ];

      for (const { input, expected } of testCases) {
        const result = await router.route(input);
        expect(result.targetLanguage).toBe(expected);
      }
    });

    test('should handle "in" keyword', async () => {
      const result = await router.route('translate this text in Spanish');
      expect(result.targetLanguage).toBe('es');
    });

    test('should return null for non-translate intents', async () => {
      const result = await router.route('write an email');
      expect(result.targetLanguage).toBeNull();
    });
  });

  describe('Complex Queries', () => {
    test('should handle multi-aspect queries', async () => {
      const result = await router.route('write a formal email to my manager about the project update');

      expect(result.intent).toBe('write');
      expect(result.outputType).toBe('email');
      expect(result.tones).toContain('formal');
    });

    test('should prioritize explicit intents', async () => {
      const result = await router.route('proofread this email draft');

      expect(result.intent).toBe('proofread');
      expect(result.outputType).toBe('email');
    });

    test('should handle translation with target language', async () => {
      const result = await router.route('translate this email to Spanish');

      expect(result.intent).toBe('translate');
      expect(result.outputType).toBe('email');
      expect(result.targetLanguage).toBe('es');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', async () => {
      const result = await router.route('');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });

    test('should handle very long input', async () => {
      const longInput = 'write an email ' + 'about the project '.repeat(100);
      const result = await router.route(longInput);

      expect(result.intent).toBe('write');
      expect(result.outputType).toBe('email');
    });

    test('should be case insensitive', async () => {
      const result1 = await router.route('WRITE AN EMAIL');
      const result2 = await router.route('write an email');

      expect(result1.intent).toBe(result2.intent);
      expect(result1.outputType).toBe(result2.outputType);
    });

    test('should handle special characters', async () => {
      const result = await router.route('write an email! @#$%');
      expect(result.intent).toBe('write');
      expect(result.outputType).toBe('email');
    });
  });

  describe('Routing Consistency', () => {
    test('should return consistent results for same input', async () => {
      const input = 'write a formal email about project updates';

      const result1 = await router.route(input);
      const result2 = await router.route(input);

      expect(result1).toEqual(result2);
    });

    test('should include all expected fields', async () => {
      const result = await router.route('write an email');

      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('outputType');
      expect(result).toHaveProperty('tones');
      expect(result).toHaveProperty('targetLanguage');
    });

    test('should have tones as array', async () => {
      const result = await router.route('write a formal email');

      expect(Array.isArray(result.tones)).toBe(true);
    });
  });
});
