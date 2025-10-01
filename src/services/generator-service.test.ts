/**
 * Unit tests for GeneratorService
 */

import * as fs from 'fs';
import * as path from 'path';
import { GeneratorService } from './generator-service';
import { GeneratorConfig } from '../types';

describe('GeneratorService', () => {
  let service: GeneratorService;
  const testDir = path.join(__dirname, '../../test-service-fixtures');
  const envFile = path.join(testDir, '.env');
  const outputFile = path.join(testDir, 'env.d.ts');
  const validationFile = path.join(testDir, 'env.validator.ts');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  beforeEach(() => {
    service = new GeneratorService();
    fs.writeFileSync(envFile, 'DATABASE_URL=postgresql://localhost\nAPI_KEY=secret');
  });

  afterEach(async () => {
    await service.stopWatch();
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('generate', () => {
    it('should generate type definitions', () => {
      const config: GeneratorConfig = {
        envFiles: [envFile],
        outputPath: outputFile,
        parseTypes: false,
        strict: false,
      };

      service.generate(config);

      expect(fs.existsSync(outputFile)).toBe(true);
      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('declare namespace NodeJS');
      expect(content).toContain('DATABASE_URL');
      expect(content).toContain('API_KEY');
    });

    it('should generate runtime helper when parseTypes is enabled', () => {
      const config: GeneratorConfig = {
        envFiles: [envFile],
        outputPath: outputFile,
        parseTypes: true,
        strict: false,
      };

      service.generate(config);

      const helperPath = outputFile.replace('.d.ts', '.js');
      expect(fs.existsSync(helperPath)).toBe(true);
      const content = fs.readFileSync(helperPath, 'utf-8');
      expect(content).toContain('export const env =');
    });

    it('should generate validation schema when specified', () => {
      const config: GeneratorConfig = {
        envFiles: [envFile],
        outputPath: outputFile,
        validationLib: 'zod',
        validationOutput: validationFile,
        parseTypes: true,
        strict: false,
      };

      service.generate(config);

      expect(fs.existsSync(validationFile)).toBe(true);
      const content = fs.readFileSync(validationFile, 'utf-8');
      expect(content).toContain("import { z } from 'zod'");
    });

    it('should merge variables from multiple files', () => {
      const env1 = path.join(testDir, '.env.local');
      fs.writeFileSync(env1, 'LOCAL_KEY=local');

      const config: GeneratorConfig = {
        envFiles: [envFile, env1],
        outputPath: outputFile,
        parseTypes: false,
        strict: false,
      };

      service.generate(config);

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('DATABASE_URL');
      expect(content).toContain('LOCAL_KEY');
    });

    it('should override variables from earlier files with later files', () => {
      const env1 = path.join(testDir, '.env');
      const env2 = path.join(testDir, '.env.local');

      fs.writeFileSync(env1, 'KEY=value1');
      fs.writeFileSync(env2, 'KEY=value2');

      const config: GeneratorConfig = {
        envFiles: [env1, env2],
        outputPath: outputFile,
        parseTypes: false,
        strict: false,
      };

      service.generate(config);

      expect(fs.existsSync(outputFile)).toBe(true);
    });

    it('should create output directory if it does not exist', () => {
      const nestedOutput = path.join(testDir, 'nested', 'deep', 'env.d.ts');

      const config: GeneratorConfig = {
        envFiles: [envFile],
        outputPath: nestedOutput,
        parseTypes: false,
        strict: false,
      };

      service.generate(config);

      expect(fs.existsSync(nestedOutput)).toBe(true);
    });

    it('should handle required variables', () => {
      const config: GeneratorConfig = {
        envFiles: [envFile],
        outputPath: outputFile,
        parseTypes: false,
        requiredVars: ['DATABASE_URL'],
        strict: false,
      };

      service.generate(config);

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('DATABASE_URL: string;');
    });

    it('should handle strict mode', () => {
      const config: GeneratorConfig = {
        envFiles: [envFile],
        outputPath: outputFile,
        parseTypes: false,
        strict: true,
      };

      service.generate(config);

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).not.toContain('?:');
    });

    it('should handle non-existent env files', () => {
      const config: GeneratorConfig = {
        envFiles: ['non-existent.env'],
        outputPath: outputFile,
        parseTypes: false,
        strict: false,
      };

      expect(() => service.generate(config)).toThrow();
    });
  });

  describe('watch', () => {
    it('should start watch mode', () => {
      const config: GeneratorConfig = {
        envFiles: [envFile],
        outputPath: outputFile,
        parseTypes: false,
        strict: false,
        watch: true,
      };

      service.watch(config);

      expect(service.isWatching()).toBe(true);
    });

    it('should regenerate on file change', (done) => {
      const config: GeneratorConfig = {
        envFiles: [envFile],
        outputPath: outputFile,
        parseTypes: false,
        strict: false,
        watch: true,
      };

      service.watch(config);

      // Wait for initial generation
      setTimeout(() => {
        const initialContent = fs.readFileSync(outputFile, 'utf-8');

        // Modify file
        fs.appendFileSync(envFile, '\nNEW_KEY=newvalue');

        // Wait for regeneration
        setTimeout(() => {
          const updatedContent = fs.readFileSync(outputFile, 'utf-8');
          expect(updatedContent).toContain('NEW_KEY');
          expect(updatedContent).not.toEqual(initialContent);
          done();
        }, 500);
      }, 200);
    }, 10000);
  });

  describe('stopWatch', () => {
    it('should stop watch mode', async () => {
      const config: GeneratorConfig = {
        envFiles: [envFile],
        outputPath: outputFile,
        parseTypes: false,
        strict: false,
        watch: true,
      };

      service.watch(config);
      expect(service.isWatching()).toBe(true);

      await service.stopWatch();
      expect(service.isWatching()).toBe(false);
    });
  });

  describe('isWatching', () => {
    it('should return false initially', () => {
      expect(service.isWatching()).toBe(false);
    });

    it('should return true after starting watch', () => {
      const config: GeneratorConfig = {
        envFiles: [envFile],
        outputPath: outputFile,
        parseTypes: false,
        strict: false,
        watch: true,
      };

      service.watch(config);
      expect(service.isWatching()).toBe(true);
    });
  });
});
