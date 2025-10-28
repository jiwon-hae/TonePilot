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

  beforeEach(async () => {
    resetAllMocks();
    router = new window.SemanticRouter();
    await router.initialize();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(router.isInitialized).toBe(true);
      expect(router.isAvailable).toBe(true);
    });
  });

  describe('Intent Detection', () => {
    test('should detect "write" intent', () => {
      const inputs = [
        'write an email',
        'create a letter',
        'draft a post',
        'compose a message'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.intent).toBe('write');
      });
    });

    test('should detect "rewrite" intent', () => {
      const inputs = [
        'rewrite this text',
        'improve this paragraph',
        'make this better',
        'rephrase this sentence'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.intent).toBe('rewrite');
      });
    });

    test('should detect "proofread" intent', () => {
      const inputs = [
        'proofread this document',
        'check for errors',
        'fix grammar mistakes',
        'correct spelling'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.intent).toBe('proofread');
      });
    });

    test('should detect "summarize" intent', () => {
      const inputs = [
        'summarize this article',
        'give me the key points',
        'condense this text',
        'tl;dr this post'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.intent).toBe('summarize');
      });
    });

    test('should detect "translate" intent', () => {
      const inputs = [
        'translate to Spanish',
        'translate this to French',
        'convert to German',
        'translate to Japanese'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.intent).toBe('translate');
      });
    });

    test('should default to "rewrite" for ambiguous input', () => {
      const result = router.route('help me with this');
      expect(result.intent).toBe('rewrite');
    });
  });

  describe('Format Detection', () => {
    test('should detect email format', () => {
      const inputs = [
        'write an email to my boss',
        'compose an email about the project',
        'draft email for team update'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.outputType).toBe('email');
      });
    });

    test('should detect letter format', () => {
      const inputs = [
        'write a cover letter',
        'create a formal letter',
        'draft a resignation letter'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.outputType).toBe('letter');
      });
    });

    test('should detect post format', () => {
      const inputs = [
        'write a LinkedIn post',
        'create a social media post',
        'draft a blog post'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.outputType).toBe('post');
      });
    });

    test('should detect list format', () => {
      const inputs = [
        'create a list of tasks',
        'make a bullet point list',
        'write an action items list'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.outputType).toBe('list');
      });
    });
  });

  describe('Tone Detection', () => {
    test('should detect formal tone', () => {
      const inputs = [
        'write a formal email',
        'create a professional letter',
        'draft a formal announcement'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.tones).toContain('formal');
      });
    });

    test('should detect casual tone', () => {
      const inputs = [
        'write a casual email',
        'create a friendly message',
        'draft an informal note'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.tones).toContain('casual');
      });
    });

    test('should detect diplomatic tone', () => {
      const inputs = [
        'write a diplomatic response',
        'create a polite email',
        'draft a tactful message'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.tones).toContain('diplomatic');
      });
    });

    test('should detect urgent tone', () => {
      const inputs = [
        'write an urgent email',
        'create an immediate request',
        'draft a critical message'
      ];

      inputs.forEach(input => {
        const result = router.route(input);
        expect(result.tones).toContain('urgent');
      });
    });
  });

  describe('Target Language Extraction', () => {
    test('should extract target language from explicit request', () => {
      const testCases = [
        { input: 'translate to Spanish', expected: 'es' },
        { input: 'translate this to French', expected: 'fr' },
        { input: 'convert to German', expected: 'de' },
        { input: 'translate to Japanese', expected: 'ja' },
        { input: 'translate to Korean', expected: 'ko' },
        { input: 'translate to Chinese', expected: 'zh' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = router.route(input);
        expect(result.targetLanguage).toBe(expected);
      });
    });

    test('should handle "in" keyword', () => {
      const result = router.route('translate this text in Spanish');
      expect(result.targetLanguage).toBe('es');
    });

    test('should return null for non-translate intents', () => {
      const result = router.route('write an email');
      expect(result.targetLanguage).toBeNull();
    });
  });

  describe('Complex Queries', () => {
    test('should handle multi-aspect queries', () => {
      const result = router.route('write a formal email to my manager about the project update');

      expect(result.intent).toBe('write');
      expect(result.outputType).toBe('email');
      expect(result.tones).toContain('formal');
    });

    test('should prioritize explicit intents', () => {
      const result = router.route('proofread this email draft');

      expect(result.intent).toBe('proofread');
      expect(result.outputType).toBe('email');
    });

    test('should handle translation with target language', () => {
      const result = router.route('translate this email to Spanish');

      expect(result.intent).toBe('translate');
      expect(result.outputType).toBe('email');
      expect(result.targetLanguage).toBe('es');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', () => {
      const result = router.route('');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });

    test('should handle very long input', () => {
      const longInput = 'write an email ' + 'about the project '.repeat(100);
      const result = router.route(longInput);

      expect(result.intent).toBe('write');
      expect(result.outputType).toBe('email');
    });

    test('should be case insensitive', () => {
      const result1 = router.route('WRITE AN EMAIL');
      const result2 = router.route('write an email');

      expect(result1.intent).toBe(result2.intent);
      expect(result1.outputType).toBe(result2.outputType);
    });

    test('should handle special characters', () => {
      const result = router.route('write an email! @#$%');
      expect(result.intent).toBe('write');
      expect(result.outputType).toBe('email');
    });
  });

  describe('Routing Consistency', () => {
    test('should return consistent results for same input', () => {
      const input = 'write a formal email about project updates';

      const result1 = router.route(input);
      const result2 = router.route(input);

      expect(result1).toEqual(result2);
    });

    test('should include all expected fields', () => {
      const result = router.route('write an email');

      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('outputType');
      expect(result).toHaveProperty('tones');
      expect(result).toHaveProperty('targetLanguage');
    });

    test('should have tones as array', () => {
      const result = router.route('write a formal email');

      expect(Array.isArray(result.tones)).toBe(true);
    });
  });
});
