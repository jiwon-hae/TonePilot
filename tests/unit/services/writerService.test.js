/**
 * WriterService Unit Tests
 * Tests content generation capabilities
 */

const fs = require('fs');
const path = require('path');

// Load dependencies
const loggerCode = fs.readFileSync(path.join(__dirname, '../../../utils/logger.js'), 'utf8');
const errorHandlerCode = fs.readFileSync(path.join(__dirname, '../../../utils/errorHandler.js'), 'utf8');
const validatorCode = fs.readFileSync(path.join(__dirname, '../../../utils/validator.js'), 'utf8');
const baseServiceCode = fs.readFileSync(path.join(__dirname, '../../../services/baseService.js'), 'utf8');
const promptServiceCode = fs.readFileSync(path.join(__dirname, '../../../services/promptService.js'), 'utf8');
const writerServiceCode = fs.readFileSync(path.join(__dirname, '../../../services/writerService.js'), 'utf8');

// Execute code
eval(loggerCode);
eval(errorHandlerCode);
eval(validatorCode);
eval(baseServiceCode);
eval(promptServiceCode);
eval(writerServiceCode);

describe('WriterService', () => {
  let writerService;

  beforeEach(async () => {
    resetAllMocks();
    writerService = new window.WriterService();
    await writerService.initialize();
  });

  describe('Initialization', () => {
    test('should initialize successfully when Writer API available', async () => {
      expect(writerService.isInitialized).toBe(true);
      expect(writerService.isAvailable).toBe(true);
    });

    test('should handle Writer API unavailability', async () => {
      global.self.Writer.availability = jest.fn(() => Promise.resolve('no'));

      const service = new window.WriterService();
      await service.initialize();

      expect(service.isAvailable).toBe(false);
    });
  });

  describe('write', () => {
    test('should generate content from prompt', async () => {
      const prompt = 'Write an email about project updates';
      const result = await writerService.write(prompt);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('Written content for');
    });

    test('should accept tone parameter', async () => {
      const result = await writerService.write('Write an email', { tone: 'formal' });

      expect(result).toBeDefined();
    });

    test('should accept context parameter', async () => {
      const result = await writerService.write('Write an email', { context: 'Project deadline approaching' });

      expect(result).toBeDefined();
    });

    test('should validate required prompt parameter', async () => {
      await expect(writerService.write('')).rejects.toThrow();
    });

    test('should clean up session after writing', async () => {
      const mockSession = {
        write: jest.fn(() => Promise.resolve('Written content')),
        destroy: jest.fn()
      };

      global.self.Writer.create = jest.fn(() => Promise.resolve(mockSession));

      const service = new window.WriterService();
      await service.initialize();
      await service.write('test prompt');

      expect(mockSession.destroy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle write failures gracefully', async () => {
      const mockSession = {
        write: jest.fn(() => Promise.reject(new Error('Write failed'))),
        destroy: jest.fn()
      };

      global.self.Writer.create = jest.fn(() => Promise.resolve(mockSession));

      const service = new window.WriterService();
      await service.initialize();

      await expect(service.write('test')).rejects.toThrow('Write failed');
      expect(mockSession.destroy).toHaveBeenCalled();
    });

    test('should handle session creation failures', async () => {
      global.self.Writer.create = jest.fn(() => Promise.reject(new Error('Session creation failed')));

      const service = new window.WriterService();
      await service.initialize();

      await expect(service.write('test')).rejects.toThrow();
    });
  });

  describe('Status Reporting', () => {
    test('should report status correctly', () => {
      const status = writerService.getStatus();

      expect(status).toHaveProperty('serviceName', 'WriterService');
      expect(status).toHaveProperty('isInitialized');
      expect(status).toHaveProperty('isAvailable');
    });
  });
});
