// Latency Metrics Collector
// Tracks voice pipeline performance for optimization

export interface LatencyMetrics {
  callSid: string;
  timestamp: number;

  // STT metrics
  sttTTFT: number; // Time to first transcript
  sttFinal: number; // Time to final transcript

  // LLM metrics
  llmTTFT: number; // Time to first token
  llmComplete: number; // Time to completion

  // TTS metrics
  ttsTTFA: number; // Time to first audio
  ttsComplete: number; // Time to complete audio

  // End-to-end
  e2eLatency: number; // Total voice-to-voice latency
}

export interface MetricsSummary {
  count: number;
  avg: LatencyMetrics;
  p50: LatencyMetrics;
  p95: LatencyMetrics;
  p99: LatencyMetrics;
}

// Latency targets (in ms)
export const LATENCY_TARGETS = {
  sttTTFT: 100,
  sttFinal: 200,
  llmTTFT: 200,
  llmComplete: 400,
  ttsTTFA: 50,
  ttsComplete: 200,
  e2eLatency: 500,
};

class MetricsCollector {
  private metrics: LatencyMetrics[] = [];
  private maxSize = 10000; // Keep last 10k measurements

  record(metrics: LatencyMetrics): void {
    this.metrics.push(metrics);

    // Trim if over max size
    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize);
    }

    // Log warning if exceeding targets
    if (metrics.e2eLatency > LATENCY_TARGETS.e2eLatency) {
      console.warn(
        `[METRICS] High latency: ${metrics.e2eLatency}ms (target: ${LATENCY_TARGETS.e2eLatency}ms)`,
        {
          callSid: metrics.callSid,
          breakdown: {
            stt: metrics.sttFinal,
            llm: metrics.llmTTFT,
            tts: metrics.ttsTTFA,
          },
        },
      );
    }
  }

  // Get percentile value
  private getPercentile(
    sorted: LatencyMetrics[],
    percentile: number,
  ): LatencyMetrics {
    const idx = Math.floor(sorted.length * (percentile / 100));
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  // Calculate average metrics
  private getAverage(metrics: LatencyMetrics[]): LatencyMetrics {
    if (metrics.length === 0) {
      return this.emptyMetrics();
    }

    const sum = metrics.reduce(
      (acc, m) => ({
        callSid: "avg",
        timestamp: Date.now(),
        sttTTFT: acc.sttTTFT + m.sttTTFT,
        sttFinal: acc.sttFinal + m.sttFinal,
        llmTTFT: acc.llmTTFT + m.llmTTFT,
        llmComplete: acc.llmComplete + m.llmComplete,
        ttsTTFA: acc.ttsTTFA + m.ttsTTFA,
        ttsComplete: acc.ttsComplete + m.ttsComplete,
        e2eLatency: acc.e2eLatency + m.e2eLatency,
      }),
      this.emptyMetrics(),
    );

    const count = metrics.length;
    return {
      callSid: "avg",
      timestamp: Date.now(),
      sttTTFT: Math.round(sum.sttTTFT / count),
      sttFinal: Math.round(sum.sttFinal / count),
      llmTTFT: Math.round(sum.llmTTFT / count),
      llmComplete: Math.round(sum.llmComplete / count),
      ttsTTFA: Math.round(sum.ttsTTFA / count),
      ttsComplete: Math.round(sum.ttsComplete / count),
      e2eLatency: Math.round(sum.e2eLatency / count),
    };
  }

  private emptyMetrics(): LatencyMetrics {
    return {
      callSid: "",
      timestamp: Date.now(),
      sttTTFT: 0,
      sttFinal: 0,
      llmTTFT: 0,
      llmComplete: 0,
      ttsTTFA: 0,
      ttsComplete: 0,
      e2eLatency: 0,
    };
  }

  // Get summary statistics
  getSummary(): MetricsSummary {
    if (this.metrics.length === 0) {
      const empty = this.emptyMetrics();
      return {
        count: 0,
        avg: empty,
        p50: empty,
        p95: empty,
        p99: empty,
      };
    }

    const sorted = [...this.metrics].sort(
      (a, b) => a.e2eLatency - b.e2eLatency,
    );

    return {
      count: this.metrics.length,
      avg: this.getAverage(this.metrics),
      p50: this.getPercentile(sorted, 50),
      p95: this.getPercentile(sorted, 95),
      p99: this.getPercentile(sorted, 99),
    };
  }

  // Get metrics for a specific call
  getCallMetrics(callSid: string): LatencyMetrics[] {
    return this.metrics.filter((m) => m.callSid === callSid);
  }

  // Get recent metrics (last N minutes)
  getRecentMetrics(minutes: number = 5): LatencyMetrics[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.metrics.filter((m) => m.timestamp > cutoff);
  }

  // Check if meeting latency targets
  checkTargets(): {
    meeting: boolean;
    violations: { metric: string; value: number; target: number }[];
  } {
    const summary = this.getSummary();
    const violations: { metric: string; value: number; target: number }[] = [];

    if (summary.p95.e2eLatency > LATENCY_TARGETS.e2eLatency) {
      violations.push({
        metric: "e2eLatency (p95)",
        value: summary.p95.e2eLatency,
        target: LATENCY_TARGETS.e2eLatency,
      });
    }

    if (summary.p95.llmTTFT > LATENCY_TARGETS.llmTTFT) {
      violations.push({
        metric: "llmTTFT (p95)",
        value: summary.p95.llmTTFT,
        target: LATENCY_TARGETS.llmTTFT,
      });
    }

    if (summary.p95.ttsTTFA > LATENCY_TARGETS.ttsTTFA) {
      violations.push({
        metric: "ttsTTFA (p95)",
        value: summary.p95.ttsTTFA,
        target: LATENCY_TARGETS.ttsTTFA,
      });
    }

    return {
      meeting: violations.length === 0,
      violations,
    };
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
  }

  // Export metrics for analysis
  export(): LatencyMetrics[] {
    return [...this.metrics];
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

// Helper to create a timer for measuring latency
export function createLatencyTimer(): {
  start: () => void;
  mark: (label: string) => void;
  getMarks: () => Record<string, number>;
} {
  const startTime = performance.now();
  const marks: Record<string, number> = {};

  return {
    start: () => {
      marks["start"] = performance.now();
    },
    mark: (label: string) => {
      marks[label] = performance.now() - startTime;
    },
    getMarks: () => ({ ...marks }),
  };
}
