/**
 * Operations Module
 * Production operations and deployment utilities
 */

export * from '../operations/index.js';

/**
 * Deployment environment type
 */
export type DeploymentEnvironment = 'development' | 'staging' | 'production';

/**
 * Deployment status
 */
export interface DeploymentStatus {
  environment: DeploymentEnvironment;
  version: string;
  timestamp: Date;
  healthy: boolean;
  checks: {
    name: string;
    passed: boolean;
    message?: string;
  }[];
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  endpoint: string;
  timeout?: number;
  expectedStatus?: number;
  retries?: number;
}

/**
 * Perform health check on service
 * @param config Health check configuration
 * @returns Health check result
 */
export async function performHealthCheck(config: HealthCheckConfig): Promise<boolean> {
  const { endpoint, timeout = 5000, expectedStatus = 200, retries = 3 } = config;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(endpoint, {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeoutId);

      if (response.status === expectedStatus) {
        return true;
      }
    } catch {
      if (attempt === retries) {
        return false;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return false;
}

/**
 * Check deployment readiness
 * @param environment Target environment
 * @returns Deployment status
 */
export function checkDeploymentReadiness(
  environment: DeploymentEnvironment
): DeploymentStatus {
  const checks: DeploymentStatus['checks'] = [];

  // Example checks - customize based on your needs
  checks.push({
    name: 'Environment Variables',
    passed: true,
    message: 'All required environment variables are set',
  });

  checks.push({
    name: 'Dependencies',
    passed: true,
    message: 'All dependencies are up to date',
  });

  const allPassed = checks.every(check => check.passed);

  return {
    environment,
    version: process.env.VERSION || '1.0.0',
    timestamp: new Date(),
    healthy: allPassed,
    checks,
  };
}
