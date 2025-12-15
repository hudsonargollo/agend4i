/**
 * GitHub Deployment Status Integration
 * Handles reporting deployment status back to GitHub commits and pull requests
 */

export interface GitHubDeploymentConfig {
  owner: string;
  repo: string;
  token: string;
  sha: string;
  environment: 'production' | 'staging' | 'preview';
  ref?: string;
  pullRequestNumber?: number;
}

export interface DeploymentStatusUpdate {
  status: 'pending' | 'success' | 'failure' | 'error';
  description: string;
  targetUrl?: string;
  context?: string;
  deploymentId?: string;
  environment?: string;
}

export interface GitHubDeploymentResult {
  deploymentId?: number;
  statusId?: number;
  commentId?: number;
  success: boolean;
  error?: string;
}

export class GitHubDeploymentStatusReporter {
  private config: GitHubDeploymentConfig;
  private baseUrl: string;

  constructor(config: GitHubDeploymentConfig) {
    this.config = config;
    this.baseUrl = 'https://api.github.com';
  }

  /**
   * Create a GitHub deployment
   */
  async createDeployment(options: {
    description?: string;
    autoMerge?: boolean;
    requiredContexts?: string[];
  } = {}): Promise<{ deploymentId: number } | { error: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/deployments`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: this.config.sha,
          environment: this.config.environment,
          description: options.description || `Deploy to ${this.config.environment}`,
          auto_merge: options.autoMerge || false,
          required_contexts: options.requiredContexts || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const deployment = await response.json();
      return { deploymentId: deployment.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { error: `Failed to create deployment: ${errorMessage}` };
    }
  }

  /**
   * Update deployment status
   */
  async updateDeploymentStatus(
    deploymentId: number,
    status: DeploymentStatusUpdate
  ): Promise<{ statusId: number } | { error: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/deployments/${deploymentId}/statuses`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            state: status.status,
            description: status.description,
            target_url: status.targetUrl,
            environment: status.environment || this.config.environment,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const deploymentStatus = await response.json();
      return { statusId: deploymentStatus.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { error: `Failed to update deployment status: ${errorMessage}` };
    }
  }

