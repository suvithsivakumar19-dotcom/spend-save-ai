// @ts-nocheck
// Run with `bun add -d vitest && bunx vitest run` — see TESTS.md.
import { describe, it, expect } from "vitest";
import { generateSummary, runAudit } from "./audit-engine";
import type { AuditInput } from "./types";

const base = (overrides: Partial<AuditInput> = {}): AuditInput => ({
  teamSize: 5,
  subscriptions: [],
  ...overrides,
});

describe("audit-engine", () => {
  it("downgrades ChatGPT Team → Plus when seats <= 2", () => {
    const r = runAudit(
      base({
        subscriptions: [
          { id: "1", tool: "chatgpt", plan: "team", monthlySpend: 50, seats: 2, useCase: "mixed" },
        ],
      })
    );
    expect(r.recommendations.some((x) => /Team → ChatGPT Plus/.test(x.action))).toBe(true);
    expect(r.monthlySavings).toBeGreaterThan(0);
  });

  it("downgrades Cursor Business → Pro for small teams", () => {
    const r = runAudit(
      base({
        subscriptions: [
          { id: "1", tool: "cursor", plan: "business", monthlySpend: 400, seats: 10, useCase: "coding" },
        ],
      })
    );
    expect(r.recommendations.some((x) => /Cursor Business → Pro/.test(x.action))).toBe(true);
    expect(r.yearlySavings).toBe(r.monthlySavings * 12);
  });

  it("consolidates overlapping coding assistants", () => {
    const r = runAudit(
      base({
        subscriptions: [
          { id: "1", tool: "cursor", plan: "pro", monthlySpend: 200, seats: 10, useCase: "coding" },
          { id: "2", tool: "copilot", plan: "business", monthlySpend: 190, seats: 10, useCase: "coding" },
        ],
      })
    );
    expect(r.recommendations.some((x) => x.type === "consolidate")).toBe(true);
  });

  it("flags overages when spend exceeds list price * seats by >50%", () => {
    const r = runAudit(
      base({
        subscriptions: [
          { id: "1", tool: "chatgpt", plan: "plus", monthlySpend: 100, seats: 1, useCase: "mixed" },
        ],
      })
    );
    expect(r.recommendations.some((x) => x.type === "rightsize")).toBe(true);
  });

  it("returns a 'keep' acknowledgement when nothing is wrong", () => {
    const r = runAudit(
      base({
        subscriptions: [
          { id: "1", tool: "chatgpt", plan: "plus", monthlySpend: 20, seats: 1, useCase: "writing" },
        ],
      })
    );
    expect(r.monthlySavings).toBe(0);
    expect(r.recommendations[0].type).toBe("keep");
  });

  it("yearly savings == monthly savings * 12", () => {
    const r = runAudit(
      base({
        subscriptions: [
          { id: "1", tool: "chatgpt", plan: "enterprise", monthlySpend: 600, seats: 10, useCase: "mixed" },
        ],
      })
    );
    expect(Math.round(r.yearlySavings)).toBe(Math.round(r.monthlySavings * 12));
  });

  it("generates a readable summary for savings results", () => {
    const r = runAudit(
      base({
        subscriptions: [
          { id: "1", tool: "cursor", plan: "business", monthlySpend: 400, seats: 10, useCase: "coding" },
          { id: "2", tool: "chatgpt", plan: "team", monthlySpend: 50, seats: 2, useCase: "mixed" },
        ],
      })
    );
    const summary = generateSummary({
      input: r.input,
      recommendations: r.recommendations,
      monthlySavings: r.monthlySavings,
      yearlySavings: r.yearlySavings,
      totalCurrentMonthly: r.totalCurrentMonthly,
    });
    expect(summary).toContain("reclaim");
    expect(summary.length).toBeGreaterThan(80);
  });

  it("generates a fallback summary when there are no savings", () => {
    const r = runAudit(
      base({
        subscriptions: [
          { id: "1", tool: "chatgpt", plan: "plus", monthlySpend: 20, seats: 1, useCase: "writing" },
        ],
      })
    );
    const summary = generateSummary({
      input: r.input,
      recommendations: r.recommendations,
      monthlySavings: r.monthlySavings,
      yearlySavings: r.yearlySavings,
      totalCurrentMonthly: r.totalCurrentMonthly,
    });
    expect(summary).toContain("didn't find structural overspend");
  });
});
