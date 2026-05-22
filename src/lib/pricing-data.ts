// Pricing data verified 2025-05. See PRICING_DATA.md for sources.
export type ToolId =
  | "cursor"
  | "copilot"
  | "claude"
  | "chatgpt"
  | "anthropic_api"
  | "openai_api"
  | "gemini"
  | "windsurf";

export interface PlanInfo {
  id: string;
  name: string;
  pricePerSeat: number; // monthly USD
  description?: string;
}

export interface ToolInfo {
  id: ToolId;
  name: string;
  category: "coding" | "chat" | "api" | "mixed";
  plans: PlanInfo[];
  notes?: string;
}

export const TOOLS: ToolInfo[] = [
  {
    id: "cursor",
    name: "Cursor",
    category: "coding",
    plans: [
      { id: "free", name: "Hobby (Free)", pricePerSeat: 0 },
      { id: "pro", name: "Pro", pricePerSeat: 20 },
      { id: "business", name: "Business", pricePerSeat: 40 },
    ],
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    category: "coding",
    plans: [
      { id: "individual", name: "Individual", pricePerSeat: 10 },
      { id: "business", name: "Business", pricePerSeat: 19 },
      { id: "enterprise", name: "Enterprise", pricePerSeat: 39 },
    ],
  },
  {
    id: "claude",
    name: "Claude",
    category: "chat",
    plans: [
      { id: "free", name: "Free", pricePerSeat: 0 },
      { id: "pro", name: "Pro", pricePerSeat: 20 },
      { id: "team", name: "Team", pricePerSeat: 30 },
    ],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    category: "chat",
    plans: [
      { id: "free", name: "Free", pricePerSeat: 0 },
      { id: "plus", name: "Plus", pricePerSeat: 20 },
      { id: "team", name: "Team", pricePerSeat: 25 },
      { id: "enterprise", name: "Enterprise", pricePerSeat: 60 },
    ],
  },
  {
    id: "anthropic_api",
    name: "Anthropic API",
    category: "api",
    plans: [{ id: "usage", name: "Usage-based", pricePerSeat: 0 }],
    notes: "Pay-as-you-go.",
  },
  {
    id: "openai_api",
    name: "OpenAI API",
    category: "api",
    plans: [{ id: "usage", name: "Usage-based", pricePerSeat: 0 }],
    notes: "Pay-as-you-go.",
  },
  {
    id: "gemini",
    name: "Gemini",
    category: "chat",
    plans: [
      { id: "free", name: "Free", pricePerSeat: 0 },
      { id: "advanced", name: "Advanced", pricePerSeat: 20 },
      { id: "business", name: "Business", pricePerSeat: 20 },
    ],
  },
  {
    id: "windsurf",
    name: "Windsurf / v0",
    category: "coding",
    plans: [
      { id: "free", name: "Free", pricePerSeat: 0 },
      { id: "pro", name: "Pro", pricePerSeat: 15 },
      { id: "team", name: "Team", pricePerSeat: 30 },
    ],
  },
];

export const TOOL_MAP: Record<ToolId, ToolInfo> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t]),
) as Record<ToolId, ToolInfo>;

export const USE_CASES = ["coding", "writing", "research", "data", "mixed"] as const;
export type UseCase = (typeof USE_CASES)[number];
