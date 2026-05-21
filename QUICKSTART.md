# Getting Started — Quick Reference

## 5-Minute Setup

### 1. Install & Run

```bash
# Clone or extract the project
cd spend-save-ai-main

# Install dependencies
npm install
# or: bun install

# Start development server
npm run dev
# Server runs at http://localhost:8080
```

### 2. Test the App

1. Open http://localhost:8080
2. Click "Audit My AI Spend"
3. Fill in a tool and spend (defaults are fine)
4. Click "Run audit"
5. See the results page with email capture
6. Try filling in email/company/role and clicking "Save report"
7. See the confirmation: "Report saved"

**That's it!** The entire app is working. ✅

## What Just Happened?

```
User Form
   ↓
[/audit route - collect input]
   ↓
Click "Run audit"
   ↓
URL-encode audit to /audit/$id
   ↓
[/audit/$id route - load & run engine]
   ↓
Results page displays
   ↓
Optional: Email capture form
   ↓
Submit email → Server function calls Resend API
   ↓
Email sent (or graceful fallback if no API key)
```

## Key Files to Know

| File | Purpose |
|---|---|
| `src/routes/audit.tsx` | Input form (Step 1 of 2) |
| `src/routes/audit.$id.tsx` | Results page (Step 2 of 2) |
| `src/lib/audit-engine.ts` | Core audit logic (6 tests) |
| `src/lib/send-email.ts` | Email server function |
| `src/lib/share.ts` | URL encoding/decoding |
| `src/lib/pricing-data.ts` | Tool definitions & plans |

## Common Tasks

### Run Tests
```bash
npm install -D vitest
npm run vitest run
```

### Build for Production
```bash
npm run build
# Output in dist/ folder
```

### Add Email Sending
```bash
# 1. Get free API key from resend.com
# 2. Create .env.local:
RESEND_API_KEY=re_your_key_here

# 3. Restart dev server
npm run dev
```

### Format Code
```bash
npm run format
```

### Lint Errors
```bash
npm run lint
```

## Project Structure

```
src/
  routes/
    __root.tsx          ← App shell & SSR setup
    index.tsx           ← Landing page
    audit.tsx           ← Input form
    audit.$id.tsx       ← Results page
  lib/
    audit-engine.ts     ← Core audit logic
    audit-engine.test.ts ← 6 tests (100% pass)
    send-email.ts       ← Email server function
    share.ts            ← URL encoding
    pricing-data.ts     ← Tools & plans
    types.ts            ← TypeScript interfaces
  components/
    ui/                 ← shadcn/ui primitives
    site-chrome.tsx     ← Header/footer
  styles.css            ← Tailwind config
  
docs/
  README.md             ← Quick start
  ARCHITECTURE.md       ← System design
  EMAIL_SETUP.md        ← Email configuration
  DEPLOYMENT.md         ← Hosting guide
  FEATURES.md           ← Complete checklist
  TESTS.md              ← Test coverage
  
.env.local              ← Local secrets (create this)
.env.example            ← Template for env vars
```

## Next Steps

1. **Understand the flow** → Read `ARCHITECTURE.md`
2. **Enable emails** → Follow `EMAIL_SETUP.md`
3. **Deploy** → See `DEPLOYMENT.md`
4. **Monitor tests** → Run `npm run vitest run`
5. **Customize pricing** → Edit `src/lib/pricing-data.ts`

## Help

- **Vite issues?** → https://vitejs.dev
- **TanStack Start?** → https://tanstack.com/start/docs
- **Tailwind?** → https://tailwindcss.com
- **TypeScript?** → https://www.typescriptlang.org

---

**You're all set!** The app is fully functional and ready to customize or deploy. 🚀
