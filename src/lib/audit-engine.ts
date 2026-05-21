import { TOOL_MAP, type ToolId } from "./pricing-data";
import type { AuditInput, AuditResult, Recommendation, ToolSubscription } from "./types";

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Deterministic, rule-based audit engine.
 * No AI calls. Easy to extend with new rules.
 */
export function runAudit(input: AuditInput): AuditResult {
  const recs: Recommendation[] = [];

  // ── Per-tool rules ──────────────────────────────────────────────
  for (const sub of input.subscriptions) {
    const info = TOOL_MAP[sub.tool];
    if (!info) continue;

    // Rule: ChatGPT Team with <=2 seats → downgrade to Plus
    if (sub.tool === "chatgpt" && sub.plan === "team" && sub.seats <= 2) {
      const proposed = 20 * sub.seats;
      recs.push(
        mkRec(sub, info.name, "downgrade", proposed, {
          action: "Downgrade ChatGPT Team → ChatGPT Plus",
          reasoning:
            "Team plan's collaboration features rarely pay back at ≤2 seats. Plus delivers the same model access at $20/seat vs $25/seat — a quiet 20% leak.",
          severity: "medium",
        })
      );
    }

    // Rule: ChatGPT Enterprise with small team → drop to Team
    if (sub.tool === "chatgpt" && sub.plan === "enterprise" && sub.seats < 20) {
      const proposed = 25 * sub.seats;
      recs.push(
        mkRec(sub, info.name, "downgrade", proposed, {
          action: "Downgrade ChatGPT Enterprise → Team",
          reasoning:
            "Enterprise is priced for 20+ seats with SSO/SCIM. Below that, Team gives you the same models plus admin controls at ~40% the cost.",
          severity: "high",
        })
      );
    }

    // Rule: Cursor Business with small eng team → Pro
    if (sub.tool === "cursor" && sub.plan === "business" && sub.seats <= 10) {
      const proposed = 20 * sub.seats;
      recs.push(
        mkRec(sub, info.name, "downgrade", proposed, {
          action: "Downgrade Cursor Business → Pro",
          reasoning:
            "Business adds SSO/audit logs and privacy mode — useful at scale, overkill under ~10 seats. Pro ships the same model access for half the price.",
          severity: "high",
        })
      );
    }

    // Rule: Copilot Enterprise tiny org → Business
    if (sub.tool === "copilot" && sub.plan === "enterprise" && sub.seats < 25) {
      const proposed = 19 * sub.seats;
      recs.push(
        mkRec(sub, info.name, "downgrade", proposed, {
          action: "Downgrade Copilot Enterprise → Business",
          reasoning:
            "Enterprise's value (knowledge bases, custom models) needs scale to amortize. Under 25 seats, Business covers the same day-to-day workflow.",
          severity: "medium",
        })
      );
    }

    // Rule: Copilot Business for solo / 1-seat
    if (sub.tool === "copilot" && sub.plan === "business" && sub.seats === 1) {
      const proposed = 10;
      recs.push(
        mkRec(sub, info.name, "downgrade", proposed, {
          action: "Downgrade Copilot Business → Individual",
          reasoning:
            "Business pricing exists for org policy controls. A single seat doesn't benefit — Individual is half the price with identical completion quality.",
          severity: "medium",
        })
      );
    }

    // Rule: Claude Team with <=2 seats → Pro
    if (sub.tool === "claude" && sub.plan === "team" && sub.seats <= 2) {
      const proposed = 20 * sub.seats;
      recs.push(
        mkRec(sub, info.name, "downgrade", proposed, {
          action: "Downgrade Claude Team → Pro",
          reasoning:
            "Team's shared projects only matter with real collaborators. At ≤2 seats, Pro gives you the same Claude 3.5 Sonnet access for $10/seat less.",
          severity: "medium",
        })
      );
    }

    // Rule: spend higher than plan list price × seats → likely overage / wrong plan reported
    const plan = info.plans.find((p) => p.id === sub.plan);
    if (plan && plan.pricePerSeat > 0) {
      const expected = plan.pricePerSeat * sub.seats;
      if (sub.monthlySpend > expected * 1.5 && info.category !== "api") {
        recs.push(
          mkRec(sub, info.name, "rightsize", expected, {
            action: `Investigate ${info.name} overages`,
            reasoning: `You're paying $${round(sub.monthlySpend)}/mo on a plan that lists at $${round(
              expected
            )}/mo for ${sub.seats} seat(s). That delta is usually unused seats, legacy add-ons, or auto-renewed upgrades.`,
            severity: "high",
          })
        );
      }
    }
  }

  // ── Cross-tool consolidation rules ──────────────────────────────
  const codingTools = input.subscriptions.filter(
    (s) => TOOL_MAP[s.tool]?.category === "coding" && s.monthlySpend > 0
  );
  if (codingTools.length >= 2) {
    const sorted = [...codingTools].sort(
      (a, b) => b.seats * b.monthlySpend - a.seats * a.monthlySpend
    );
    const keep = sorted[0];
    const drop = sorted.slice(1);
    const dropSpend = drop.reduce((s, x) => s + x.monthlySpend, 0);
    if (dropSpend > 0) {
      recs.push({
        id: rid(),
        toolId: keep.tool,
        toolName: drop.map((d) => TOOL_MAP[d.tool].name).join(" + "),
        severity: "high",
        type: "consolidate",
        currentSpend: dropSpend,
        suggestedSpend: 0,
        monthlySavings: round(dropSpend),
        yearlySavings: round(dropSpend * 12),
        action: `Consolidate onto ${TOOL_MAP[keep.tool].name}`,
        reasoning: `You're paying for ${
          codingTools.length
        } overlapping coding assistants. Devs rarely use two in parallel — pick ${
          TOOL_MAP[keep.tool].name
        } (your highest usage) and sunset ${drop.map((d) => TOOL_MAP[d.tool].name).join(", ")}.`,
      });
    }
  }

  const chatTools = input.subscriptions.filter(
    (s) => TOOL_MAP[s.tool]?.category === "chat" && s.monthlySpend > 0
  );
  if (chatTools.length >= 3) {
    const sorted = [...chatTools].sort((a, b) => b.monthlySpend - a.monthlySpend);
    const drop = sorted.slice(2);
    const dropSpend = drop.reduce((s, x) => s + x.monthlySpend, 0);
    if (dropSpend > 0) {
      recs.push({
        id: rid(),
        toolId: drop[0].tool,
        toolName: drop.map((d) => TOOL_MAP[d.tool].name).join(" + "),
        severity: "medium",
        type: "consolidate",
        currentSpend: dropSpend,
        suggestedSpend: 0,
        monthlySavings: round(dropSpend),
        yearlySavings: round(dropSpend * 12),
        action: "Trim redundant chat assistants",
        reasoning:
          "Three+ general-purpose chat tools is almost always duplicate spend. Keep your two strongest (frontier model + fallback) and cancel the rest.",
      });
    }
  }

  const apiSubs = input.subscriptions.filter((s) => TOOL_MAP[s.tool]?.category === "api");
  const apiSpend = apiSubs.reduce((s, x) => s + x.monthlySpend, 0);
  if (apiSubs.length >= 2 && apiSpend < 150) {
    const smaller = [...apiSubs].sort((a, b) => a.monthlySpend - b.monthlySpend)[0];
    recs.push({
      id: rid(),
      toolId: smaller.tool,
      toolName: TOOL_MAP[smaller.tool].name,
      severity: "low",
      type: "consolidate",
      currentSpend: smaller.monthlySpend,
      suggestedSpend: 0,
      monthlySavings: round(smaller.monthlySpend),
      yearlySavings: round(smaller.monthlySpend * 12),
      action: "Route low-volume API traffic through one provider",
      reasoning:
        "Below ~$150/mo combined, multi-provider API spend usually costs more in engineering overhead (keys, billing, abstractions) than it saves. Pick one until volume justifies the split.",
    });
  }

  if (recs.length === 0 && input.subscriptions.length > 0) {
    recs.push({
      id: rid(),
      toolId: input.subscriptions[0].tool,
      toolName: "Your stack",
      severity: "low",
      type: "keep",
      currentSpend: input.subscriptions.reduce((s, x) => s + x.monthlySpend, 0),
      suggestedSpend: input.subscriptions.reduce((s, x) => s + x.monthlySpend, 0),
      monthlySavings: 0,
      yearlySavings: 0,
      action: "Stack looks lean",
      reasoning:
        "We didn't find obvious overspend given your team size and usage mix. Re-run this audit any time you add a tool or change plans.",
    });
  }

  const totalCurrentMonthly = round(
    input.subscriptions.reduce((s, x) => s + x.monthlySpend, 0)
  );
  const monthlySavings = round(recs.reduce((s, r) => s + r.monthlySavings, 0));
  const totalProposedMonthly = round(Math.max(0, totalCurrentMonthly - monthlySavings));
  const yearlySavings = round(monthlySavings * 12);

  return {
    id: rid() + rid(),
    createdAt: new Date().toISOString(),
    input,
    recommendations: recs,
    totalCurrentMonthly,
    totalProposedMonthly,
    monthlySavings,
    yearlySavings,
    summary: generateSummary({
      input,
      recommendations: recs,
      monthlySavings,
      yearlySavings,
      totalCurrentMonthly,
    }),
  };
}

