import { createServerFn } from "@tanstack/react-start";
import { generateSummary } from "./audit-engine";
import type { AuditInput, Recommendation } from "./types";

function formatNumber(value: number | undefined): string {
  return `$${(Number(value) || 0).toLocaleString()}`;
}

export interface GenerateSummaryInput {
  input: AuditInput;
  recommendations: Recommendation[];
  monthlySavings: number;
  yearlySavings: number;
  totalCurrentMonthly: number;
}

export interface GenerateSummaryResult {
  summary: string;
  provider: "openai" | "anthropic" | "fallback";
  message?: string;
}

export const generateAuditSummary = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateSummaryInput) => input)
  .handler(async (ctx): Promise<GenerateSummaryResult> => {
    const input = ctx.data;
    const fallbackSummary = generateSummary(input);

    const anthropicKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.VITE_ANTHROPIC_API_KEY ||
      import.meta.env.ANTHROPIC_API_KEY ||
      import.meta.env.VITE_ANTHROPIC_API_KEY;

    const openAiKey =
      process.env.OPENAI_API_KEY ||
      process.env.VITE_OPENAI_API_KEY ||
      import.meta.env.OPENAI_API_KEY ||
      import.meta.env.VITE_OPENAI_API_KEY;

    // Build the query prompt
    const prompt = buildPrompt(input);
    const systemInstruction =
      "You are an expert enterprise SaaS analyst writing for executives. Create an insightful, business-ready summary of AI spend and savings. Start with a strong insight sentence, keep the tone concise, and end with a clear recommendation. Do not repeat the recommendation bullets verbatim.";

    // 1. Try Anthropic Claude API first if key exists
    if (anthropicKey) {
      try {
        console.log("[summary] Attempting summary generation via Anthropic...");
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 340,
            temperature: 0.8,
            system: systemInstruction,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        });

        if (response.ok) {
          const payload = await response.json();
          const summary = payload?.content?.[0]?.text?.trim();
          if (summary) {
            console.log("[summary] Dynamic Anthropic Claude summary generated successfully!");
            return { summary, provider: "anthropic" };
          }
        } else {
          const errorText = await response.text();
          console.warn("[summary] Anthropic API failed:", response.status, errorText);
        }
      } catch (err) {
        console.warn("[summary] Anthropic summary fetch error:", err);
      }
    }

    // 2. Try OpenAI GPT API next if key exists
    if (openAiKey) {
      try {
        console.log("[summary] Attempting summary generation via OpenAI...");
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: systemInstruction,
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.8,
            max_tokens: 340,
          }),
        });

        if (response.ok) {
          const payload = await response.json();
          const summary = payload?.choices?.[0]?.message?.content?.trim();
          if (summary) {
            console.log("[summary] Dynamic OpenAI summary generated successfully!");
            return { summary, provider: "openai" };
          }
        } else {
          const errorText = await response.text();
          console.warn("[summary] OpenAI API failed:", response.status, errorText);
        }
      } catch (err) {
        console.warn("[summary] OpenAI summary fetch error:", err);
      }
    }

    // 3. Graceful fallback
    console.log("[summary] Using deterministic rules-based summary fallback.");
    return {
      summary: fallbackSummary,
      provider: "fallback",
      message: "API keys missing or requests failed. Using rules-based executive summary.",
    };
  });

function buildPrompt(input: GenerateSummaryInput): string {
  const toolCount = input.input.subscriptions.length;
  const topRecommendations = input.recommendations
    .slice(0, 3)
    .map(
      (rec, index) =>
        `${index + 1}. ${rec.toolName}: ${formatNumber(rec.monthlySavings)} /mo savings (${rec.action})`,
    )
    .join("\n");

  return `
Write a single 120-150 word executive summary for a business buyer. The summary should be distinct from the recommendation details and focus on overall spend posture, savings potential, and the most important next step.

Current monthly spend: ${formatNumber(input.totalCurrentMonthly)}.
Estimated monthly savings: ${formatNumber(input.monthlySavings)}.
Estimated yearly savings: ${formatNumber(input.yearlySavings)}.
Number of tools audited: ${toolCount}.
Top opportunities:
${topRecommendations}

Do not repeat the recommendation bullets verbatim. Keep the summary executive, calm, and easy to share with leadership.
  `.trim();
}
