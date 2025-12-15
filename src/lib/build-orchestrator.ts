import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { DeploymentErrorHandler } from './deployment-error-handler.js';

/**
 * Build orchestration utility
 * Executes Vite production build with optimizations, validates output, and handles failures
 */

export interface BuildOptions {
  environment?: 'development' | 'staging' | 'production' | 'preview';
  verbose?: boolean;
  dryRun?: boolean;
}

export interface BuildAssets {
  totalFiles: number;
  totalSize: number;
  htmlFiles: Array<{ path: string; size: number }>;
  jsFiles: Array<{ path: string; size: number }>;
  cssFiles: Array<{ path: string; size: number }>;
  staticAssets: Array<{ path: string; size: number; ext?: string }>;
}

export interface BuildValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  assets: BuildAssets;
}

export interface BuildExecutionResult {
  success: boolean;
  buildTime: number;
  command?: string;
  output?: string;
  error?: string;
}

export interface BuildOrchestrationResult {
  success: boolean;
  stage: 'initialization' | 'pre-validation' | 'cleanup' | 'build' | 'validation';
  buildTime: number;
  validationTime: number;
  totalTime: number;
  environment: string;
  assets: BuildAssets | null;
  errors: string[];
  warnings: string[];
}

export class BuildOrchestrator {
  private environment: string;
  private verbose: boolean;
  private dryRun: boolean;
  private projectRoot: string;
  private errorHandler: DeploymentErrorHandler;

  constructor(options: BuildOptions = {}) {
    this.environment = options.environment || 'production';
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.projectRoot = process.cwd();
    this.errorHandler = new DeploymentErrorHandler({ 
      projectRoot: this.projectRoot,
      verbose: this.verbose 
    });
  }

  private log(message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Validate pre-build requirements
   */
  validatePreBuildRequirements(): boolean {
    this.log('Validating pre-build requirements...');
    
    const errors: string[] = [];
    
    // Check if package.json exists
    const packageJsonPath = join(this.projectRoot, 'package.json');
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
        errors.push(`Failed to parse package.json: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Check if vite.config.ts exists
    const viteConfigPath = join(this.projectRoot, 'vite.config.ts');
    if (!existsSync(viteConfigPath)) {
      errors.push('vite.config.ts not found');
    }

    // Check if src directory exists
    const srcPath = join(this.projectRoot, 'src');
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
  cleanBuildOutput(): void {
    this.log('Cleaning previous build output...');
    
    const distPath = join(this.projectRoot, 'dist');
    
    if (existsSync(distPath)) {
      try {
        if (this.dryRun) {
          this.log('[DRY RUN] Would remove dist directory');
        } else {
          // Use cross-platform approach to remove directory
          if (process.platform === 'win32') {
            execSync('rmdir /s /q dist', { cwd: this.projectRoot, stdio: 'pipe' });
          } else {
            execSync('rm -rf dist', { cwd: this.projectRoot, stdio: 'pipe' });
          }
          this.log('Previous build output cleaned', 'success');
        }
      } catch (error) {
        this.log(`Warning: Failed to clean previous build output: ${error instanceof Error ? error.message : String(error)}`, 'warning');
      }
    } else {
      this.log('No previous build output to clean');
    }
  }

  /**
   * Execute Vite production build with optimizations
   */
  async executeBuild(): Promise<BuildExecutionResult> {
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
            cwd: this.projectRoot,
            encoding: 'utf8'
          });
        } else {
          // Capture output for analysis
          buildOutput = execSync(buildCommand, { 
            cwd: this.projectRoot,
            encoding: 'utf8'
          });
        }
      } catch (error: any) {
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Build execution failed: ${errorMessage}`, 'error');
      
      // Provide helpful error analysis
      this.analyzeBuildError(errorMessage);
      
      // Provide helpful error analysis
      await this.analyzeBuildError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        buildTime: 0
      };
    }
  }

  /**
   * Analyze build errors and provide helpful suggestions
   */
  private async analyzeBuildError(errorMessage: string): Promise<void> {
    this.log('Analyzing build error...', 'warning');
    
    try {
      const errorInfo = await this.errorHandler.handleDeploymentError(
        new Error(errorMessage), 
        'build'
      );
      
      if (this.verbose) {
        console.log('\n' + errorInfo.report);
      } else {
        // Show just the recovery actions for non-verbose mode
        if (errorInfo.recoveryActions.length > 0) {
          this.log('💡 Suggested recovery actions:', 'warning');
          errorInfo.recoveryActions.forEach((action, index) => {
            this.log(`  ${index + 1}. ${action.description}`, 'warning');
            if (action.command) {
              this.log(`     Command: ${action.command}`, 'info');
            }
          });
        }
      }
    } catch (error) {
      // Fallback to simple error analysis if error handler fails
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
  }

  /**
   * Validate build output and asset generation
   */
  validateBuildOutput(): BuildValidationResult {
    this.log('Validating build output...');
    
    const distPath = join(this.projectRoot, 'dist');
    const validationResults: BuildValidationResult = {
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

    // In dry run mode, skip actual validation
    if (this.dryRun) {
      this.log('[DRY RUN] Would validate build output');
      return validationResults;
    }

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
      validationResults.errors.push(`Failed to validate build output: ${error instanceof Error ? error.message : String(error)}`);
      validationResults.success = false;
    }

    // Report validation results
    this.reportValidationResults(validationResults);
    
    return validationResults;
  }

  /**
   * Analyze build assets and collect statistics
   */
  private analyzeBuildAssets(distPath: string, assets: BuildAssets): void {
    const analyzeDirectory = (dirPath: string, relativePath: string = '') => {
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
  private validateAssetOptimization(validationResults: BuildValidationResult): void {
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
  private checkCommonBuildIssues(distPath: string, validationResults: BuildValidationResult): void {
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
  private reportValidationResults(results: BuildValidationResult): void {
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
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Execute complete build orchestration process
   */
  async orchestrateBuild(): Promise<BuildOrchestrationResult> {
    this.log(`Starting build orchestration for ${this.environment} environment...`);
    
    const startTime = Date.now();
    const result: BuildOrchestrationResult = {
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
      result.errors.push(`Build orchestration failed: ${error instanceof Error ? error.message : String(error)}`);
      result.totalTime = Date.now() - startTime;
      this.log(`Build orchestration failed at ${result.stage} stage: ${error instanceof Error ? error.message : String(error)}`, 'error');
      return result;
    }
  }
}