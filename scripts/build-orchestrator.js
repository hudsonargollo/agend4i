#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Build orchestration script
 * Executes Vite production build with optimizations, validates output, and handles failures
 */

export class BuildOrchestrator {
  constructor(options = {}) {
    this.environment = options.environment || 'production';
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Validate pre-build requirements
   */
  validatePreBuildRequirements() {
    this.log('Validating pre-build requirements...');
    
    const errors = [];
    
    // Check if package.json exists
    const packageJsonPath = join(projectRoot, 'package.json');
    if (!existsSync(packageJsonPath)) {
      errors.push('package.json not found');
    } else {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        const buildScript = `build:${this.environment}`;
        
        if (!packageJson.scripts || !packageJson.scripts[buildScript]) {
          errors.push(`Build script "${buildScript}" not found in package.json`);
        }
      } catch (error) {
        errors.push(`Failed to parse package.json: ${error.message}`);
      }
    }

    // Check if vite.config.ts exists
    const viteConfigPath = join(projectRoot, 'vite.config.ts');
    if (!existsSync(viteConfigPath)) {
      errors.push('vite.config.ts not found');
    }

    // Check if src directory exists
    const srcPath = join(projectRoot, 'src');
    if (!existsSync(srcPath)) {
      errors.push('src directory not found');
    }

    if (errors.length > 0) {
      this.log('Pre-build validation failed:', 'error');
      errors.forEach(error => this.log(`  • ${error}`, 'error'));
      return false;
    }

    this.log('Pre-build requirements validated successfully', 'success');
    return true;
  }

  /**
   * Clean previous build output
   */
  cleanBuildOutput() {
    this.log('Cleaning previous build output...');
    
    const distPath = join(projectRoot, 'dist');
    
    if (existsSync(distPath)) {
      try {
        if (this.dryRun) {
          this.log('[DRY RUN] Would remove dist directory');
        } else {
          // Use cross-platform approach to remove directory
          if (process.platform === 'win32') {
            execSync('rmdir /s /q dist', { cwd: projectRoot, stdio: 'pipe' });
          } else {
            execSync('rm -rf dist', { cwd: projectRoot, stdio: 'pipe' });
          }
          this.log('Previous build output cleaned', 'success');
        }
      } catch (error) {
        this.log(`Warning: Failed to clean previous build output: ${error.message}`, 'warning');
      }
    } else {
      this.log('No previous build output to clean');
    }
  }

  /**
   * Execute Vite production build with optimizations
   */
  async executeBuild() {
    this.log(`Executing Vite build for ${this.environment} environment...`);
    
    try {
      const buildCommand = this.environment === 'preview' ? 'npm run build:preview' : `npm run build:${this.environment}`;
      
      if (this.dryRun) {
        this.log(`[DRY RUN] Would execute: ${buildCommand}`);
        return {
          success: true,
          buildTime: 0,
          command: buildCommand
        };
      }

      const startTime = Date.now();
      
      this.log(`Running command: ${buildCommand}`);
      
      let buildOutput = '';
      
      try {
        if (this.verbose) {
          // Show real-time output
          execSync(buildCommand, { 
            stdio: 'inherit', 
            cwd: projectRoot,
            encoding: 'utf8'
          });
        } else {
          // Capture output for analysis
          buildOutput = execSync(buildCommand, { 
            cwd: projectRoot,
            encoding: 'utf8'
          });
        }
      } catch (error) {
        // Capture build errors for detailed reporting
        const errorOutput = error.stdout || error.stderr || error.message;
        throw new Error(`Build command failed: ${errorOutput}`);
      }
      
      const buildTime = Date.now() - startTime;
      
      this.log(`Build completed successfully in ${buildTime}ms`, 'success');
      
      return {
        success: true,
        buildTime,
        command: buildCommand,
        output: buildOutput
      };
    } catch (error) {
      this.log(`Build execution failed: ${error.message}`, 'error');
      
      // Provide helpful error analysis
      this.analyzeBuildError(error.message);
      
      return {
        success: false,
        error: error.message,
        buildTime: 0
      };
    }
  }

  /**
   * Analyze build errors and provide helpful suggestions
   */
  analyzeBuildError(errorMessage) {
    this.log('Analyzing build error...', 'warning');
    
    const errorPatterns = [
      {
        pattern: /TypeScript error/i,
        suggestion: 'Fix TypeScript compilation errors. Run "npm run lint" to see detailed errors.'
      },
      {
        pattern: /Module not found/i,
        suggestion: 'Check for missing dependencies. Run "npm install" to ensure all packages are installed.'
      },
      {
        pattern: /out of memory/i,
        suggestion: 'Build process ran out of memory. Try increasing Node.js memory limit with --max-old-space-size=4096'
      },
      {
        pattern: /ENOSPC/i,
        suggestion: 'Insufficient disk space. Free up disk space and try again.'
      },
      {
        pattern: /permission denied/i,
        suggestion: 'Permission error. Check file permissions or run with appropriate privileges.'
      },
      {
        pattern: /vite.*not found/i,
        suggestion: 'Vite is not installed. Run "npm install" to install dependencies.'
      }
    ];

    for (const { pattern, suggestion } of errorPatterns) {
      if (pattern.test(errorMessage)) {
        this.log(`💡 Suggestion: ${suggestion}`, 'warning');
        break;
      }
    }
  }

