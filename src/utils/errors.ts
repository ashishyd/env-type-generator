/**
 * Custom error classes for env-type-generator
 */

export class EnvTypeGeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvTypeGeneratorError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class FileNotFoundError extends EnvTypeGeneratorError {
  constructor(filePath: string) {
    super(`Environment file not found: ${filePath}`);
    this.name = 'FileNotFoundError';
  }
}

export class ParseError extends EnvTypeGeneratorError {
  constructor(filePath: string, reason: string) {
    super(`Failed to parse ${filePath}: ${reason}`);
    this.name = 'ParseError';
  }
}

export class ValidationError extends EnvTypeGeneratorError {
  constructor(message: string) {
    super(`Validation failed: ${message}`);
    this.name = 'ValidationError';
  }
}

export class GenerationError extends EnvTypeGeneratorError {
  constructor(message: string) {
    super(`Type generation failed: ${message}`);
    this.name = 'GenerationError';
  }
}
