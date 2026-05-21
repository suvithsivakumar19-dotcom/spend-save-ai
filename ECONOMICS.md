# Economics

## Pricing model (proposed)

| Tier | Price | What you get |
|---|---|---|
| Self-serve audit | $0 | The free tool. Forever. |
| Done-for-you review | $499 one-time | We audit, we call your vendors, we send a savings memo. |
| Quarterly FinOps | $299/mo | Same as above, every quarter, plus alerts on plan changes. |

The free tier is the wedge. The two paid tiers monetize the 10% of teams
whose savings are large enough that paying us is obvious math.

## Funnel assumptions

| Stage | Rate | Reasoning |
|---|---:|---|
| Landing → audit started | 35% | Strong CTA, no friction, value visible above the fold. |
| Audit started → completed | 70% | Single-page form, persists state. |
| Completed → email submitted | 25% | Email gate is after value, optional. |
| Email → paid (DFY) conversion | 3% | Only teams with >$500/mo savings will book the review. |

100 visits → 35 audits → ~25 finished → ~6 emails → ~0.2 paying customers.

## Unit economics (first 12 months)

- **CAC (blended):** ~$22.
  Reddit/X is ~$0 marginal but takes founder time. Paid ads ~$5/visit, ~$140/lead, ~$700/customer.
  At our scale, organic dominates → blended CAC stays low.
- **ARPU (paid customers):** ~$120/mo (mix of one-time DFY amortized + recurring quarterly).
- **Gross margin:** ~85%. Almost no per-audit cost (the engine is free to run;
  Resend is ~$0.001/email; Supabase free tier covers first 5k audits).
- **LTV:** ~$1,400 assuming 12-month average retention on the recurring tier.
- **LTV / CAC:** ~63×. The free tier is the moat; the paid tier is the print.

## Revenue assumptions

- 5% of audited stacks book DFY → $499 revenue.
- 1% convert to quarterly retainer → $299/mo recurring.
- Average free-tier audit: doesn't pay us, but is content fuel and referral source.

## Path to $1M ARR

| Lever | Number needed |
|---|---:|
| Recurring customers @ $299/mo | ~280 |
| DFY one-time @ $499 (annualized over 12mo) | n/a — treated as one-time |
| Implied audits/yr to fill the funnel (1% conv) | 28,000 |
| Implied free audits/mo | ~2,300 |
| Implied landing visits/mo (35% start, 70% complete) | ~9,400 |

9,400 monthly visits is **one good Reddit thread per week + steady X
presence + ongoing HN attempts**. Not crazy. Not free either.

## When this breaks

- Vendors change pricing aggressively → engine accuracy drops → user trust
  drops. Mitigation: weekly pricing-page scrape (week 4 build).
- Free tier cannibalizes paid (everyone DIYs the recommendations).
  Mitigation: paid tier sells the **execution** (calling vendors), not the
  diagnosis.
- AI-tool prices commodify → savings shrink → recommendations get small.
  Mitigation: expand into broader SaaS audit (Notion, Linear, Figma).
