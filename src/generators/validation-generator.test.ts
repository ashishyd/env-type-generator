/**
 * Unit tests for ValidationGenerator
 */

import { ValidationGenerator } from './validation-generator';
import { EnvVariable, GeneratorOptions } from '../types';
import { GenerationError } from '../utils/errors';

describe('ValidationGenerator', () => {
  let generator: ValidationGenerator;

  beforeEach(() => {
    generator = new ValidationGenerator();
  });

  describe('generateSchema', () => {
    const variables: EnvVariable[] = [
      { key: 'DATABASE_URL', value: 'postgresql://localhost' },
      { key: 'PORT', value: '3000' },
    ];

    const options: GeneratorOptions = {
      parseTypes: true,
      validationLib: 'zod',
      requiredVars: ['DATABASE_URL'],
      strict: false,
    };

    it('should return null for none validation library', () => {
      const result = generator.generateSchema(variables, 'none', options);
      expect(result).toBeNull();
    });

    it('should generate Zod schema', () => {
      const result = generator.generateSchema(variables, 'zod', options);

      expect(result).toContain("import { z } from 'zod'");
      expect(result).toContain('export const envSchema = z.object({');
      expect(result).toContain('DATABASE_URL:');
      expect(result).toContain('PORT:');
      expect(result).toContain('.optional()');
      expect(result).toContain('export type Env = z.infer<typeof envSchema>');
      expect(result).toContain('export const env = envSchema.parse(process.env)');
    });

    it('should generate Yup schema', () => {
      const result = generator.generateSchema(variables, 'yup', options);

      expect(result).toContain("import * as yup from 'yup'");
      expect(result).toContain('export const envSchema = yup.object({');
      expect(result).toContain('DATABASE_URL:');
      expect(result).toContain('PORT:');
      expect(result).toContain('export type Env = yup.InferType<typeof envSchema>');
      expect(result).toContain('export const env = envSchema.validateSync(process.env)');
    });

    it('should generate Joi schema', () => {
      const result = generator.generateSchema(variables, 'joi', options);

      expect(result).toContain("import Joi from 'joi'");
      expect(result).toContain('export const envSchema = Joi.object({');
      expect(result).toContain('DATABASE_URL:');
      expect(result).toContain('PORT:');
      expect(result).toContain('.optional()');
      expect(result).toContain('export const env = envSchema.validate(process.env).value');
    });

    it('should throw error for unsupported validation library', () => {
      expect(() => generator.generateSchema(variables, 'invalid' as never, options)).toThrow(
        GenerationError
      );
    });

    it('should handle comments in schema', () => {
      const variablesWithComments: EnvVariable[] = [
        { key: 'API_KEY', value: 'secret', comment: 'API authentication key' },
      ];

      const result = generator.generateSchema(variablesWithComments, 'zod', options);

      expect(result).toContain('// API authentication key');
    });

    it('should handle required variables', () => {
      const requiredOptions: GeneratorOptions = {
        parseTypes: true,
        validationLib: 'zod',
        requiredVars: ['DATABASE_URL', 'PORT'],
        strict: false,
      };

      const result = generator.generateSchema(variables, 'zod', requiredOptions);

      expect(result).not.toContain('.optional()');
    });

    it('should handle strict mode', () => {
      const strictOptions: GeneratorOptions = {
        parseTypes: true,
        validationLib: 'yup',
        requiredVars: [],
        strict: true,
      };

      const result = generator.generateSchema(variables, 'yup', strictOptions);

      expect(result).toContain('.required()');
    });

    it('should handle different types in Zod schema', () => {
      const typedVariables: EnvVariable[] = [
        { key: 'ENABLE_DEBUG', value: 'true' },
        { key: 'MAX_CONNECTIONS', value: '100' },
        { key: 'CONFIG', value: '{"key":"value"}' },
        { key: 'MESSAGE', value: 'hello' },
      ];

      const result = generator.generateSchema(typedVariables, 'zod', options);

      expect(result).toContain('z.enum(["true", "false"]).transform');
      expect(result).toContain('z.string().transform((val) => Number(val))');
      expect(result).toContain('z.string().transform((val) => JSON.parse(val))');
      expect(result).toContain('z.string()');
    });

    it('should handle different types in Yup schema', () => {
      const typedVariables: EnvVariable[] = [
        { key: 'ENABLE_DEBUG', value: 'true' },
        { key: 'MAX_CONNECTIONS', value: '100' },
      ];

      const result = generator.generateSchema(typedVariables, 'yup', options);

      expect(result).toContain('yup.boolean()');
      expect(result).toContain('yup.number()');
    });

    it('should handle different types in Joi schema', () => {
      const typedVariables: EnvVariable[] = [
        { key: 'ENABLE_DEBUG', value: 'true' },
        { key: 'MAX_CONNECTIONS', value: '100' },
      ];

      const result = generator.generateSchema(typedVariables, 'joi', options);

      expect(result).toContain('Joi.boolean()');
      expect(result).toContain('Joi.number()');
    });
  });
});
