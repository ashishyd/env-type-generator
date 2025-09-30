/**
 * Main generator service
 * Orchestrates parsing, type generation, and file writing
 */

import * as fs from 'fs';
import * as path from 'path';
import { GeneratorConfig, EnvVariable, GeneratorOptions } from '../types';
import { EnvParser } from '../parsers/env-parser';
import { TypeGenerator } from '../generators/type-generator';
import { ValidationGenerator } from '../generators/validation-generator';
import { FileWatcher } from './file-watcher';
import { GenerationError } from '../utils/errors';

export class GeneratorService {
  private parser: EnvParser;
  private typeGenerator: TypeGenerator;
  private validationGenerator: ValidationGenerator;
  private watcher: FileWatcher;

  constructor() {
    this.parser = new EnvParser();
    this.typeGenerator = new TypeGenerator();
    this.validationGenerator = new ValidationGenerator();
    this.watcher = new FileWatcher();
  }

  /**
   * Generate types and validation schemas
   */
  public generate(config: GeneratorConfig): void {
    try {
      // Parse all env files
      const parsedFiles = this.parser.parseFiles(config.envFiles, {
        parseTypes: config.parseTypes,
        requiredVars: config.requiredVars,
      });

      // Merge variables from all files
      const allVariables = this.mergeVariables(parsedFiles.map((f) => f.variables));

      // Build generator options
      const options: GeneratorOptions = {
        parseTypes: config.parseTypes ?? true,
        validationLib: config.validationLib ?? 'none',
        requiredVars: config.requiredVars ?? [],
        strict: config.strict ?? false,
      };

      // Generate type definitions
      const typeDefinition = this.typeGenerator.generateTypes(allVariables, options);
      this.writeFile(config.outputPath, typeDefinition);

      // Generate runtime helper if parseTypes is enabled
      if (config.parseTypes) {
        const helperPath = config.outputPath.replace(/\.d\.ts$/, '.js');
        const runtimeHelper = this.typeGenerator.generateRuntimeHelper(allVariables, options);
        this.writeFile(helperPath, runtimeHelper);
      }

      // Generate validation schema if requested
      if (config.validationLib && config.validationLib !== 'none' && config.validationOutput) {
        const validationSchema = this.validationGenerator.generateSchema(
          allVariables,
          config.validationLib,
          options
        );

        if (validationSchema) {
          this.writeFile(config.validationOutput, validationSchema);
        }
      }
    } catch (error) {
      throw new GenerationError((error as Error).message);
    }
  }

  /**
   * Start watching mode
   */
  public watch(config: GeneratorConfig): void {
    // Generate initial types
    this.generate(config);

    // Start watching
    this.watcher.watch({
      files: config.envFiles,
      onChanged: () => {
        this.generate(config);
      },
    });
  }

  /**
   * Stop watching mode
   */
  public async stopWatch(): Promise<void> {
    await this.watcher.stop();
  }

  /**
   * Merge variables from multiple files
   * Later files override earlier ones
   */
  private mergeVariables(variableArrays: EnvVariable[][]): EnvVariable[] {
    const merged = new Map<string, EnvVariable>();

    for (const variables of variableArrays) {
      for (const variable of variables) {
        merged.set(variable.key, variable);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Write content to file
   */
  private writeFile(filePath: string, content: string): void {
    try {
      const absolutePath = path.resolve(filePath);
      const directory = path.dirname(absolutePath);

      // Ensure directory exists
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Write file
      fs.writeFileSync(absolutePath, content, 'utf-8');
    } catch (error) {
      throw new GenerationError(`Failed to write file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if watcher is running
   */
  public isWatching(): boolean {
    return this.watcher.isWatching();
  }
}
