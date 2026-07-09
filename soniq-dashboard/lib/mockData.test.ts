import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatPercentage,
  formatTimestamp,
  formatDuration,
  generateSystemMetrics,
  generateBusinessMetrics,
  generateCallMetrics,
  generateDashboardMetrics,
} from "./mockData";

describe("formatCurrency", () => {
  it("formats whole USD amounts with a grouped thousands separator and no decimals", () => {
    expect(formatCurrency(1234)).toBe("$1,234");
    expect(formatCurrency(1000000)).toBe("$1,000,000");
    expect(formatCurrency(0)).toBe("$0");
  });

  it("rounds fractional amounts to whole currency units", () => {
    expect(formatCurrency(1234.56)).toBe("$1,235");
    expect(formatCurrency(0.4)).toBe("$0");
    expect(formatCurrency(0.5)).toBe("$1");
  });

  it("renders negative amounts with a leading minus", () => {
    expect(formatCurrency(-1200)).toBe("-$1,200");
  });

  it("honors a non-default currency", () => {
    expect(formatCurrency(1234, "EUR")).toBe("€1,234");
    expect(formatCurrency(1234, "GBP")).toBe("£1,234");
  });
});

describe("formatPercentage", () => {
  it("defaults to one decimal place and appends a percent sign", () => {
    expect(formatPercentage(72.5)).toBe("72.5%");
    expect(formatPercentage(100)).toBe("100.0%");
    expect(formatPercentage(0)).toBe("0.0%");
  });

  it("respects a custom decimal precision", () => {
    expect(formatPercentage(50, 0)).toBe("50%");
    expect(formatPercentage(33.333, 2)).toBe("33.33%");
  });

  it("rounds according to the requested precision", () => {
    expect(formatPercentage(66.666, 1)).toBe("66.7%");
  });
});

describe("formatDuration", () => {
  it("formats seconds as m:ss with a zero-padded seconds field", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(125)).toBe("2:05");
  });

  it("allows minutes to grow past sixty", () => {
    expect(formatDuration(3661)).toBe("61:01");
  });
});

describe("formatTimestamp", () => {
  it("renders a 24-hour zero-padded HH:MM:SS clock in local time", () => {
    // Built from local components so the assertion holds in any timezone.
    const local = new Date(2024, 0, 15, 9, 5, 3);
    expect(formatTimestamp(local.toISOString())).toBe("09:05:03");
  });

  it("uses 24-hour time rather than a 12-hour AM/PM clock", () => {
    const local = new Date(2024, 0, 15, 22, 30, 0);
    const formatted = formatTimestamp(local.toISOString());
    expect(formatted).toBe("22:30:00");
    expect(formatted).not.toMatch(/[AP]M/i);
  });

  it("always produces the two-digit-per-field shape", () => {
    const local = new Date(2024, 5, 1, 1, 2, 9);
    expect(formatTimestamp(local.toISOString())).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});

describe("generateSystemMetrics", () => {
  it("returns online status with metrics inside their documented bounds", () => {
    for (let i = 0; i < 50; i++) {
      const m = generateSystemMetrics();
      expect(m.status).toBe("online");
      expect(m.latency).toBeGreaterThanOrEqual(18);
      expect(m.latency).toBeLessThanOrEqual(30);
      expect(m.uptime).toBeGreaterThanOrEqual(99.9);
      expect(m.uptime).toBeLessThan(100);
      expect(m.cpuUsage).toBeGreaterThanOrEqual(15);
      expect(m.cpuUsage).toBeLessThanOrEqual(40);
      expect(m.memoryUsage).toBeGreaterThanOrEqual(45);
      expect(m.memoryUsage).toBeLessThanOrEqual(65);
    }
  });
});

describe("generateBusinessMetrics", () => {
  it("keeps derived revenue and transaction figures internally consistent", () => {
    for (let i = 0; i < 50; i++) {
      const m = generateBusinessMetrics();
      expect(m.transactionsToday).toBeGreaterThanOrEqual(12);
      expect(m.transactionsToday).toBeLessThanOrEqual(36);
      expect(m.transactionsWeek).toBe(m.transactionsToday * 7);
      // revenueWeek/Month are derived from the unrounded daily revenue, so they
      // track ~6.5x / ~28x the reported (rounded) daily figure within rounding.
      expect(Math.abs(m.revenueWeek - m.revenueToday * 6.5)).toBeLessThanOrEqual(
        7,
      );
      expect(Math.abs(m.revenueMonth - m.revenueToday * 28)).toBeLessThanOrEqual(
        30,
      );
      expect(m.conversionRate).toBeGreaterThanOrEqual(72);
      expect(m.conversionRate).toBeLessThanOrEqual(87);
    }
  });
});

describe("generateCallMetrics", () => {
  it("keeps totals and quality scores within realistic ranges", () => {
    for (let i = 0; i < 50; i++) {
      const m = generateCallMetrics();
      expect(m.totalToday).toBeGreaterThanOrEqual(45);
      expect(m.totalToday).toBeLessThanOrEqual(75);
      expect(m.totalWeek).toBe(m.totalToday * 7);
      expect(m.satisfactionScore).toBeGreaterThanOrEqual(4.2);
      expect(m.satisfactionScore).toBeLessThanOrEqual(4.8);
      expect(m.abandonRate).toBeGreaterThanOrEqual(0);
      expect(m.abandonRate).toBeLessThan(3);
    }
  });
});

describe("generateDashboardMetrics", () => {
  it("composes the system, business and call metric groups", () => {
    const m = generateDashboardMetrics();
    expect(m.system.status).toBe("online");
    expect(typeof m.business.revenueToday).toBe("number");
    expect(typeof m.calls.totalToday).toBe("number");
  });
});
