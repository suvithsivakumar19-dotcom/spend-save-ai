import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  LineChart,
  Wallet,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Credex — Stop Overpaying for AI Tools" },
      {
        name: "description",
        content:
          "Instantly audit your AI stack and uncover wasted spend across ChatGPT, Claude, Cursor, Copilot, Gemini, and more. Free, no login.",
      },
      { property: "og:url", content: "https://credex.app/" },
      { property: "og:site_name", content: "Credex" },
      { property: "og:title", content: "Credex — AI Spend Auditor" },
      {
        property: "og:description",
        content:
          "Audit your AI tool spend in 60 seconds. Get a per-tool recommendation and a yearly savings number you can defend.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://credex.app/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Credex" },
      { name: "twitter:title", content: "Credex — AI Spend Auditor" },
      {
        name: "twitter:description",
        content:
          "Audit your AI tool spend in 60 seconds. Get a per-tool recommendation and a yearly savings number you can defend.",
      },
      { name: "twitter:image", content: "https://credex.app/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://credex.app/" }],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <SocialProof />
        <Problem />
        <HowItWorks />
        <Features />
        <FinalCTA />
        <FAQ />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 grid-bg opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pt-28 lg:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Free audit · No signup · 60 seconds
          </div>
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Stop overpaying for <span className="text-gradient">AI tools.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            Instantly audit your AI stack and uncover wasted spend across ChatGPT, Claude, Cursor,
            Copilot, Gemini, and more. Get a per-tool recommendation and a yearly savings number you
            can defend.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="xl" variant="hero">
              <Link to="/audit">
                Audit My AI Spend <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <a href="#how">See how it works</a>
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Rule-based audit · No AI black box · Your data never leaves your browser
          </p>
        </div>

        {/* Mock preview */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-elevated">
            <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/50 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="ml-3 text-xs text-muted-foreground">credex.app/results</span>
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-3 sm:p-10">
              <SummaryStat label="Current spend" value="$1,840 /mo" tone="muted" />
              <SummaryStat label="Monthly savings" value="$612 /mo" tone="success" />
              <SummaryStat label="Yearly savings" value="$7,344 /yr" tone="primary" />
            </div>
            <div className="grid gap-3 border-t border-border/60 p-6 sm:p-8">
              <PreviewRow tool="Cursor Business → Pro" saving="$240/mo" />
              <PreviewRow tool="ChatGPT Team → Plus" saving="$10/mo" />
              <PreviewRow tool="Consolidate Copilot + Cursor" saving="$190/mo" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "muted" | "success" | "primary";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-1.5 text-2xl font-semibold tracking-tight ${
          tone === "success"
            ? "text-[oklch(0.55_0.16_155)]"
            : tone === "primary"
              ? "text-gradient"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PreviewRow({ tool, saving }: { tool: string; saving: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-4 w-4 text-[oklch(0.55_0.16_155)]" />
        <span className="text-sm">{tool}</span>
      </div>
      <span className="text-sm font-medium text-[oklch(0.55_0.16_155)]">−{saving}</span>
    </div>
  );
}

function SocialProof() {
  return (
    <section className="border-y border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="mb-6 text-center text-xs uppercase tracking-wider text-muted-foreground">
          Built for teams running modern AI stacks
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-base font-medium text-muted-foreground/80">
          {[
            "ChatGPT",
            "Claude",
            "Cursor",
            "Copilot",
            "Gemini",
            "Anthropic API",
            "OpenAI API",
            "Windsurf",
          ].map((n) => (
            <span key={n} className="opacity-80">
              {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-primary">The problem</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Every team is quietly overpaying.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            AI tools billed monthly, per-seat, with overlapping features and surprise upgrades. The
            average team we audit has{" "}
            <span className="font-semibold text-foreground">3–5 redundant subscriptions</span> and
            is on a higher tier than they actually use.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { stat: "30%", label: "average spend reduction" },
            { stat: "4.2", label: "AI tools per team" },
            { stat: "$612", label: "median monthly savings" },
            { stat: "60s", label: "to run the audit" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border/60 bg-card-gradient p-6 shadow-soft"
            >
              <div className="text-3xl font-semibold tracking-tight text-gradient">{s.stat}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Wallet,
      title: "List what you pay for",
      body: "Add the AI tools, plans, seats, and spend. Takes about 60 seconds.",
    },
    {
      icon: Search,
      title: "Get a rule-based audit",
      body: "We apply deterministic rules — no AI black box — and flag every overpayment.",
    },
    {
      icon: LineChart,
      title: "See yearly savings",
      body: "Per-tool recommendation with reasoning and a number you can take to finance.",
    },
  ];
  return (
    <section id="how" className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">How it works</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Three steps. No login.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-2xl border border-border/60 bg-card p-7 shadow-soft"
            >
              <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Step {i + 1}
              </div>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Defensible logic",
      body: "Every recommendation has plain-English reasoning tied to published pricing. No AI hallucinations.",
    },
    {
      icon: Zap,
      title: "Instant results",
      body: "No queue, no email gate. See the savings number before we ever ask for your email.",
    },
    {
      icon: LineChart,
      title: "Shareable report",
      body: "One link to send to your CFO or co-founder. Read-only, no account required.",
    },
    {
      icon: Sparkles,
      title: "Built for the modern stack",
      body: "Cursor, Copilot, ChatGPT, Claude, Gemini, Windsurf, plus raw Anthropic & OpenAI APIs.",
    },
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">Features</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Finance-grade, not founder-grade.
        </h2>
      </div>
      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        {items.map((f) => (
          <div
            key={f.title}
            className="flex gap-5 rounded-2xl border border-border/60 bg-card p-7 shadow-soft transition-shadow hover:shadow-elevated"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-savings text-primary-foreground shadow-glow">
              <f.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-savings p-10 text-center shadow-elevated sm:p-16">
        <div className="absolute inset-0 grid-bg opacity-20" aria-hidden />
        <div className="relative">
          <h2 className="text-balance text-4xl font-semibold tracking-tight text-primary-foreground sm:text-5xl">
            Find out what you're wasting.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-primary-foreground/80">
            Free, no signup, results in under a minute.
          </p>
          <div className="mt-8">
            <Button asChild size="xl" variant="secondary">
              <Link to="/audit">
                Audit My AI Spend <ArrowRight className="ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "Is this really free?",
      a: "Yes. The audit, recommendations, and shareable report are all free. We may later offer a deeper paid review with vendor negotiation — that's the optional upsell.",
    },
    {
      q: "Do you store my data?",
      a: "By default, no. Audits run entirely in your browser. We only store anything if you choose to save a report and provide an email.",
    },
    {
      q: "Is the audit AI-generated?",
      a: "No. The recommendations come from a deterministic rules engine tied to published vendor pricing. We use AI only for the optional executive summary — the numbers are not AI guesses.",
    },
    {
      q: "What tools do you support?",
      a: "Cursor, GitHub Copilot, Claude, ChatGPT, Anthropic API, OpenAI API, Gemini, and Windsurf/v0 today. Adding more weekly.",
    },
    {
      q: "How accurate are the savings?",
      a: "We use list pricing as of the most recent verification (see PRICING_DATA.md). Actual savings depend on your contract — annual deals, negotiated rates, and overages will shift the number.",
    },
  ];
  return (
    <section id="faq" className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">FAQ</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Questions, answered.
          </h2>
        </div>
        <div className="mt-12 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
          {faqs.map((f) => (
            <details key={f.q} className="group p-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium">
                {f.q}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
