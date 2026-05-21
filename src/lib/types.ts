import type { ToolId, UseCase } from "./pricing-data";

export interface ToolSubscription {
  id: string; // local row id
  tool: ToolId;
  plan: string;
  monthlySpend: number;
  seats: number;
  useCase: UseCase;
}

export interface AuditInput {
  teamSize: number;
  subscriptions: ToolSubscription[];
}

export interface Recommendation {
  id: string;
  toolId: ToolId;
  toolName: string;
  severity: "high" | "medium" | "low";
  type: "downgrade" | "consolidate" | "switch" | "rightsize" | "keep";
  currentSpend: number; // monthly
  suggestedSpend: number; // monthly
  monthlySavings: number;
  yearlySavings: number;
  action: string;
  reasoning: string;
}

export interface AuditResult {
  id: string;
  createdAt: string;
  input: AuditInput;
  recommendations: Recommendation[];
  totalCurrentMonthly: number;
  totalProposedMonthly: number;
  monthlySavings: number;
  yearlySavings: number;
  summary: string;
}
