import { useEffect, useMemo, useState, useRef } from "react";
import { createFileRoute, Outlet, useMatch, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { z } from "zod";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { TOOLS, TOOL_MAP, USE_CASES, type ToolId, type UseCase } from "@/lib/pricing-data";
import type { AuditInput, ToolSubscription } from "@/lib/types";
import { encodeAuditInput } from "@/lib/share";
import { Route as AuditIdRoute } from "./audit.$id";

const STORAGE_KEY = "credex.audit.input.v1";
// Previously used a REAUDIT_FLAG to auto-submit when returning from results.
// We no longer auto-submit — re-audit should prefill the form and wait
// for the user to click "Run audit". Keep STORAGE_KEY only.

const TOOL_IDS = TOOLS.map((t) => t.id) as [ToolId, ...ToolId[]];

const subscriptionSchema = z.object({
  id: z.string(),
  tool: z.enum(TOOL_IDS),
  plan: z.string().min(1),
  monthlySpend: z.number().min(0).max(1_000_000),
  seats: z.number().int().min(1).max(10_000),
  useCase: z.enum(["coding", "writing", "research", "data", "mixed"]),
});

const auditSchema = z.object({
  teamSize: z.number().int().min(1).max(10_000),
  subscriptions: z.array(subscriptionSchema).min(1, "Add at least one tool."),
});

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Run your audit — Credex" },
      {
        name: "description",
        content: "List your AI tools, plans, and spend. Get an instant audit with monthly and yearly savings.",
      },
      { property: "og:url", content: "https://your-domain.com/audit" },
      { property: "og:site_name", content: "Credex" },
      { property: "og:title", content: "Run your AI spend audit — Credex" },
      {
        property: "og:description",
        content: "List your AI tools, plans, and spend. Get an instant audit with monthly and yearly savings.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://your-domain.com/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Credex" },
      { name: "twitter:title", content: "Run your AI spend audit — Credex" },
      {
        name: "twitter:description",
        content: "List your AI tools, plans, and spend. Get an instant audit with monthly and yearly savings.",
      },
      { name: "twitter:image", content: "https://your-domain.com/og-image.png" },
    ],
    links: [
      { rel: "canonical", href: "https://your-domain.com/audit" },
    ],
  }),
  component: AuditPage,
});

function newRow(): ToolSubscription {
  return {
    id: Math.random().toString(36).slice(2, 10),
    tool: "chatgpt",
    plan: "plus",
    monthlySpend: 20,
    seats: 1,
    useCase: "mixed",
  };
}

