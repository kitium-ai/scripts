import { log } from '../utils/index.js';

export interface CanaryMetrics {
  errorRate: number;
  latencyP95?: number;
  latencyP99?: number;
  requestCount?: number;
}

export interface CanaryThresholds {
  maxErrorRate?: number;
  maxLatencyP95?: number;
  maxLatencyP99?: number;
  maxErrorRateIncrease?: number;
  maxLatencyIncreasePct?: number;
  minRequests?: number;
}

export interface CanaryCheckOptions {
  canary: CanaryMetrics;
  baseline?: CanaryMetrics;
  thresholds?: CanaryThresholds;
}

export interface CanaryCheckResult {
  healthy: boolean;
  reasons: string[];
  canary: CanaryMetrics;
  baseline?: CanaryMetrics;
}

function percentChange(current: number, baseline: number): number {
  if (baseline === 0) { return current === 0 ? 0 : Infinity; }
  return ((current - baseline) / baseline) * 100;
}

function validateMetric(name: string, value: number | undefined, reasons: string[]): boolean {
  if (value === undefined || Number.isNaN(value)) {
    reasons.push(`${name} is missing or invalid`);
    return false;
  }
  if (value < 0) {
    reasons.push(`${name} cannot be negative`);
    return false;
  }
  return true;
}


function checkThresholds(
  canary: CanaryMetrics,
  thresholds: CanaryThresholds,
  reasons: string[]
): void {
  if (thresholds.minRequests && (canary.requestCount ?? 0) < thresholds.minRequests) {
    reasons.push(`Insufficient canary request volume: ${(canary.requestCount ?? 0).toLocaleString()} < ${thresholds.minRequests.toLocaleString()}`);
  }

  if (thresholds.maxErrorRate !== undefined && canary.errorRate > thresholds.maxErrorRate) {
    reasons.push(`Error rate ${canary.errorRate}% exceeds max ${thresholds.maxErrorRate}%`);
  }

  if (
    thresholds.maxLatencyP95 !== undefined &&
    canary.latencyP95 !== undefined &&
    canary.latencyP95 > thresholds.maxLatencyP95
  ) {
    reasons.push(`p95 latency ${canary.latencyP95}ms exceeds max ${thresholds.maxLatencyP95}ms`);
  }

  if (
    thresholds.maxLatencyP99 !== undefined &&
    canary.latencyP99 !== undefined &&
    canary.latencyP99 > thresholds.maxLatencyP99
  ) {
    reasons.push(`p99 latency ${canary.latencyP99}ms exceeds max ${thresholds.maxLatencyP99}ms`);
  }
}

function checkBaselineRegression(
  canary: CanaryMetrics,
  baseline: CanaryMetrics | undefined,
  thresholds: CanaryThresholds,
  reasons: string[]
): void {
  if (!baseline) { return; }

  if (
    thresholds.maxErrorRateIncrease !== undefined &&
    baseline.errorRate !== undefined
  ) {
    const delta = percentChange(canary.errorRate, baseline.errorRate);
    if (delta > thresholds.maxErrorRateIncrease) {
      reasons.push(`Error rate regression ${delta.toFixed(2)}% exceeds allowed ${thresholds.maxErrorRateIncrease}%`);
    }
  }

  if (thresholds.maxLatencyIncreasePct !== undefined) {
    const p95Delta =
      canary.latencyP95 !== undefined && baseline.latencyP95 !== undefined
        ? percentChange(canary.latencyP95, baseline.latencyP95)
        : 0;
    const p99Delta =
      canary.latencyP99 !== undefined && baseline.latencyP99 !== undefined
        ? percentChange(canary.latencyP99, baseline.latencyP99)
        : 0;

    if (p95Delta > thresholds.maxLatencyIncreasePct) {
      reasons.push(`p95 latency regression ${p95Delta.toFixed(2)}% exceeds allowed ${thresholds.maxLatencyIncreasePct}%`);
    }
    if (p99Delta > thresholds.maxLatencyIncreasePct) {
      reasons.push(`p99 latency regression ${p99Delta.toFixed(2)}% exceeds allowed ${thresholds.maxLatencyIncreasePct}%`);
    }
  }
}

export function evaluateCanary(options: CanaryCheckOptions): CanaryCheckResult {
  const { canary, baseline, thresholds = {} } = options;
  const reasons: string[] = [];

  const metricsValid = [
    validateMetric('canary.errorRate', canary.errorRate, reasons),
    validateMetric('canary.latencyP95', canary.latencyP95 ?? 0, []),
    validateMetric('canary.latencyP99', canary.latencyP99 ?? 0, []),
  ].every(Boolean);

  if (!metricsValid) {
    return { healthy: false, reasons, canary, baseline };
  }

  checkThresholds(canary, thresholds, reasons);
  checkBaselineRegression(canary, baseline, thresholds, reasons);

  const healthy = reasons.length === 0;

  if (healthy) {
    log('success', 'Canary metrics within thresholds');
  } else {
    log('warn', `Canary check failed with ${reasons.length} issue(s)`);
  }

  return { healthy, reasons, canary, baseline };
}
