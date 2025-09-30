/**
 * Core type definitions for env-type-generator
 */

export interface EnvVariable {
  key: string;
  value: string;
  comment?: string;
}

export interface ParsedEnvFile {
  variables: EnvVariable[];
  filePath: string;
}

export interface GeneratorConfig {
  envFiles: string[];
  outputPath: string;
  validationLib?: 'zod' | 'yup' | 'joi' | 'none';
  validationOutput?: string;
  requiredVars?: string[];
  parseTypes?: boolean;
  strict?: boolean;
  watch?: boolean;
}

export interface TypeInfo {
  name: string;
  type: string;
  required: boolean;
  parsed: boolean;
  comment?: string;
}

export interface GeneratedOutput {
  typeDefinition: string;
  validationSchema?: string;
}

export type ValidationLibrary = 'zod' | 'yup' | 'joi' | 'none';

export interface ParserOptions {
  parseTypes?: boolean;
  requiredVars?: string[];
}

export interface GeneratorOptions {
  parseTypes: boolean;
  validationLib: ValidationLibrary;
  requiredVars: string[];
  strict: boolean;
}
