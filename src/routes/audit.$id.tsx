import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Mail,
  Sparkles,
  TrendingDown,
  AlertTriangle,
  Layers,
  RefreshCw,
  Loader2,
  ExternalLink,
  Printer,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/animated-number";
import { runAudit } from "@/lib/audit-engine";
import { getAudit, saveLead } from "@/lib/db";
import { TOOL_MAP } from "@/lib/pricing-data";
import { sendAuditEmail } from "@/lib/send-email";
import { generateAuditSummary } from "@/lib/summary";
import type { Recommendation, ToolSubscription } from "@/lib/types";

export const Route = createFileRoute("/audit/$id")({
  loader: async ({ params }) => {
    const input = await getAudit({ data: params.id });
    if (!input) throw notFound();
    const result = runAudit(input);
    return {
      result,
      auditUrl: `https://credex.app/audit/${params.id}`,
    };
  },
  head: ({ loaderData }) => {
    const yearly = loaderData?.result.yearlySavings ?? 0;
    const title =
      yearly > 0
        ? `Save $${yearly.toLocaleString()}/yr on AI tools — Credex audit`
        : "Your AI spend audit — Credex";
    const desc =
      yearly > 0
        ? `Credex found $${yearly.toLocaleString()}/yr in AI spend savings across this stack. See the per-tool breakdown.`
        : "View this AI spend audit from Credex.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:url", content: loaderData?.auditUrl ?? "https://credex.app/audit" },
        { property: "og:site_name", content: "Credex" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:image", content: "https://credex.app/og-image.png" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@Credex" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: "https://credex.app/og-image.png" },
      ],
      links: [{ rel: "canonical", href: loaderData?.auditUrl ?? "https://credex.app/audit" }],
    };
  },
  component: ResultsPage,
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex flex-1 items-center justify-center px-4 py-24 text-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Audit link looks broken</h1>
          <p className="mt-2 text-muted-foreground">
            We couldn't decode this audit. It may have been truncated.
          </p>
          <div className="mt-6">
            <Button asChild variant="hero">
              <Link to="/audit">Run a new audit</Link>
            </Button>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  ),
});

