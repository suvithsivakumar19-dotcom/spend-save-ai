import { TOOL_MAP, type ToolId } from "./pricing-data";
import type { AuditInput, AuditResult, Recommendation, ToolSubscription } from "./types";

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function getPricingUrl(tool: string): string {
  const pricingUrls: Record<string, string> = {
    cursor: "https://cursor.com/pricing",
    copilot: "https://github.com/features/copilot/plans",
    claude: "https://claude.ai/pricing",
    chatgpt: "https://openai.com/chatgpt/pricing/",
    gemini: "https://gemini.google/advanced/",
    windsurf: "https://windsurf.com/pricing",
    anthropic_api: "https://www.anthropic.com/pricing",
    openai_api: "https://openai.com/api/pricing/",
  };
  return pricingUrls[tool] || "https://openai.com/chatgpt/pricing/";
}

/**
 * Deterministic, rule-based audit engine.
 * Upgraded with premium, realistic financial reasoning.
 */
export function runAudit(input: AuditInput): AuditResult {
  const recs: Recommendation[] = [];

  // Deep copy subscriptions to allow rightsizing seat count first without double-counting savings
  const subscriptions = input.subscriptions.map((s) => ({ ...s }));

  // ── 1. Rightsize Seat Counts Exceeding Team Size ─────────────────
  for (const sub of subscriptions) {
    const info = TOOL_MAP[sub.tool];
    if (!info) continue;

    if (info.category !== "api" && sub.seats > input.teamSize) {
      const plan = info.plans.find((p) => p.id === sub.plan);
      const listPrice = plan ? plan.pricePerSeat : 0;
      const currentPricePerSeat = sub.seats > 0 ? sub.monthlySpend / sub.seats : 0;
      const pricePerSeat = listPrice > 0 ? listPrice : currentPricePerSeat;

      if (pricePerSeat > 0) {
        const excessSeats = sub.seats - input.teamSize;
        const proposedSeats = input.teamSize;
        const proposedSpend = pricePerSeat * proposedSeats;
        const monthlySavings = round(pricePerSeat * excessSeats);

        recs.push({
          id: rid(),
          toolId: sub.tool,
          toolName: info.name,
          severity: "high",
          type: "rightsize",
          currentSpend: round(sub.monthlySpend),
          suggestedSpend: round(proposedSpend),
          monthlySavings,
          yearlySavings: round(monthlySavings * 12),
          action: `Optimize ${info.name} seats to match team size`,
          reasoning: `You are paying for ${sub.seats} seat(s) of ${info.name}, but your reported total headcount is only ${input.teamSize}. Centralizing licenses by cutting ${excessSeats} excess seat(s) to match your team size reclaims $${round(pricePerSeat)}/seat monthly, yielding instant savings of $${monthlySavings}/mo ($${round(monthlySavings * 12)}/yr) without impacting operations.`,
          currentPlan: `${info.name} ${plan?.name || sub.plan} (${sub.seats} seats)`,
          suggestedPlan: `${info.name} ${plan?.name || sub.plan} (${proposedSeats} seats)`,
          pricingUrl: getPricingUrl(sub.tool),
        });

        // Adjust subscription in local memory for subsequent tier check rules
        sub.seats = proposedSeats;
        sub.monthlySpend = proposedSpend;
      }
    }
  }

  // ── 2. Per-tool specific plan tier optimizations ──────────────────
  for (const sub of subscriptions) {
    const info = TOOL_MAP[sub.tool];
    if (!info) continue;

    // Rule: ChatGPT Team with <=2 seats → downgrade to Plus
    if (sub.tool === "chatgpt" && sub.plan === "team" && sub.seats <= 2) {
      const proposed = 20 * sub.seats;
      const currentPricePerSeat = 25;
      const proposedPricePerSeat = 20;
      const savingsPerSeat = currentPricePerSeat - proposedPricePerSeat;
      const totalSavings = savingsPerSeat * sub.seats;

      recs.push(
        mkRec(sub, info.name, "downgrade", proposed, {
          action: "Downgrade ChatGPT Team → ChatGPT Plus",
          reasoning: `The ChatGPT Team plan ($25/seat) carries a 2-seat minimum and is designed for shared workspaces. At only ${sub.seats} active user(s), team collaboration features are under-utilized. Downgrading to ChatGPT Plus ($20/seat) preserves identical model capabilities (GPT-4o, advanced tools) while returning $${savingsPerSeat}/seat monthly—saving a total of $${round(totalSavings)}/mo.`,
          severity: "medium",
          suggestedPlanId: "plus",
        }),
      );
      continue;
    }

    // Rule: ChatGPT Enterprise with small team (< 20 seats) → drop to Team
    if (sub.tool === "chatgpt" && sub.plan === "enterprise" && sub.seats < 20) {
      const proposed = 25 * sub.seats;
      const currentPricePerSeat = 60;
      const proposedPricePerSeat = 25;
      const savingsPerSeat = currentPricePerSeat - proposedPricePerSeat;
      const totalSavings = savingsPerSeat * sub.seats;

      recs.push(
        mkRec(sub, info.name, "downgrade", proposed, {
          action: "Downgrade ChatGPT Enterprise → Team",
          reasoning: `ChatGPT Enterprise is custom-priced (typically ~$60/seat) and architected for 20+ seat organizations needing advanced SSO, SAML, and administrative panels. With a team size of ${sub.seats}, downgrading to the ChatGPT Team plan ($25/seat) gives you the same premium model access and high message caps while reclaiming $${savingsPerSeat}/seat monthly—slashing your monthly run-rate by $${round(totalSavings)}/mo.`,
          severity: "high",
          suggestedPlanId: "team",
        }),
      );
      continue;
    }

    // Rule: Claude Team with <=2 seats → Pro
    if (sub.tool === "claude" && sub.plan === "team" && sub.seats <= 2) {
      const proposed = 20 * sub.seats;
      const currentPricePerSeat = 30;
      const proposedPricePerSeat = 20;
      const savingsPerSeat = currentPricePerSeat - proposedPricePerSeat;
      const totalSavings = savingsPerSeat * sub.seats;

      recs.push(
        mkRec(sub, info.name, "downgrade", proposed, {
          action: "Downgrade Claude Team → Pro",
          reasoning: `Claude Team tier ($30/seat) requires a 5-seat minimum on some contracts and is designed for shared workspaces. At only ${sub.seats} active user(s), team features are not fully utilized. Downgrading to Claude Pro ($20/seat) maintains full access to Claude 3.5 Sonnet while saving you $${savingsPerSeat}/seat monthly—adding $${round(totalSavings)}/mo directly to your bottom line.`,
          severity: "medium",
          suggestedPlanId: "pro",
        }),
      );
      continue;
    }

    // Rule: Cursor Business with <= 10 seats → Pro
    if (sub.tool === "cursor" && sub.plan === "business" && sub.seats <= 10) {
      const proposed = 20 * sub.seats;
      const currentPricePerSeat = 40;
      const proposedPricePerSeat = 20;
      const savingsPerSeat = currentPricePerSeat - proposedPricePerSeat;
      const totalSavings = savingsPerSeat * sub.seats;

      recs.push(
        mkRec(sub, info.name, "downgrade", proposed, {
          action: "Downgrade Cursor Business → Pro",
          reasoning: `Cursor Business is priced at $40/seat and includes SSO/SAML integration and audit logs. For a team of ${sub.seats} engineer(s), these security features are rarely required. The Pro plan ($20/seat) delivers the identical advanced AI autocomplete, inline edits, and frontier model access at exactly half the price, immediately recovering $${round(totalSavings)}/mo in cash.`,
          severity: "high",
          suggestedPlanId: "pro",
        }),
      );
      continue;
    }

    // Rule: Copilot Enterprise tiny org (< 25 seats) → Business
    if (sub.tool === "copilot" && sub.plan === "enterprise" && sub.seats < 25) {
      const proposed = 19 * sub.seats;
      const currentPricePerSeat = 39;
      const proposedPricePerSeat = 19;
      const savingsPerSeat = currentPricePerSeat - proposedPricePerSeat;
      const totalSavings = savingsPerSeat * sub.seats;

      recs.push(
        mkRec(sub, info.name, "downgrade", proposed, {
          action: "Downgrade Copilot Enterprise → Business",
          reasoning: `GitHub Copilot Enterprise ($39/seat) adds custom fine-tuned models and repo indexers. Under 25 seats, the administrative complexity rarely pays off. Downgrading to Copilot Business ($19/seat) retains full inline autocomplete and IDE chat integration while saving $${savingsPerSeat}/seat monthly—pocketing a clean $${round(totalSavings)}/mo.`,
          severity: "medium",
          suggestedPlanId: "business",
        }),
      );
      continue;
    }

    // Rule: Copilot Business for solo / 1-seat → Individual
    if (sub.tool === "copilot" && sub.plan === "business" && sub.seats === 1) {
      const proposed = 10;
      const savingsPerSeat = 19 - 10;

      recs.push(
        mkRec(sub, info.name, "downgrade", proposed, {
          action: "Downgrade Copilot Business → Individual",
          reasoning: `Copilot Business ($19/seat) exists to provide organization-level policy enforcement and centralized billing. As a single-seat user, you receive no collaborative benefit from these corporate features. Downgrading to Copilot Individual ($10/seat) gives you identical AI model completions at a 47% lower cost, saving $${savingsPerSeat}/mo.`,
          severity: "medium",
          suggestedPlanId: "individual",
        }),
      );
      continue;
    }

    // Rule: Switch Cursor Pro to Windsurf Pro (Cheaper Alternatives)
    if (sub.tool === "cursor" && sub.plan === "pro" && sub.useCase === "coding") {
      const proposed = 15 * sub.seats;
      const savingsPerSeat = 20 - 15;
      const totalSavings = savingsPerSeat * sub.seats;

      recs.push(
        mkRec(sub, info.name, "switch", proposed, {
          action: "Switch Cursor Pro → Windsurf Pro",
          reasoning: `Your team uses Cursor Pro ($20/seat) primarily for coding. Windsurf Pro offers an equivalent, state-of-the-art agentic IDE environment (powered by Cascade) for just $15/seat. Switching your ${sub.seats} developer(s) saves $${savingsPerSeat}/seat monthly ($${round(totalSavings)}/mo total) while delivering identical or superior agent coding assistance.`,
          severity: "low",
          suggestedPlanId: "pro",
        }),
      );
      continue;
    }

    // Rule: Switch ChatGPT Team to Gemini Business (Cheaper Alternatives)
    if (
      sub.tool === "chatgpt" &&
      sub.plan === "team" &&
      sub.seats > 2 &&
      (sub.useCase === "mixed" || sub.useCase === "research" || sub.useCase === "writing")
    ) {
      const proposed = 20 * sub.seats;
      const savingsPerSeat = 25 - 20;
      const totalSavings = savingsPerSeat * sub.seats;

      recs.push(
        mkRec(sub, info.name, "switch", proposed, {
          action: "Switch ChatGPT Team → Gemini Business",
          reasoning: `Your team is using ChatGPT Team ($25/seat) primarily for ${sub.useCase}. Gemini Business delivers enterprise-grade Google Workspace integration, enterprise privacy controls, and direct access to Google's frontier Ultra models for only $20/seat. Making the switch saves $${savingsPerSeat}/seat monthly ($${round(totalSavings)}/mo total).`,
          severity: "low",
          suggestedPlanId: "business",
        }),
      );
      continue;
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
              expected,
            )}/mo for ${sub.seats} seat(s). That delta is usually unused seats, legacy add-ons, or auto-renewed upgrades.`,
            severity: "high",
          }),
        );
      }
    }
  }

  // ── 3. Cross-tool consolidation rules ──────────────────────────────
  const codingTools = subscriptions.filter(
    (s) => TOOL_MAP[s.tool]?.category === "coding" && s.monthlySpend > 0,
  );
  if (codingTools.length >= 2) {
    const sorted = [...codingTools].sort(
      (a, b) => b.seats * b.monthlySpend - a.seats * a.monthlySpend,
    );
    const keep = sorted[0];
    const drop = sorted.slice(1);
    const dropSpend = drop.reduce((s, x) => s + x.monthlySpend, 0);
    if (dropSpend > 0) {
      const dropNames = drop.map((d) => TOOL_MAP[d.tool].name).join(" and ");
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
        action: `Consolidate overlapping Coding tools onto ${TOOL_MAP[keep.tool].name}`,
        reasoning: `You are paying for both ${TOOL_MAP[keep.tool].name} and ${dropNames} concurrently. Because developers generally use only a single primary editor workspace, carrying multiple licenses is a 100% redundant expense. Consolidating all active coding seats onto your highest-usage tool (${TOOL_MAP[keep.tool].name}) allows you to sunset ${dropNames} and immediately recoup $${round(dropSpend)}/mo ($${round(dropSpend * 12)}/yr) without impacting engineering velocity.`,
        currentPlan: drop
          .map(
            (d) =>
              `${TOOL_MAP[d.tool].name} ${TOOL_MAP[d.tool].plans.find((p) => p.id === d.plan)?.name || d.plan}`,
          )
          .join(" + "),
        suggestedPlan: `Consolidated onto ${TOOL_MAP[keep.tool].name}`,
        pricingUrl: getPricingUrl(keep.tool),
      });
    }
  }

  const chatTools = subscriptions.filter(
    (s) => TOOL_MAP[s.tool]?.category === "chat" && s.monthlySpend > 0,
  );
  if (chatTools.length >= 3) {
    const sorted = [...chatTools].sort((a, b) => b.monthlySpend - a.monthlySpend);
    const drop = sorted.slice(2);
    const dropSpend = drop.reduce((s, x) => s + x.monthlySpend, 0);
    if (dropSpend > 0) {
      const dropNames = drop.map((d) => TOOL_MAP[d.tool].name).join(" and ");
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
        reasoning: `You are subscribing to three or more general-purpose AI chat assistants (${dropNames}). This almost always represents duplicate user licenses. We recommend retaining your primary workspace and fallback model, and fully canceling licenses for ${dropNames} to recover $${round(dropSpend)}/mo ($${round(dropSpend * 12)}/yr).`,
        currentPlan: drop
          .map(
            (d) =>
              `${TOOL_MAP[d.tool].name} ${TOOL_MAP[d.tool].plans.find((p) => p.id === d.plan)?.name || d.plan}`,
          )
          .join(" + "),
        suggestedPlan: "Cancel redundant licenses",
        pricingUrl: "https://openai.com/chatgpt/pricing/",
      });
    }
  }

  const apiSubs = subscriptions.filter((s) => TOOL_MAP[s.tool]?.category === "api");
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
      reasoning: `Below ~$150/mo combined, multi-provider API spend usually costs more in engineering overhead (keys, billing, abstractions) than it saves. Pick one until volume justifies the split.`,
      currentPlan: `${TOOL_MAP[smaller.tool].name} Usage-based`,
      suggestedPlan: "Consolidated onto single API provider",
      pricingUrl: getPricingUrl(smaller.tool),
    });
  }

  if (recs.length === 0 && subscriptions.length > 0) {
    const defaultSub = subscriptions[0];
    const info = TOOL_MAP[defaultSub.tool];
    const planName = info?.plans.find((p) => p.id === defaultSub.plan)?.name || defaultSub.plan;
    const currentPlan = info ? `${info.name} ${planName}` : "Lean Stack";
    recs.push({
      id: rid(),
      toolId: defaultSub.tool,
      toolName: "Your stack",
      severity: "low",
      type: "keep",
      currentSpend: subscriptions.reduce((s, x) => s + x.monthlySpend, 0),
      suggestedSpend: subscriptions.reduce((s, x) => s + x.monthlySpend, 0),
      monthlySavings: 0,
      yearlySavings: 0,
      action: "Stack looks lean",
      reasoning:
        "We didn't find obvious overspend given your team size and usage mix. Re-run this audit any time you add a tool or change plans.",
      currentPlan,
      suggestedPlan: currentPlan,
      pricingUrl: info ? getPricingUrl(defaultSub.tool) : undefined,
    });
  }

  const totalCurrentMonthly = round(input.subscriptions.reduce((s, x) => s + x.monthlySpend, 0));
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
  opts: {
    action: string;
    reasoning: string;
    severity: Recommendation["severity"];
    suggestedPlanId?: string;
  },
): Recommendation {
  const monthlySavings = round(Math.max(0, sub.monthlySpend - suggestedMonthly));
  const info = TOOL_MAP[sub.tool];

  // Find current plan name
  const currentPlanInfo = info?.plans.find((p) => p.id === sub.plan);
  const currentPlan = currentPlanInfo ? `${info.name} ${currentPlanInfo.name}` : undefined;

  // Find suggested plan name
  const suggestedPlanId = opts.suggestedPlanId || sub.plan;
  const suggestedPlanInfo = info?.plans.find((p) => p.id === suggestedPlanId);
  const suggestedPlan = suggestedPlanInfo ? `${info.name} ${suggestedPlanInfo.name}` : undefined;

  const pricingUrl = getPricingUrl(sub.tool);

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
    currentPlan,
    suggestedPlan: type === "keep" || type === "rightsize" ? currentPlan : suggestedPlan,
    pricingUrl,
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

  const top = [...recommendations].sort((a, b) => b.monthlySavings - a.monthlySavings).slice(0, 2);
  const biggest = top[0];

  const lines = [
    `This audit identifies a strong opportunity to reclaim $${monthlySavings.toLocaleString()}/mo in AI spend, or about ${pct}% of your current $${totalCurrentMonthly.toLocaleString()}/mo run rate, which equates to roughly $${yearlySavings.toLocaleString()}/year.`,
    biggest
      ? `The highest-impact change is in ${biggest.toolName || biggest.action}, where a smarter plan or consolidation can unlock most of the savings.`
      : "",
    top[1]
      ? `A secondary improvement area is ${top[1].toolName || top[1].action}, which helps reduce overlap and improve overall efficiency.`
      : "",
    `Start with the largest opportunity first, then validate the next area before adjusting the rest of your stack.`,
  ];
  return lines.filter(Boolean).join(" ");
}
