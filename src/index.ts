/**
 * Main entry point for env-type-generator
 * Exports public API for programmatic usage
 */

export { GeneratorService } from './services/generator-service';
export { EnvParser } from './parsers/env-parser';
export { TypeGenerator } from './generators/type-generator';
export { ValidationGenerator } from './generators/validation-generator';
export { FileWatcher } from './services/file-watcher';

export type {
  EnvVariable,
  ParsedEnvFile,
  GeneratorConfig,
  TypeInfo,
  GeneratedOutput,
  ValidationLibrary,
  ParserOptions,
  GeneratorOptions,
} from './types';

export {
  EnvTypeGeneratorError,
  FileNotFoundError,
  ParseError,
  ValidationError,
  GenerationError,
} from './utils/errors';