function ResultsPage() {
  const { result } = Route.useLoaderData();
  const { id } = Route.useParams();
  const [summaryText, setSummaryText] = useState(result.summary);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const sortedRecs = useMemo(
    () => [...result.recommendations].sort((a, b) => b.monthlySavings - a.monthlySavings),
    [result.recommendations],
  );

  const fetchSummary = useCallback(
    async (isActive = true) => {
      setSummaryLoading(true);
      try {
        const timeoutMs = 7000;
        const summaryPromise = generateAuditSummary({
          data: {
            input: result.input,
            recommendations: result.recommendations,
            monthlySavings: result.monthlySavings,
            yearlySavings: result.yearlySavings,
            totalCurrentMonthly: result.totalCurrentMonthly,
          },
        });

        const response = await Promise.race([
          summaryPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("summary_timeout")), timeoutMs),
          ),
        ]);

        if (!isActive) return;

        const res = response as { provider?: string; summary?: string } | null;
        if (res?.summary) {
          setSummaryText(res.summary);
        } else {
          setSummaryText(result.summary);
        }
      } catch (error) {
        if (!isActive) return;
        console.warn(
          "AI summary failed or timed out, falling back to deterministic summary.",
          error,
        );
        setSummaryText(result.summary);
      } finally {
        if (isActive) setSummaryLoading(false);
      }
    },
    [result],
  );

  useEffect(() => {
    let isActive = true;
    fetchSummary(isActive);
    return () => {
      isActive = false;
    };
  }, [fetchSummary]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const existing = JSON.parse(localStorage.getItem("credex.audit.history") || "[]");
      const history = Array.isArray(existing) ? existing : [];
      if (!history.some((entry: { id: string }) => entry.id === result.id)) {
        history.push({
          id: result.id,
          createdAt: result.createdAt,
          totalCurrentMonthly: result.totalCurrentMonthly,
          monthlySavings: result.monthlySavings,
          yearlySavings: result.yearlySavings,
          url: window.location.href,
        });
        localStorage.setItem("credex.audit.history", JSON.stringify(history.slice(-15)));
      }
    } catch {
      /* ignore */
    }
  }, [result]);

  const auditUrl = typeof window === "undefined" ? "" : window.location.href;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50">
      <SiteHeader />
      <main className="flex-1">
        <ResultsHero result={result} />

        <section className="mx-auto max-w-5xl px-4 sm:px-6">
          <SummaryCard
            text={summaryText}
            loading={summaryLoading}
          />
          <SpendGraph
            current={result.totalCurrentMonthly}
            proposed={result.totalProposedMonthly}
            savings={result.monthlySavings}
            subscriptions={result.input.subscriptions}
          />
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Recommendations</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sorted by monthly impact. Each rec ties to published pricing.
              </p>
            </div>
            <span className="hidden text-sm text-muted-foreground sm:block">
              {result.recommendations.length} item{result.recommendations.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid gap-4">
            {sortedRecs.map((r) => (
              <RecCard key={r.id} rec={r} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
          <LeadCapture
            yearlySavings={result.yearlySavings}
            monthlySavings={result.monthlySavings}
            summary={summaryText}
            auditUrl={auditUrl}
            auditId={id}
            initialTeamSize={result.input.teamSize}
          />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ResultsHero({ result }: { result: ReturnType<typeof runAudit> }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  function handleReAudit() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("credex.audit.input.v1", JSON.stringify(result.input));
    }
    navigate({ to: "/audit" });
  }

  async function handleDownloadPDF() {
    if (typeof window === "undefined") return;
    setPdfGenerating(true);

    try {
      // 1. Dynamically import libraries to keep SSR building safe
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");

      const element = document.querySelector("main");
      if (!element) {
        throw new Error("Could not find main container element");
      }

      // Save scroll position and scroll to top for clean canvas rendering
      const initialScrollY = window.scrollY;
      window.scrollTo(0, 0);

      // Give a tiny moment for layout to settle on top scroll if rendering engine needs it
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 2. Capture canvas with high resolution
      const canvas = await html2canvas(element, {
        scale: 2, // Sharpness/high DPI
        useCORS: true, // Handle external assets
        logging: false,
        backgroundColor: "#f8fafc", // Retain background color
        ignoreElements: (el) => {
          // Hide interactive controls, forms, or any items with the .no-print or other classes
          return (
            el.classList.contains("no-print") ||
            el.classList.contains("lead-capture-section") ||
            el.classList.contains("copy-btn") ||
            el.classList.contains("re-run-btn") ||
            el.tagName === "HEADER" ||
            el.tagName === "FOOTER"
          );
        },
      });

      // Restore scroll position
      window.scrollTo(0, initialScrollY);

      // 3. Convert canvas to image
      const imgData = canvas.toDataURL("image/png");

      // 4. Calculate dimensions for standard A4
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 size width in mm
      const pageHeight = 297; // A4 size height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // 5. Add pages if long document
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight; // Slide up the image
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      // 6. Save the PDF
      pdf.save(`credex-ai-spend-audit-${result.id || "report"}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fallback to window.print() if client-side rendering fails
      window.print();
    } finally {
      setPdfGenerating(false);
    }
  }

  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Audit complete · {new Date(result.createdAt).toLocaleDateString()}
        </div>
        <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          You can reclaim{" "}
          <span className="text-gradient">
            $<AnimatedNumber value={result.monthlySavings} />
          </span>
          /mo
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          About{" "}
          <span className="font-semibold text-foreground">
            $<AnimatedNumber value={result.yearlySavings} />
            /year
          </span>{" "}
          across {result.recommendations.length} change
          {result.recommendations.length === 1 ? "" : "s"} to your AI stack.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <StatCard label="Current monthly" value={result.totalCurrentMonthly} tone="muted" />
          <StatCard label="Proposed monthly" value={result.totalProposedMonthly} tone="primary" />
          <StatCard label="Yearly savings" value={result.yearlySavings} tone="success" highlight />
        </div>

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center no-print">
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            size="lg"
            disabled={pdfGenerating}
            className="border-indigo-200 hover:border-indigo-300 text-indigo-700 bg-white"
          >
            {pdfGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-indigo-600" />
                Generating PDF...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" /> Download PDF Report
              </>
            )}
          </Button>
          <Button onClick={copy} variant="outline" size="lg" className="copy-btn">
            <Copy className="h-4 w-4 mr-2" />
            {copied ? "Copied!" : "Copy share link"}
          </Button>
          <Button variant="hero" size="lg" onClick={handleReAudit} className="re-run-btn">
            <RefreshCw className="h-4 w-4 mr-2" /> Re-run audit
          </Button>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: number;
  tone: "muted" | "primary" | "success";
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-card p-4 sm:p-6 shadow-soft ${
        highlight
          ? "border-transparent bg-savings text-primary-foreground shadow-glow"
          : "border-border/60"
      }`}
    >
      <div
        className={`text-xs uppercase tracking-wider ${
          highlight ? "text-primary-foreground/80" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-1.5 text-3xl font-semibold tracking-tight ${
          highlight
            ? "text-primary-foreground"
            : tone === "primary"
              ? "text-gradient"
              : tone === "success"
                ? "text-[oklch(0.55_0.16_155)]"
                : ""
        }`}
      >
        $<AnimatedNumber value={value} />
      </div>
      <div
        className={`mt-1 text-xs ${
          highlight ? "text-primary-foreground/70" : "text-muted-foreground"
        }`}
      >
        per {label.toLowerCase().includes("yearly") ? "year" : "month"}
      </div>
    </div>
  );
}

function SummaryCard({
  text,
  loading,
}: {
  text: string;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = !expanded && text.length > 320 ? text.slice(0, 320).trimEnd() + "…" : text;

  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-4 sm:p-8 relative">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Executive summary
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 py-2 animate-pulse">
          <div className="h-4 bg-slate-200 rounded-md w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded-md w-11/12"></div>
          <div className="h-4 bg-slate-200 rounded-md w-4/5"></div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium pt-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Generating dynamic AI
            executive summary...
          </div>
        </div>
      ) : (
        <>
          <p
            className="text-pretty text-base leading-relaxed text-foreground sm:text-lg"
            style={{ whiteSpace: expanded ? "normal" : "pre-wrap" }}
          >
            {preview}
          </p>
          {text.length > 320 && (
            <button
              type="button"
              className="mt-4 text-sm font-medium text-primary hover:text-primary/80 animate-in fade-in"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? "Show less" : "Read full summary"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function SpendGraph({
  current,
  proposed,
  savings,
  subscriptions,
}: {
  current: number;
  proposed: number;
  savings: number;
  subscriptions: ToolSubscription[];
}) {
  const barData = [
    { name: "Current Spend", amount: current, fill: "#64748b" },
    { name: "Proposed Spend", amount: proposed, fill: "#6366f1" },
    { name: "Monthly Savings", amount: savings, fill: "#10b981" },
  ];

  const donutData = subscriptions
    .filter((sub) => sub.monthlySpend > 0)
    .map((sub) => ({
      name: TOOL_MAP[sub.tool]?.name || sub.tool,
      value: sub.monthlySpend,
    }));

  const COLORS = [
    "#6366f1", // indigo
    "#10b981", // emerald
    "#3b82f6", // blue
    "#f59e0b", // amber
    "#ec4899", // pink
    "#8b5cf6", // violet
    "#14b8a6", // teal
  ];

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      {/* Spend Comparison Bar Chart */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Spend Comparison</h3>
          <p className="text-xs text-muted-foreground mb-4">Current vs proposed monthly run-rate</p>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                formatter={(value) => [`$${value.toLocaleString()}`, "Amount"]}
                contentStyle={{
                  background: "white",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spend Allocation Donut Chart */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Spend Allocation</h3>
          <p className="text-xs text-muted-foreground mb-4">Current monthly spend by tool</p>
        </div>
        {donutData.length === 0 ? (
          <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
            No active subscriptions listed.
          </div>
        ) : (
          <div className="h-60 w-full flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="h-40 w-40 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`$${value.toLocaleString()}`, "Spend"]}
                    contentStyle={{
                      background: "white",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 text-xs w-full max-h-40 overflow-y-auto pr-1">
              {donutData.map((entry, index) => (
                <div
                  key={entry.name}
                  className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="truncate text-muted-foreground font-medium">{entry.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    ${entry.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecCard({ rec }: { rec: Recommendation }) {
  const Icon =
    rec.type === "consolidate"
      ? Layers
      : rec.type === "downgrade" || rec.type === "rightsize"
        ? TrendingDown
        : rec.type === "keep"
          ? CheckCircle2
          : AlertTriangle;

  const sev =
    rec.severity === "high"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : rec.severity === "medium"
        ? "bg-warning/15 text-[oklch(0.45_0.12_75)] border-warning/30"
        : "bg-muted text-muted-foreground border-border";

  return (
    <article className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition-shadow hover:shadow-elevated">
      <div className="p-4 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${sev}`}
              >
                {rec.severity} priority
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                · {TOOL_MAP[rec.toolId]?.name ?? rec.toolName}
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Monthly Savings
            </div>
            <div className="text-2xl font-bold tracking-tight text-[oklch(0.55_0.16_155)]">
              ${rec.monthlySavings.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold tracking-tight sm:text-xl mb-3 text-slate-800">
          {rec.action}
        </h3>

        {/* Sleek Plan Comparison Grid */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2 rounded-xl bg-slate-50/70 border border-slate-100 p-4">
          <div className="flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Current Plan Details
            </span>
            <div className="mt-1">
              <span className="font-semibold text-slate-700 text-sm block truncate">
                {rec.currentPlan || "N/A"}
              </span>
              <span className="text-xs text-slate-500">
                ${rec.currentSpend.toLocaleString()}/mo spend
              </span>
            </div>
          </div>
          <div className="flex flex-col justify-between border-t border-slate-200/60 pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">
              Recommended Action
            </span>
            <div className="mt-1">
              <span className="font-semibold text-primary text-sm block truncate">
                {rec.suggestedPlan || "N/A"}
              </span>
              <span className="text-xs text-slate-500">
                {rec.type === "keep"
                  ? "Same spend level"
                  : `Optimized to $${rec.suggestedSpend.toLocaleString()}/mo`}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Audit Justification
            </h4>
            <p className="text-sm leading-relaxed text-slate-600 font-normal">{rec.reasoning}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100/80">
            <div className="flex gap-x-6 text-xs text-muted-foreground">
              <span>
                Yearly Savings Potential:{" "}
                <span className="font-bold text-slate-700">
                  ${rec.yearlySavings.toLocaleString()}/yr
                </span>
              </span>
            </div>

            {rec.pricingUrl && (
              <a
                href={rec.pricingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors no-print"
              >
                View official pricing <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function LeadCapture({
  yearlySavings,
  monthlySavings,
  summary,
  auditUrl,
  auditId,
  initialTeamSize,
}: {
  yearlySavings: number;
  monthlySavings: number;
  summary?: string;
  auditUrl: string;
  auditId: string;
  initialTeamSize: number;
}) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [teamSize, setTeamSize] = useState<number | string>(initialTeamSize || "");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const templateId = import.meta.env?.VITE_EMAILJS_TEMPLATE_ID;
  const userId = import.meta.env?.VITE_EMAILJS_USER_ID;
  const serviceId = import.meta.env?.VITE_EMAILJS_SERVICE_ID || "service_g30qq5k";
  const sendMethod = templateId && userId ? `EmailJS (${serviceId})` : "Server";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }

    setSending(true);
    try {
      const parsedTeamSize = Number(teamSize) || initialTeamSize;

      // Prefer client-side EmailJS if configured
      if (templateId && userId) {
        const template_params = {
          to_email: email.trim(),
          company: company.trim(),
          teamSize: parsedTeamSize,
          role: `Team Size: ${parsedTeamSize}`,
          audit_url: auditUrl,
          monthly_savings: monthlySavings,
          yearly_savings: yearlySavings,
          summary: summary || "",
        };

        const resp = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: serviceId,
            template_id: templateId,
            user_id: userId,
            template_params,
          }),
        });

        if (!resp.ok) {
          const errText = await resp.text();
          setError(`EmailJS send failed: ${resp.status} ${errText}`);
          setSending(false);
          return;
        }

        const fakeId = `emailjs_${Date.now()}`;
        try {
          await saveLead({ data: { email, company, teamSize: parsedTeamSize, auditId } });
          const leads = JSON.parse(localStorage.getItem("credex.leads") || "[]");
          leads.push({
            email,
            company,
            teamSize: parsedTeamSize,
            role: `Team Size: ${parsedTeamSize}`,
            at: new Date().toISOString(),
            emailId: fakeId,
          });
          localStorage.setItem("credex.leads", JSON.stringify(leads));
        } catch (err) {
          console.warn("Failed to save lead local entry", err);
        }

        setSubmitted(true);
        setSending(false);
        return;
      }

      // Fallback to server-side send
      const response = await sendAuditEmail({
        data: {
          email: email.trim(),
          company: company.trim(),
          role: `Team Size: ${parsedTeamSize}`,
          auditUrl,
          monthlySavings,
          yearlySavings,
          summary,
        },
      });

      if (!response.success) {
        setError(response.message || "Failed to send email");
        setSending(false);
        return;
      }

      try {
        await saveLead({ data: { email, company, teamSize: parsedTeamSize, auditId } });
        const leads = JSON.parse(localStorage.getItem("credex.leads") || "[]");
        leads.push({
          email,
          company,
          teamSize: parsedTeamSize,
          role: `Team Size: ${parsedTeamSize}`,
          at: new Date().toISOString(),
          emailId: response.id,
        });
        localStorage.setItem("credex.leads", JSON.stringify(leads));
      } catch {
        /* ignore localStorage error */
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-soft">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[oklch(0.55_0.16_155)] animate-in zoom-in duration-300" />
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-800">Report saved.</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          Check your email for the full audit report. We've flagged the single highest-impact
          opportunity.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft lead-capture-section">
      <div className="grid gap-0 sm:grid-cols-[1.2fr_1.5fr]">
        <div className="bg-savings p-8 text-primary-foreground sm:p-10 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Mail className="h-3.5 w-3.5" /> Full Audit Details
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              Get Full Report
            </h3>
            <p className="mt-2 text-primary-foreground/80 text-sm leading-relaxed">
              Email this complete breakdown to yourself, your CFO, or your leadership team. We will
              structure this into a clean, sharing-ready briefing document.
              {yearlySavings > 0
                ? ` Your stack currently has ~$${yearlySavings.toLocaleString()}/yr in clear savings potential.`
                : ""}
            </p>
          </div>
          <div className="mt-6 text-xs text-primary-foreground/60 border-t border-primary-foreground/10 pt-4">
            Security Guarantee: Your pricing numbers are secure. No spam, ever.
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 p-8 sm:p-10 bg-white">
          <div className="mb-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>Enterprise Savings Delivery</span>
            <span className="font-semibold text-foreground text-[10px] uppercase bg-slate-100 px-2 py-0.5 rounded">
              Via {sendMethod}
            </span>
          </div>

          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Work Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={sending}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 shadow-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Company Name
              </span>
              <input
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={120}
                placeholder="Acme Corp"
                disabled={sending}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 shadow-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Team Size
              </span>
              <input
                type="number"
                required
                min={1}
                max={10000}
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value === "" ? "" : Number(e.target.value))}
                disabled={sending}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 shadow-sm"
              />
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" variant="hero" size="lg" className="w-full mt-2" disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" /> Generating Report…
              </>
            ) : (
              <>
                Get Full Report <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground pt-1">
            Free PDF & email report delivered instantly.
          </p>
        </form>
      </div>
    </div>
  );
}