  /**
   * Validate build output and asset generation
   */
  validateBuildOutput() {
    this.log('Validating build output...');
    
    const distPath = join(projectRoot, 'dist');
    const validationResults = {
      success: true,
      errors: [],
      warnings: [],
      assets: {
        totalFiles: 0,
        totalSize: 0,
        htmlFiles: [],
        jsFiles: [],
        cssFiles: [],
        staticAssets: []
      }
    };

    // Check if dist directory exists
    if (!existsSync(distPath)) {
      validationResults.errors.push('Build output directory "dist" not found');
      validationResults.success = false;
      return validationResults;
    }

    try {
      // Check for essential files
      const indexPath = join(distPath, 'index.html');
      if (!existsSync(indexPath)) {
        validationResults.errors.push('index.html not found in build output');
        validationResults.success = false;
      } else {
        // Validate index.html content
        const indexContent = readFileSync(indexPath, 'utf8');
        if (!indexContent.includes('<div id="root">')) {
          validationResults.warnings.push('index.html may not contain expected React root element');
        }
        if (!indexContent.includes('type="module"')) {
          validationResults.warnings.push('index.html may not be configured for ES modules');
        }
      }

      // Analyze build assets
      this.analyzeBuildAssets(distPath, validationResults.assets);
      
      // Validate asset optimization
      this.validateAssetOptimization(validationResults);
      
      // Check for common issues
      this.checkCommonBuildIssues(distPath, validationResults);

    } catch (error) {
      validationResults.errors.push(`Failed to validate build output: ${error.message}`);
      validationResults.success = false;
    }

    // Report validation results
    this.reportValidationResults(validationResults);
    
    return validationResults;
  }

  /**
   * Analyze build assets and collect statistics
   */
  analyzeBuildAssets(distPath, assets) {
    const analyzeDirectory = (dirPath, relativePath = '') => {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = join(dirPath, item);
        const relativeItemPath = join(relativePath, item);
        const stats = statSync(itemPath);
        
        if (stats.isDirectory()) {
          analyzeDirectory(itemPath, relativeItemPath);
        } else {
          assets.totalFiles++;
          assets.totalSize += stats.size;
          
          const ext = item.split('.').pop()?.toLowerCase();
          
          if (ext === 'html') {
            assets.htmlFiles.push({ path: relativeItemPath, size: stats.size });
          } else if (ext === 'js' || ext === 'mjs') {
            assets.jsFiles.push({ path: relativeItemPath, size: stats.size });
          } else if (ext === 'css') {
            assets.cssFiles.push({ path: relativeItemPath, size: stats.size });
          } else {
            assets.staticAssets.push({ path: relativeItemPath, size: stats.size, ext });
          }
        }
      }
    };

