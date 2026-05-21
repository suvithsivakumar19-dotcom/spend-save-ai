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
  provider: "openai" | "fallback";
  message?: string;
}

export const generateAuditSummary = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateSummaryInput) => input)
  .handler(async (ctx): Promise<GenerateSummaryResult> => {
    const input = ctx.data;
    const fallbackSummary = generateSummary(input);
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!openAiKey) {
      return {
        summary: fallbackSummary,
        provider: "fallback",
        message: "No OpenAI API key configured. Using deterministic summary.",
      };
    }

    try {
      const prompt = buildPrompt(input);
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
              content:
                "You are an expert enterprise SaaS analyst writing for executives. Create an insightful, business-ready summary of AI spend and savings. Start with a strong insight sentence, keep the tone concise, and end with a clear recommendation. Do not repeat the recommendation bullets verbatim.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.9,
          max_tokens: 340,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.warn("OpenAI summary error:", response.status, error);
        return {
          summary: fallbackSummary,
          provider: "fallback",
          message: "OpenAI summary request failed.",
        };
      }

      const payload = await response.json();
      const summary = payload?.choices?.[0]?.message?.content?.trim();
      if (!summary) {
        return {
          summary: fallbackSummary,
          provider: "fallback",
          message: "OpenAI returned no summary.",
        };
      }

      return { summary, provider: "openai" };
    } catch (error) {
      console.warn("OpenAI summary error:", error);
      return {
        summary: fallbackSummary,
        provider: "fallback",
        message: "OpenAI summary failed.",
      };
    }
  }
);

function buildPrompt(input: GenerateSummaryInput): string {
  const toolCount = input.input.subscriptions.length;
  const topRecommendations = input.recommendations
    .slice(0, 3)
    .map((rec, index) => `${index + 1}. ${rec.toolName}: ${formatNumber(rec.monthlySavings)} /mo savings`)
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
