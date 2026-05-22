# Metrics

## North Star

**Weekly Completed Audits.**

Why: every other useful number (leads, shares, paid conversions, virality)
correlates with audits completed. It's the single metric the product is
designed to maximize.

## Supporting metrics

| Metric                                          | What it tells us  | Target by week 8 |
| ----------------------------------------------- | ----------------- | ---------------: |
| Audit completion rate                           | UX quality        |            ≥ 65% |
| Median monthly savings surfaced                 | Engine quality    |        ≥ $400/mo |
| Shares per audit (URL copies + outbound clicks) | Viral coefficient |           ≥ 0.15 |
| Email capture rate                              | Lead funnel       |            ≥ 20% |
| Time to first savings number (TTFV)             | Speed of value    |            < 90s |
| Day-7 return rate                               | Stickiness        |            ≥ 12% |

## Instrumentation strategy

- **Client-side events** via a thin wrapper (no third-party SDK in v1 — fewer
  privacy concerns, faster page).
- Event names:
  - `landing_viewed`
  - `audit_started` (first form interaction)
  - `audit_row_added` / `audit_row_removed`
  - `audit_submitted` (with engine output payload — no PII)
  - `share_link_copied`
  - `lead_submitted` (boolean only; email goes to DB, not analytics)
- POST to a `/api/public/track` server route — batched, debounced.
- Aggregate weekly in Supabase via a single materialized view.

## Pivot thresholds

If after 4 weeks of consistent distribution:

1. **Completion rate < 40%** → the form is the problem. Consider replacing
   manual entry with "paste your billing email and we'll guess" parsing.
2. **Median savings < $150/mo** → either the engine is too conservative or
   the audience is wrong. Rewrite rules **or** move ICP up-market.
3. **Shares per audit < 0.05** → the report isn't shareable enough. Add a
   per-audit OG image generator and re-test.
4. **Email capture < 10%** → people don't trust the email gate. Drop it
   entirely and shift monetization purely to the paid review tier.

## What we will NOT optimize for

- Time on site.
- Page views.
- Free signups (there are none).

Those metrics reward the wrong product behavior.
