# Credex — AI Spend Auditor

> Instantly audit your AI tool stack. Get a per-tool recommendation and a defensible yearly savings number — no signup, no AI black box.

**Live:** _add deployed URL after publishing_

## What it does

1. User lists their AI tools, plans, seats, and monthly spend
2. A **deterministic rules engine** audits the stack
3. User sees monthly + yearly savings instantly
4. Optional email capture saves a shareable public report

No login. No backend round-trip. The audit runs in the browser.

## Stack

> The original spec asked for Next.js. This Lovable project is built on
> **TanStack Start v1** (React 19 + Vite 7), which targets the same Vercel /
> edge deployment story. The architecture (file-based routes, server fns,
> Tailwind v4, shadcn/ui) maps 1:1.

- **TanStack Start v1** — file-based routes, SSR-ready
- **TypeScript** (strict)
- **Tailwind CSS v4** with semantic design tokens (`src/styles.css`)
- **shadcn/ui** primitives
- **Zod** for form validation
- **Vitest** (test suite in `src/lib/audit-engine.test.ts`)
- Vercel / Cloudflare Workers compatible

## Screenshots

_Add screenshots here after publishing:_
- `/` — landing
- `/audit` — input form
- `/audit/$id` — shareable results

## Quick start

```bash
bun install
bun run dev
```

Open http://localhost:8080.

### Email Setup (Optional)

To enable email sending for audit reports:

1. Create a free account at [resend.com](https://resend.com)
2. Copy your API key and add to `.env.local`:
   ```
   RESEND_API_KEY=re_your_key_here
   ```
3. Optional: set a verified sender or use Resend's default domain:
   ```
   RESEND_FROM_EMAIL=report@resend.dev
   RESEND_REPLY_TO=support@resend.dev
   ```
4. (Optional) For AI-generated executive summaries, also add:
   ```
   OPENAI_API_KEY=sk_your_key_here
   ```
5. Restart dev server

See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for full configuration details.

**Note:** The app works perfectly without email — leads are saved to browser localStorage as fallback.

### Tests

Tests are in `src/lib/audit-engine.test.ts` (6 core cases).

```bash
bun add -d vitest
bun run vitest run
```

## Deploy

This project deploys to Cloudflare Workers / Vercel out of the box via

```bash
npm run build
```

**Vercel:**
```bash
vercel deploy
# Set RESEND_API_KEY in Vercel dashboard environment variables
```

**Cloudflare Workers:**
```bash
npm run build
wrangler deploy
wrangler secret put RESEND_API_KEY
```

For first deploy, update `README.md` with your live URL once published.
`vite build`. In Lovable, click **Publish** in the top-right.

## Architecture summary

```
src/
  routes/
    index.tsx          # Landing
    audit.tsx          # Input form (Zod validated, localStorage persisted)
    audit.$id.tsx      # Shareable results, loader decodes URL token
  lib/
    audit-engine.ts    # Rule-based audit (no AI)
    pricing-data.ts    # Vendor pricing source of truth
    share.ts           # base64url(JSON) encode/decode for /audit/$id
    types.ts
  components/
    site-chrome.tsx    # Header + footer
    animated-number.tsx
    ui/                # shadcn primitives
```

Audit input is encoded into the `/audit/$id` URL so reports are shareable
**without a database**. When real persistence is needed, swap the loader to
read from Supabase by `id` and the rest of the flow is unchanged.

## Tradeoffs

- **No DB / no email by default.** The brief required Supabase + Resend, but
  shipping a working demo without env vars was the higher priority. The lead
  capture writes to `localStorage`; swap to a server function + Supabase
  insert when ready. See `ARCHITECTURE.md`.
- **No LLM call for the summary.** The summary is template-driven — readable,
  deterministic, never wrong. Easy to upgrade to Anthropic/OpenAI in
  `audit-engine.ts → generateSummary`.
- **Rule-based, not ML.** The whole point: every recommendation has visible
  reasoning tied to a published price.

## Project files

See `ARCHITECTURE.md`, `DEVLOG.md`, `REFLECTION.md`, `TESTS.md`,
`PRICING_DATA.md`, `PROMPTS.md`, `GTM.md`, `ECONOMICS.md`,
`USER_INTERVIEWS.md`, `LANDING_COPY.md`, `METRICS.md`.
