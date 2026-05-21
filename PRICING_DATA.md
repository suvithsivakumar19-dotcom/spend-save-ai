# Pricing Data

All list prices verified **2025-05**. Sources are official vendor pricing pages
captured on that date. Numbers in `src/lib/pricing-data.ts` should be re-verified
quarterly — set a calendar reminder.

| Tool | Plan | Price / seat / mo | Source |
|---|---|---:|---|
| Cursor | Pro | $20 | https://cursor.com/pricing |
| Cursor | Business | $40 | https://cursor.com/pricing |
| GitHub Copilot | Individual | $10 | https://github.com/features/copilot/plans |
| GitHub Copilot | Business | $19 | https://github.com/features/copilot/plans |
| GitHub Copilot | Enterprise | $39 | https://github.com/features/copilot/plans |
| Claude | Pro | $20 | https://claude.ai/pricing |
| Claude | Team | $30 | https://claude.ai/pricing |
| ChatGPT | Plus | $20 | https://openai.com/chatgpt/pricing/ |
| ChatGPT | Team | $25 | https://openai.com/chatgpt/pricing/ |
| ChatGPT | Enterprise | ~$60 | Sales-quoted; rough public median |
| Gemini Advanced | — | $20 | https://gemini.google/advanced/ |
| Gemini Business | — | $20 | https://workspace.google.com/products/gemini/ |
| Windsurf / v0 | Pro | $15 | https://windsurf.com/pricing |
| Anthropic API | Usage | $0 base | https://www.anthropic.com/pricing |
| OpenAI API | Usage | $0 base | https://openai.com/api/pricing/ |

## Assumptions

1. **Annual billing not modeled yet.** Most vendors offer 15–20% off annual.
   Future rule: "you're billed monthly on a plan with annual savings — switch."
2. **ChatGPT Enterprise** is sales-priced. We use $60/seat as a public-median
   estimate; actual contracts vary $40–$100.
3. **API costs** are usage-based; we treat reported `monthlySpend` as truth
   and don't second-guess token mix.
4. **Geo discounts and student/edu rates** are ignored.
5. **Seat = paying user**, not "registered user".
6. Currency: USD. Other currencies are converted by the user before entry.

## How to add a tool

1. Append a `ToolInfo` entry to `TOOLS` in `src/lib/pricing-data.ts`.
2. Add rules (if any) to `audit-engine.ts`.
3. Add a test case to `audit-engine.test.ts`.
4. Update this file with the source URL.