    analyzeDirectory(distPath);
  }

  /**
   * Validate asset optimization
   */
  validateAssetOptimization(validationResults) {
    const { assets } = validationResults;
    
    // Check for minified JavaScript files
    const largeJsFiles = assets.jsFiles.filter(file => file.size > 1024 * 1024); // > 1MB
    if (largeJsFiles.length > 0) {
      validationResults.warnings.push(`Large JavaScript files detected (${largeJsFiles.length} files > 1MB)`);
    }

    // Check for CSS optimization
    const largeCssFiles = assets.cssFiles.filter(file => file.size > 512 * 1024); // > 512KB
    if (largeCssFiles.length > 0) {
      validationResults.warnings.push(`Large CSS files detected (${largeCssFiles.length} files > 512KB)`);
    }

    // Check for proper file naming (should include hash for caching)
    const jsFilesWithoutHash = assets.jsFiles.filter(file => 
      !file.path.includes('-') && !file.path.includes('.') || file.path === 'index.js'
    );
    if (jsFilesWithoutHash.length > 0) {
      validationResults.warnings.push('Some JavaScript files may not include content hash for optimal caching');
    }
  }

  /**
   * Check for common build issues
   */
  checkCommonBuildIssues(distPath, validationResults) {
    // Check for source maps in production
    const sourceMapFiles = validationResults.assets.jsFiles.filter(file => file.path.endsWith('.map'));
    if (sourceMapFiles.length > 0 && this.environment === 'production') {
      validationResults.warnings.push('Source map files found in production build (may expose source code)');
    }

    // Check for development artifacts
    const devArtifacts = validationResults.assets.staticAssets.filter(file => 
      file.path.includes('dev') || file.path.includes('debug')
    );
    if (devArtifacts.length > 0) {
      validationResults.warnings.push('Development artifacts found in build output');
    }
  }

  /**
   * Report validation results
   */
  reportValidationResults(results) {
    const { assets, errors, warnings } = results;
    
    this.log('\n=== Build Output Validation Results ===');
    
    // Asset summary
    this.log(`📊 Build Statistics:`);
    this.log(`   Total Files: ${assets.totalFiles}`);
    this.log(`   Total Size: ${this.formatFileSize(assets.totalSize)}`);
    this.log(`   HTML Files: ${assets.htmlFiles.length}`);
    this.log(`   JavaScript Files: ${assets.jsFiles.length}`);
    this.log(`   CSS Files: ${assets.cssFiles.length}`);
    this.log(`   Static Assets: ${assets.staticAssets.length}`);

    // Errors
    if (errors.length > 0) {
      this.log(`\n❌ ${errors.length} error(s) found:`);
      errors.forEach(error => this.log(`  • ${error}`, 'error'));
    }

    // Warnings
    if (warnings.length > 0) {
      this.log(`\n⚠️  ${warnings.length} warning(s):`);
      warnings.forEach(warning => this.log(`  • ${warning}`, 'warning'));
    }

    // Overall result
    if (results.success) {
      this.log('\n✅ Build output validation passed!', 'success');
    } else {
      this.log('\n❌ Build output validation failed!', 'error');
    }
  }

  /**
   * Format file size for human readability
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Execute complete build orchestration process
   */
  async orchestrateBuild() {
    this.log(`Starting build orchestration for ${this.environment} environment...`);
    
    const startTime = Date.now();
    const result = {
      success: false,
      stage: 'initialization',
      buildTime: 0,
      validationTime: 0,
      totalTime: 0,
      environment: this.environment,
      assets: null,
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Validate pre-build requirements
      result.stage = 'pre-validation';
      if (!this.validatePreBuildRequirements()) {
        result.errors.push('Pre-build validation failed');
        return result;
      }

      // Step 2: Clean previous build output
      result.stage = 'cleanup';
      this.cleanBuildOutput();

      // Step 3: Execute build
      result.stage = 'build';
      const buildResult = await this.executeBuild();
      result.buildTime = buildResult.buildTime;
      
      if (!buildResult.success) {
        result.errors.push(buildResult.error || 'Build execution failed');
        return result;
      }

      // Step 4: Validate build output
      result.stage = 'validation';
      const validationStartTime = Date.now();
      const validationResult = this.validateBuildOutput();
      result.validationTime = Date.now() - validationStartTime;
      
      result.assets = validationResult.assets;
      result.errors = validationResult.errors;
      result.warnings = validationResult.warnings;
      
      if (!validationResult.success) {
        return result;
      }

      // Success!
      result.success = true;
      result.totalTime = Date.now() - startTime;
      
      this.log(`🎉 Build orchestration completed successfully in ${result.totalTime}ms`, 'success');
      
      return result;

    } catch (error) {
      result.errors.push(`Build orchestration failed: ${error.message}`);
      result.totalTime = Date.now() - startTime;
      this.log(`Build orchestration failed at ${result.stage} stage: ${error.message}`, 'error');
      return result;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'production';
  const verbose = args.includes('--verbose') || args.includes('-v');
  const dryRun = args.includes('--dry-run');
  
  if (!['development', 'staging', 'production', 'preview'].includes(environment)) {
    console.error('❌ Invalid environment. Use: development, staging, production, or preview');
    process.exit(1);
  }

  const orchestrator = new BuildOrchestrator({ environment, verbose, dryRun });
  
  try {
    const result = await orchestrator.orchestrateBuild();
    
    if (result.success) {
      console.log('\n✅ Build Orchestration Summary:');
      console.log(`   Environment: ${result.environment}`);
      console.log(`   Build Time: ${result.buildTime}ms`);
      console.log(`   Validation Time: ${result.validationTime}ms`);
      console.log(`   Total Time: ${result.totalTime}ms`);
      if (result.assets) {
        console.log(`   Total Files: ${result.assets.totalFiles}`);
        console.log(`   Total Size: ${orchestrator.formatFileSize(result.assets.totalSize)}`);
      }
      if (result.warnings.length > 0) {
        console.log(`   Warnings: ${result.warnings.length}`);
      }
      process.exit(0);
    } else {
      console.error(`\n❌ Build orchestration failed at ${result.stage} stage:`);
      if (result.errors.length > 0) {
        result.errors.forEach(error => console.error(`   Error: ${error}`));
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Build orchestration script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Build orchestration script failed:', error);
    process.exit(1);
  });
}