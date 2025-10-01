/**
 * Unit tests for FileWatcher
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileWatcher } from './file-watcher';
import { EnvTypeGeneratorError } from '../utils/errors';

describe('FileWatcher', () => {
  let watcher: FileWatcher;
  const testDir = path.join(__dirname, '../../test-watch-fixtures');
  const testFile = path.join(testDir, 'test.env');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  beforeEach(() => {
    watcher = new FileWatcher();
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    fs.writeFileSync(testFile, 'KEY=value');
  });

  afterEach(async () => {
    await watcher.stop();
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('watch', () => {
    it('should start watching files', (done) => {
      let callCount = 0;

      watcher.watch({
        files: [testFile],
        onChanged: () => {
          callCount++;
          if (callCount === 1) {
            expect(watcher.isWatching()).toBe(true);
            done();
          }
        },
        debounceMs: 100,
      });

      // Trigger file change
      setTimeout(() => {
        fs.appendFileSync(testFile, '\nNEW_KEY=value');
      }, 200);
    });

    it('should debounce multiple rapid changes', (done) => {
      let callCount = 0;

      watcher.watch({
        files: [testFile],
        onChanged: () => {
          callCount++;
        },
        debounceMs: 200,
      });

      // Trigger multiple rapid changes
      setTimeout(() => fs.appendFileSync(testFile, '\nKEY1=value1'), 50);
      setTimeout(() => fs.appendFileSync(testFile, '\nKEY2=value2'), 100);
      setTimeout(() => fs.appendFileSync(testFile, '\nKEY3=value3'), 150);

      // Check after debounce period
      setTimeout(() => {
        // Should only have been called once due to debouncing
        expect(callCount).toBeLessThanOrEqual(1);
        done();
      }, 500);
    });

    it('should throw error if watcher is already running', () => {
      watcher.watch({
        files: [testFile],
        onChanged: jest.fn(),
      });

      expect(() =>
        watcher.watch({
          files: [testFile],
          onChanged: jest.fn(),
        })
      ).toThrow(EnvTypeGeneratorError);
    });

    it('should handle async callbacks', (done) => {
      const asyncCallback = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      watcher.watch({
        files: [testFile],
        onChanged: asyncCallback,
        debounceMs: 100,
      });

      setTimeout(() => {
        fs.appendFileSync(testFile, '\nASYNC_KEY=value');
      }, 200);

      setTimeout(() => {
        expect(asyncCallback).toHaveBeenCalled();
        done();
      }, 600);
    });
  });

  describe('stop', () => {
    it('should stop watching files', async () => {
      watcher.watch({
        files: [testFile],
        onChanged: jest.fn(),
      });

      expect(watcher.isWatching()).toBe(true);

      await watcher.stop();

      expect(watcher.isWatching()).toBe(false);
    });

    it('should handle stop when not watching', async () => {
      expect(watcher.isWatching()).toBe(false);
      await expect(watcher.stop()).resolves.not.toThrow();
    });

    it('should clear debounce timers on stop', (done) => {
      const callback = jest.fn();

      watcher.watch({
        files: [testFile],
        onChanged: callback,
        debounceMs: 500,
      });

      // Trigger change
      setTimeout(() => {
        fs.appendFileSync(testFile, '\nKEY=value');
      }, 100);

      // Stop before debounce completes
      setTimeout(async () => {
        await watcher.stop();

        // Wait and check callback wasn't called
        setTimeout(() => {
          expect(callback).not.toHaveBeenCalled();
          done();
        }, 300);
      }, 200);
    });
  });

  describe('isWatching', () => {
    it('should return false when not watching', () => {
      expect(watcher.isWatching()).toBe(false);
    });

    it('should return true when watching', () => {
      watcher.watch({
        files: [testFile],
        onChanged: jest.fn(),
      });

      expect(watcher.isWatching()).toBe(true);
    });
  });
});
