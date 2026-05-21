# Email Setup Guide

## Overview

Credex uses **Resend** for transactional emails. The system has a **graceful fallback** — if no API key is configured, emails still succeed locally but show a warning.

## Quick Start (Production)

### 1. Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up (free tier included)
3. Verify your email

### 2. Get Your API Key

1. Navigate to **Settings** → **API Keys**
2. Copy your API key (starts with `re_`)
3. Save it to your `.env.local` file:

```bash
RESEND_API_KEY=re_your_key_here
```

### 3. Configure Sender Email

You'll need a verified sender domain. Two options:

#### Option A: Use Resend's Domain (Easiest)

Resend provides a default domain. Update `src/lib/send-email.ts`:

```typescript
from: "report@resend.dev", // Use Resend's default
```

#### Option B: Use Your Domain (Recommended)

1. In Resend dashboard, add your domain (e.g., `credex.app`)
2. Follow DNS verification steps
3. Update sender in `src/lib/send-email.ts`:

```typescript
from: "report@credex.app",
```

## Development Setup

### Local Testing Without Email

1. Run the app:
   ```bash
   npm run dev
   ```

2. Submit an audit form with email
3. You'll see the confirmation screen (no actual email sent)
4. Check terminal logs for: `⚠️  RESEND_API_KEY not set`

### Local Testing With Email

1. Get an API key from [resend.com](https://resend.com)
2. Create `.env.local`:
   ```
   RESEND_API_KEY=re_your_key_here
   RESEND_FROM_EMAIL=report@resend.dev
   RESEND_REPLY_TO=support@resend.dev
   ```
3. Restart dev server: `npm run dev`
4. Submit an audit form
5. Check your inbox

## Email Template

The audit report email includes:

- ✅ Summary of findings
- ✅ Monthly & yearly savings
- ✅ Direct link to shareable report
- ✅ Next steps recommendations
- ✅ Unsubscribe link

Template file: `src/lib/send-email.ts` → `generateEmailHTML()`

## Production Deployment

### Vercel

```bash
# Set environment variable in Vercel dashboard
RESEND_API_KEY=re_your_key_here
```

### Cloudflare Workers

```bash
# Set secret via wrangler
wrangler secret put RESEND_API_KEY
# Paste your API key when prompted
```

## Monitoring & Debugging

### Check Email Status

1. Open Resend dashboard
2. Navigate to **Emails** tab
3. View delivery status and failures

### Common Issues

| Issue | Fix |
|---|---|
| "Email service not configured" | Add `RESEND_API_KEY` to `.env.local` |
| "Email sending failed" | Check Resend dashboard for error details |
| "Invalid sender domain" | Verify domain in Resend dashboard |
| Emails in spam | Check SPF/DKIM records in DNS |

## Cost

- **Free tier**: 100 emails/day
- **Pay-as-you-go**: $0.20 per email after free tier
- **Volume pricing**: Available at scale

For Credex's expected volume (B2B SaaS), free tier is sufficient for months 1-6.

## Alternative: No Email (Dev Mode)

To disable email completely:

1. Comment out `RESEND_API_KEY` in `.env.local`
2. The app still works — just no emails sent
3. Leads are still saved to browser localStorage

## Testing Email Sending

Use this in your browser console:

```javascript
// Check if email was saved to localStorage
JSON.parse(localStorage.getItem('credex.leads') || '[]')
```

Example output:
```javascript
[
  {
    email: "demo@credex.app",
    company: "Acme Corp",
    role: "CTO",
    at: "2026-05-21T06:15:22.000Z",
    emailId: "e_xxxxx" // Resend email ID if sent
  }
]
```

## Questions?

- **Resend docs**: [resend.com/docs](https://resend.com/docs)
- **GitHub issues**: Create an issue in this repo
