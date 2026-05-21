import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/animated-number";
import { runAudit } from "@/lib/audit-engine";
import { decodeAuditInput } from "@/lib/share";
import { TOOL_MAP } from "@/lib/pricing-data";
import { sendAuditEmail } from "@/lib/send-email";
import { generateAuditSummary } from "@/lib/summary";
import type { Recommendation } from "@/lib/types";

export const Route = createFileRoute("/audit/$id")({
  loader: ({ params }) => {
    const input = decodeAuditInput(params.id);
    if (!input) throw notFound();
    const result = runAudit(input);
    return {
      result,
      auditUrl: `https://your-domain.com/audit/${params.id}`,
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
        { property: "og:url", content: loaderData?.auditUrl ?? "https://your-domain.com/audit" },
        { property: "og:site_name", content: "Credex" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:image", content: "https://your-domain.com/og-image.png" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@Credex" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: "https://your-domain.com/og-image.png" },
      ],
      links: [
        { rel: "canonical", href: loaderData?.auditUrl ?? "https://your-domain.com/audit" },
      ],
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
  const [summaryText, setSummaryText] = useState(result.summary);
  const [summarySource, setSummarySource] = useState<"ai" | "fallback">("fallback");
  const [summaryLoading, setSummaryLoading] = useState(true);

  const sortedRecs = useMemo(
    () => [...result.recommendations].sort((a, b) => b.monthlySavings - a.monthlySavings),
    [result.recommendations]
  );

  useEffect(() => {
    let isActive = true;

    async function fetchSummary() {
      try {
        // Debug: summary generation start
        // eslint-disable-next-line no-console
        console.debug("[results] fetchSummary start, provider=OpenAI?", !!process.env.OPENAI_API_KEY);

        // Add a client-side timeout so the UI doesn't hang indefinitely
        const timeoutMs = 6000;
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
          new Promise((_, reject) => setTimeout(() => reject(new Error("summary_timeout")), timeoutMs)),
        ]);

        if (!isActive) return;
        // eslint-disable-next-line no-console
        console.debug("[results] fetchSummary done", { provider: (response as any)?.provider, message: (response as any)?.message });
        setSummaryText((response as any)?.summary ?? result.summary);
        setSummarySource((response as any)?.provider === "openai" ? "ai" : "fallback");
      } catch (error) {
        // Handle timeout or other failures by falling back to deterministic summary
        // eslint-disable-next-line no-console
        console.warn("AI summary failed or timed out, falling back to deterministic summary.", error);
        setSummaryText(result.summary);
        setSummarySource("fallback");
      } finally {
        if (isActive) setSummaryLoading(false);
      }
    }

    fetchSummary();
    return () => {
      isActive = false;
    };
  }, [result]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const existing = JSON.parse(localStorage.getItem("credex.audit.history") || "[]");
      const history = Array.isArray(existing) ? existing : [];
      if (!history.some((entry: any) => entry.id === result.id)) {
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
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <ResultsHero result={result} />

        <section className="mx-auto max-w-5xl px-4 sm:px-6">
          <SummaryCard
            text={summaryText}
            note={summaryLoading ? "Generating AI summary…" : summarySource === "ai" ? "AI-generated executive summary" : "Rule-based fallback summary"}
          />
          <SpendGraph
            current={result.totalCurrentMonthly}
            proposed={result.totalProposedMonthly}
            savings={result.monthlySavings}
          />
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Recommendations
              </h2>
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
          />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ResultsHero({
  result,
}: {
  result: ReturnType<typeof runAudit>;
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
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
      window.localStorage.setItem(
        "credex.audit.input.v1",
        JSON.stringify(result.input)
      );
    }
    navigate({ to: "/audit" });
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
            $<AnimatedNumber value={result.yearlySavings} />/year
          </span>{" "}
          across {result.recommendations.length} change
          {result.recommendations.length === 1 ? "" : "s"} to your AI stack.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <StatCard label="Current monthly" value={result.totalCurrentMonthly} tone="muted" />
          <StatCard label="Proposed monthly" value={result.totalProposedMonthly} tone="primary" />
          <StatCard label="Yearly savings" value={result.yearlySavings} tone="success" highlight />
        </div>

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Button onClick={copy} variant="outline" size="lg">
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy share link"}
          </Button>
          <Button variant="hero" size="lg" onClick={handleReAudit}>
            <RefreshCw className="h-4 w-4" /> Re-run audit
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
      className={`rounded-2xl border bg-card p-6 shadow-soft ${
        highlight ? "border-transparent bg-savings text-primary-foreground shadow-glow" : "border-border/60"
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

function SummaryCard({ text, note }: { text: string; note?: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = !expanded && text.length > 320 ? text.slice(0, 320).trimEnd() + "…" : text;

  return (
    <div className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-soft sm:p-8">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
        <Sparkles className="h-3.5 w-3.5" /> Executive summary
      </div>
      <p className="text-pretty text-base leading-relaxed text-foreground sm:text-lg" style={{ whiteSpace: expanded ? "normal" : "pre-wrap" }}>
        {preview}
      </p>
      {text.length > 320 ? (
        <button
          type="button"
          className="mt-4 text-sm font-medium text-primary hover:text-primary/80"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Show less" : "Read full summary"}
        </button>
      ) : null}
      {note ? <p className="mt-3 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function SpendGraph({
  current,
  proposed,
  savings,
}: {
  current: number;
  proposed: number;
  savings: number;
}) {
  const maxValue = Math.max(current, proposed, savings, 1);
  const entries = [
    { label: "Current monthly spend", value: current, tone: "bg-slate-500" },
    { label: "Proposed monthly spend", value: proposed, tone: "bg-primary" },
    { label: "Monthly savings", value: savings, tone: "bg-success" },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Spend overview</h2>
          <p className="text-sm text-muted-foreground">
            Compare current spend, proposed spend, and savings visually.
          </p>
        </div>
        <div className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary-foreground">
          Savings are {current > 0 ? `${Math.round((savings / current) * 100)}%` : "—"} of current spend
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {entries.map((entry) => {
          const width = Math.max(16, Math.min(100, (entry.value / maxValue) * 100));
          return (
            <div key={entry.label} className="rounded-3xl border border-border/70 bg-slate-50 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between text-sm font-medium text-foreground">
                <span>{entry.label}</span>
                <span>${entry.value.toLocaleString()}</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                <div className={`${entry.tone} h-full rounded-full`} style={{ width: `${width}%` }} />
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {entry.value === 0
                  ? "No spend detected"
                  : `${width}% of the largest category`}
              </div>
            </div>
          );
        })}
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
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-7">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="h-4 w-4" />
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${sev}`}>
              {rec.severity} priority
            </span>
            <span className="text-xs text-muted-foreground">· {TOOL_MAP[rec.toolId]?.name ?? rec.toolName}</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight sm:text-xl">{rec.action}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{rec.reasoning}</p>
          <p className="mt-4 text-sm font-semibold text-foreground">
            Impact: ${rec.monthlySavings.toLocaleString()}/mo saved, ${rec.yearlySavings.toLocaleString()}/yr potential.
          </p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>
              Current: <span className="font-medium text-foreground">${rec.currentSpend.toLocaleString()}/mo</span>
            </span>
            <span className="text-muted-foreground">
              Proposed:{" "}
              <span className="font-medium text-foreground">${rec.suggestedSpend.toLocaleString()}/mo</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start justify-center rounded-xl border border-border/60 bg-muted/40 p-5 sm:items-end sm:text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Savings</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-[oklch(0.55_0.16_155)]">
            ${rec.monthlySavings.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span>
          </div>
          <div className="text-sm text-muted-foreground">
            ${rec.yearlySavings.toLocaleString()}/yr
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
}: {
  yearlySavings: number;
  monthlySavings: number;
  summary?: string;
  auditUrl: string;
}) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const templateId = (import.meta as any).env?.VITE_EMAILJS_TEMPLATE_ID;
  const userId = (import.meta as any).env?.VITE_EMAILJS_USER_ID;
  const serviceId = (import.meta as any).env?.VITE_EMAILJS_SERVICE_ID || "service_g30qq5k";
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
      // Prefer client-side EmailJS if configured (allows using provided service id)
      const templateId = (import.meta as any).env?.VITE_EMAILJS_TEMPLATE_ID;
      const userId = (import.meta as any).env?.VITE_EMAILJS_USER_ID;
      const serviceId = (import.meta as any).env?.VITE_EMAILJS_SERVICE_ID || "service_g30qq5k";

      if (templateId && userId) {
        // Build template params
        const template_params = {
          to_email: email.trim(),
          company: company.trim(),
          role: role.trim(),
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

        // Success
        const fakeId = `emailjs_${Date.now()}`;
        try {
          const leads = JSON.parse(localStorage.getItem("credex.leads") || "[]");
          leads.push({ email, company, role, at: new Date().toISOString(), emailId: fakeId });
          localStorage.setItem("credex.leads", JSON.stringify(leads));
        } catch {}

        setSubmitted(true);
        setSending(false);
        return;
      }

      // Fallback to server-side send
      const response = await sendAuditEmail({
        data: {
          email: email.trim(),
          company: company.trim(),
          role: role.trim(),
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

      // Success — show confirmation
      try {
        const leads = JSON.parse(localStorage.getItem("credex.leads") || "[]");
        leads.push({ email, company, role, at: new Date().toISOString(), emailId: response.id });
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
        <CheckCircle2 className="mx-auto h-10 w-10 text-[oklch(0.55_0.16_155)]" />
        <h3 className="mt-3 text-2xl font-semibold tracking-tight">Report saved.</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Check your email for the full audit report. We'll flag the single highest-impact opportunity.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
      <div className="grid gap-0 sm:grid-cols-[1.2fr_1fr]">
        <div className="bg-savings p-8 text-primary-foreground sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Mail className="h-3.5 w-3.5" /> Optional
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Save this report.
          </h3>
          <p className="mt-2 text-primary-foreground/80">
            Email it to yourself, your CFO, or your co-founder. We'll also flag the single highest-impact
            change to do first
            {yearlySavings > 0 ? ` — your stack has ~$${yearlySavings.toLocaleString()}/yr on the table.` : "."}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3 p-8 sm:p-10">
            <div className="mb-2 text-xs text-muted-foreground">Sending via: <span className="font-medium text-foreground">{sendMethod}</span></div>
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={sending}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Company <span className="opacity-60">(optional)</span>
              </span>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={120}
                disabled={sending}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Role <span className="opacity-60">(optional)</span>
              </span>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={120}
                disabled={sending}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </label>
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                Save report <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
        </form>
      </div>
    </div>
  );
}
