# Devlog

## Day 1 — 5h
**Built:** project scaffold, design tokens, landing page hero + how-it-works.
**Blockers:** Original brief said Next.js; this template runs on TanStack Start. Decided to adapt rather than fight the platform — same React/Tailwind story, deploys the same way.
**Lessons:** Define the design system FIRST. Gradients, shadows, and the savings-gradient token unlocked the visual style for every later screen.
**Next:** form + engine.

## Day 2 — 6h
**Built:** `pricing-data.ts` with 8 tools and all current plans. Audit input form with dynamic add/remove rows, localStorage persistence, Zod validation.
**Blockers:** Form ergonomics — auto-filling spend when a plan is picked vs. respecting user override. Picked the simple rule: changing plan resets spend, manual edits stick.
**Lessons:** People will type "20" or "$20" or "20/mo". Coerce hard.
**Next:** rules engine.

## Day 3 — 4h
**Built:** First version of `audit-engine.ts`. Five per-tool rules, two cross-tool consolidation rules.
**Blockers:** Risk of cascading recommendations (downgrade + consolidate the same tool). Solved by separating per-tool downgrades from cross-tool consolidations and never double-counting savings on the same line item.
**Lessons:** "Savings" needs guardrails — `Math.max(0, ...)` everywhere. Negative savings is worse than no savings.
**Next:** results page.

## Day 4 — 5h
**Built:** Results page with animated number counters, severity-coded cards, executive summary, copy-link share.
**Blockers:** SSR vs animation — `requestAnimationFrame` doesn't run on server. Wrapped counters in a client hook with `useEffect`.
**Lessons:** Counters that animate from 0 are addictive. Worth the 30 lines.
**Next:** shareable URLs.

## Day 5 — 3h
**Built:** `/audit/$id` route with base64url token. Per-route `head()` metadata so X/Twitter previews show the actual savings number.
**Blockers:** None — URL state is genuinely the simplest "database".
**Lessons:** If a feature can be done without a DB, do it without a DB.
**Next:** tests, lead capture.

## Day 6 — 4h
**Built:** Vitest suite for the engine (6 cases incl. edge cases). Lead capture UI with happy-path UX.
**Blockers:** Vitest isn't pre-installed; documented the install step in TESTS.md rather than bloating the default bundle.
**Lessons:** Tests on the engine are the highest-leverage ones — the engine is the whole product.
**Next:** docs.

## Day 7 — 4h
**Built:** All docs (README, ARCH, GTM, ECONOMICS, INTERVIEWS, METRICS, PROMPTS, PRICING, REFLECTION, LANDING_COPY).
**Blockers:** Writing GTM that didn't sound like ChatGPT generated it.
**Lessons:** Specificity over breadth. "Post in r/selfhosted" beats "leverage online communities".
**Next:** ship.
