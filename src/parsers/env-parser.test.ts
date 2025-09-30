/**
 * Unit tests for EnvParser
 */

import * as fs from 'fs';
import * as path from 'path';
import { EnvParser } from './env-parser';
import { FileNotFoundError } from '../utils/errors';

describe('EnvParser', () => {
  let parser: EnvParser;
  const testDir = path.join(__dirname, '../../test-fixtures');

  beforeAll(() => {
    // Create test fixtures directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  beforeEach(() => {
    parser = new EnvParser();
  });

  afterAll(() => {
    // Clean up test fixtures
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('parseFile', () => {
    it('should parse a simple .env file', () => {
      const envContent = 'DATABASE_URL=postgresql://localhost:5432/mydb\nAPI_KEY=secret123';
      const testFile = path.join(testDir, 'simple.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);

      expect(result.variables).toHaveLength(2);
      expect(result.variables[0]).toEqual({
        key: 'DATABASE_URL',
        value: 'postgresql://localhost:5432/mydb',
        comment: undefined,
      });
      expect(result.variables[1]).toEqual({
        key: 'API_KEY',
        value: 'secret123',
        comment: undefined,
      });
    });

    it('should parse variables with comments', () => {
      const envContent = '# Database configuration\nDATABASE_URL=postgresql://localhost:5432/mydb';
      const testFile = path.join(testDir, 'comments.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);

      expect(result.variables).toHaveLength(1);
      expect(result.variables[0].comment).toBe('Database configuration');
    });

    it('should handle quoted values', () => {
      const envContent = 'MESSAGE="Hello World"\nPATH=\'/usr/local/bin\'';
      const testFile = path.join(testDir, 'quoted.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);

      expect(result.variables[0].value).toBe('Hello World');
      expect(result.variables[1].value).toBe('/usr/local/bin');
    });

    it('should handle escape sequences in double quotes', () => {
      const envContent = 'MESSAGE="Line 1\\nLine 2\\tTabbed"';
      const testFile = path.join(testDir, 'escape.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);

      expect(result.variables[0].value).toBe('Line 1\nLine 2\tTabbed');
    });

    it('should handle inline comments', () => {
      const envContent = 'API_KEY=secret123 # This is a secret';
      const testFile = path.join(testDir, 'inline-comment.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);

      expect(result.variables[0].value).toBe('secret123');
    });

    it('should handle # inside quotes', () => {
      const envContent = 'MESSAGE="This has # inside"';
      const testFile = path.join(testDir, 'hash-in-quotes.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);

      expect(result.variables[0].value).toBe('This has # inside');
    });

    it('should skip empty lines', () => {
      const envContent = 'KEY1=value1\n\n\nKEY2=value2';
      const testFile = path.join(testDir, 'empty-lines.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);

      expect(result.variables).toHaveLength(2);
    });

    it('should throw FileNotFoundError for non-existent file', () => {
      expect(() => parser.parseFile('non-existent.env')).toThrow(FileNotFoundError);
    });

    it('should handle absolute paths', () => {
      const testFile = path.join(testDir, 'absolute.env');
      fs.writeFileSync(testFile, 'KEY=value');

      const absolutePath = path.resolve(testFile);
      const result = parser.parseFile(absolutePath);

      expect(result.filePath).toBe(absolutePath);
      expect(result.variables[0].key).toBe('KEY');
    });
  });

  describe('parseFiles', () => {
    it('should parse multiple .env files', () => {
      const file1 = path.join(testDir, 'multi1.env');
      const file2 = path.join(testDir, 'multi2.env');

      fs.writeFileSync(file1, 'KEY1=value1');
      fs.writeFileSync(file2, 'KEY2=value2');

      const results = parser.parseFiles([file1, file2]);

      expect(results).toHaveLength(2);
      expect(results[0].variables[0].key).toBe('KEY1');
      expect(results[1].variables[0].key).toBe('KEY2');
    });

    it('should handle empty file list', () => {
      const results = parser.parseFiles([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('inferType', () => {
    it('should infer boolean type', () => {
      expect(parser.inferType('true')).toBe('boolean');
      expect(parser.inferType('false')).toBe('boolean');
      expect(parser.inferType('TRUE')).toBe('boolean');
      expect(parser.inferType('FALSE')).toBe('boolean');
    });

    it('should infer number type', () => {
      expect(parser.inferType('42')).toBe('number');
      expect(parser.inferType('3.14')).toBe('number');
      expect(parser.inferType('-100')).toBe('number');
      expect(parser.inferType('-5.5')).toBe('number');
    });

    it('should infer object type for valid JSON', () => {
      expect(parser.inferType('{"key":"value"}')).toBe('object');
      expect(parser.inferType('[1,2,3]')).toBe('object');
    });

    it('should return string for invalid JSON', () => {
      expect(parser.inferType('{invalid}')).toBe('string');
      expect(parser.inferType('[invalid]')).toBe('string');
    });

    it('should return string for regular strings', () => {
      expect(parser.inferType('hello')).toBe('string');
      expect(parser.inferType('postgresql://localhost')).toBe('string');
    });
  });

  describe('edge cases', () => {
    it('should handle unbalanced quotes in inline comments', () => {
      const envContent = 'KEY=value # comment with "unbalanced';
      const testFile = path.join(testDir, 'unbalanced.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);
      expect(result.variables[0].value).toBe('value');
    });

    it('should handle values without quotes', () => {
      const envContent = 'PLAIN_VALUE=simplevalue';
      const testFile = path.join(testDir, 'plain.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);
      expect(result.variables[0].value).toBe('simplevalue');
    });

    it('should handle single-quoted values without escapes', () => {
      const envContent = "MESSAGE='Single quoted \\n no escape'";
      const testFile = path.join(testDir, 'single-quote.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);
      expect(result.variables[0].value).toBe('Single quoted \\n no escape');
    });

    it('should handle values with all escape sequences', () => {
      const envContent = 'MESSAGE="Line\\nTab\\tReturn\\rBackslash\\\\Quote\\""';
      const testFile = path.join(testDir, 'all-escapes.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);
      expect(result.variables[0].value).toBe('Line\nTab\tReturn\rBackslash\\Quote"');
    });

    it('should handle lines that do not match variable pattern', () => {
      const envContent = 'VALID_KEY=value\ninvalid line\n123INVALID=value';
      const testFile = path.join(testDir, 'invalid-lines.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);
      expect(result.variables).toHaveLength(1);
      expect(result.variables[0].key).toBe('VALID_KEY');
    });

    it('should handle files with only comments', () => {
      const envContent = '# Comment 1\n# Comment 2\n# Comment 3';
      const testFile = path.join(testDir, 'only-comments.env');
      fs.writeFileSync(testFile, envContent);

      const result = parser.parseFile(testFile);
      expect(result.variables).toHaveLength(0);
    });

    it('should handle empty file', () => {
      const testFile = path.join(testDir, 'empty.env');
      fs.writeFileSync(testFile, '');

      const result = parser.parseFile(testFile);
      expect(result.variables).toHaveLength(0);
    });
  });
});