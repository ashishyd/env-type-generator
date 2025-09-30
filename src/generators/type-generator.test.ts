/**
 * Unit tests for TypeGenerator
 */

import { TypeGenerator } from './type-generator';
import { EnvVariable, GeneratorOptions } from '../types';

describe('TypeGenerator', () => {
  let generator: TypeGenerator;

  beforeEach(() => {
    generator = new TypeGenerator();
  });

  describe('generateTypes', () => {
    it('should generate basic type definitions', () => {
      const variables: EnvVariable[] = [
        { key: 'DATABASE_URL', value: 'postgresql://localhost' },
        { key: 'API_KEY', value: 'secret123' },
      ];

      const options: GeneratorOptions = {
        parseTypes: false,
        validationLib: 'none',
        requiredVars: [],
        strict: false,
      };

      const result = generator.generateTypes(variables, options);

      expect(result).toContain('declare namespace NodeJS');
      expect(result).toContain('interface ProcessEnv');
      expect(result).toContain('DATABASE_URL?: string | undefined;');
      expect(result).toContain('API_KEY?: string | undefined;');
    });

    it('should mark required variables', () => {
      const variables: EnvVariable[] = [
        { key: 'DATABASE_URL', value: 'postgresql://localhost' },
      ];

      const options: GeneratorOptions = {
        parseTypes: false,
        validationLib: 'none',
        requiredVars: ['DATABASE_URL'],
        strict: false,
      };

      const result = generator.generateTypes(variables, options);

      expect(result).toContain('DATABASE_URL: string;');
      expect(result).not.toContain('DATABASE_URL?:');
    });

    it('should mark all variables as required when strict is true', () => {
      const variables: EnvVariable[] = [
        { key: 'DATABASE_URL', value: 'postgresql://localhost' },
        { key: 'API_KEY', value: 'secret' },
      ];

      const options: GeneratorOptions = {
        parseTypes: false,
        validationLib: 'none',
        requiredVars: [],
        strict: true,
      };

      const result = generator.generateTypes(variables, options);

      expect(result).toContain('DATABASE_URL: string;');
      expect(result).toContain('API_KEY: string;');
      expect(result).not.toContain('?:');
    });

    it('should infer types when parseTypes is true', () => {
      const variables: EnvVariable[] = [
        { key: 'PORT', value: '3000' },
        { key: 'ENABLE_DEBUG', value: 'true' },
        { key: 'CONFIG', value: '{"key":"value"}' },
      ];

      const options: GeneratorOptions = {
        parseTypes: true,
        validationLib: 'none',
        requiredVars: [],
        strict: false,
      };

      const result = generator.generateTypes(variables, options);

      expect(result).toContain('PORT?: number | undefined;');
      expect(result).toContain('ENABLE_DEBUG?: boolean | undefined;');
      expect(result).toContain('CONFIG?: object | undefined;');
    });

    it('should include comments', () => {
      const variables: EnvVariable[] = [
        { key: 'DATABASE_URL', value: 'postgresql://localhost', comment: 'Database connection' },
      ];

      const options: GeneratorOptions = {
        parseTypes: false,
        validationLib: 'none',
        requiredVars: [],
        strict: false,
      };

      const result = generator.generateTypes(variables, options);

      expect(result).toContain('/** Database connection */');
    });

    it('should generate export env helper', () => {
      const variables: EnvVariable[] = [
        { key: 'API_KEY', value: 'secret' },
      ];

      const options: GeneratorOptions = {
        parseTypes: false,
        validationLib: 'none',
        requiredVars: [],
        strict: false,
      };

      const result = generator.generateTypes(variables, options);

      expect(result).toContain('export declare const env:');
      expect(result).toContain('API_KEY?: string;');
    });
  });

  describe('generateRuntimeHelper', () => {
    it('should generate runtime helper without type parsing', () => {
      const variables: EnvVariable[] = [
        { key: 'API_KEY', value: 'secret' },
      ];

      const options: GeneratorOptions = {
        parseTypes: false,
        validationLib: 'none',
        requiredVars: [],
        strict: false,
      };

      const result = generator.generateRuntimeHelper(variables, options);

      expect(result).toContain('export const env = {');
      expect(result).toContain('get API_KEY()');
      expect(result).toContain('return process.env.API_KEY;');
    });

    it('should generate runtime helper with type parsing', () => {
      const variables: EnvVariable[] = [
        { key: 'PORT', value: '3000' },
      ];

      const options: GeneratorOptions = {
        parseTypes: true,
        validationLib: 'none',
        requiredVars: [],
        strict: false,
      };

      const result = generator.generateRuntimeHelper(variables, options);

      expect(result).toContain('function parseValue');
      expect(result).toContain('return parseValue');
    });

    it('should throw error for required variables in strict mode', () => {
      const variables: EnvVariable[] = [
        { key: 'DATABASE_URL', value: 'postgresql://localhost' },
      ];

      const options: GeneratorOptions = {
        parseTypes: false,
        validationLib: 'none',
        requiredVars: ['DATABASE_URL'],
        strict: true,
      };

      const result = generator.generateRuntimeHelper(variables, options);

      expect(result).toContain('if (value === undefined)');
      expect(result).toContain('throw new Error');
      expect(result).toContain('Required environment variable DATABASE_URL is not defined');
    });

    it('should handle optional variables', () => {
      const variables: EnvVariable[] = [
        { key: 'OPTIONAL_KEY', value: 'value' },
      ];

      const options: GeneratorOptions = {
        parseTypes: false,
        validationLib: 'none',
        requiredVars: [],
        strict: false,
      };

      const result = generator.generateRuntimeHelper(variables, options);

      expect(result).toContain('return process.env.OPTIONAL_KEY;');
      expect(result).not.toContain('throw new Error');
    });
  });
});