function AuditPage() {
  const isResultsRoute = useMatch({ from: AuditIdRoute.id, shouldThrow: false });
  const navigate = useNavigate();
  const [teamSize, setTeamSize] = useState(5);
  const [subs, setSubs] = useState<ToolSubscription[]>([newRow()]);
  const [errors, setErrors] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const isMountedRef = useRef(true);

  // Hydrate from localStorage (prefill), but do NOT auto-submit. The user
  // should review or edit the prefilled inputs and explicitly click "Run audit".
  useEffect(() => {
    isMountedRef.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // Debug: trace hydration
      // eslint-disable-next-line no-console
      console.debug("[audit] hydrate: rawExists=", !!raw);
      if (raw) {
        const parsed = JSON.parse(raw) as AuditInput;
        // eslint-disable-next-line no-console
        console.debug("[audit] parsed stored input", parsed);
        if (parsed?.subscriptions?.length) {
          setTeamSize(parsed.teamSize ?? 5);
          setSubs(parsed.subscriptions);
          setPrefilled(true);
        }
      }
    } catch {
      /* ignore */
    }
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // No auto-submit effect — users must click "Run audit" to generate results.

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ teamSize, subscriptions: subs } satisfies AuditInput)
      );
    } catch {
      /* ignore */
    }
  }, [teamSize, subs]);

  const totalMonthly = useMemo(
    () => subs.reduce((s, x) => s + (Number(x.monthlySpend) || 0), 0),
    [subs]
  );

  function updateSub(id: string, patch: Partial<ToolSubscription>) {
    setSubs((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        // When tool changes, reset plan to first available + default price
        if (patch.tool && patch.tool !== s.tool) {
          const info = TOOL_MAP[patch.tool as ToolId];
          if (info) {
            const firstPaid = info.plans.find((p) => p.pricePerSeat > 0) ?? info.plans[0];
            next.plan = firstPaid.id;
            next.monthlySpend = (firstPaid.pricePerSeat || 0) * (next.seats || 1);
          }
        }
        if (patch.plan && patch.plan !== s.plan) {
          const info = TOOL_MAP[next.tool as ToolId];
          const plan = info?.plans.find((p) => p.id === patch.plan);
          if (plan && plan.pricePerSeat > 0) {
            next.monthlySpend = plan.pricePerSeat * (next.seats || 1);
          }
        }
        return next;
      })
    );
  }

  function addRow() {
    setSubs((prev) => [...prev, newRow()]);
  }
  function removeRow(id: string) {
    setSubs((prev) => (prev.length === 1 ? prev : prev.filter((s) => s.id !== id)));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors(null);
    const input: AuditInput = { teamSize, subscriptions: subs };
    const parsed = auditSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(parsed.error.issues[0]?.message ?? "Please fix the form.");
      return;
    }
    setSubmitting(true);
    const token = encodeAuditInput(parsed.data);
    // Debug: manual submit
    // eslint-disable-next-line no-console
    console.debug("[audit] manual submit, token=", token?.slice?.(0, 12));
    // Navigate immediately (removed delay for faster feedback)
    navigate({ to: "/audit/$id", params: { id: token } });
    // Fallback: if navigation doesn't occur within 2s, clear the spinner and show an error.
    // Use a mounted ref to avoid updating state after unmount.
    setTimeout(() => {
      try {
        // eslint-disable-next-line no-console
        console.debug("[audit] submit fallback check: location=", typeof window !== "undefined" ? window.location.href : "no-window");
        const navigated = typeof window !== "undefined" && window.location.pathname.startsWith("/audit/");
        if (!navigated) {
          if (isMountedRef.current) {
            setSubmitting(false);
            setErrors("Navigation to results failed — check console or try again.");
          }
          // eslint-disable-next-line no-console
          console.warn("[audit] navigation to results didn't complete within timeout");
        } else {
          // If we navigated successfully, ensure spinner cleared (if component still mounted)
          if (isMountedRef.current) setSubmitting(false);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[audit] submit fallback check failed", err);
      }
    }, 2000);
  }

  if (isResultsRoute) {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">Step 1 of 2</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              List what you're paying for.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
              Add every AI tool your team subscribes to. Numbers stay in your browser until you choose to save.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-border/60 bg-card p-6 shadow-elevated sm:p-8"
          >
            {/* Prefill notice removed as requested */}
            {/* Team size */}
            <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className="text-sm font-medium" htmlFor="teamSize">
                  Total team size
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Everyone — engineers, PMs, ops — not just AI tool users.
                </p>
              </div>
              <input
                id="teamSize"
                type="number"
                min={1}
                max={10000}
                value={teamSize}
                onChange={(e) => setTeamSize(Math.max(1, Number(e.target.value) || 1))}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-32"
              />
            </div>

            <div className="my-6 h-px bg-border" />

            <div className="space-y-4">
              {subs.map((sub, idx) => (
                <SubscriptionRow
                  key={sub.id}
                  index={idx}
                  sub={sub}
                  onChange={(patch) => updateSub(sub.id, patch)}
                  onRemove={() => removeRow(sub.id)}
                  canRemove={subs.length > 1}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={addRow}>
                <Plus className="h-4 w-4" /> Add another tool
              </Button>
              <div className="text-right text-sm text-muted-foreground">
                Current total{" "}
                <span className="text-base font-semibold text-foreground">
                  ${totalMonthly.toLocaleString()}
                </span>{" "}
                /mo
              </div>
            </div>

            {errors && (
              <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {errors}
              </div>
            )}

            <div className="mt-8 flex flex-col items-center gap-3">
              <Button type="submit" variant="hero" size="xl" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Auditing your stack…
                  </>
                ) : (
                  <>
                    Run audit <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Free · Instant · No signup
              </p>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SubscriptionRow({
  index,
  sub,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  sub: ToolSubscription;
  onChange: (patch: Partial<ToolSubscription>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const info = TOOL_MAP[sub.tool as ToolId];
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Tool #{index + 1}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove tool"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_0.8fr_1fr]">
        <Field label="Tool">
          <select
            value={sub.tool}
            onChange={(e) => onChange({ tool: e.target.value as ToolId })}
            className="input"
          >
            {TOOLS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Plan">
          <select
            value={sub.plan}
            onChange={(e) => onChange({ plan: e.target.value })}
            className="input"
          >
            {info?.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.pricePerSeat > 0 ? ` — $${p.pricePerSeat}/seat` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Monthly spend ($)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={sub.monthlySpend}
            onChange={(e) => onChange({ monthlySpend: Number(e.target.value) || 0 })}
            className="input"
          />
        </Field>
        <Field label="Seats">
          <input
            type="number"
            min={1}
            value={sub.seats}
            onChange={(e) => onChange({ seats: Math.max(1, Number(e.target.value) || 1) })}
            className="input"
          />
        </Field>
        <Field label="Primary use">
          <select
            value={sub.useCase}
            onChange={(e) => onChange({ useCase: e.target.value as UseCase })}
            className="input"
          >
            {USE_CASES.map((u) => (
              <option key={u} value={u}>
                {u[0].toUpperCase() + u.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <style>{`
        .input {
          height: 2.5rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--input);
          background: var(--background);
          padding: 0 0.65rem;
          font-size: 0.875rem;
          box-shadow: 0 1px 0 oklch(0.2 0.02 260 / 0.02);
        }
        .input:focus { outline: none; box-shadow: 0 0 0 2px var(--ring); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
