/**
 * File watcher service
 * Watches .env files for changes and triggers regeneration
 */

import * as chokidar from 'chokidar';
import * as path from 'path';
import { EnvTypeGeneratorError } from '../utils/errors';

export type FileChangeCallback = (filePath: string) => void | Promise<void>;

export interface WatcherOptions {
  files: string[];
  onChanged: FileChangeCallback;
  debounceMs?: number;
}

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start watching files
   */
  public watch(options: WatcherOptions): void {
    const { files, onChanged, debounceMs = 300 } = options;

    if (this.watcher) {
      throw new EnvTypeGeneratorError('Watcher is already running');
    }

    const absolutePaths = files.map((file) => path.resolve(file));

    this.watcher = chokidar.watch(absolutePaths, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.watcher.on('change', (filePath: string) => {
      this.handleChange(filePath, onChanged, debounceMs);
    });

    this.watcher.on('error', (error: Error) => {
      throw new EnvTypeGeneratorError(`Watcher error: ${error.message}`);
    });
  }

  /**
   * Handle file change with debouncing
   */
  private handleChange(filePath: string, callback: FileChangeCallback, debounceMs: number): void {
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      void this.executeCallback(callback, filePath);
    }, debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Execute callback safely
   */
  private async executeCallback(callback: FileChangeCallback, filePath: string): Promise<void> {
    try {
      await callback(filePath);
    } catch (error) {
      throw new EnvTypeGeneratorError(
        `Callback execution failed for ${filePath}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Stop watching files
   */
  public async stop(): Promise<void> {
    if (!this.watcher) {
      return;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    await this.watcher.close();
    this.watcher = null;
  }

  /**
   * Check if watcher is running
   */
  public isWatching(): boolean {
    return this.watcher !== null;
  }
}
