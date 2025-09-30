#!/usr/bin/env node

/**
 * CLI entry point for env-type-generator
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { GeneratorService } from './services/generator-service';
import { GeneratorConfig, ValidationLibrary } from './types';

const program = new Command();

program
  .name('env-type-gen')
  .description('Auto-generate TypeScript types from .env files')
  .version('1.0.0');

program
  .option('-e, --env-files <files...>', 'Environment files to parse', ['.env'])
  .option('-o, --output <path>', 'Output path for type definitions', './src/types/env.d.ts')
  .option('-v, --validation-lib <library>', 'Validation library (zod|yup|joi|none)', 'none')
  .option(
    '-s, --validation-output <path>',
    'Output path for validation schema',
    './src/config/env.validator.ts'
  )
  .option('-r, --required <vars...>', 'Required environment variables', [])
  .option('-p, --parse-types', 'Parse and infer types from values', false)
  .option('-t, --strict', 'Treat all variables as required', false)
  .option('-w, --watch', 'Watch mode - regenerate on file changes', false)
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    try {
      let config: GeneratorConfig;

      // Load config from file if specified
      if (options.config) {
        config = loadConfigFile(options.config);
      } else {
        // Build config from CLI options
        config = {
          envFiles: options.envFiles as string[],
          outputPath: options.output as string,
          validationLib: options.validationLib as ValidationLibrary,
          validationOutput: options.validationOutput as string,
          requiredVars: options.required as string[],
          parseTypes: options.parseTypes as boolean,
          strict: options.strict as boolean,
          watch: options.watch as boolean,
        };
      }

      // Validate config
      validateConfig(config);

      // Create generator service
      const service = new GeneratorService();

      if (config.watch) {
        console.log(chalk.blue('👀 Watch mode enabled...'));
        console.log(chalk.gray(`Watching: ${config.envFiles.join(', ')}`));
        console.log(chalk.gray('Press Ctrl+C to stop\n'));

        service.watch(config);

        console.log(chalk.green('✓ Initial types generated'));
        console.log(chalk.gray(`Output: ${config.outputPath}\n`));

        // Keep process running
        process.on('SIGINT', () => {
          console.log(chalk.yellow('\n\nStopping watcher...'));
          void service.stopWatch().then(() => {
            console.log(chalk.green('✓ Watcher stopped'));
            process.exit(0);
          });
        });
      } else {
        console.log(chalk.blue('🔧 Generating types...'));

        service.generate(config);

        console.log(chalk.green('✓ Types generated successfully!'));
        console.log(chalk.gray(`Output: ${config.outputPath}`));

        if (config.validationLib && config.validationLib !== 'none') {
          console.log(chalk.gray(`Validation: ${config.validationOutput}`));
        }
      }
    } catch (error) {
      console.error(chalk.red('✗ Error:'), (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Load configuration from file
 */
function loadConfigFile(configPath: string): GeneratorConfig {
  const absolutePath = path.resolve(configPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(absolutePath) as GeneratorConfig;
    return config;
  } catch (error) {
    throw new Error(`Failed to load config: ${(error as Error).message}`);
  }
}

/**
 * Validate configuration
 */
function validateConfig(config: GeneratorConfig): void {
  // Check if env files exist
  for (const envFile of config.envFiles) {
    const absolutePath = path.resolve(envFile);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Environment file not found: ${envFile}`);
    }
  }

  // Validate validation library
  const validLibs: ValidationLibrary[] = ['zod', 'yup', 'joi', 'none'];
  if (config.validationLib && !validLibs.includes(config.validationLib)) {
    throw new Error(
      `Invalid validation library: ${config.validationLib}. Must be one of: ${validLibs.join(', ')}`
    );
  }

  // Check if output path ends with .d.ts
  if (!config.outputPath.endsWith('.d.ts')) {
    throw new Error('Output path must end with .d.ts');
  }
}

// Parse command line arguments
program.parse(process.argv);

// Show help if no arguments
if (process.argv.length === 2) {
  program.help();
}
