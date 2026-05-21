# Reflection

## 1. Hardest bug
The first version of the engine double-counted savings: a `consolidate` rec
would drop ChatGPT entirely, and a separate `downgrade` rec on the same
ChatGPT row would also fire. Total savings displayed > current spend.

Fix: consolidation rules now look at the **other** tools, never the
already-flagged one, and the totals function clamps with
`Math.max(0, currentMonthly - savings)`. Added a test (`yearly == monthly * 12`)
that would have caught it.

## 2. Decision I reversed
Started with a generated AI summary via Anthropic. Pulled it. Two reasons:
- Without an API key configured in the demo, the fallback was the path users
  actually saw — so the fallback **had** to be good. Once it was good, the AI
  version added latency and risk without much upside.
- The whole product promise is "no AI black box". Burying the headline number
  in an LLM hedged that promise.

The summary is still upgradeable to Anthropic in one function. But the
default is the deterministic version.

## 3. Week 2 roadmap
1. Wire Supabase: real `audits` + `leads` tables, server fn for lead insert.
2. Resend transactional email with the report link.
3. Anthropic-augmented summary (additive, behind a flag).
4. Three more tools: Perplexity, Notion AI, Linear AI.
5. Annual-billing rules: spot teams paying monthly when annual would save 17–20%.
6. Vendor-side data: scrape pricing pages weekly, alert on changes.
7. One paid SKU: "I'll go negotiate this for you — $X flat or 20% of savings."

## 4. AI usage reflection
Used Lovable to scaffold faster than I could by hand. AI was great for
boilerplate (form structure, route shells) and for design polish (gradient
ideas, layout density). It was a worse judge of **product decisions** —
e.g., suggested adding social auth, suggested adding 12 more tools, suggested
building an admin dashboard. All of those would have hurt the demo.

Lesson: AI assistance is a force multiplier on what you've already decided,
not a substitute for deciding.

## 5. Self-evaluation
- **Engine quality:** 8/10. Defensible, testable, but rules are still hand-coded.
  Want vendor-data ingestion before claiming 9.
- **Design:** 8/10. Looks like a real product. Could push the results page harder
  with a small chart.
- **Code quality:** 8/10. Strict TS, no escape hatches, small files.
- **Product clarity:** 9/10. The flow is one decision: "list → see savings".
  No confusion about what to do next.
- **Where I'd spend the next 10 hours:** Supabase + Resend wiring, then one
  real customer interview to validate the consolidation rule weights.