function mkRec(
  sub: ToolSubscription,
  toolName: string,
  type: Recommendation["type"],
  suggestedMonthly: number,
  opts: { action: string; reasoning: string; severity: Recommendation["severity"] }
): Recommendation {
  const monthlySavings = round(Math.max(0, sub.monthlySpend - suggestedMonthly));
  return {
    id: rid(),
    toolId: sub.tool,
    toolName,
    severity: opts.severity,
    type,
    currentSpend: round(sub.monthlySpend),
    suggestedSpend: round(suggestedMonthly),
    monthlySavings,
    yearlySavings: round(monthlySavings * 12),
    action: opts.action,
    reasoning: opts.reasoning,
  };
}

export function generateSummary(args: {
  input: AuditInput;
  recommendations: Recommendation[];
  monthlySavings: number;
  yearlySavings: number;
  totalCurrentMonthly: number;
}): string {
  const { input, recommendations, monthlySavings, yearlySavings, totalCurrentMonthly } = args;
  const toolCount = input.subscriptions.length;
  const pct =
    totalCurrentMonthly > 0 ? Math.round((monthlySavings / totalCurrentMonthly) * 100) : 0;

  if (monthlySavings === 0) {
    return `Your team of ${input.teamSize} is running ${toolCount} AI tool${
      toolCount === 1 ? "" : "s"
    } at $${totalCurrentMonthly.toLocaleString()}/mo. We didn't find structural overspend — your plan mix appears aligned with seat counts and use cases. Keep monitoring as your headcount or tool mix changes, and re-audit after any material plan updates.`;
  }

  const top = [...recommendations]
    .sort((a, b) => b.monthlySavings - a.monthlySavings)
    .slice(0, 2);
  const biggest = top[0];

  const lines = [
    `This audit identifies a strong AI spend optimization opportunity: $${monthlySavings.toLocaleString()}/mo, or about ${pct}% of your current $${totalCurrentMonthly.toLocaleString()}/mo run rate, which equates to roughly $${yearlySavings.toLocaleString()}/year.`,
    biggest
      ? `The highest-impact change is in ${biggest.toolName}, where a smarter plan or consolidation can unlock most of the savings.`
      : "",
    top[1]
      ? `A secondary improvement area is ${top[1].toolName}, which helps reduce overlap and improve overall efficiency.`
      : "",
    `Start with the largest opportunity first, then validate the next area before adjusting the rest of your stack.`,
  ];
  return lines.filter(Boolean).join(" ");
}
