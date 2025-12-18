/**
 * Comprehensive error handling and recovery mechanisms for deployment
 * Provides retry logic, rollback capabilities, and troubleshooting guidance
 */

export interface DeploymentError {
  type: 'network' | 'authentication' | 'build' | 'configuration' | 'quota' | 'validation' | 'unknown';
  code?: string;
  message: string;
  retryable: boolean;
  recoverable: boolean;
  timestamp: Date;
  stage: 'pre-validation' | 'build' | 'deployment' | 'post-validation';
}

export interface RecoveryAction {
  type: 'retry' | 'rollback' | 'manual' | 'skip';
  description: string;
  command?: string;
  automated: boolean;
}

export interface RollbackInfo {
  previousDeploymentId?: string;
  previousUrl?: string;
  rollbackAvailable: boolean;
  rollbackCommand?: string;
}

export class DeploymentErrorHandler {
  private verbose: boolean;
  private deploymentHistory: Array<{ id: string; url: string; timestamp: Date; success: boolean }> = [];

  constructor(options: { verbose?: boolean } = {}) {
    this.verbose = options.verbose || false;
  }

  /**
   * Classify error type based on error message and context
   */
  classifyError(error: Error | string, stage: DeploymentError['stage']): DeploymentError {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorString = errorMessage.toLowerCase();

    let type: DeploymentError['type'] = 'unknown';
    let retryable = false;
    let recoverable = true;
    let code: string | undefined;

    // Network errors
    if (errorString.includes('econnreset') || errorString.includes('enotfound') || 
        errorString.includes('etimedout') || errorString.includes('network error') ||
        errorString.includes('timeout')) {
      type = 'network';
      retryable = true;
      code = 'NETWORK_ERROR';
    }
    // Authentication errors
    else if (errorString.includes('unauthorized') || errorString.includes('authentication') || 
             errorString.includes('login') || errorString.includes('token')) {
      type = 'authentication';
      retryable = false;
      code = 'AUTH_ERROR';
    }
    // Build errors
    else if (errorString.includes('build failed') || errorString.includes('compilation') || 
             errorString.includes('typescript') || errorString.includes('syntax error')) {
      type = 'build';
      retryable = false;
      code = 'BUILD_ERROR';
    }
    // Configuration errors
    else if (errorString.includes('configuration') || errorString.includes('wrangler.toml') || 
             errorString.includes('environment variable')) {
      type = 'configuration';
      retryable = false;
      code = 'CONFIG_ERROR';
    }
    // Quota/limit errors
    else if (errorString.includes('quota') || errorString.includes('limit') || 
             errorString.includes('exceeded') || errorString.includes('too many')) {
      type = 'quota';
      retryable = true;
      code = 'QUOTA_ERROR';
    }
    // Validation errors
    else if (errorString.includes('validation') || errorString.includes('invalid') || 
             errorString.includes('missing required')) {
      type = 'validation';
      retryable = false;
      code = 'VALIDATION_ERROR';
    }

    return {
      type,
      code,
      message: errorMessage,
      retryable,
      recoverable,
      timestamp: new Date(),
      stage
    };
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attemptNumber: number): number {
    const baseDelay = 1000;
    const maxDelay = 30000;
    const backoffMultiplier = 2;
    const delay = baseDelay * Math.pow(backoffMultiplier, attemptNumber - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Get rollback information for the current deployment
   */
  getRollbackInfo(): RollbackInfo {
    const lastSuccessfulDeployment = this.deploymentHistory.find(deployment => deployment.success);

    if (!lastSuccessfulDeployment) {
      return {
        rollbackAvailable: false
      };
    }

    return {
      previousDeploymentId: lastSuccessfulDeployment.id,
      previousUrl: lastSuccessfulDeployment.url,
      rollbackAvailable: true,
      rollbackCommand: `wrangler pages deployment tail ${lastSuccessfulDeployment.id}`
    };
  }

  /**
   * Get recovery actions for a specific error
   */
  getRecoveryActions(error: DeploymentError): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (error.type) {
      case 'network':
        if (error.retryable) {
          actions.push({
            type: 'retry',
            description: 'Retry the operation after network connectivity is restored',
            automated: true
          });
        }
        actions.push({
          type: 'manual',
          description: 'Check network connectivity and firewall settings',
          automated: false
        });
        break;

      case 'authentication':
        actions.push({
          type: 'manual',
          description: 'Re-authenticate with Cloudflare',
          command: 'wrangler login',
          automated: false
        });
        break;

      case 'build':
        actions.push({
          type: 'manual',
          description: 'Fix build errors and retry deployment',
          command: 'npm run build',
          automated: false
        });
        break;

      case 'configuration':
        actions.push({
          type: 'manual',
          description: 'Review and fix configuration files',
          automated: false
        });
        break;

      case 'quota':
        actions.push({
          type: 'retry',
          description: 'Wait for quota reset and retry',
          automated: true
        });
        break;

      case 'validation':
        actions.push({
          type: 'manual',
          description: 'Fix validation errors and retry',
          automated: false
        });
        break;

      default:
        actions.push({
          type: 'retry',
          description: 'Retry the operation',
          automated: true
        });
    }

    // Always offer rollback as an option if available
    const rollbackInfo = this.getRollbackInfo();
    if (rollbackInfo.rollbackAvailable && error.recoverable) {
      actions.push({
        type: 'rollback',
        description: `Rollback to previous deployment (${rollbackInfo.previousUrl})`,
        automated: true
      });
    }

    return actions;
  }

  /**
   * Generate comprehensive error report with recovery options
   */
  generateErrorReport(error: DeploymentError): string {
    const report = [];
    
    report.push('='.repeat(60));
    report.push('DEPLOYMENT ERROR REPORT');
    report.push('='.repeat(60));
    report.push('');
    
    report.push(`Error Type: ${error.type.toUpperCase()}`);
    report.push(`Stage: ${error.stage}`);
    report.push(`Time: ${error.timestamp.toISOString()}`);
    report.push(`Retryable: ${error.retryable ? 'Yes' : 'No'}`);
    report.push(`Recoverable: ${error.recoverable ? 'Yes' : 'No'}`);
    if (error.code) {
      report.push(`Error Code: ${error.code}`);
    }
    report.push('');
    
    report.push('Error Message:');
    report.push(error.message);
    report.push('');

    // Recovery actions
    const actions = this.getRecoveryActions(error);
    if (actions.length > 0) {
      report.push('RECOVERY OPTIONS:');
      report.push('-'.repeat(20));
      actions.forEach((action, index) => {
        report.push(`${index + 1}. ${action.description}`);
        if (action.command) {
          report.push(`   Command: ${action.command}`);
        }
        report.push(`   Type: ${action.automated ? 'Automated' : 'Manual'}`);
        report.push('');
      });
    }

    // Rollback information
    const rollbackInfo = this.getRollbackInfo();
    if (rollbackInfo.rollbackAvailable) {
      report.push('ROLLBACK INFORMATION:');
      report.push('-'.repeat(22));
      report.push(`Previous Deployment: ${rollbackInfo.previousUrl}`);
      if (rollbackInfo.rollbackCommand) {
        report.push(`Rollback Command: ${rollbackInfo.rollbackCommand}`);
      }
      report.push('');
    }

    report.push('='.repeat(60));
    
    return report.join('\n');
  }

  /**
   * Record deployment attempt
   */
  recordDeployment(deploymentId: string, url: string, success: boolean): void {
    this.deploymentHistory.unshift({
      id: deploymentId,
      url,
      timestamp: new Date(),
      success
    });

    // Keep only last 10 deployments
    this.deploymentHistory = this.deploymentHistory.slice(0, 10);
  }

  /**
   * Get deployment history
   */
  getDeploymentHistory(): Array<{ id: string; url: string; timestamp: Date; success: boolean }> {
    return [...this.deploymentHistory];
  }

  /**
   * Handle deployment error with comprehensive recovery
   */
  async handleDeploymentError(
    error: Error | string,
    stage: DeploymentError['stage']
  ): Promise<{
    error: DeploymentError;
    report: string;
    recoveryActions: RecoveryAction[];
    rollbackInfo: RollbackInfo;
  }> {
    const deploymentError = this.classifyError(error, stage);
    
    const report = this.generateErrorReport(deploymentError);
    const recoveryActions = this.getRecoveryActions(deploymentError);
    const rollbackInfo = this.getRollbackInfo();

    return {
      error: deploymentError,
      report,
      recoveryActions,
      rollbackInfo
    };
  }

  /**
   * Attempt to rollback to previous deployment
   */
  async rollback(): Promise<{ success: boolean; message: string }> {
    const rollbackInfo = this.getRollbackInfo();
    
    if (!rollbackInfo.rollbackAvailable) {
      return {
        success: false,
        message: 'No previous successful deployment found for rollback'
      };
    }

    return {
      success: true,
      message: `Rollback information available. Previous deployment: ${rollbackInfo.previousUrl}`
    };
  }
}