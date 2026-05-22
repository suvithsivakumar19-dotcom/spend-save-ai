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
      }),
    );
    expect(r.recommendations.some((x) => /Team → ChatGPT Plus/.test(x.action))).toBe(true);
    expect(r.monthlySavings).toBeGreaterThan(0);
  });

  it("downgrades Cursor Business → Pro for small teams", () => {
    const r = runAudit(
      base({
        subscriptions: [
          {
            id: "1",
            tool: "cursor",
            plan: "business",
            monthlySpend: 400,
            seats: 10,
            useCase: "coding",
          },
        ],
      }),
    );
    expect(r.recommendations.some((x) => /Cursor Business → Pro/.test(x.action))).toBe(true);
    expect(r.yearlySavings).toBe(r.monthlySavings * 12);
  });

  it("consolidates overlapping coding assistants", () => {
    const r = runAudit(
      base({
        subscriptions: [
          { id: "1", tool: "cursor", plan: "pro", monthlySpend: 200, seats: 10, useCase: "coding" },
          {
            id: "2",
            tool: "copilot",
            plan: "business",
            monthlySpend: 190,
            seats: 10,
            useCase: "coding",
          },
        ],
      }),
    );
    expect(r.recommendations.some((x) => x.type === "consolidate")).toBe(true);
  });

  it("flags overages when spend exceeds list price * seats by >50%", () => {
    const r = runAudit(
      base({
        subscriptions: [
          { id: "1", tool: "chatgpt", plan: "plus", monthlySpend: 100, seats: 1, useCase: "mixed" },
        ],
      }),
    );
    expect(r.recommendations.some((x) => x.type === "rightsize")).toBe(true);
  });

  it("returns a 'keep' acknowledgement when nothing is wrong", () => {
    const r = runAudit(
      base({
        subscriptions: [
          {
            id: "1",
            tool: "chatgpt",
            plan: "plus",
            monthlySpend: 20,
            seats: 1,
            useCase: "writing",
          },
        ],
      }),
    );
    expect(r.monthlySavings).toBe(0);
    expect(r.recommendations[0].type).toBe("keep");
  });

  it("yearly savings == monthly savings * 12", () => {
    const r = runAudit(
      base({
        subscriptions: [
          {
            id: "1",
            tool: "chatgpt",
            plan: "enterprise",
            monthlySpend: 600,
            seats: 10,
            useCase: "mixed",
          },
        ],
      }),
    );
    expect(Math.round(r.yearlySavings)).toBe(Math.round(r.monthlySavings * 12));
  });

  it("generates a readable summary for savings results", () => {
    const r = runAudit(
      base({
        subscriptions: [
          {
            id: "1",
            tool: "cursor",
            plan: "business",
            monthlySpend: 400,
            seats: 10,
            useCase: "coding",
          },
          { id: "2", tool: "chatgpt", plan: "team", monthlySpend: 50, seats: 2, useCase: "mixed" },
        ],
      }),
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
          {
            id: "1",
            tool: "chatgpt",
            plan: "plus",
            monthlySpend: 20,
            seats: 1,
            useCase: "writing",
          },
        ],
      }),
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

  it("rightsizes seat counts exceeding team size", () => {
    const r = runAudit(
      base({
        teamSize: 5,
        subscriptions: [
          { id: "1", tool: "cursor", plan: "pro", monthlySpend: 200, seats: 10, useCase: "coding" },
        ],
      }),
    );
    // Since teamSize is 5 and seats is 10, it should rightsize to 5 seats
    expect(
      r.recommendations.some(
        (x) => x.type === "rightsize" && x.action.includes("seats to match team size"),
      ),
    ).toBe(true);
    // Since Cursor Pro is $20/seat, reducing by 5 seats should save 5 * $20 = $100/mo
    const rightsizeRec = r.recommendations.find((x) => x.type === "rightsize");
    expect(rightsizeRec?.monthlySavings).toBe(100);
    // And subsequently it checks for Windsurf switch on the remaining 5 seats:
    // Windsurf Pro is $15/seat. Suggested spend would be 5 * 15 = 75. Monthly savings = 100 - 75 = 25.
    const switchRec = r.recommendations.find((x) => x.type === "switch");
    expect(switchRec).toBeDefined();
    expect(switchRec?.monthlySavings).toBe(25);
  });

  it("recommends switching Cursor Pro to Windsurf Pro for coding use cases", () => {
    const r = runAudit(
      base({
        teamSize: 5,
        subscriptions: [
          { id: "1", tool: "cursor", plan: "pro", monthlySpend: 100, seats: 5, useCase: "coding" },
        ],
      }),
    );
    expect(
      r.recommendations.some(
        (x) => x.type === "switch" && x.action.includes("Cursor Pro → Windsurf Pro"),
      ),
    ).toBe(true);
  });

  it("recommends switching ChatGPT Team to Gemini Business for mixed/research/writing use cases with >2 seats", () => {
    const r = runAudit(
      base({
        teamSize: 5,
        subscriptions: [
          { id: "1", tool: "chatgpt", plan: "team", monthlySpend: 75, seats: 3, useCase: "mixed" },
        ],
      }),
    );
    expect(
      r.recommendations.some(
        (x) => x.type === "switch" && x.action.includes("ChatGPT Team → Gemini Business"),
      ),
    ).toBe(true);
  });
});