  /**
   * Create commit status
   */
  async createCommitStatus(status: DeploymentStatusUpdate): Promise<{ statusId: number } | { error: string }> {
    try {
      const context = status.context || `cloudflare-pages/${this.config.environment}`;
      
      const response = await fetch(
        `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/statuses/${this.config.sha}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            state: status.status,
            description: status.description,
            target_url: status.targetUrl,
            context: context,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const commitStatus = await response.json();
      return { statusId: commitStatus.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { error: `Failed to create commit status: ${errorMessage}` };
    }
  }

  /**
   * Add comment to pull request
   */
  async addPullRequestComment(
    message: string,
    updateExisting: boolean = true
  ): Promise<{ commentId: number } | { error: string }> {
    if (!this.config.pullRequestNumber) {
      return { error: 'Pull request number not provided' };
    }

    try {
      // If updateExisting is true, try to find and update existing comment
      if (updateExisting) {
        const existingComment = await this.findExistingDeploymentComment();
        if (existingComment) {
          return await this.updatePullRequestComment(existingComment.id, message);
        }
      }

      // Create new comment
      const response = await fetch(
        `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${this.config.pullRequestNumber}/comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: message,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const comment = await response.json();
      return { commentId: comment.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { error: `Failed to add PR comment: ${errorMessage}` };
    }
  }

  /**
   * Update existing pull request comment
   */
  private async updatePullRequestComment(
    commentId: number,
    message: string
  ): Promise<{ commentId: number } | { error: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/comments/${commentId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: message,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      return { commentId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { error: `Failed to update PR comment: ${errorMessage}` };
    }
  }

  /**
   * Find existing deployment comment in PR
   */
  private async findExistingDeploymentComment(): Promise<{ id: number } | null> {
    if (!this.config.pullRequestNumber) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${this.config.pullRequestNumber}/comments`,
        {
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const comments = await response.json();
      
      // Look for existing deployment comment (contains deployment status markers)
      const deploymentComment = comments.find((comment: any) => 
        comment.body && (
          comment.body.includes('🚀 Deployment Status') ||
          comment.body.includes('<!-- deployment-status-comment -->')
        )
      );

      return deploymentComment ? { id: deploymentComment.id } : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate deployment status message for PR comments
   */
  generateDeploymentMessage(options: {
    status: 'pending' | 'success' | 'failure' | 'error';
    environment: string;
    url?: string;
    previewUrl?: string;
    buildTime?: number;
    deployTime?: number;
    error?: string;
    sha?: string;
  }): string {
    const { status, environment, url, previewUrl, buildTime, deployTime, error, sha } = options;
    
    const statusEmoji = {
      pending: '⏳',
      success: '✅',
      failure: '❌',
      error: '🚨'
    }[status];

    const statusText = {
      pending: 'In Progress',
      success: 'Successful',
      failure: 'Failed',
      error: 'Error'
    }[status];

    let message = `<!-- deployment-status-comment -->\n`;
    message += `## 🚀 Deployment Status\n\n`;
    message += `${statusEmoji} **${statusText}** deployment to **${environment}**\n\n`;

    if (sha) {
      message += `**Commit:** \`${sha.substring(0, 7)}\`\n`;
    }

    if (status === 'success') {
      if (url) {
        message += `🌐 **Live URL:** ${url}\n`;
      }
      if (previewUrl && previewUrl !== url) {
        message += `🔗 **Preview URL:** ${previewUrl}\n`;
      }
      if (buildTime || deployTime) {
        message += `\n**Performance:**\n`;
        if (buildTime) {
          message += `- Build time: ${Math.round(buildTime / 1000)}s\n`;
        }
        if (deployTime) {
          message += `- Deploy time: ${Math.round(deployTime / 1000)}s\n`;
        }
      }
    } else if (status === 'failure' || status === 'error') {
      if (url) {
        message += `🌐 **Live URL:** ${url}\n`;
      }
      if (previewUrl && previewUrl !== url) {
        message += `🔗 **Preview URL:** ${previewUrl}\n`;
      }
      if (error) {
        message += `\n**Error Details:**\n\`\`\`\n${error}\n\`\`\`\n`;
      }
      message += `\n💡 Check the [workflow logs](https://github.com/${this.config.owner}/${this.config.repo}/actions) for more details.\n`;
    } else if (status === 'pending') {
      message += `\n⏱️ Deployment is currently in progress...\n`;
      if (url) {
        message += `🌐 **Live URL:** ${url}\n`;
      }
      if (previewUrl && previewUrl !== url) {
        message += `🔗 **Preview URL:** ${previewUrl}\n`;
      }
    }

    message += `\n---\n`;
    message += `*Updated at ${new Date().toISOString()}*`;

    return message;
  }

  /**
   * Complete deployment workflow - creates deployment, updates status, and adds PR comment
   */
  async reportDeploymentStatus(options: {
    status: 'pending' | 'success' | 'failure' | 'error';
    description: string;
    url?: string;
    previewUrl?: string;
    buildTime?: number;
    deployTime?: number;
    error?: string;
    createDeployment?: boolean;
  }): Promise<GitHubDeploymentResult> {
    const result: GitHubDeploymentResult = { success: false };

    try {
      let deploymentId: number | undefined;

      // Create deployment if requested
      if (options.createDeployment) {
        const deploymentResult = await this.createDeployment({
          description: options.description,
        });

        if ('error' in deploymentResult) {
          result.error = deploymentResult.error;
          return result;
        }

        deploymentId = deploymentResult.deploymentId;
        result.deploymentId = deploymentId;
      }

      // Update deployment status if we have a deployment ID
      if (deploymentId) {
        const statusResult = await this.updateDeploymentStatus(deploymentId, {
          status: options.status,
          description: options.description,
          targetUrl: options.url,
          environment: this.config.environment,
        });

        if ('error' in statusResult) {
          result.error = statusResult.error;
          return result;
        }

        result.statusId = statusResult.statusId;
      }

      // Create commit status
      const commitStatusResult = await this.createCommitStatus({
        status: options.status,
        description: options.description,
        targetUrl: options.url,
      });

      if ('error' in commitStatusResult) {
        // Don't fail the entire operation if commit status fails
        console.warn('Failed to create commit status:', commitStatusResult.error);
      }

      // Add PR comment if this is a pull request
      if (this.config.pullRequestNumber) {
        const message = this.generateDeploymentMessage({
          status: options.status,
          environment: this.config.environment,
          url: options.url,
          previewUrl: options.previewUrl,
          buildTime: options.buildTime,
          deployTime: options.deployTime,
          error: options.error,
          sha: this.config.sha,
        });

        const commentResult = await this.addPullRequestComment(message, true);

        if ('error' in commentResult) {
          // Don't fail the entire operation if PR comment fails
          console.warn('Failed to add PR comment:', commentResult.error);
        } else {
          result.commentId = commentResult.commentId;
        }
      }

      result.success = true;
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.error = `Deployment status reporting failed: ${errorMessage}`;
      return result;
    }
  }
}

/**
 * Utility function to create GitHub deployment status reporter from environment variables
 */
export function createGitHubReporterFromEnv(): GitHubDeploymentStatusReporter | null {
  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const fullRepo = process.env.GITHUB_REPOSITORY;
  const repo = fullRepo?.split('/')[1];
  const token = process.env.GITHUB_TOKEN;
  const sha = process.env.GITHUB_SHA;

  // Check if all required environment variables are present and valid
  if (!owner || !fullRepo || !repo || repo.trim() === '' || !token || !sha) {
    console.warn(`Missing required environment variable for GitHub reporting: ${!owner ? 'GITHUB_REPOSITORY_OWNER' : !fullRepo ? 'GITHUB_REPOSITORY' : (!repo || repo.trim() === '') ? 'repo' : !token ? 'GITHUB_TOKEN' : 'GITHUB_SHA'}`);
    return null;
  }

  const environment = (process.env.DEPLOYMENT_ENVIRONMENT || 'production') as 'production' | 'staging' | 'preview';
  const pullRequestNumber = process.env.GITHUB_EVENT_NAME === 'pull_request' 
    ? parseInt(process.env.GITHUB_EVENT_NUMBER || '0') || undefined
    : undefined;

  return new GitHubDeploymentStatusReporter({
    owner,
    repo,
    token,
    sha,
    environment,
    pullRequestNumber,
  });
}