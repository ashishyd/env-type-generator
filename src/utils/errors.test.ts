/**
 * Unit tests for custom errors
 */

import {
  EnvTypeGeneratorError,
  FileNotFoundError,
  ParseError,
  ValidationError,
  GenerationError,
} from './errors';

describe('Custom Errors', () => {
  describe('EnvTypeGeneratorError', () => {
    it('should create error with message', () => {
      const error = new EnvTypeGeneratorError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('EnvTypeGeneratorError');
    });

    it('should have stack trace', () => {
      const error = new EnvTypeGeneratorError('Test error');
      expect(error.stack).toBeDefined();
    });
  });

  describe('FileNotFoundError', () => {
    it('should create error with file path', () => {
      const error = new FileNotFoundError('/path/to/file');

      expect(error).toBeInstanceOf(EnvTypeGeneratorError);
      expect(error.message).toBe('Environment file not found: /path/to/file');
      expect(error.name).toBe('FileNotFoundError');
    });
  });

  describe('ParseError', () => {
    it('should create error with file path and reason', () => {
      const error = new ParseError('/path/to/file', 'Invalid syntax');

      expect(error).toBeInstanceOf(EnvTypeGeneratorError);
      expect(error.message).toBe('Failed to parse /path/to/file: Invalid syntax');
      expect(error.name).toBe('ParseError');
    });
  });

  describe('ValidationError', () => {
    it('should create error with validation message', () => {
      const error = new ValidationError('Invalid environment variables');

      expect(error).toBeInstanceOf(EnvTypeGeneratorError);
      expect(error.message).toBe('Validation failed: Invalid environment variables');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('GenerationError', () => {
    it('should create error with generation message', () => {
      const error = new GenerationError('Failed to generate types');

      expect(error).toBeInstanceOf(EnvTypeGeneratorError);
      expect(error.message).toBe('Type generation failed: Failed to generate types');
      expect(error.name).toBe('GenerationError');
    });
  });
});